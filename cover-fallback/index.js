const STORAGE_KEY = "settings";
const CHANNEL_NAME = "echo-plugin:cover-fallback:settings";

const DEFAULT_SETTINGS = {
  enabled: true,
  mode: "text",
  imagePath: "",
  imageUrl: "",
  text: "EchoMusic",
  subtext: "No Cover",
  fontSize: 42,
  showSubtext: true,
};

const IMAGE_FILTERS = [
  {
    name: "Images",
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif", "apng", "svg"],
  },
];

let state = null;
let fallbackDispose = null;
let settingsDispose = null;
let channel = null;
let applyingRemoteSettings = false;

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

const normalizeSettings = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const mode = source.mode === "image" ? "image" : "text";
  return {
    enabled: source.enabled ?? DEFAULT_SETTINGS.enabled,
    mode,
    imagePath: typeof source.imagePath === "string" ? source.imagePath : "",
    imageUrl: typeof source.imageUrl === "string" ? source.imageUrl : "",
    text:
      typeof source.text === "string" && source.text.trim()
        ? source.text.trim()
        : DEFAULT_SETTINGS.text,
    subtext:
      typeof source.subtext === "string"
        ? source.subtext.trim()
        : DEFAULT_SETTINGS.subtext,
    fontSize: clamp(source.fontSize ?? DEFAULT_SETTINGS.fontSize, 22, 72),
    showSubtext: source.showSubtext ?? DEFAULT_SETTINGS.showSubtext,
  };
};

const isUsableImageUrl = (value) =>
  /^(https?:\/\/|file:\/\/|data:image\/)/i.test(String(value));

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const readCssColor = (variableName, fallback) => {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.color = `var(${variableName})`;
  document.documentElement.appendChild(probe);
  const color = getComputedStyle(probe).color.trim();
  probe.remove();
  return color || fallback;
};

const parseRgb = (color) => {
  const text = String(color || "").trim();
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const value = hex[1];
    const full =
      value.length === 3
        ? value
            .split("")
            .map((item) => item + item)
            .join("")
        : value;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = text.match(/rgba?\(([^)]+)\)/i);
  if (!rgb) return null;
  const [r, g, b] = rgb[1]
    .split(",")
    .slice(0, 3)
    .map((item) => Number.parseFloat(item.trim()));
  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b };
};

const resolveReadableTextColor = (backgroundColor) => {
  const rgb = parseRgb(backgroundColor);
  if (!rgb) return "#ffffff";
  const normalize = (value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * normalize(rgb.r) +
    0.7152 * normalize(rgb.g) +
    0.0722 * normalize(rgb.b);
  return luminance > 0.46 ? "#111827" : "#ffffff";
};

const createTextCoverUrl = (settings, context) => {
  const size = Math.max(160, Math.min(960, Number(context?.size) || 400));
  const fontSize = Math.round(
    (Number(settings.fontSize) || DEFAULT_SETTINGS.fontSize) * (size / 400),
  );
  const subFontSize = Math.max(14, Math.round(fontSize * 0.38));
  const text = escapeXml(settings.text || DEFAULT_SETTINGS.text);
  const subtext = escapeXml(settings.subtext || "");
  const showSubtext = Boolean(settings.showSubtext && subtext);
  const mainY = showSubtext ? "48%" : "54%";
  const backgroundColor = readCssColor("--color-primary", "#31cfa1");
  const textColor = resolveReadableTextColor(backgroundColor);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.08)}" fill="${escapeXml(backgroundColor)}"/>
  <text x="50%" y="${mainY}" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(textColor)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="0">${text}</text>
  ${
    showSubtext
      ? `<text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(textColor)}" opacity="0.72" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${subFontSize}" font-weight="650" letter-spacing="0">${subtext}</text>`
      : ""
  }
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const resolveImageUrl = async (ctx, settings) => {
  const remoteUrl = String(settings.imageUrl || "").trim();
  if (remoteUrl && isUsableImageUrl(remoteUrl)) return remoteUrl;

  const imagePath = String(settings.imagePath || "").trim();
  if (!imagePath) return "";

  const result = await ctx.fs.getFileUrl(imagePath);
  return result?.ok ? result.url : "";
};

const syncFallback = (ctx) => {
  fallbackDispose?.();
  fallbackDispose = ctx.ui.cover.setFallback({
    id: "cover-fallback",
    resolveUrl(context) {
      if (!state?.settings.enabled) return null;
      if (state.settings.mode === "image" && state.imageUrl)
        return state.imageUrl;
      return createTextCoverUrl(state.settings, context);
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
    console.warn("[cover-fallback] 同步设置失败", error);
  }
};

const applySettings = async (ctx, values, options = {}) => {
  if (!state) return;
  state.settings = normalizeSettings(values);
  state.imageUrl =
    state.settings.mode === "image"
      ? await resolveImageUrl(ctx, state.settings)
      : "";
  syncFallback(ctx);
  if (options.broadcast !== false) broadcastSettings();
};

const registerSettings = (ctx) => {
  settingsDispose?.();
  settingsDispose = ctx.ui.settings.define({
    title: "封面兜底",
    description: "自定义无封面或封面加载失败时的显示内容。",
    sections: [
      {
        id: "behavior",
        title: "显示方式",
        fields: [
          {
            key: "enabled",
            type: "switch",
            label: "启用封面兜底",
            default: DEFAULT_SETTINGS.enabled,
          },
          {
            key: "mode",
            type: "select",
            label: "兜底类型",
            default: DEFAULT_SETTINGS.mode,
            width: 180,
            options: [
              { label: "文字渲染", value: "text" },
              { label: "自定义图片", value: "image" },
            ],
          },
        ],
      },
      {
        id: "image",
        title: "自定义图片",
        fields: [
          {
            key: "imagePath",
            type: "file",
            label: "本地图片",
            default: DEFAULT_SETTINGS.imagePath,
            filters: IMAGE_FILTERS,
          },
          {
            key: "imageUrl",
            type: "text",
            label: "图片地址",
            placeholder: "https://example.com/cover.png",
            default: DEFAULT_SETTINGS.imageUrl,
          },
        ],
      },
      {
        id: "text",
        title: "文字渲染",
        fields: [
          {
            key: "text",
            type: "text",
            label: "主文字",
            default: DEFAULT_SETTINGS.text,
          },
          {
            key: "subtext",
            type: "text",
            label: "副文字",
            default: DEFAULT_SETTINGS.subtext,
          },
          {
            key: "showSubtext",
            type: "switch",
            label: "显示副文字",
            default: DEFAULT_SETTINGS.showSubtext,
          },
          {
            key: "fontSize",
            type: "slider",
            label: "文字大小",
            default: DEFAULT_SETTINGS.fontSize,
            min: 22,
            max: 72,
            step: 1,
          },
        ],
      },
    ],
    async onChange(values) {
      await applySettings(ctx, values);
    },
  });
};

const setupChannel = (ctx) => {
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

const watchThemeChanges = (ctx) => {
  const stopWatch = ctx.vue.watch(
    () => [
      ctx.stores.theme.sourceColor,
      ctx.stores.theme.coverColor,
      ctx.stores.theme.isDark,
      ctx.stores.settings.theme,
    ],
    () => syncFallback(ctx),
  );
  ctx.dispose(stopWatch);

  if (typeof MutationObserver !== "function") return;
  const observer = new MutationObserver(() => syncFallback(ctx));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  ctx.dispose(() => observer.disconnect());
};

export async function activate(ctx) {
  state = ctx.vue.reactive({
    settings: normalizeSettings(await ctx.storage.get(STORAGE_KEY)),
    imageUrl: "",
  });

  setupChannel(ctx);
  registerSettings(ctx);
  watchThemeChanges(ctx);
  await applySettings(ctx, state.settings, { broadcast: false });
}

export function deactivate() {
  fallbackDispose?.();
  fallbackDispose = null;
  settingsDispose?.();
  settingsDispose = null;
  channel?.close();
  channel = null;
  state = null;
}
