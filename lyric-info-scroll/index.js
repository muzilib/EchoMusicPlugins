const STORAGE_KEY = "settings";
const CHANNEL_NAME = "echo-plugin:lyric-info-scroll:settings";
const LYRIC_LOOKAHEAD_MS = 150;
const LYRIC_CLOCK_INTERVAL_MS = 80;

const DEFAULT_SETTINGS = {
  enabled: true,
  showMainPlayerBar: true,
  showMiniPlayer: true,
  showSecondary: false,
  showLoading: false,
  emptyText: "",
  scrollSpeed: 10,
  opacity: 78,
};

let state = null;
let settingsDispose = null;
let channel = null;
let applyingRemoteSettings = false;
let miniSnapshot = null;
let lyricClockTimer = null;
let mainPlaybackClock = {
  trackId: null,
  observedMs: -1,
  baseMs: 0,
  anchorMs: 0,
};

const mountedStrips = new Set();

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const normalizeSettings = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    enabled: source.enabled ?? DEFAULT_SETTINGS.enabled,
    showMainPlayerBar:
      source.showMainPlayerBar ?? DEFAULT_SETTINGS.showMainPlayerBar,
    showMiniPlayer: source.showMiniPlayer ?? DEFAULT_SETTINGS.showMiniPlayer,
    showSecondary: source.showSecondary ?? DEFAULT_SETTINGS.showSecondary,
    showLoading: source.showLoading ?? DEFAULT_SETTINGS.showLoading,
    emptyText:
      typeof source.emptyText === "string"
        ? source.emptyText
        : DEFAULT_SETTINGS.emptyText,
    scrollSpeed: clamp(
      source.scrollSpeed ?? DEFAULT_SETTINGS.scrollSpeed,
      5,
      24,
    ),
    opacity: clamp(source.opacity ?? DEFAULT_SETTINGS.opacity, 30, 100),
  };
};

const getLineSecondary = (line, settings) => {
  if (!settings.showSecondary || !line) return "";
  return String(line.translated || line.romanized || "").trim();
};

const getPreferredSecondary = (lyric, line, settings) => {
  if (!settings.showSecondary || !lyric || !line) return "";
  const translated = String(line.translated || "").trim();
  const romanized = String(line.romanized || "").trim();
  const wantsTranslation = lyric.wantTranslation && lyric.hasTranslation;
  const wantsRomanization = lyric.wantRomanization && lyric.hasRomanization;
  if (wantsTranslation && wantsRomanization) {
    return [translated, romanized].filter(Boolean).join(" / ");
  }
  if (wantsRomanization) return romanized || translated;
  if (wantsTranslation) return translated || romanized;
  return getLineSecondary(line, settings);
};

const joinLyricParts = (primary, secondary) =>
  [primary, secondary]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" / ");

const getLineStartMs = (line) => {
  const charStart = line?.characters?.[0]?.startTime;
  if (Number.isFinite(charStart)) return charStart;
  return Math.round((Number(line?.time) || 0) * 1000);
};

const calculateLineIndex = (lines, seekMs) => {
  if (!Array.isArray(lines) || lines.length === 0) return -1;
  let index = -1;
  let low = 0;
  let high = lines.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (seekMs >= getLineStartMs(lines[mid])) {
      index = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return index;
};

const getMainPlaybackSeekMs = (ctx) => {
  const player = ctx.stores.player;
  const now = Date.now();
  const trackId = String(player.currentTrackId ?? "");
  const observedMs = Math.max(0, Number(player.currentTime || 0) * 1000);

  if (
    mainPlaybackClock.trackId !== trackId ||
    Math.abs(observedMs - mainPlaybackClock.observedMs) > 1
  ) {
    mainPlaybackClock = {
      trackId,
      observedMs,
      baseMs: observedMs,
      anchorMs: now,
    };
  }

  if (!player.isPlaying) return observedMs;
  const playbackRate = Math.max(0.1, Number(player.playbackRate || 1));
  return (
    mainPlaybackClock.baseMs +
    Math.max(0, now - mainPlaybackClock.anchorMs) * playbackRate
  );
};

const getMiniPlaybackSeekMs = () => {
  const playback = miniSnapshot?.playback;
  if (!playback) return 0;
  const baseMs = Math.max(0, Number(playback.currentTime || 0) * 1000);
  if (!playback.isPlaying) return baseMs;
  const updatedAt = Number(playback.updatedAt || Date.now());
  const playbackRate = Math.max(0.1, Number(playback.playbackRate || 1));
  const elapsedMs = Math.max(0, Date.now() - updatedAt) * playbackRate;
  const durationMs = Math.max(0, Number(playback.duration || 0) * 1000);
  const seekMs = baseMs + elapsedMs;
  return durationMs > 0 ? Math.min(seekMs, durationMs) : seekMs;
};

const getMainActiveLine = (ctx) => {
  const lyric = ctx.stores.lyric;
  const lines = lyric.lines ?? [];
  const seekMs =
    getMainPlaybackSeekMs(ctx) +
    Number(lyric.currentTimeOffset || 0) +
    LYRIC_LOOKAHEAD_MS;
  const index = calculateLineIndex(lines, seekMs);
  if (index >= 0) return lines[index];
  return lyric.currentLine ?? null;
};

const getMiniActiveLine = () => {
  const lyric = miniSnapshot?.lyric;
  const lines = lyric?.lines ?? [];
  const playbackTrackId = miniSnapshot?.playback?.trackId ?? null;
  const lyricTrackId = lyric?.trackId ?? null;
  const canPredictByPlaybackTime =
    Boolean(playbackTrackId) &&
    (!lyricTrackId || lyricTrackId === playbackTrackId);

  if (canPredictByPlaybackTime) {
    const seekMs =
      getMiniPlaybackSeekMs() +
      Number(lyric?.timeOffset || 0) +
      LYRIC_LOOKAHEAD_MS;
    const index = calculateLineIndex(lines, seekMs);
    if (index >= 0) return lines[index];
  }

  if (lyric?.currentIndex >= 0) return lines[lyric.currentIndex] ?? null;
  return null;
};

const getMainLyricText = (ctx) => {
  const lyric = ctx.stores.lyric;
  const settings = state.settings;
  if (lyric.isLoading && settings.showLoading)
    return lyric.tips || "歌词加载中...";

  const line = getMainActiveLine(ctx);
  const primary = String(line?.text || "").trim();
  const secondary = getPreferredSecondary(lyric, line, settings);
  const text = joinLyricParts(primary, secondary);
  return text || settings.emptyText || "";
};

const getMiniSecondary = (lyric, line, settings) => {
  return getPreferredSecondary(lyric, line, settings);
};

const getMiniLyricText = () => {
  const settings = state.settings;
  const lyric = miniSnapshot?.lyric;
  if (!lyric) return settings.emptyText || "";
  if (lyric.isLoading && settings.showLoading)
    return lyric.tips || "歌词加载中...";

  const line = getMiniActiveLine();
  const primary = String(line?.text || "").trim();
  const secondary = getMiniSecondary(lyric, line, settings);
  return joinLyricParts(primary, secondary) || settings.emptyText || "";
};

const createStripElement = (kind) => {
  const element = document.createElement("div");
  element.className = `echo-lyric-info-strip echo-lyric-info-${kind}`;
  element.dataset.kind = kind;
  element.innerHTML = `<span class="echo-lyric-info-text"></span>`;
  return element;
};

const updateStripMarquee = (strip) => {
  const text = strip.querySelector(".echo-lyric-info-text");
  if (!text) return;
  window.requestAnimationFrame(() => {
    if (!state) return;
    const distance = Math.max(0, text.scrollWidth - strip.clientWidth + 24);
    strip.style.setProperty("--echo-lyric-distance", `${distance}px`);
    strip.classList.toggle("is-marquee", distance > 4);
    strip.style.setProperty(
      "--echo-lyric-duration",
      `${state.settings.scrollSpeed}s`,
    );
    strip.style.setProperty(
      "--echo-lyric-opacity",
      String(state.settings.opacity / 100),
    );
  });
};

const updateStripText = (strip, text, visible) => {
  const content = String(text || "").trim();
  const textElement = strip.querySelector(".echo-lyric-info-text");
  if (!textElement) return false;
  const previousContent = textElement.textContent || "";
  const previousActive = strip.dataset.active === "true";
  if (textElement.textContent !== content) textElement.textContent = content;
  const active = Boolean(visible && content);
  strip.dataset.active = active ? "true" : "false";
  strip.classList.toggle("is-empty", !content);
  strip.style.display = active ? "" : "none";
  if (previousContent !== content || previousActive !== active) {
    updateStripMarquee(strip);
  }
  return active;
};

const updateAllStrips = (ctx) => {
  if (!state) return;
  for (const strip of mountedStrips) {
    const kind = strip.dataset.kind;
    if (kind === "main") {
      const active = updateStripText(
        strip,
        getMainLyricText(ctx),
        state.settings.enabled && state.settings.showMainPlayerBar,
      );
      strip
        .closest(".echo-lyric-info-main-host")
        ?.classList.toggle("echo-lyric-info-active", active);
    } else {
      const active = updateStripText(
        strip,
        getMiniLyricText(),
        state.settings.enabled && state.settings.showMiniPlayer,
      );
      strip
        .closest(".mini-info")
        ?.classList.toggle("echo-lyric-info-active", active);
    }
  }
  syncLyricClockTimer(ctx);
};

const shouldRunLyricClock = (ctx) => {
  if (!state?.settings.enabled || mountedStrips.size === 0) return false;
  const isMini = ctx.router.currentRoute.value.name === "mini-player";
  if (isMini) {
    return Boolean(
      state.settings.showMiniPlayer && miniSnapshot?.playback?.isPlaying,
    );
  }
  return Boolean(
    state.settings.showMainPlayerBar && ctx.stores.player.isPlaying,
  );
};

const syncLyricClockTimer = (ctx) => {
  const shouldRun = shouldRunLyricClock(ctx);
  if (shouldRun && !lyricClockTimer) {
    lyricClockTimer = setInterval(
      () => updateAllStrips(ctx),
      LYRIC_CLOCK_INTERVAL_MS,
    );
    return;
  }
  if (!shouldRun && lyricClockTimer) {
    clearInterval(lyricClockTimer);
    lyricClockTimer = null;
  }
};

const mountMainStrip = (ctx, songInfoElement) => {
  const titleRow = songInfoElement.parentElement;
  if (!titleRow) return () => {};
  if (titleRow.querySelector(".echo-lyric-info-main")) return () => {};

  const strip = createStripElement("main");
  const openLyricView = () => ctx.stores.player.toggleLyricView?.(true);
  strip.addEventListener("click", openLyricView);
  titleRow.appendChild(strip);
  titleRow.classList.add("echo-lyric-info-main-host");
  mountedStrips.add(strip);
  updateAllStrips(ctx);

  return () => {
    mountedStrips.delete(strip);
    titleRow.classList.remove(
      "echo-lyric-info-main-host",
      "echo-lyric-info-active",
    );
    strip.removeEventListener("click", openLyricView);
    strip.remove();
  };
};

const mountMiniStrip = (ctx, miniInfoElement) => {
  if (miniInfoElement.querySelector(".echo-lyric-info-mini")) return () => {};

  const title = miniInfoElement.querySelector(".mini-title");
  const strip = createStripElement("mini");
  if (title?.nextSibling)
    miniInfoElement.insertBefore(strip, title.nextSibling);
  else miniInfoElement.appendChild(strip);
  miniInfoElement.classList.add("echo-lyric-info-mini-host");
  mountedStrips.add(strip);
  updateAllStrips(ctx);

  return () => {
    mountedStrips.delete(strip);
    miniInfoElement.classList.remove(
      "echo-lyric-info-mini-host",
      "echo-lyric-info-active",
    );
    strip.remove();
  };
};

const registerSettings = (ctx) => {
  settingsDispose?.();
  settingsDispose = ctx.ui.settings.define({
    title: "信息区歌词滚动",
    description: "用当前歌词替换主播放器和 mini 播放器的信息区歌曲展示。",
    sections: [
      {
        id: "display",
        title: "显示",
        fields: [
          {
            key: "enabled",
            type: "switch",
            label: "启用歌词滚动",
            default: DEFAULT_SETTINGS.enabled,
          },
          {
            key: "showMainPlayerBar",
            type: "switch",
            label: "主播放器信息区",
            default: DEFAULT_SETTINGS.showMainPlayerBar,
          },
          {
            key: "showMiniPlayer",
            type: "switch",
            label: "mini 信息区",
            default: DEFAULT_SETTINGS.showMiniPlayer,
          },
          {
            key: "showSecondary",
            type: "switch",
            label: "显示翻译或音译",
            default: DEFAULT_SETTINGS.showSecondary,
          },
          {
            key: "showLoading",
            type: "switch",
            label: "显示加载状态",
            default: DEFAULT_SETTINGS.showLoading,
          },
          {
            key: "emptyText",
            type: "text",
            label: "空歌词文案",
            default: DEFAULT_SETTINGS.emptyText,
          },
        ],
      },
      {
        id: "motion",
        title: "动效",
        fields: [
          {
            key: "scrollSpeed",
            type: "slider",
            label: "滚动速度",
            default: DEFAULT_SETTINGS.scrollSpeed,
            min: 5,
            max: 24,
            step: 1,
            unit: " 秒",
          },
          {
            key: "opacity",
            type: "slider",
            label: "显示强度",
            default: DEFAULT_SETTINGS.opacity,
            min: 30,
            max: 100,
            step: 1,
            unit: "%",
          },
        ],
      },
    ],
    async onChange(values) {
      await applySettings(ctx, values);
    },
  });
};

const broadcastSettings = () => {
  if (!channel || applyingRemoteSettings || !state) return;
  try {
    channel.postMessage({
      type: "settings",
      settings: normalizeSettings({ ...state.settings }),
    });
  } catch (error) {
    console.warn("[lyric-info-scroll] 同步设置失败", error);
  }
};

const applySettings = async (ctx, values, options = {}) => {
  if (!state) return;
  state.settings = normalizeSettings(values);
  updateAllStrips(ctx);
  mountedStrips.forEach(updateStripMarquee);
  if (options.broadcast !== false) broadcastSettings();
};

const setupSettingsChannel = (ctx) => {
  if (typeof BroadcastChannel !== "function") return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    const payload = event.data;
    if (!payload || payload.type !== "settings") return;
    applyingRemoteSettings = true;
    void applySettings(ctx, payload.settings, { broadcast: false }).finally(
      () => {
        applyingRemoteSettings = false;
      },
    );
  };
};

const setupMainRuntime = (ctx) => {
  const disposeDom = ctx.dom.observe(".player-song-info", (element) =>
    mountMainStrip(ctx, element),
  );
  ctx.dispose(disposeDom);

  const stopWatch = ctx.vue.watch(
    () => [
      ctx.stores.lyric.currentIndex,
      ctx.stores.lyric.lines.length,
      ctx.stores.lyric.activeSecondaryText,
      ctx.stores.lyric.tips,
      ctx.stores.lyric.isLoading,
      ctx.stores.lyric.currentTimeOffset,
      ctx.stores.player.currentTime,
      ctx.stores.player.isPlaying,
      ctx.stores.player.playbackRate,
      ctx.stores.player.currentTrackId,
      state.settings,
    ],
    () => updateAllStrips(ctx),
    { deep: true, immediate: true },
  );
  ctx.dispose(stopWatch);
};

const setupMiniRuntime = async (ctx) => {
  const disposeDom = ctx.dom.observe(".mini-info", (element) =>
    mountMiniStrip(ctx, element),
  );
  ctx.dispose(disposeDom);

  try {
    miniSnapshot = await ctx.electron.miniPlayer?.getSnapshot?.();
  } catch {
    miniSnapshot = null;
  }
  updateAllStrips(ctx);

  const disposeSnapshot =
    ctx.electron.miniPlayer?.onSnapshot?.((snapshot) => {
      miniSnapshot = snapshot;
      updateAllStrips(ctx);
    }) ?? null;
  if (disposeSnapshot) ctx.dispose(disposeSnapshot);
};

export async function activate(ctx) {
  state = ctx.vue.reactive({
    settings: normalizeSettings(await ctx.storage.get(STORAGE_KEY)),
  });

  setupSettingsChannel(ctx);
  registerSettings(ctx);
  ctx.css.inject(
    `
.echo-lyric-info-strip {
  --echo-lyric-distance: 0px;
  --echo-lyric-duration: 10s;
  --echo-lyric-opacity: 0.78;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  pointer-events: none;
  color: color-mix(in srgb, var(--color-primary) 82%, var(--color-text-main));
  opacity: var(--echo-lyric-opacity);
  font-weight: 650;
  letter-spacing: 0;
}

.echo-lyric-info-main-host.echo-lyric-info-active > .player-song-info {
  display: none;
}

.echo-lyric-info-main {
  width: 100%;
  height: 24px;
  line-height: 24px;
  font-size: 14px;
  cursor: pointer;
  pointer-events: auto;
}

.mini-info.echo-lyric-info-active .mini-title,
.mini-info.echo-lyric-info-active .mini-artist {
  display: none;
}

.echo-lyric-info-mini {
  width: 100%;
  height: 44px;
  line-height: 44px;
  font-size: 12px;
}

.echo-lyric-info-text {
  display: inline-block;
  max-width: none;
  will-change: transform;
}

.echo-lyric-info-strip.is-marquee .echo-lyric-info-text {
  animation: echo-lyric-info-marquee var(--echo-lyric-duration) linear infinite;
}

@keyframes echo-lyric-info-marquee {
  0%,
  14% {
    transform: translateX(0);
  }
  86%,
  100% {
    transform: translateX(calc(var(--echo-lyric-distance) * -1));
  }
}
`,
    { id: "lyric-info-scroll" },
  );

  if (ctx.router.currentRoute.value.name === "mini-player") {
    await setupMiniRuntime(ctx);
  } else {
    setupMainRuntime(ctx);
  }
}

export function deactivate() {
  if (lyricClockTimer) {
    clearInterval(lyricClockTimer);
    lyricClockTimer = null;
  }
  settingsDispose?.();
  settingsDispose = null;
  channel?.close();
  channel = null;
  mountedStrips.forEach((strip) => {
    strip
      .closest(".mini-info")
      ?.classList.remove("echo-lyric-info-mini-host", "echo-lyric-info-active");
    strip
      .closest(".echo-lyric-info-main-host")
      ?.classList.remove("echo-lyric-info-main-host", "echo-lyric-info-active");
    strip.remove();
  });
  mountedStrips.clear();
  miniSnapshot = null;
  state = null;
}
