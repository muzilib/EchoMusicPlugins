/**
 * 音乐下载插件 v1.1.0
 *
 * 功能：
 *  1. 一键下载当前曲目的音频（最高音质优先）/ 歌词（.lrc）/ 封面，三者分开下载。
 *  2. 独立弹窗，每个资源一个【下载】按钮，直接下载到浏览器默认下载目录（无需手填地址）。
 *  3. 入口：
 *     - 方案 A：命令 `music-download.open` + 快捷键 ⌘/Ctrl + Shift + D。
 *     - 方案 B：把下载按钮注入到播放器底栏右侧操作区 `.player-actions` 末尾；
 *               找不到稳定容器时回退为右下角浮动按钮。
 *
 * 写法对齐 index 2.js：全程可选链防御式调用，任一宿主 API 缺失都不会让插件崩溃。
 * 主入口运行在 EchoMusic 主窗口渲染进程，可直接操作 document。
 *
 * 已知字段（来自实测日志）：
 *  - 音频：track.audioUrl
 *  - 封面：track.coverUrl
 *  - 歌词：snapshot.lyric.lines（实测仅 1 行，结构待确认）
 */

const STORAGE_KEY = "music-download:settings:v1";
const TAG = "[music-download]";
const PANEL_ID = "echo-dl-panel";
const PLAYER_BTN_ID = "echo-dl-playerbar-btn";

const DEFAULT_SETTINGS = {
    enabled: true,
    injectPlayerBar: true, // 方案 B：注入底栏按钮
    floatFallback: true, // 注入失败显示右下角浮动按钮
};

// ---------------- 基础工具 ----------------

const isHttpUrl = (v) =>
    typeof v === "string" && /^https?:\/\//i.test(v) && !/\s/.test(v);

const safeText = (s) => (s == null ? "" : String(s)).trim();

const toast = (ctx, fn, msg) => {
    try {
        const t = ctx?.toast;
        if (t && typeof t[fn] === "function") t[fn](msg);
    } catch {
    }
};

// 通用 DOM 构造：字符串以 "<" 开头时按 HTML 片段插入，否则作为文本节点
const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k === "class") node.className = v;
        else if (k === "style" && typeof v === "object")
            Object.assign(node.style, v);
        else if (k.startsWith("on") && typeof v === "function")
            node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "html") node.insertAdjacentHTML("beforeend", v);
        else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
        if (c == null || c === false) continue;
        if (typeof c === "string") {
            if (c.trim().startsWith("<")) node.insertAdjacentHTML("beforeend", c);
            else node.appendChild(document.createTextNode(c));
        } else {
            node.appendChild(c);
        }
    }
    return node;
};

const ICON_DOWNLOAD =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

// ---------------- 曲目信息 ----------------

const getCurrentTrack = (ctx) => {
    try {
        const t = ctx?.player?.currentTrack;
        if (t && typeof t === "object") {
            if ("value" in t) return t.value ?? null; // ComputedRef 解包
            return t;
        }
    } catch {
    }
    return null;
};

const getMeta = (track, snapshot) => {
    const pb = snapshot?.playback;
    const t = track || pb || {};
    const title =
        safeText(t.title) ||
        safeText(t.name) ||
        safeText(t.songName) ||
        safeText(pb?.title) ||
        "未知歌曲";
    let artist =
        safeText(t.artist) || safeText(t.singer) || safeText(pb?.artist) || "";
    if (!artist && Array.isArray(t.artists)) {
        artist = t.artists
            .map((a) => safeText(a?.name) || safeText(a))
            .filter(Boolean)
            .join(", ");
    }
    if (!artist && t?.album?.artist) artist = safeText(t.album.artist);
    if (!artist) artist = "未知歌手";
    return {title, artist};
};

// 递归收集对象里所有 http(s) 字符串及其路径
const collectUrlCandidates = (obj, base = "") => {
    const out = [];
    if (!obj || typeof obj !== "object") return out;
    if (Array.isArray(obj)) {
        obj.forEach((item, i) => {
            const path = `${base}[${i}]`;
            if (typeof item === "string" && isHttpUrl(item))
                out.push({path, url: item});
            else if (item && typeof item === "object")
                out.push(...collectUrlCandidates(item, path));
        });
        return out;
    }
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        const path = base ? `${base}.${k}` : k;
        if (typeof v === "string" && isHttpUrl(v)) out.push({path, url: v});
        else if (v && typeof v === "object")
            out.push(...collectUrlCandidates(v, path));
    }
    return out;
};

const looksLikeAudioPath = (p) => {
    const lp = (p || "").toLowerCase();
    if (/(cover|pic|img|image|album|lyric|lrc|avatar)/.test(lp)) return false;
    return (
        /(url|src|play|music|song|file|source|link|audio|stream)/.test(lp) ||
        /\.(mp3|flac|ape|wav|m4a|aac|ogg|opus|dsf|dsd)$/i.test(lp)
    );
};

const audioRank = (p) => {
    const lp = (p || "").toLowerCase();
    if (/(hires|hi-res|master|dsd|dsf)/.test(lp)) return 6;
    if (/(flac|lossless|ape|wav)/.test(lp)) return 5;
    if (/(sq|320|exhigh)/.test(lp)) return 4;
    if (/(hq|192)/.test(lp)) return 3;
    if (/(128|standard|low)/.test(lp)) return 2;
    return 1;
};

const pickAudio = (track) => {
    if (!track || typeof track !== "object")
        return {url: null, sourcePath: null, candidates: []};
    const all = collectUrlCandidates(track);
    const audio = all.filter((c) => looksLikeAudioPath(c.path));
    audio.sort((a, b) => audioRank(b.path) - audioRank(a.path));
    const best = audio[0] || null;
    return {
        url: best?.url ?? null,
        sourcePath: best?.path ?? null,
        candidates: all,
    };
};

const pickCover = (track) => {
    if (!track || typeof track !== "object")
        return {url: null, sourcePath: null};
    const all = collectUrlCandidates(track);
    const cover =
        all.find((c) => /(cover|pic|img|image|album)/i.test(c.path)) || null;
    return {url: cover?.url ?? null, sourcePath: cover?.path ?? null};
};

const qualityLabel = (track, sourcePath) => {
    const p = (sourcePath || "").toLowerCase();
    if (/hires|hi-res|master|dsd|dsf/.test(p)) return "Hi-Res";
    if (/flac|lossless|ape|wav/.test(p)) return "FLAC / 无损";
    if (/sq|320|exhigh/.test(p)) return "SQ · 320kbps";
    if (/hq|192/.test(p)) return "HQ · 192kbps";
    if (/128|standard|low/.test(p)) return "标准 · 128kbps";
    try {
        for (const f of ["quality", "level", "rate", "bitrate", "q"]) {
            if (track?.[f] != null && track[f] !== "") return String(track[f]);
        }
    } catch {
    }
    return "标准";
};

// ---------------- 歌词 ----------------

const buildLrc = (snapshot) => {
    const lines = snapshot?.lyric?.lines;
    if (!Array.isArray(lines) || !lines.length) return null;
    const out = [];
    for (const ln of lines) {
        const text =
            safeText(ln.text) || safeText(ln.content) || safeText(ln.words) || "";
        let sec = Number(ln.time ?? ln.startTime ?? ln.t ?? NaN);
        if (!isFinite(sec) || sec < 0) {
            if (text) out.push(text);
            continue;
        }
        // 宿主 lyric.lines[].time 单位为【秒】（实测 7.51 / 173.7 等）；
        // 兼容个别以毫秒给出的来源（>1000 视为毫秒）
        if (sec > 1000) sec = sec / 1000;
        const mm = Math.floor(sec / 60);
        const ss = sec % 60;
        const stamp = `[${String(mm).padStart(2, "0")}:${ss
            .toFixed(2)
            .padStart(5, "0")}]`;
        out.push(`${stamp}${text}`);
    }
    return out.length ? out.join("\n") : null;
};

// ---------------- 文件名 / 下载 ----------------

const extFromUrl = (url, fallback) => {
    const m = /\.([a-z0-9]{2,4})(?:$|\?|#)/i.exec(url || "");
    return m ? m[1].toLowerCase() : fallback;
};

const buildFilename = (meta, ext) => {
    const base = `${meta.artist} - ${meta.title}`
        .replace(/[\\/:*?"<>|]/g, "_")
        .trim();
    return `${base || "download"}.${ext}`;
};

const saveBlob = (blob, filename) => {
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
};

// 优先 fetch→blob（可重命名为 歌手-歌名），跨域/混合内容失败则降级为浏览器原生下载
const triggerUrlDownload = async (url, filename) => {
    if (!isHttpUrl(url)) throw new Error("下载地址无效");
    try {
        const res = await fetch(url, {mode: "cors", credentials: "omit"});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        saveBlob(blob, filename);
        return "blob";
    } catch {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "";
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return "fallback";
    }
};

const triggerTextDownload = (
    text,
    filename,
    mime = "application/octet-stream",
) => {
    saveBlob(new Blob([text], {type: mime}), filename);
};

// ---------------- 下载弹窗 ----------------

let panelKeyHandler = null;

const closePanel = () => {
    const node = document.getElementById(PANEL_ID);
    if (node) node.remove();
    if (panelKeyHandler) {
        document.removeEventListener("keydown", panelKeyHandler);
        panelKeyHandler = null;
    }
};

// 单行：左侧 标签+音质标签，右侧 下载按钮；下方可选 hint
const makeRow = (ctx, {label, tag, tagTitle, hint, disabled, onDownload}) => {
    const btnDl = el(
        "button",
        {
            class: "echo-dl-btn echo-dl-btn--primary",
            type: "button",
            title: "下载",
        },
        [ICON_DOWNLOAD, " 下载"],
    );
    btnDl.disabled = Boolean(disabled);

    if (!disabled) {
        let busy = false;
        btnDl.addEventListener("click", async () => {
            if (busy) return;
            busy = true;
            const origin = btnDl.innerHTML;
            btnDl.innerHTML = "下载中…";
            btnDl.disabled = true;
            try {
                await onDownload();
            } catch (e) {
                console.warn(TAG, "下载失败", e);
                toast(ctx, "warning", `下载失败：${e?.message || e}`);
            } finally {
                btnDl.innerHTML = origin;
                btnDl.disabled = false;
                busy = false;
            }
        });
    }

    return el("section", {class: "echo-dl-row"}, [
        el("div", {class: "echo-dl-row__main"}, [
            el("span", {class: "echo-dl-row__label"}, [label]),
            tag
                ? el("span", {class: "echo-dl-tag", title: tagTitle || ""}, [tag])
                : null,
        ]),
        btnDl,
        hint ? el("div", {class: "echo-dl-row__hint"}, [hint]) : null,
    ]);
};

const openPanel = async (ctx) => {
    closePanel();

    const track = getCurrentTrack(ctx);
    let snapshot = null;
    try {
        snapshot = await ctx?.nowPlaying?.getSnapshot?.();
    } catch {
    }

    // 歌词为异步加载，若仍在加载中则稍候重取一次，避免拿到空歌词
    try {
        if (snapshot?.lyric?.isLoading) {
            await new Promise((r) => setTimeout(r, 600));
            snapshot = await ctx?.nowPlaying?.getSnapshot?.();
        }
    } catch {
    }

    const meta = getMeta(track, snapshot);
    const audio = pickAudio(track);
    const cover = pickCover(track);
    const lrc = buildLrc(snapshot);
    const lrcCount = snapshot?.lyric?.lines?.length || 0;

    // —— 探测日志（字段校准用，请反馈给开发者）——
    try {
        console.group(`${TAG} 下载探测（请把下面信息反馈给开发者）`);
        console.log("currentTrack =", track);
        console.log("snapshot =", snapshot);
        console.log("snapshot.lyric =", snapshot?.lyric);
        console.log(
            "所有 URL 候选 =",
            audio.candidates.map((c) => `${c.path} = ${c.url}`),
        );
        console.log(
            "音频 →",
            audio.sourcePath,
            audio.url,
            "| 音质",
            qualityLabel(track, audio.sourcePath),
        );
        console.log("封面 →", cover.sourcePath, cover.url);
        console.log("歌词行数 =", lrcCount);
        console.groupEnd();
    } catch {
    }

    const overlay = el("div", {class: "echo-dl-overlay", id: PANEL_ID});
    const card = el("div", {class: "echo-dl-card"});

    // 头部
    card.appendChild(
        el("div", {class: "echo-dl-head"}, [
            el("div", {class: "echo-dl-head__copy"}, [
                el("div", {class: "echo-dl-head__title"}, [
                    el("strong", {}, [`下载：${meta.artist} - ${meta.title}`]),
                ]),
                el("div", {class: "echo-dl-head__sub"}, [
                    track
                        ? "点击下方按钮即可下载到浏览器默认下载目录"
                        : "当前无播放曲目，无可下载内容",
                ]),
            ]),
            el(
                "button",
                {
                    class: "echo-dl-x",
                    type: "button",
                    title: "关闭",
                    onClick: closePanel,
                },
                ["×"],
            ),
        ]),
    );

    // 三个区块（无输入框，直接下载）
    card.appendChild(
        el("div", {class: "echo-dl-body"}, [
            makeRow(ctx, {
                label: "音频文件",
                tag: qualityLabel(track, audio.sourcePath),
                tagTitle: audio.sourcePath
                    ? `来源字段：${audio.sourcePath}`
                    : "未探测到",
                hint: audio.url
                    ? `来源：${audio.sourcePath}`
                    : "未探测到音频直链，无法下载",
                disabled: !audio.url,
                onDownload: async () => {
                    const r = await triggerUrlDownload(
                        audio.url,
                        buildFilename(meta, extFromUrl(audio.url, "mp3")),
                    );
                    toast(
                        ctx,
                        r === "blob" ? "success" : "info",
                        r === "blob" ? "已开始下载音频" : "已为你打开音频链接",
                    );
                },
            }),
            makeRow(ctx, {
                label: "歌词文件（.lrc）",
                tag: lrc ? `内嵌 · ${lrcCount} 行` : "无内嵌",
                tagTitle: lrc ? "来自当前播放快照" : "当前无内嵌歌词",
                hint: lrc
                    ? "来自当前播放快照"
                    : "当前快照无歌词数据（详见控制台 snapshot.lyric）",
                disabled: !lrc,
                onDownload: async () => {
                    if (!lrc) throw new Error("没有可下载的歌词");
                    triggerTextDownload(
                        lrc,
                        buildFilename(meta, "lrc"),
                        "text/plain;charset=utf-8",
                    );
                    toast(ctx, "success", "已开始下载歌词");
                },
            }),
            makeRow(ctx, {
                label: "封面图片",
                tag: cover.url ? extFromUrl(cover.url, "jpg").toUpperCase() : "无",
                tagTitle: cover.sourcePath
                    ? `来源字段：${cover.sourcePath}`
                    : "未探测到",
                hint: cover.url
                    ? `来源：${cover.sourcePath}`
                    : "未探测到封面，无法下载",
                disabled: !cover.url,
                onDownload: async () => {
                    const r = await triggerUrlDownload(
                        cover.url,
                        buildFilename(meta, extFromUrl(cover.url, "jpg")),
                    );
                    toast(
                        ctx,
                        r === "blob" ? "success" : "info",
                        r === "blob" ? "已开始下载封面" : "已为你打开图片链接",
                    );
                },
            }),
        ]),
    );

    card.appendChild(
        el("div", {class: "echo-dl-foot"}, [
            el("div", {class: "echo-dl-foot__hint"}, [
                "文件保存到浏览器默认下载目录；跨域资源可能以原始文件名保存。",
            ]),
            el(
                "button",
                {
                    class: "echo-dl-btn echo-dl-btn--ghost",
                    type: "button",
                    onClick: closePanel,
                },
                ["关闭"],
            ),
        ]),
    );

    overlay.appendChild(card);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closePanel();
    });
    card.addEventListener("click", (e) => e.stopPropagation());

    document.body.appendChild(overlay);

    panelKeyHandler = (e) => {
        if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", panelKeyHandler);
};

// ---------------- 播放栏按钮注入（方案 B） ----------------

let playerBtn = null;
let lastMode = null;
let mo = null;
let moTimer = null;

const makePlayerButton = (ctx) => {
    const btn = el(
        "button",
        {
            id: PLAYER_BTN_ID,
            class: "echo-dl-btn echo-dl-btn--bar",
            type: "button",
            title: "下载音乐 (⌘/Ctrl + Shift + D)",
        },
        [ICON_DOWNLOAD],
    );
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        void openPanel(ctx);
    });
    return btn;
};

// 定位到播放器底栏右侧操作区 .player-actions（justify-end），把按钮放到其末尾
const findInjectPoint = () => {
    const selectors = [
        ".player-actions",
        '[class~="player-actions"]',
        '[class*="player-actions"]',
        '[class*="playerActions"]',
        '[class*="player-bar-container"]',
        '[class*="playerBarContainer"]',
    ];
    for (const sel of selectors) {
        try {
            const node = document.querySelector(sel);
            if (node) return {container: node, sel};
        } catch {
        }
    }
    return null;
};

const detachPlayerButton = () => {
    if (playerBtn) playerBtn.remove();
};

const ensurePlayerButton = (ctx) => {
    if (!state?.settings?.enabled) {
        detachPlayerButton();
        lastMode = null;
        return;
    }

    let mode = null;
    let point = null;
    if (state.settings.injectPlayerBar) point = findInjectPoint();
    if (point) mode = "bar";
    else if (state.settings.floatFallback) mode = "float";
    if (!mode) {
        detachPlayerButton();
        lastMode = null;
        return;
    }

    if (!playerBtn) playerBtn = makePlayerButton(ctx);

    if (mode === "bar") {
        const {container, sel} = point;
        playerBtn.className = "echo-dl-btn echo-dl-btn--bar";
        if (playerBtn.parentElement !== container) {
            container.appendChild(playerBtn);
            console.log(TAG, "下载按钮已放入播放栏末尾", sel);
        }
        lastMode = "bar";
    } else {
        playerBtn.className = "echo-dl-btn echo-dl-btn--float";
        if (playerBtn.parentElement !== document.body) {
            document.body.appendChild(playerBtn);
            console.log(TAG, "未找到播放栏容器，显示浮动下载按钮");
        }
        lastMode = "float";
    }
};

const startPlayerButtonObserver = (ctx) => {
    stopPlayerButtonObserver();
    try {
        mo = new MutationObserver(() => {
            clearTimeout(moTimer);
            moTimer = setTimeout(() => ensurePlayerButton(ctx), 500);
        });
        mo.observe(document.body, {childList: true, subtree: true});
    } catch {
    }
    ensurePlayerButton(ctx);
};

const stopPlayerButtonObserver = () => {
    try {
        mo?.disconnect();
    } catch {
    }
    mo = null;
    clearTimeout(moTimer);
    moTimer = null;
};

// ---------------- 设置面板 ----------------

const SETTINGS_CSS = `
/* ===== 设置面板 ===== */
.echo-dl-settings{display:grid;gap:14px;color:var(--color-text-main,#f8fafc)}
.echo-dl-settings h3{margin:0;font-size:13px;font-weight:760}
.echo-dl-settings .echo-dl-panel{display:grid;gap:11px;border:1px solid color-mix(in srgb,var(--color-text-main,#f8fafc) 12%,transparent);border-radius:8px;background:color-mix(in srgb,var(--surface-elevated-base,#111827) 72%,transparent);padding:14px}
.echo-dl-settings .echo-dl-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px}
.echo-dl-settings .echo-dl-copy{display:grid;gap:3px;min-width:0}
.echo-dl-settings .echo-dl-copy span{font-size:13px;font-weight:650}
.echo-dl-settings .echo-dl-copy small{font-size:12px;line-height:1.45;color:var(--color-text-secondary,rgba(148,163,184,.9))}
.echo-dl-actions{display:flex;flex-wrap:wrap;gap:8px}
@media(max-width:640px){.echo-dl-settings .echo-dl-row{align-items:flex-start}}

/* ===== 下载弹窗 ===== */
#echo-dl-panel.echo-dl-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);animation:echo-dl-fade .16s ease}
.echo-dl-card{width:min(520px,100%);max-height:86vh;overflow:auto;display:grid;gap:14px;background:var(--bg-elevated,#1e1e24);color:var(--color-text-main,#f8fafc);border:1px solid var(--border-subtle,rgba(148,163,184,.22));border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.5);padding:18px 18px 16px;animation:echo-dl-pop .18s cubic-bezier(.22,1,.36,1)}
.echo-dl-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:10px}
.echo-dl-head__copy{display:grid;gap:4px;min-width:0}
.echo-dl-head__title strong{font-size:15px;font-weight:760;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.echo-dl-head__sub{font-size:11.5px;line-height:1.5;color:var(--color-text-secondary,rgba(148,163,184,.9))}
.echo-dl-x{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:inherit;font-size:20px;line-height:1;cursor:pointer;transition:background .15s ease}
.echo-dl-x:hover{background:color-mix(in srgb,var(--color-text-main,#fff) 12%,transparent)}
.echo-dl-body{display:grid;gap:12px}
.echo-dl-card .echo-dl-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 12px;padding:13px 14px;border:1px solid var(--border-subtle,rgba(148,163,184,.18));border-radius:10px;background:color-mix(in srgb,var(--color-text-main,#fff) 4%,transparent)}
.echo-dl-card .echo-dl-row__main{display:flex;align-items:center;gap:10px;min-width:0}
.echo-dl-card .echo-dl-row__label{font-size:13px;font-weight:700;min-width:0}
.echo-dl-tag{flex:none;font-size:10.5px;font-weight:700;letter-spacing:.3px;padding:3px 8px;border-radius:999px;background:color-mix(in srgb,var(--color-primary,#31cfa1) 20%,transparent);color:color-mix(in srgb,var(--color-primary,#31cfa1) 60%,#fff)}
.echo-dl-card .echo-dl-row__hint{grid-column:1/-1;font-size:11px;line-height:1.5;color:var(--color-text-secondary,rgba(148,163,184,.85))}
.echo-dl-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border-subtle,rgba(148,163,184,.3));border-radius:8px;background:transparent;color:inherit;font-size:12px;font-weight:650;cursor:pointer;padding:8px 14px;transition:background .15s ease,border-color .15s ease,opacity .15s ease}
.echo-dl-btn:disabled{opacity:.45;cursor:not-allowed}
.echo-dl-btn--ghost:hover{background:color-mix(in srgb,var(--color-text-main,#fff) 10%,transparent)}
.echo-dl-btn--primary{border-color:transparent;background:color-mix(in srgb,var(--color-primary,#31cfa1) 22%,transparent);color:#fff}
.echo-dl-btn--primary:hover{background:color-mix(in srgb,var(--color-primary,#31cfa1) 38%,transparent)}
.echo-dl-btn svg{display:block}
.echo-dl-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:4px;border-top:1px solid var(--border-subtle,rgba(148,163,184,.14))}
.echo-dl-foot__hint{font-size:11px;color:var(--color-text-secondary,rgba(148,163,184,.85));min-width:0}

/* ===== 播放栏 / 浮动按钮 ===== */
#echo-dl-playerbar-btn.echo-dl-btn--bar{width:34px;height:34px;padding:0;border-radius:8px;background:transparent;border:0;color:inherit;cursor:pointer;display:grid;place-items:center;opacity:.72;transition:opacity .15s ease,background .15s ease}
#echo-dl-playerbar-btn.echo-dl-btn--bar:hover{opacity:1;background:color-mix(in srgb,var(--color-text-main,#fff) 10%,transparent)}
#echo-dl-playerbar-btn.echo-dl-btn--float{position:fixed;right:18px;bottom:88px;z-index:99998;width:48px;height:48px;padding:0;border:0;border-radius:50%;background:color-mix(in srgb,var(--color-primary,#31cfa1) 88%,#0b7);color:#fff;cursor:pointer;display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:transform .15s ease}
#echo-dl-playerbar-btn.echo-dl-btn--float:hover{transform:translateY(-2px)}
#echo-dl-playerbar-btn svg{display:block}

@keyframes echo-dl-fade{from{opacity:0}to{opacity:1}}
@keyframes echo-dl-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
`;

const createSettingsComponent = (ctx) =>
    ctx.vue.defineComponent({
        name: "MusicDownloadSettings",
        setup() {
            const {computed, defineAsyncComponent, h} = ctx.vue;
            const Button = defineAsyncComponent(ctx.ui.components.Button);
            const Switch = defineAsyncComponent(ctx.ui.components.Switch);
            const settings = computed(() =>
                Object.assign({}, DEFAULT_SETTINGS, state?.settings || {}),
            );

            const patch = (values) => {
                void saveSettings(ctx, {...settings.value, ...values}).catch((e) => {
                    toast(ctx, "warning", e?.message || "设置保存失败");
                });
            };

            const row = (label, key, hint = "") =>
                h("div", {class: "echo-dl-row"}, [
                    h("span", {class: "echo-dl-copy"}, [
                        h("span", label),
                        hint ? h("small", hint) : null,
                    ]),
                    h(Switch, {
                        modelValue: Boolean(settings.value[key]),
                        "onUpdate:modelValue": (v) => patch({[key]: Boolean(v)}),
                    }),
                ]);

            return () =>
                h("div", {class: "echo-dl-settings"}, [
                    h("section", {class: "echo-dl-panel"}, [
                        h("h3", "入口"),
                        row("启用音乐下载插件", "enabled"),
                        row(
                            "在播放器底栏注入下载按钮",
                            "injectPlayerBar",
                            "自动注入到播放栏右侧 .player-actions 末尾。",
                        ),
                        row(
                            "注入失败显示浮动按钮",
                            "floatFallback",
                            "未匹配到播放栏时，在右下角显示浮动下载按钮作为兜底。",
                        ),
                        h("div", {class: "echo-dl-actions"}, [
                            h(
                                Button,
                                {
                                    variant: "primary",
                                    size: "xs",
                                    onClick: () => openPanel(ctx),
                                },
                                {default: () => "打开下载面板"},
                            ),
                            h(
                                Button,
                                {
                                    variant: "ghost",
                                    size: "xs",
                                    onClick: () => patch(DEFAULT_SETTINGS),
                                },
                                {default: () => "恢复默认"},
                            ),
                        ]),
                    ]),
                ]);
        },
    });

// ---------------- 状态 / 存储 ----------------

let state = null;
let settingsDispose = null;
let settingsStyleDispose = null;

const normalizeSettings = (v) => {
    const s = v && typeof v === "object" ? v : {};
    return {
        ...DEFAULT_SETTINGS,
        ...s,
        enabled: s.enabled ?? DEFAULT_SETTINGS.enabled,
        injectPlayerBar: s.injectPlayerBar ?? DEFAULT_SETTINGS.injectPlayerBar,
        floatFallback: s.floatFallback ?? DEFAULT_SETTINGS.floatFallback,
    };
};

const saveSettings = async (ctx, values) => {
    const next = normalizeSettings(values);
    if (!state) return next;
    state.settings = next;
    try {
        await ctx.storage.set(STORAGE_KEY, next);
    } catch {
    }
    ensurePlayerButton(ctx);
    return next;
};

// ---------------- 生命周期 ----------------

export async function activate(ctx) {
    let stored = {};
    try {
        stored = (await ctx.storage.get(STORAGE_KEY)) || {};
    } catch {
    }
    state = ctx.vue.reactive({settings: normalizeSettings(stored)});

    try {
        settingsStyleDispose = ctx.css.inject(SETTINGS_CSS, {
            id: "music-download-settings-css",
        });
    } catch {
    }

    try {
        settingsDispose = ctx.ui.settings.define({
            title: "音乐下载",
            description: "下载当前曲目的音频、歌词和封面。",
            component: createSettingsComponent(ctx),
        });
    } catch (e) {
        console.warn(TAG, "注册设置面板失败", e);
    }

    // 方案 A：命令 + 快捷键（⌘/Ctrl + Shift + D）
    try {
        ctx.commands?.register?.("music-download.open", () => openPanel(ctx), {
            title: "打开音乐下载面板",
        });
    } catch (e) {
        console.warn(TAG, "注册命令失败", e);
    }
    try {
        const has = typeof ctx?.shortcuts?.register === "function";
        console.log(TAG, "快捷键 API 是否可用：", has);
        ctx.shortcuts?.register?.("CommandOrControl+Shift+D", () => openPanel(ctx));
    } catch (e) {
        console.warn(TAG, "注册快捷键失败", e);
    }

    // 方案 B：播放栏按钮注入
    startPlayerButtonObserver(ctx);

    if (ctx.dispose) {
        try {
            ctx.dispose(() => {
                stopPlayerButtonObserver();
                detachPlayerButton();
                closePanel();
                settingsDispose?.();
                settingsStyleDispose?.();
            });
        } catch {
        }
    }

    console.log(TAG, "已激活");
}

export async function deactivate(ctx) {
    stopPlayerButtonObserver();
    detachPlayerButton();
    playerBtn = null;
    lastMode = null;
    closePanel();
    try {
        settingsDispose?.();
    } catch {
    }
    settingsDispose = null;
    try {
        settingsStyleDispose?.();
    } catch {
    }
    settingsStyleDispose = null;
    state = null;
    console.log(TAG, "已停用");
}
