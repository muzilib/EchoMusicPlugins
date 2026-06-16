const SETTINGS_KEY = "settings";

const IMAGE_FILTERS = [{ name: "Images", extensions: ["jpg", "jpeg", "png", "ico", "webp", "bmp", "gif"] }];
const ICO_FILTERS = [{ name: "Icons", extensions: ["ico"] }];
const AUDIO_FILTERS = [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "m4a", "flac", "aac", "wma"] }];

const ICON_TYPES = ["tray", "taskbar", "desktop"];
const SHORTCUT_TYPES = new Set(["taskbar", "desktop"]);

const DEFAULT_SETTINGS = (() => {
  const base = { enabled: true, splashEnabled: true, splashImagePath: "", splashRelativePath: "", splashPreviewUrl: "", splashDuration: 3, splashScale: "cover", splashOverlayOpacity: 0.5, splashOverlayColor: "#ffffff", splashBlurAmount: 0, splashBgColor: "#ffffff", splashShowLogo: true, splashAudioEnabled: true, splashAudioPath: "", splashAudioRelativePath: "", splashAudioPreviewUrl: "", splashAudioVolume: 0.5, splashAudioDuration: 3 };
  for (const type of ICON_TYPES) {
    base[`${type}IconPath`] = "";
    base[`${type}RelativePath`] = "";
    base[`${type}PreviewUrl`] = "";
  }
  return base;
})();

const SETTINGS_PANEL_CSS = `
.custom-icon-settings{display:grid;gap:20px;color:var(--color-text-main,var(--text-main,#f8fafc))}
.custom-icon-settings.with-preview{grid-template-columns:minmax(172px,220px) minmax(0,1fr)}
.custom-icon-settings.with-preview .custom-icon-tabs{grid-column:1/-1}
.custom-icon-preview-panel{display:grid;gap:12px;align-content:start}
.custom-icon-preview-heading,.custom-icon-section-heading,.custom-icon-footer{display:flex;align-items:center;justify-content:space-between;gap:10px}
.custom-icon-preview-heading span:first-child,.custom-icon-section-heading h3{margin:0;font-size:13px;font-weight:760}
.custom-icon-pill{display:inline-flex;align-items:center;height:22px;border-radius:999px;padding:0 8px;background:color-mix(in srgb,var(--color-text-main,#f8fafc) 8%,transparent);color:var(--color-text-secondary,var(--text-secondary,rgba(148,163,184,0.9)));font-size:11px;font-weight:750}
.custom-icon-pill.is-active{background:color-mix(in srgb,var(--color-primary,#31cfa1) 16%,transparent);color:var(--color-primary,#31cfa1)}
.custom-icon-preview-box{aspect-ratio:1;overflow:hidden;border:1px solid color-mix(in srgb,var(--color-text-main,#f8fafc) 13%,transparent);border-radius:8px;background:linear-gradient(135deg,color-mix(in srgb,var(--color-primary,#31cfa1) 10%,transparent),transparent),var(--color-bg-elevated,var(--bg-secondary,rgba(148,163,184,0.08)));box-shadow:inset 0 0 0 1px color-mix(in srgb,white 5%,transparent);display:grid;place-items:center}
.custom-icon-preview-box.wide{aspect-ratio:16/9}
.custom-icon-preview-box img{display:block;width:100%;height:100%;border-radius:inherit;object-fit:cover}
.custom-icon-preview-empty{color:var(--color-text-secondary,var(--text-secondary,rgba(148,163,184,0.9)));text-align:center;font-size:12px;line-height:1.45;padding:16px}
.custom-icon-preview-meta{display:grid;gap:3px}
.custom-icon-preview-meta span{font-size:12px;font-weight:750}
.custom-icon-preview-meta small,.custom-icon-section-description,.custom-icon-field-hint{color:var(--color-text-secondary,var(--text-secondary,rgba(148,163,184,0.9)));font-size:12px;line-height:1.5}
.custom-icon-settings-fields{display:grid;gap:14px;min-width:0}
.custom-icon-section{display:grid;gap:12px;min-width:0;border:1px solid color-mix(in srgb,var(--color-text-main,#f8fafc) 12%,transparent);border-radius:8px;background:color-mix(in srgb,var(--surface-elevated-base,#111827) 72%,transparent);padding:14px}
.custom-icon-section-copy{display:grid;gap:3px;min-width:0}
.custom-icon-field{display:grid;gap:7px}.custom-icon-field-label{color:var(--text-secondary,rgba(148,163,184,0.9));font-size:12px;font-weight:600}
.custom-icon-path-value{flex:1 1 0;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid color-mix(in srgb,var(--color-text-main,#f8fafc) 12%,transparent);border-radius:8px;color:var(--color-text-secondary,var(--text-secondary,rgba(148,163,184,0.9)));padding:8px 10px;font-size:12px}
.custom-icon-path-row{display:flex;flex-wrap:nowrap;gap:8px;align-items:center;min-width:0}
.custom-icon-path-row>*{white-space:nowrap;flex-shrink:0}
.custom-icon-tabs{display:flex;gap:0;border-bottom:1px solid color-mix(in srgb,var(--color-text-main,#f8fafc) 12%,transparent);margin-bottom:14px}
.custom-icon-tab{padding:8px 16px;font-size:13px;font-weight:600;color:var(--color-text-secondary,rgba(148,163,184,0.9));cursor:pointer;border-bottom:2px solid transparent;transition:color .15s,border-color .15s;background:none;border-top:none;border-left:none;border-right:none}
.custom-icon-tab:hover{color:var(--color-text-main,var(--text-main,#f8fafc))}
.custom-icon-tab.is-active{color:var(--color-primary,#31cfa1);border-bottom-color:var(--color-primary,#31cfa1)}
.custom-icon-footer{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-start;padding-top:2px}
.custom-icon-switch-row{display:flex;justify-content:space-between;gap:12px;align-items:center;color:var(--color-text-main,var(--text-main,#f8fafc));font-size:13px}
.custom-icon-switch-copy{display:grid;gap:3px}
.custom-icon-switch-copy small{color:var(--color-text-secondary,var(--text-secondary,rgba(148,163,184,0.9)));font-size:12px;line-height:1.45}
.custom-icon-message{color:var(--color-text-secondary,var(--text-secondary,rgba(148,163,184,0.9)));font-size:12px}
.custom-icon-applied-result{padding:10px 14px;border-radius:8px;font-size:12px;line-height:1.6}
.custom-icon-applied-result.success{background:color-mix(in srgb,#22c55e 15%,transparent);color:#22c55e}
.custom-icon-applied-result.warning{background:color-mix(in srgb,#f59e0b 15%,transparent);color:#f59e0b}
.custom-icon-applied-result.error{background:color-mix(in srgb,#ef4444 15%,transparent);color:#ef4444}
.custom-icon-settings input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:var(--color-text-secondary,rgba(148,163,184,0.9));outline:none;opacity:0.7;transition:opacity .2s}
.custom-icon-settings input[type=range]:hover{opacity:1}
.custom-icon-settings input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--color-primary,#31cfa1);cursor:pointer;border:2px solid var(--color-bg-elevated,rgba(255,255,255,0.8));box-shadow:0 1px 3px rgba(0,0,0,0.3)}
@media(max-width:640px){.custom-icon-settings{grid-template-columns:1fr}.custom-icon-preview-panel{grid-template-columns:104px minmax(0,1fr);align-items:center}.custom-icon-preview-heading{grid-column:1/-1}.custom-icon-section{padding:12px}.custom-icon-switch-row{align-items:flex-start}}
`;

let state = null;
let settingsDispose = null;
let settingsStyleDispose = null;

const buildSettingsFromDraft = (draft, overrides = {}) => ({
  ...DEFAULT_SETTINGS,
  enabled: draft.enabled,
  splashEnabled: draft.splashEnabled,
  trayIconPath: draft.trayIconPath,
  trayRelativePath: draft.trayRelativePath,
  trayPreviewUrl: draft.trayPreviewUrl,
  taskbarIconPath: draft.taskbarIconPath,
  taskbarRelativePath: draft.taskbarRelativePath,
  taskbarPreviewUrl: draft.taskbarPreviewUrl,
  desktopIconPath: draft.desktopIconPath,
  desktopRelativePath: draft.desktopRelativePath,
  desktopPreviewUrl: draft.desktopPreviewUrl,
  splashImagePath: draft.splashImagePath,
  splashRelativePath: draft.splashRelativePath,
  splashPreviewUrl: draft.splashPreviewUrl,
  splashDuration: draft.splashDuration,
  splashScale: draft.splashScale,
  splashOverlayOpacity: draft.splashOverlayOpacity,
  splashOverlayColor: draft.splashOverlayColor,
  splashBlurAmount: draft.splashBlurAmount,
  splashBgColor: draft.splashBgColor,
  splashShowLogo: draft.splashShowLogo,
  splashAudioEnabled: draft.splashAudioEnabled,
  splashAudioPath: draft.splashAudioPath,
  splashAudioRelativePath: draft.splashAudioRelativePath,
  splashAudioPreviewUrl: draft.splashAudioPreviewUrl,
  splashAudioVolume: draft.splashAudioVolume,
  splashAudioDuration: draft.splashAudioDuration,
  ...overrides,
});

const getExt = (name) => {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

const getMime = (ext) => {
  const e = String(ext || "").toLowerCase().replace(/^\./, "");
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "gif") return "image/gif";
  if (e === "ico") return "image/x-icon";
  if (e === "webp") return "image/webp";
  if (e === "bmp") return "image/bmp";
  return "image/png";
};

const getAudioMime = (ext) => {
  const e = String(ext || "").toLowerCase().replace(/^\./, "");
  if (e === "mp3") return "audio/mpeg";
  if (e === "wav") return "audio/wav";
  if (e === "ogg") return "audio/ogg";
  if (e === "m4a" || e === "aac") return "audio/mp4";
  if (e === "flac") return "audio/flac";
  if (e === "wma") return "audio/x-ms-wma";
  return "audio/mpeg";
};

const bufferToDataUrl = (buf, mime) => {
  if (!buf) return "";
  try {
    let bytes;
    if (buf instanceof Uint8Array) bytes = buf;
    else if (buf instanceof ArrayBuffer) bytes = new Uint8Array(buf);
    else if (ArrayBuffer.isView?.(buf)) bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    else if (buf?.buffer instanceof ArrayBuffer) bytes = new Uint8Array(buf.buffer, buf.byteOffset || 0, buf.byteLength || buf.buffer.byteLength);
    else if (typeof buf === "string") { bytes = new Uint8Array(buf.length); for (let i = 0; i < buf.length; i++) bytes[i] = buf.charCodeAt(i) & 0xff; }
    else return "";
    if (!bytes?.length) return "";
    let bin = ""; const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return `data:${mime};base64,${btoa(bin)}`;
  } catch { return ""; }
};

const isGifPath = (p) => /\.gif$/i.test(p || "");
const getFileName = (p) => {
  if (!p) return "";
  const n = String(p).replace(/\\/g, "/");
  const i = n.lastIndexOf("/");
  return i >= 0 ? n.substring(i + 1) : n;
};

const normalizeSettings = (stored) => {
  const src = (stored && typeof stored === "object") || Array.isArray(stored) ? stored : {};
  const s = { enabled: src.enabled !== undefined ? Boolean(src.enabled) : true, splashEnabled: src.splashEnabled !== undefined ? Boolean(src.splashEnabled) : true, splashImagePath: typeof src.splashImagePath === "string" ? src.splashImagePath : "", splashRelativePath: typeof src.splashRelativePath === "string" ? src.splashRelativePath : "", splashPreviewUrl: typeof src.splashPreviewUrl === "string" ? src.splashPreviewUrl : "", splashDuration: typeof src.splashDuration === "number" && src.splashDuration > 0 ? src.splashDuration : 3, splashScale: ["cover", "contain", "fill"].includes(src.splashScale) ? src.splashScale : "cover", splashOverlayOpacity: typeof src.splashOverlayOpacity === "number" ? Math.max(0, Math.min(1, src.splashOverlayOpacity)) : 0.5, splashOverlayColor: typeof src.splashOverlayColor === "string" ? src.splashOverlayColor : "#ffffff", splashBlurAmount: typeof src.splashBlurAmount === "number" ? Math.max(0, Math.min(20, src.splashBlurAmount)) : 0, splashBgColor: typeof src.splashBgColor === "string" ? src.splashBgColor : "#ffffff", splashShowLogo: src.splashShowLogo !== undefined ? Boolean(src.splashShowLogo) : true, splashAudioEnabled: src.splashAudioEnabled !== undefined ? Boolean(src.splashAudioEnabled) : true, splashAudioPath: typeof src.splashAudioPath === "string" ? src.splashAudioPath : "", splashAudioRelativePath: typeof src.splashAudioRelativePath === "string" ? src.splashAudioRelativePath : "", splashAudioPreviewUrl: typeof src.splashAudioPreviewUrl === "string" ? src.splashAudioPreviewUrl : "", splashAudioVolume: typeof src.splashAudioVolume === "number" ? Math.max(0, Math.min(1, src.splashAudioVolume)) : 0.5, splashAudioDuration: typeof src.splashAudioDuration === "number" && src.splashAudioDuration > 0 ? src.splashAudioDuration : 3 };
  for (const type of ICON_TYPES) {
    s[`${type}IconPath`] = typeof src[`${type}IconPath`] === "string" ? src[`${type}IconPath`] : "";
    s[`${type}RelativePath`] = typeof src[`${type}RelativePath`] === "string" ? src[`${type}RelativePath`] : "";
    s[`${type}PreviewUrl`] = typeof src[`${type}PreviewUrl`] === "string" ? src[`${type}PreviewUrl`] : "";
  }
  return s;
};

let splashOverlay = null;
let splashTimer = null;
let splashCssDispose = null;
let splashObserverDispose = null;
let splashAudio = null;
let splashAudioTimer = null;

const removeSplash = () => {
  if (splashTimer) { clearTimeout(splashTimer); splashTimer = null; }
  if (splashOverlay) {
    splashOverlay.style.transition = "opacity 0.2s ease-out";
    splashOverlay.style.opacity = "0";
    const el = splashOverlay;
    setTimeout(() => el.remove(), 250);
    splashOverlay = null;
  }
};

const removeSplashCss = () => {
  if (splashCssDispose) { splashCssDispose(); splashCssDispose = null; }
};

const stopSplashAudio = () => {
  if (splashAudioTimer) { clearTimeout(splashAudioTimer); splashAudioTimer = null; }
  if (splashAudio) {
    try { splashAudio.pause(); splashAudio.currentTime = 0; } catch {}
    splashAudio = null;
  }
};

const playSplashAudio = async (ctx, settings) => {
  stopSplashAudio();
  if (!settings.splashAudioEnabled || !settings.splashAudioPath) return;
  try {
    const ext = getExt(settings.splashAudioPath);
    const mime = getAudioMime(ext);
    const result = await ctx.fs.readFileBytes(settings.splashAudioPath, { maxBytes: 10 * 1024 * 1024 });
    if (!result?.ok) return;
    const url = bufferToDataUrl(result.data, mime);
    if (!url) return;
    splashAudio = new Audio(url);
    splashAudio.volume = settings.splashAudioVolume;
    splashAudio.play().catch(() => {});
    const duration = Math.max(0.5, Number(settings.splashAudioDuration) || 3) * 1000;
    splashAudioTimer = setTimeout(() => { stopSplashAudio(); }, duration);
  } catch {}
};

const cloneLogoToOverlay = (settings) => {
  if (!splashOverlay) return;
  splashOverlay.querySelectorAll(".splash-logo-clone").forEach((el) => el.remove());
  const lv = document.querySelector(".loading-view");
  if (!lv) return;
  const main = lv.querySelector("main");
  if (main) {
    const clone = main.cloneNode(true);
    clone.classList.add("splash-logo-clone");
    clone.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:1;";
    if (!settings.splashShowLogo) {
      const logoDiv = clone.querySelector(":scope > div");
      if (logoDiv) logoDiv.style.display = "none";
    }
    splashOverlay.appendChild(clone);
  }
  const footer = lv.querySelector("footer");
  if (footer) {
    const clone = footer.cloneNode(true);
    clone.classList.add("splash-logo-clone");
    clone.style.cssText = "position:absolute;bottom:40px;left:0;right:0;pointer-events:none;z-index:1;";
    splashOverlay.appendChild(clone);
  }
};

const resolveImageUrl = async (ctx, filePath) => {
  if (!filePath || !/\.gif$/i.test(filePath)) return "";
  try {
    const r = await ctx.fs.getFileUrl(filePath);
    if (r.ok && r.url) return r.url;
  } catch {}
  return `file://${filePath.replace(/\\/g, "/")}`;
};

const applySplashCss = async (ctx, settings) => {
  removeSplashCss();
  if (!settings.splashEnabled || !settings.splashImagePath || !settings.splashPreviewUrl) return;
  const isGif = isGifPath(settings.splashImagePath);
  let url = settings.splashPreviewUrl;
  if (isGif) url = await resolveImageUrl(ctx, settings.splashImagePath) || url;
  const sizeRule = settings.splashScale === "contain" ? "contain" : settings.splashScale === "fill" ? "100% 100%" : "cover";
  const blurRule = settings.splashBlurAmount > 0 ? `.custom-splash-img{filter:blur(${settings.splashBlurAmount}px)!important}` : "";
  const overlayRule = settings.splashOverlayOpacity > 0 ? `.loading-view::after{content:''!important;position:absolute!important;inset:0!important;background:${settings.splashOverlayColor}!important;opacity:${settings.splashOverlayOpacity}!important;z-index:1!important;pointer-events:none!important}` : "";
  const bgRule = `background-image:url("${url}")!important;background-size:${sizeRule}!important;background-position:center center!important;background-repeat:no-repeat!important;`;
  const logoRule = ".loading-view main>div{opacity:0!important}";
  const css = `.loading-view{${bgRule}${settings.splashBgColor ? `background-color:${settings.splashBgColor}!important;` : ""}}${logoRule}${blurRule}${overlayRule}`;
  splashCssDispose = ctx.css.inject(css, { id: "custom-splash-css" });
};

const showSplash = async (ctx, settings) => {
  removeSplash();
  if (!settings.splashImagePath || !settings.splashPreviewUrl) return;
  const duration = Math.max(0.5, Number(settings.splashDuration) || 3) * 1000;
  const isGif = isGifPath(settings.splashImagePath);
  let url = settings.splashPreviewUrl;
  if (isGif) url = await resolveImageUrl(ctx, settings.splashImagePath) || url;

  const lv = document.querySelector(".loading-view");
  if (lv && !lv.querySelector(".custom-splash-img")) {
    const fit = "cover";
    const img = document.createElement("img");
    img.className = "custom-splash-img";
    img.src = url;
    img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};z-index:0;pointer-events:none;`;
    lv.prepend(img);
    lv.style.setProperty("background-image", `url("${url}")`, "important");
  }

  const overlay = document.createElement("div");
  overlay.setAttribute("data-custom-splash", "true");
  const blurRule = settings.splashBlurAmount > 0 ? `filter:blur(${settings.splashBlurAmount}px);` : "";
  Object.assign(overlay.style, {
    position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
    zIndex: "2147483647", background: `url("${url}") center/cover no-repeat`,
    backgroundColor: settings.splashBgColor || "#000", opacity: "0", transition: "opacity 0.2s ease-out", pointerEvents: "none",
    ...(blurRule ? { filter: blurRule } : {}),
  });
  if (settings.splashOverlayOpacity > 0) {
    const ol = document.createElement("div");
    Object.assign(ol.style, {
      position: "absolute", inset: "0", background: settings.splashOverlayColor,
      opacity: String(settings.splashOverlayOpacity), pointerEvents: "none",
    });
    overlay.appendChild(ol);
  }
  document.body.appendChild(overlay);
  splashOverlay = overlay;
  cloneLogoToOverlay(settings);
  setTimeout(() => { if (splashOverlay) splashOverlay.style.opacity = "1"; }, 50);
  splashTimer = setTimeout(removeSplash, duration);
};

const createSplashObserver = (ctx) => {
  return ctx.dom.observe(".loading-view", async (element) => {
    const s = state?.settings;
    if (!s?.splashEnabled || !s?.splashImagePath || !s?.splashPreviewUrl) return;
    if (element.querySelector(".custom-splash-img")) return;
    let url = s.splashPreviewUrl;
    if (isGifPath(s.splashImagePath)) url = await resolveImageUrl(ctx, s.splashImagePath) || url;
    const fit = "cover";
    const img = document.createElement("img");
    img.className = "custom-splash-img";
    img.src = url;
    img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};z-index:0;pointer-events:none;`;
    element.prepend(img);
    element.style.setProperty("background-image", `url("${url}")`, "important");

    const main = element.querySelector("main");
    if (main) {
      const logoBox = main.querySelector("div");
      if (logoBox && logoBox.querySelector("span")) {
        const desktopPath = s.desktopIconPath || s.trayIconPath || "";
        if (desktopPath) {
          logoBox.innerHTML = "";
          const logoImg = document.createElement("img");
          logoImg.src = `file:///${desktopPath.replace(/\\/g, "/")}`;
          logoImg.style.cssText = "width:100%;height:100%;object-fit:contain;border-radius:inherit;";
          logoImg.onerror = () => { logoBox.innerHTML = '<span style="font-size:24px;font-weight:700">Echo</span><span style="font-size:16px;font-weight:700;color:var(--color-primary)">MUSIC</span>'; };
          logoBox.appendChild(logoImg);
          logoBox.style.background = "none";
          logoBox.style.border = "none";
        }
      }
      cloneLogoToOverlay(s);
    }
  });
};

const deleteFile = async (ctx, relativePath) => {
  if (!relativePath) return;
  try {
    await ctx.fs.deleteFile(relativePath);
  } catch {}
};

const readIconFile = async (ctx, filePath, title, filters, maxBytes) => {
  try {
    const result = await ctx.dialog.selectFiles({ title, buttonLabel: "使用此图片", filters });
    const path = result?.paths?.[0] || "";
    if (result?.canceled || !path) return null;
    const source = await ctx.fs.readFileBytes(path, { maxBytes });
    if (!source?.ok) { ctx.toast.warning(`无法读取选择的图片（超过 ${Math.round(maxBytes / 1024 / 1024)}MB 或文件不可访问）`); return null; }
    const ext = getExt(path.split(/[\\/]/).pop() || "");
    const folder = filePath === "splash" ? "assets/images" : "assets/icons";
    const destName = getFileName(path);
    const destPath = `${folder}/${destName}`;
    const writeResult = await ctx.fs.writeFile(destPath, source.data, { overwrite: true });
    if (!writeResult?.ok) { ctx.toast.warning(`图片保存失败: ${writeResult?.error || "未知错误"}`); return null; }
    return { relativePath: destPath, absolutePath: writeResult.path || "", previewUrl: bufferToDataUrl(source.data, getMime(ext)), ext: ext || "png" };
  } catch (e) { ctx.toast.warning(e instanceof Error ? e.message : "图片选择失败"); return null; }
};

const readAudioFile = async (ctx, filePath, title, filters, maxBytes) => {
  try {
    const result = await ctx.dialog.selectFiles({ title, buttonLabel: "使用此音效", filters });
    const path = result?.paths?.[0] || "";
    if (result?.canceled || !path) return null;
    const source = await ctx.fs.readFileBytes(path, { maxBytes });
    if (!source?.ok) { ctx.toast.warning(`无法读取选择的音效（超过 ${Math.round(maxBytes / 1024 / 1024)}MB 或文件不可访问）`); return null; }
    const ext = getExt(path.split(/[\\/]/).pop() || "");
    const destName = getFileName(path);
    const destPath = `assets/audio/${destName}`;
    const writeResult = await ctx.fs.writeFile(destPath, source.data, { overwrite: true });
    if (!writeResult?.ok) { ctx.toast.warning(`音效保存失败: ${writeResult?.error || "未知错误"}`); return null; }
    const mime = getAudioMime(ext);
    return { relativePath: destPath, absolutePath: writeResult.path || "", previewUrl: bufferToDataUrl(source.data, mime), ext: ext || "mp3" };
  } catch (e) { ctx.toast.warning(e instanceof Error ? e.message : "音效选择失败"); return null; }
};

const saveIconStorage = async (ctx, settings) => {
  await ctx.storage.set("appIcons", { trayIconPath: settings.trayIconPath || "", taskbarIconPath: settings.taskbarIconPath || "", desktopIconPath: settings.desktopIconPath || "" });
};

const clearAllIconStorage = async (ctx) => {
  await ctx.storage.set("appIcons", "");
};

const createShortcutsUpdater = (ctx) => async (mode, iconPath, taskbarIconPath) => {
  try {
    if (mode === "reset") {
      const desktopResult = await ctx.appIcons.restoreDefaultDesktopIcon();
      if (!ctx.process?.launch) return { ok: desktopResult?.ok !== false };
      const args = ["shortcuts", "--mode", "reset", "--appName", "EchoMusic"];
      await ctx.process.launch({ executable: "Tool.exe", args });
      return { ok: desktopResult?.ok !== false };
    }
    if (!ctx.process?.launch) return { ok: false, error: "插件进程能力不可用" };
    const args = ["shortcuts", "--mode", "custom", "--appName", "EchoMusic"];
    if (iconPath) args.push("--iconPath", iconPath);
    if (taskbarIconPath) args.push("--taskbarIconPath", taskbarIconPath);
    return await ctx.process.launch({ executable: "Tool.exe", args });
  } catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) }; }
};

const PREVIEW_LABELS = { tray: "托盘图标预览", taskbar: "任务栏图标预览", desktop: "桌面快捷方式图标预览" };

const createSettingsComponent = (ctx) =>
  ctx.vue.defineComponent({
    name: "CustomIconSettings",
    setup() {
      const { h, reactive, ref, watch, onBeforeUnmount, defineAsyncComponent } = ctx.vue;
      const Button = defineAsyncComponent(ctx.ui.components.Button);
      const Switch = defineAsyncComponent(ctx.ui.components.Switch);
      const Select = defineAsyncComponent(ctx.ui.components.Select);
      const draft = reactive(normalizeSettings(state?.settings));
      const initialSettings = { ...normalizeSettings(state?.settings) };
      const saving = ref(false);
      const message = ref("");
      const statusText = ref("");
      const statusType = ref("");
      const lastSelectedKey = ref("");
      const activeTab = ref("icons");
      const resolvedSplashUrl = ref("");

      const refreshSplashUrl = async () => {
        if (draft.splashImagePath) {
          resolvedSplashUrl.value = await resolveImageUrl(ctx, draft.splashImagePath) || draft.splashPreviewUrl;
        } else {
          resolvedSplashUrl.value = "";
        }
      };

      watch(() => draft.splashImagePath, refreshSplashUrl);
      refreshSplashUrl();

      let previewAudioPlayer = null;
      const isPreviewPlaying = ref(false);

      const stopPreviewAudio = () => {
        if (previewAudioPlayer) {
          try { previewAudioPlayer.pause(); previewAudioPlayer.currentTime = 0; } catch {}
          previewAudioPlayer = null;
        }
        isPreviewPlaying.value = false;
      };

      watch(() => activeTab.value, (tab) => { if (tab !== "audio") stopPreviewAudio(); });

      onBeforeUnmount(() => {
        stopPreviewAudio();
        const keys = [
          ["trayIconPath", "trayRelativePath"],
          ["taskbarIconPath", "taskbarRelativePath"],
          ["desktopIconPath", "desktopRelativePath"],
          ["splashImagePath", "splashRelativePath"],
          ["splashAudioPath", "splashAudioRelativePath"],
        ];
        for (const [pathKey, relKey] of keys) {
          const initial = initialSettings[relKey] || "";
          const current = draft[relKey] || "";
          if (current && current !== initial) deleteFile(ctx, current);
        }
      });

      watch(() => state?.settings, (s) => {
        if (!s) return;
        const u = normalizeSettings(s);
        Object.assign(draft, u);
        if (!lastSelectedKey.value) {
          if (u.taskbarPreviewUrl) lastSelectedKey.value = "taskbar";
          else if (u.trayPreviewUrl) lastSelectedKey.value = "tray";
          else if (u.desktopPreviewUrl) lastSelectedKey.value = "desktop";
        }
      }, { deep: true });

      const setVal = (k, v) => { draft[k] = v; message.value = ""; statusText.value = ""; statusType.value = ""; };

      const handleSelectIcon = async (key) => {
        const oldPath = draft[`${key}RelativePath`] || "";
        const r = await readIconFile(ctx, key, key === "tray" ? "选择托盘图标图片" : key === "taskbar" ? "选择任务栏图标（推荐 .ico 格式）" : "选择桌面快捷方式图标（推荐 .ico 格式）", SHORTCUT_TYPES.has(key) ? ICO_FILTERS : IMAGE_FILTERS, 2 * 1024 * 1024);
        if (r) {
          if (oldPath) await deleteFile(ctx, oldPath);
          setVal(`${key}IconPath`, r.absolutePath || r.relativePath);
          setVal(`${key}RelativePath`, r.relativePath);
          setVal(`${key}PreviewUrl`, r.previewUrl);
          lastSelectedKey.value = key;
        }
      };

      const handleClearIcon = async (key) => { const p = draft[`${key}RelativePath`] || ""; setVal(`${key}IconPath`, ""); setVal(`${key}RelativePath`, ""); setVal(`${key}PreviewUrl`, ""); if (p) await deleteFile(ctx, p); };

      const handleSelectSplash = async () => {
        const oldPath = draft.splashRelativePath || "";
        const r = await readIconFile(ctx, "splash", "选择启动画面图片", IMAGE_FILTERS, 10 * 1024 * 1024);
        if (r) {
          if (oldPath) await deleteFile(ctx, oldPath);
          setVal("splashImagePath", r.absolutePath || r.relativePath);
          setVal("splashRelativePath", r.relativePath);
          setVal("splashPreviewUrl", r.previewUrl);
        }
      };

      const handleClearSplash = async () => { const p = draft.splashRelativePath || ""; setVal("splashImagePath", ""); setVal("splashRelativePath", ""); setVal("splashPreviewUrl", ""); if (p) await deleteFile(ctx, p); };

      const updateShortcuts = createShortcutsUpdater(ctx);

      const updateInitialSettings = () => {
        initialSettings.trayIconPath = draft.trayIconPath;
        initialSettings.trayRelativePath = draft.trayRelativePath;
        initialSettings.taskbarIconPath = draft.taskbarIconPath;
        initialSettings.taskbarRelativePath = draft.taskbarRelativePath;
        initialSettings.desktopIconPath = draft.desktopIconPath;
        initialSettings.desktopRelativePath = draft.desktopRelativePath;
        initialSettings.splashImagePath = draft.splashImagePath;
        initialSettings.splashRelativePath = draft.splashRelativePath;
        initialSettings.splashAudioPath = draft.splashAudioPath;
        initialSettings.splashAudioRelativePath = draft.splashAudioRelativePath;
      };

      const saveIconSettings = async () => {
        if (saving.value) return;
        saving.value = true; message.value = ""; statusText.value = ""; statusType.value = "";
        try {
          const s = normalizeSettings(draft);
          const oldTray = state?.settings?.trayIconPath || "";
          Object.assign(draft, s);
          await ctx.storage.set(SETTINGS_KEY, s);
          if (state) state.settings = s;
          const hasIcon = s.enabled && (s.trayIconPath || s.taskbarIconPath || s.desktopIconPath);
          if (hasIcon) await saveIconStorage(ctx, s); else await clearAllIconStorage(ctx);
          const trayChanged = s.trayIconPath !== oldTray;
          if (trayChanged) await ctx.appIcons.refresh();
          const scMode = (!s.desktopIconPath && !s.taskbarIconPath) ? "reset" : "custom";
          const scResult = await updateShortcuts(scMode, scMode === "custom" ? s.desktopIconPath : null, scMode === "custom" ? s.taskbarIconPath : null);
          const parts = [];
          if (trayChanged) parts.push(s.trayIconPath ? "托盘: 已应用" : "托盘: 已恢复");
          if (s.taskbarIconPath) parts.push("窗口标题栏: 已应用");
          if (s.desktopIconPath) { if (scResult?.ok) parts.push("桌面快捷方式: 已更新"); else parts.push("桌面快捷方式: 未生效"); }
          if (scResult?.ok) parts.push("任务栏快捷方式: 已更新");
          statusText.value = parts.join(" | ");
          message.value = "图标设置已保存";
          statusType.value = "success";
          lastSelectedKey.value = "";
          ctx.toast.success("图标设置已保存");
          updateInitialSettings();
        } catch (e) { const t = e instanceof Error ? e.message : "保存失败"; message.value = t; statusType.value = "error"; statusText.value = t; ctx.toast.warning(t); }
        finally { saving.value = false; }
      };

      const resetIconSettings = async () => {
        if (saving.value) return;
        saving.value = true; message.value = ""; statusText.value = ""; statusType.value = "";
        try {
          const oldTray = state?.settings?.trayIconPath || "";
          for (const key of ICON_TYPES) { const p = draft[`${key}RelativePath`] || ""; if (p) await deleteFile(ctx, p); }
          const s = buildSettingsFromDraft(draft, {
            enabled: true,
            trayIconPath: "", trayRelativePath: "", trayPreviewUrl: "",
            taskbarIconPath: "", taskbarRelativePath: "", taskbarPreviewUrl: "",
            desktopIconPath: "", desktopRelativePath: "", desktopPreviewUrl: "",
          });
          Object.assign(draft, s);
          await ctx.storage.set(SETTINGS_KEY, s);
          if (state) state.settings = s;
          await clearAllIconStorage(ctx);
          if (oldTray) await ctx.appIcons.refresh();
          await updateShortcuts("reset", null, null);
          statusText.value = "托盘: 已恢复 | 窗口标题栏: 已恢复";
          message.value = "已恢复默认图标";
          statusType.value = "success";
          lastSelectedKey.value = "";
          ctx.toast.success("已恢复默认图标");
          updateInitialSettings();
        } catch (e) { const t = e instanceof Error ? e.message : "恢复失败"; message.value = t; statusType.value = "error"; statusText.value = t; ctx.toast.warning(t); }
        finally { saving.value = false; }
      };

      const saveSplashSettings = async () => {
        if (saving.value) return;
        saving.value = true; message.value = ""; statusText.value = ""; statusType.value = "";
        try {
          const s = normalizeSettings(draft);
          Object.assign(draft, s);
          await ctx.storage.set(SETTINGS_KEY, s);
          if (state) state.settings = s;
          if (s.splashEnabled) {
            applySplashCss(ctx, s);
          } else {
            removeSplashCss();
          }
          statusText.value = s.splashImagePath ? "启动画面: 已应用" : "启动画面: 已清除";
          message.value = "启动画面设置已保存";
          statusType.value = "success";
          ctx.toast.success("启动画面设置已保存");
          updateInitialSettings();
        } catch (e) { const t = e instanceof Error ? e.message : "保存失败"; message.value = t; statusType.value = "error"; statusText.value = t; ctx.toast.warning(t); }
        finally { saving.value = false; }
      };

      const resetSplashSettings = async () => {
        if (saving.value) return;
        saving.value = true; message.value = ""; statusText.value = ""; statusType.value = "";
        try {
          const p = draft.splashRelativePath || "";
          const s = buildSettingsFromDraft(draft, {
            splashImagePath: "", splashRelativePath: "", splashPreviewUrl: "",
          });
          Object.assign(draft, s);
          await ctx.storage.set(SETTINGS_KEY, s);
          if (state) state.settings = s;
          if (p) await deleteFile(ctx, p);
          removeSplashCss();
          resolvedSplashUrl.value = "";
          statusText.value = "启动画面: 已恢复默认";
          message.value = "已恢复默认启动画面";
          statusType.value = "success";
          ctx.toast.success("已恢复默认启动画面");
          updateInitialSettings();
        } catch (e) { const t = e instanceof Error ? e.message : "恢复失败"; message.value = t; statusType.value = "error"; statusText.value = t; ctx.toast.warning(t); }
        finally { saving.value = false; }
      };

      const handleSelectAudio = async () => {
        const oldPath = draft.splashAudioRelativePath || "";
        const r = await readAudioFile(ctx, "splash-audio", "选择启动音效", AUDIO_FILTERS, 10 * 1024 * 1024);
        if (r) {
          if (oldPath) await deleteFile(ctx, oldPath);
          setVal("splashAudioPath", r.absolutePath || r.relativePath);
          setVal("splashAudioRelativePath", r.relativePath);
          setVal("splashAudioPreviewUrl", r.previewUrl);
        }
      };

      const handleClearAudio = async () => { const p = draft.splashAudioRelativePath || ""; setVal("splashAudioPath", ""); setVal("splashAudioRelativePath", ""); setVal("splashAudioPreviewUrl", ""); if (p) await deleteFile(ctx, p); };

      const previewAudio = async () => {
        if (isPreviewPlaying.value) {
          stopPreviewAudio();
          return;
        }
        if (!draft.splashAudioPath) return;
        try {
          const ext = getExt(draft.splashAudioPath);
          let url = draft.splashAudioPreviewUrl;
          if (!url) {
            const mime = getAudioMime(ext);
            const result = await ctx.fs.readFileBytes(draft.splashAudioPath, { maxBytes: 10 * 1024 * 1024 });
            if (result?.ok) url = bufferToDataUrl(result.data, mime);
          }
          if (!url) return;
          previewAudioPlayer = new Audio(url);
          previewAudioPlayer.volume = draft.splashAudioVolume;
          previewAudioPlayer.onended = () => { isPreviewPlaying.value = false; previewAudioPlayer = null; };
          previewAudioPlayer.play().catch(() => {});
          isPreviewPlaying.value = true;
        } catch {}
      };

      const saveAudioSettings = async () => {
        if (saving.value) return;
        saving.value = true; message.value = ""; statusText.value = ""; statusType.value = "";
        stopPreviewAudio();
        try {
          const s = normalizeSettings(draft);
          Object.assign(draft, s);
          await ctx.storage.set(SETTINGS_KEY, s);
          if (state) state.settings = s;
          statusText.value = s.splashAudioPath ? "启动音效: 已应用" : "启动音效: 已清除";
          message.value = "启动音效设置已保存";
          statusType.value = "success";
          ctx.toast.success("启动音效设置已保存");
          updateInitialSettings();
        } catch (e) { const t = e instanceof Error ? e.message : "保存失败"; message.value = t; statusType.value = "error"; statusText.value = t; ctx.toast.warning(t); }
        finally { saving.value = false; }
      };

      const resetAudioSettings = async () => {
        if (saving.value) return;
        saving.value = true; message.value = ""; statusText.value = ""; statusType.value = "";
        stopPreviewAudio();
        try {
          const p = draft.splashAudioRelativePath || "";
          const s = buildSettingsFromDraft(draft, {
            splashAudioPath: "", splashAudioRelativePath: "", splashAudioPreviewUrl: "",
          });
          Object.assign(draft, s);
          await ctx.storage.set(SETTINGS_KEY, s);
          if (state) state.settings = s;
          if (p) await deleteFile(ctx, p);
          statusText.value = "启动音效: 已恢复默认";
          message.value = "已恢复默认启动音效";
          statusType.value = "success";
          ctx.toast.success("已恢复默认启动音效");
          updateInitialSettings();
        } catch (e) { const t = e instanceof Error ? e.message : "恢复失败"; message.value = t; statusType.value = "error"; statusText.value = t; ctx.toast.warning(t); }
        finally { saving.value = false; }
      };

      const renderBtn = (label, props = {}) => h(Button, props, { default: () => label });

      const renderIconRow = (key, label, desc) => {
        const fp = draft[`${key}IconPath`] || "";
        return h("div", { class: "custom-icon-section" }, [
          h("div", { class: "custom-icon-section-heading" }, [h("div", { class: "custom-icon-section-copy" }, [h("h3", label), h("small", desc)])]),
          h("div", { class: "custom-icon-path-row" }, [
            h("div", { class: "custom-icon-path-value", title: fp || "未选择图标" }, fp ? getFileName(fp) : "未选择图标"),
            renderBtn("选择", { variant: "outline", size: "xs", onClick: () => handleSelectIcon(key) }),
            fp ? renderBtn("清除", { variant: "ghost", size: "xs", onClick: () => handleClearIcon(key) }) : null,
          ]),
        ]);
      };

      const renderStatus = () => statusText.value ? h("div", { class: `custom-icon-applied-result ${statusType.value || "warning"}` }, statusText.value) : null;

      const getActivePreview = () => {
        const key = lastSelectedKey.value && draft[`${lastSelectedKey.value}PreviewUrl`] ? lastSelectedKey.value : ICON_TYPES.find((t) => draft[`${t}PreviewUrl`]) || "";
        return { url: key ? draft[`${key}PreviewUrl`] : "", label: key ? PREVIEW_LABELS[key] : "自定义图标" };
      };

      const renderTabBar = () => h("div", { class: "custom-icon-tabs" }, [
        h("button", { class: ["custom-icon-tab", activeTab.value === "icons" ? "is-active" : ""], onClick: () => { stopPreviewAudio(); activeTab.value = "icons"; message.value = ""; statusText.value = ""; statusType.value = ""; } }, "图标"),
        h("button", { class: ["custom-icon-tab", activeTab.value === "splash" ? "is-active" : ""], onClick: () => { stopPreviewAudio(); activeTab.value = "splash"; message.value = ""; statusText.value = ""; statusType.value = ""; } }, "启动画面"),
        h("button", { class: ["custom-icon-tab", activeTab.value === "audio" ? "is-active" : ""], onClick: () => { activeTab.value = "audio"; message.value = ""; statusText.value = ""; statusType.value = ""; } }, "启动音效"),
      ]);

      const renderIconPreview = () => {
        const preview = getActivePreview();
        return h("aside", { class: "custom-icon-preview-panel" }, [
          h("div", { class: "custom-icon-preview-box" }, [
            preview.url ? h("img", { src: preview.url, alt: "自定义图标预览" }) : h("div", { class: "custom-icon-preview-empty" }, "选择图标后在此预览"),
          ]),
          h("div", { class: "custom-icon-preview-meta" }, [
            h("small", "支持 .png/.ico/.jpg/.webp/.bmp"),
            h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));margin-top:2px" }, "桌面/任务栏快捷方式推荐使用 .ico"),
          ]),
          renderStatus(),
        ]);
      };

      const renderSplashPreview = () => h("div", { style: "margin-bottom:14px" }, [
        h("div", { class: "custom-icon-preview-box wide" }, [
          resolvedSplashUrl.value ? h("img", { src: resolvedSplashUrl.value, alt: "启动画面预览" }) : h("div", { class: "custom-icon-preview-empty", innerHTML: "选择图片后在此预览<br>支持 .png/.jpg/.webp/.gif/.bmp<br>启动画面中的部分功能来自群友@小栀（rinnki）" }),
        ]),
        renderStatus(),
      ]);

      const renderIconTab = () => [
        h("div", { class: "custom-icon-section" }, [
          h("div", { class: "custom-icon-switch-row" }, [
            h("div", { class: "custom-icon-switch-copy" }, [h("span", "开启自定义图标"), h("small", "关闭后恢复应用默认图标")]),
            h(Switch, { modelValue: draft.enabled, loading: saving.value, disabled: saving.value, "onUpdate:modelValue": (v) => { if (Boolean(v) !== draft.enabled) { if (!v) { draft.enabled = false; saveIconSettings(); } else setVal("enabled", true); } } }),
          ]),
        ]),
        renderIconRow("tray", "托盘图标", "系统托盘区域显示的图标（.png/.ico 均可）"),
        renderIconRow("taskbar", "任务栏图标以及标题栏图标", "任务栏图标以及窗口左上角显示的图标（.ico格式效果最佳。任务栏图标必须固定，否则会失效）"),
        renderIconRow("desktop", "桌面快捷方式图标", "桌面快捷方式 .lnk 指向的图标（必须使用 .ico 格式）"),
        h("div", { class: "custom-icon-footer" }, [
          renderBtn("恢复默认", { variant: "ghost", size: "xs", disabled: saving.value, onClick: resetIconSettings }),
          renderBtn(saving.value ? "保存中..." : "保存", { variant: "primary", size: "xs", loading: saving.value, disabled: saving.value, onClick: saveIconSettings }),
          message.value ? h("span", { class: "custom-icon-message" }, message.value) : null,
        ]),
      ];

      const renderSplashTab = () => [
        renderSplashPreview(),
        h("div", { class: "custom-icon-section" }, [
          h("div", { class: "custom-icon-switch-row" }, [
            h("div", { class: "custom-icon-switch-copy" }, [h("span", "开启自定义启动画面"), h("small", "关闭后恢复应用默认启动画面")]),
            h(Switch, { modelValue: draft.splashEnabled, loading: saving.value, disabled: saving.value, "onUpdate:modelValue": (v) => { if (Boolean(v) !== draft.splashEnabled) { if (!v) { draft.splashEnabled = false; saveSplashSettings(); } else setVal("splashEnabled", true); } } }),
          ]),
        ]),
        h("div", { class: "custom-icon-section" }, [
          h("div", { class: "custom-icon-section-heading" }, [h("div", { class: "custom-icon-section-copy" }, [h("h3", "启动画面"), h("small", "替换应用启动画面为自定义图片")])]),
          h("div", { class: "custom-icon-path-row" }, [
            h("div", { class: "custom-icon-path-value", title: draft.splashImagePath || "未选择图片" }, draft.splashImagePath ? getFileName(draft.splashImagePath) : "未选择图片"),
            renderBtn("选择", { variant: "outline", size: "xs", onClick: handleSelectSplash }),
            draft.splashImagePath ? renderBtn("清除", { variant: "ghost", size: "xs", onClick: handleClearSplash }) : null,
          ]),
          isGifPath(draft.splashImagePath)
            ? h("div", { class: "custom-icon-field" }, [
                h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));font-size:11px;line-height:1.5" }, "由于软件限制，启动画面 GIF 只能显示约1秒，无法完整播放动画。"),
              ])
            : h("div", { class: "custom-icon-field" }, [
                h("div", { class: "custom-icon-field-label" }, "显示时长（秒）"),
                h("input", { type: "number", min: "0.5", max: "30", step: "0.5", value: draft.splashDuration, style: "width:80px;padding:6px 8px;border:1px solid color-mix(in srgb,var(--color-text-main,#f8fafc) 12%,transparent);border-radius:6px;background:transparent;color:var(--color-text-main,var(--text-main,#f8fafc));font-size:12px;outline:none", onInput: (e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setVal("splashDuration", v); } }),
                h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));font-size:11px;line-height:1.5" }, "0.5~30秒，默认3秒"),
              ]),
          h("div", { class: "custom-icon-field" }, [
            h("div", { class: "custom-icon-switch-row" }, [
              h("div", { class: "custom-icon-switch-copy" }, [h("span", "显示 LOGO"), h("small", "关闭后隐藏加载页面底部的品牌标识")]),
              h(Switch, { modelValue: draft.splashShowLogo, loading: saving.value, disabled: saving.value, "onUpdate:modelValue": (v) => setVal("splashShowLogo", Boolean(v)) }),
            ]),
          ]),
        ]),
        h("div", { class: "custom-icon-section" }, [
          h("div", { class: "custom-icon-section-heading" }, [h("div", { class: "custom-icon-section-copy" }, [h("h3", "外观设置"), h("small", "调整启动画面的缩放、叠加层和模糊效果")])]),
            h("div", { class: "custom-icon-field" }, [
                h("div", { class: "custom-icon-field-label" }, "图片适配方式"),
                h(Select, {
                  modelValue: draft.splashScale,
                  options: [
                    { value: "cover", label: "裁剪铺满 (cover)" },
                    { value: "contain", label: "完整显示 (contain)" },
                    { value: "fill", label: "拉伸填充 (fill)" },
                  ],
                  "onUpdate:modelValue": (v) => setVal("splashScale", v),
                }),
          ]),
          h("div", { class: "custom-icon-field" }, [
            h("div", { class: "custom-icon-field-label" }, `暗化叠加层 (${Math.round(draft.splashOverlayOpacity * 100)}%)`),
            h("input", { type: "range", min: "0", max: "100", value: String(Math.round(draft.splashOverlayOpacity * 100)), onInput: (e) => setVal("splashOverlayOpacity", Number(e.target.value) / 100), style: "width:100%;accent-color:var(--color-primary,#31cfa1)" }),
          ]),
          h("div", { class: "custom-icon-field" }, [
            h("div", { class: "custom-icon-field-label" }, "叠加层颜色"),
            h("div", { style: "display:flex;gap:8px;align-items:center" }, [
              h("input", { type: "color", value: draft.splashOverlayColor, onInput: (e) => setVal("splashOverlayColor", e.target.value), style: "width:32px;height:32px;border:none;border-radius:4px;cursor:pointer;padding:0" }),
              h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));font-family:monospace" }, draft.splashOverlayColor),
            ]),
          ]),
          h("div", { class: "custom-icon-field" }, [
            h("div", { class: "custom-icon-field-label" }, `图片模糊 (${draft.splashBlurAmount}px)`),
            h("input", { type: "range", min: "0", max: "20", value: String(draft.splashBlurAmount), onInput: (e) => setVal("splashBlurAmount", Number(e.target.value)), style: "width:100%;accent-color:var(--color-primary,#31cfa1)" }),
          ]),
          h("div", { class: "custom-icon-field" }, [
            h("div", { class: "custom-icon-field-label" }, "兜底背景色"),
            h("div", { style: "display:flex;gap:8px;align-items:center" }, [
              h("input", { type: "color", value: draft.splashBgColor || "#ffffff", onInput: (e) => setVal("splashBgColor", e.target.value), style: "width:32px;height:32px;border:none;border-radius:4px;cursor:pointer;padding:0" }),
              h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));font-family:monospace" }, draft.splashBgColor || "未设置"),
              draft.splashBgColor ? renderBtn("清除", { variant: "ghost", size: "xs", onClick: () => setVal("splashBgColor", "") }) : null,
            ]),
           ]),
        ]),
        h("div", { class: "custom-icon-footer" }, [
          renderBtn("恢复默认", { variant: "ghost", size: "xs", disabled: saving.value, onClick: resetSplashSettings }),
          renderBtn(saving.value ? "保存中..." : "保存", { variant: "primary", size: "xs", loading: saving.value, disabled: saving.value, onClick: saveSplashSettings }),
          message.value ? h("span", { class: "custom-icon-message" }, message.value) : null,
        ]),
      ];

      const renderAudioTab = () => [
        renderStatus(),
        h("div", { class: "custom-icon-section" }, [
          h("div", { class: "custom-icon-switch-row" }, [
            h("div", { class: "custom-icon-switch-copy" }, [h("span", "开启自定义启动音效"), h("small", "关闭后不播放自定义音效")]),
            h(Switch, { modelValue: draft.splashAudioEnabled, loading: saving.value, disabled: saving.value, "onUpdate:modelValue": (v) => { if (Boolean(v) !== draft.splashAudioEnabled) { if (!v) { draft.splashAudioEnabled = false; saveAudioSettings(); } else setVal("splashAudioEnabled", true); } } }),
          ]),
        ]),
        h("div", { class: "custom-icon-section" }, [
          h("div", { class: "custom-icon-section-heading" }, [h("div", { class: "custom-icon-section-copy" }, [h("h3", "启动音效"), h("small", "应用启动时播放自定义音效")])]),
          h("div", { class: "custom-icon-path-row" }, [
            h("div", { class: "custom-icon-path-value", title: draft.splashAudioPath || "未选择音效" }, draft.splashAudioPath ? getFileName(draft.splashAudioPath) : "未选择音效"),
            renderBtn("选择", { variant: "outline", size: "xs", onClick: handleSelectAudio }),
            draft.splashAudioPath ? renderBtn("清除", { variant: "ghost", size: "xs", onClick: handleClearAudio }) : null,
          ]),
          h("div", { class: "custom-icon-field" }, [
            h("div", { class: "custom-icon-field-label" }, "播放音量"),
            h("div", { style: "display:flex;gap:8px;align-items:center" }, [
              h("input", { type: "range", min: "0", max: "100", value: String(Math.round(draft.splashAudioVolume * 100)), onInput: (e) => setVal("splashAudioVolume", Number(e.target.value) / 100), style: "width:100%;accent-color:var(--color-primary,#31cfa1)" }),
              h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));font-family:monospace;min-width:36px;text-align:right" }, `${Math.round(draft.splashAudioVolume * 100)}%`),
            ]),
          ]),
          h("div", { class: "custom-icon-field" }, [
            h("div", { class: "custom-icon-field-label" }, "播放时长（秒）"),
            h("div", { style: "display:flex;gap:8px;align-items:center" }, [
              h("input", { type: "number", min: "0.5", max: "30", step: "0.5", value: draft.splashAudioDuration, style: "width:80px;padding:6px 8px;border:1px solid color-mix(in srgb,var(--color-text-main,#f8fafc) 12%,transparent);border-radius:6px;background:transparent;color:var(--color-text-main,var(--text-main,#f8fafc));font-size:12px;outline:none", onInput: (e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setVal("splashAudioDuration", v); } }),
              h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));font-size:11px;line-height:1.5" }, "0.5~30秒，默认3秒"),
            ]),
            h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));font-size:11px;line-height:1.5" }, "如果启动音效播放不全请在此处增加播放时长"),
          ]),
          h("div", { class: "custom-icon-field" }, [
            h("small", { style: "color:var(--color-text-secondary,rgba(148,163,184,0.9));font-size:11px;line-height:1.5" }, "支持 .mp3/.wav/.ogg/.m4a/.flac/.aac/.wma 格式"),
          ]),
        ]),
        h("div", { class: "custom-icon-footer" }, [
          renderBtn("恢复默认", { variant: "ghost", size: "xs", disabled: saving.value, onClick: resetAudioSettings }),
          renderBtn(isPreviewPlaying.value ? "停止" : "试听", { variant: isPreviewPlaying.value ? "primary" : "outline", size: "xs", disabled: !draft.splashAudioPath, onClick: previewAudio }),
          renderBtn(saving.value ? "保存中..." : "保存", { variant: "primary", size: "xs", loading: saving.value, disabled: saving.value, onClick: saveAudioSettings }),
          message.value ? h("span", { class: "custom-icon-message" }, message.value) : null,
        ]),
      ];

      return () =>
        h("div", { class: ["custom-icon-settings", activeTab.value === "icons" ? "with-preview" : ""] }, [
          renderTabBar(),
          activeTab.value === "icons"
            ? [
                renderIconPreview(),
                h("div", { class: "custom-icon-settings-fields" }, [
                  ...renderIconTab(),
                ]),
              ]
            : activeTab.value === "splash"
              ? [
                  h("div", { class: "custom-icon-settings-fields" }, [
                    ...renderSplashTab(),
                  ]),
                ]
              : [
                  h("div", { class: "custom-icon-settings-fields" }, [
                    ...renderAudioTab(),
                  ]),
                ],
        ]);
    },
  });

const registerSettings = (ctx) => {
  settingsDispose?.();
  settingsStyleDispose?.();
  settingsStyleDispose = ctx.css.inject(SETTINGS_PANEL_CSS, { id: "custom-icon-settings" });
  settingsDispose = ctx.ui.settings.define({ title: "自定义图标", description: "自定义托盘图标、任务栏图标、桌面快捷方式图标、启动画面以及启动音效。", component: createSettingsComponent(ctx) });
};

export async function activate(ctx) {
  const loaded = await ctx.storage.get(SETTINGS_KEY);
  const normalized = normalizeSettings(loaded);

  if (!state) state = ctx.vue.reactive({ settings: normalized });
  else Object.assign(state.settings, normalized);

  if (normalized.enabled) {
    if (normalized.splashEnabled) {
      try {
        if (isGifPath(normalized.splashImagePath) && normalized.splashPreviewUrl && !normalized.splashPreviewUrl.startsWith("file://") && !normalized.splashPreviewUrl.startsWith("blob:")) {
          const resolved = await resolveImageUrl(ctx, normalized.splashImagePath);
          if (resolved) {
            state.settings.splashPreviewUrl = resolved;
            await ctx.storage.set(SETTINGS_KEY, { ...normalized, splashPreviewUrl: resolved });
          }
        }
        applySplashCss(ctx, state.settings);
        splashObserverDispose = createSplashObserver(ctx);
      } catch (e) { console.log("[custom-icon] splash setup error:", e); }
      if (document.querySelector(".loading-view") && state.settings.splashImagePath && state.settings.splashPreviewUrl) {
        showSplash(ctx, state.settings);
      }
    }
    if (state.settings.splashAudioEnabled && state.settings.splashAudioPath && document.querySelector(".loading-view")) {
      playSplashAudio(ctx, state.settings);
    }
  }

  registerSettings(ctx);

  if (state.settings.enabled) {
    const hasIcon = state.settings.trayIconPath || state.settings.taskbarIconPath || state.settings.desktopIconPath;
    if (hasIcon) await saveIconStorage(ctx, state.settings);
  } else {
    await clearAllIconStorage(ctx);
  }

  try { await ctx.appIcons.refresh(); } catch {}
}

export function deactivate() {
  settingsDispose?.(); settingsDispose = null;
  settingsStyleDispose?.(); settingsStyleDispose = null;
  removeSplash();
  removeSplashCss();
  stopSplashAudio();
  const lv = document.querySelector(".loading-view");
  if (lv) { const img = lv.querySelector(".custom-splash-img"); if (img) img.remove(); lv.style.removeProperty("background-image"); }
  splashObserverDispose?.(); splashObserverDispose = null;
  state = null;
}
