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

const SETTINGS_PANEL_CSS = `
.echo-cover-settings {
  display: grid;
  grid-template-columns: minmax(172px, 220px) minmax(0, 1fr);
  gap: 20px;
  color: var(--color-text-main, var(--text-main, #f8fafc));
}

.echo-cover-preview-panel {
  display: grid;
  gap: 12px;
  align-content: start;
}

.echo-cover-preview-heading,
.echo-cover-section-heading,
.echo-cover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.echo-cover-preview-heading span:first-child,
.echo-cover-section-heading h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 760;
}

.echo-cover-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  background: color-mix(in srgb, var(--color-text-main, #f8fafc) 8%, transparent);
  color: var(--color-text-secondary, var(--text-secondary, rgba(148, 163, 184, 0.9)));
  font-size: 11px;
  font-weight: 750;
}

.echo-cover-pill.is-active {
  background: color-mix(in srgb, var(--color-primary, #31cfa1) 16%, transparent);
  color: var(--color-primary, #31cfa1);
}

.echo-cover-preview-box {
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-text-main, #f8fafc) 13%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--color-primary, #31cfa1) 10%, transparent), transparent),
    var(--color-bg-elevated, var(--bg-secondary, rgba(148, 163, 184, 0.08)));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, white 5%, transparent);
}

.echo-cover-preview-box img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.echo-cover-preview-empty {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  padding: 16px;
  color: var(--color-text-secondary, var(--text-secondary, rgba(148, 163, 184, 0.9)));
  text-align: center;
  font-size: 12px;
  line-height: 1.45;
}

.echo-cover-preview-meta {
  display: grid;
  gap: 3px;
}

.echo-cover-preview-meta span {
  font-size: 12px;
  font-weight: 750;
}

.echo-cover-preview-meta small,
.echo-cover-section-description,
.echo-cover-field-hint {
  color: var(--color-text-secondary, var(--text-secondary, rgba(148, 163, 184, 0.9)));
  font-size: 12px;
  line-height: 1.5;
}

.echo-cover-settings-fields {
  display: grid;
  gap: 14px;
}

.echo-cover-section {
  display: grid;
  gap: 12px;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--color-text-main, #f8fafc) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-elevated-base, #111827) 72%, transparent);
  padding: 14px;
}

.echo-cover-section-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.echo-cover-field-grid {
  display: grid;
  gap: 12px;
}

.echo-cover-field {
  display: grid;
  gap: 7px;
}

.echo-cover-field-label {
  color: var(--text-secondary, rgba(148, 163, 184, 0.9));
  font-size: 12px;
  font-weight: 600;
}

.echo-cover-host-input input {
  width: 100%;
  min-width: 0;
  height: 36px;
  border-radius: 8px;
  padding-left: 12px;
  padding-right: 32px;
  font-size: 13px;
}

.echo-cover-host-select.echo-select-trigger {
  width: 100%;
  min-width: 0;
  height: 36px;
  border-radius: 8px;
  font-size: 13px;
}

.echo-cover-host-slider {
  width: 100%;
  min-width: 0;
}

.echo-cover-path-value {
  min-width: 0;
  flex: 1 1 180px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-text-main, #f8fafc) 12%, transparent);
  border-radius: 8px;
  color: var(--color-text-secondary, var(--text-secondary, rgba(148, 163, 184, 0.9)));
  padding: 8px 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.echo-cover-path-row,
.echo-cover-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.echo-cover-switch-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: var(--color-text-main, var(--text-main, #f8fafc));
  font-size: 13px;
}

.echo-cover-switch-copy {
  display: grid;
  gap: 3px;
}

.echo-cover-switch-copy small {
  color: var(--color-text-secondary, var(--text-secondary, rgba(148, 163, 184, 0.9)));
  font-size: 12px;
  line-height: 1.45;
}

.echo-cover-footer {
  justify-content: flex-start;
  padding-top: 2px;
}

.echo-cover-message {
  color: var(--color-text-secondary, var(--text-secondary, rgba(148, 163, 184, 0.9)));
  font-size: 12px;
}

@media (max-width: 640px) {
  .echo-cover-settings {
    grid-template-columns: 1fr;
  }

  .echo-cover-preview-panel {
    grid-template-columns: 104px minmax(0, 1fr);
    align-items: center;
  }

  .echo-cover-preview-heading {
    grid-column: 1 / -1;
  }

  .echo-cover-section {
    padding: 12px;
  }

  .echo-cover-switch-row {
    align-items: flex-start;
  }
}
`;

let state = null;
let fallbackDispose = null;
let settingsDispose = null;
let settingsStyleDispose = null;
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
  // 优先使用主程序通过 context 提供的最终主题色（稳定、不随过渡动画抖动）；
  // 设置面板预览等无 context 场景回退到实时读取 CSS 变量。
  const backgroundColor =
    (context && context.accentColor) || readCssColor("--color-primary", "#31cfa1");
  const textColor = resolveReadableTextColor(backgroundColor);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${escapeXml(backgroundColor)}"/>
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

const createSettingsComponent = (ctx) =>
  ctx.vue.defineComponent({
    name: "CoverFallbackSettings",
    setup() {
      const { h, reactive, computed, ref, watch, defineAsyncComponent } =
        ctx.vue;
      const Button = defineAsyncComponent(ctx.ui.components.Button);
      const Input = defineAsyncComponent(ctx.ui.components.Input);
      const Select = defineAsyncComponent(ctx.ui.components.Select);
      const Slider = defineAsyncComponent(ctx.ui.components.Slider);
      const Switch = defineAsyncComponent(ctx.ui.components.Switch);
      const draft = reactive(normalizeSettings(state?.settings));
      const saving = ref(false);
      const message = ref("");

      watch(
        () => state?.settings,
        (settings) => {
          if (settings && !saving.value) {
            Object.assign(draft, normalizeSettings(settings));
          }
        },
        { deep: true },
      );

      const previewUrl = computed(() => {
        if (!draft.enabled) return "";
        if (draft.mode === "image") {
          const remoteUrl = String(draft.imageUrl || "").trim();
          if (isUsableImageUrl(remoteUrl)) return remoteUrl;
          if (
            state?.imageUrl &&
            state.settings?.imagePath === draft.imagePath &&
            state.settings?.imageUrl === draft.imageUrl
          ) {
            return state.imageUrl;
          }
          return "";
        }
        return createTextCoverUrl(draft, { size: 360 });
      });
      const modeLabel = computed(() =>
        draft.mode === "image" ? "自定义图片" : "文字渲染",
      );
      const previewCaption = computed(() =>
        draft.mode === "image"
          ? "图片地址优先；为空时使用本地图片。"
          : "背景跟随主题色，文字颜色自动适配。",
      );

      const setDraftValue = (key, value) => {
        draft[key] = value;
        message.value = "";
      };

      const selectImage = async () => {
        try {
          const result = await ctx.dialog.selectFiles({
            title: "选择兜底图片",
            buttonLabel: "使用此图片",
            filters: IMAGE_FILTERS,
          });
          const filePath = result?.paths?.[0] || "";
          if (result?.canceled || !filePath) return;
          setDraftValue("mode", "image");
          setDraftValue("imagePath", filePath);
        } catch (error) {
          ctx.toast.warning(
            error instanceof Error ? error.message : "图片选择失败",
          );
        }
      };

      const resetDraft = () => {
        Object.assign(draft, normalizeSettings(DEFAULT_SETTINGS));
        message.value = "已恢复默认，保存后生效";
      };

      const saveDraft = async () => {
        if (saving.value) return;
        saving.value = true;
        try {
          const next = normalizeSettings({ ...draft });
          await ctx.storage.set(STORAGE_KEY, next);
          await applySettings(ctx, next);
          Object.assign(draft, next);
          message.value = "设置已保存";
          ctx.toast.success("封面兜底设置已保存");
        } catch (error) {
          const text = error instanceof Error ? error.message : "设置保存失败";
          message.value = text;
          ctx.toast.warning(text);
        } finally {
          saving.value = false;
        }
      };

      const renderField = (label, control, hint = "") =>
        h("div", { class: "echo-cover-field" }, [
          h("span", { class: "echo-cover-field-label" }, label),
          control,
          hint ? h("span", { class: "echo-cover-field-hint" }, hint) : null,
        ]);

      const renderTextInput = (key, placeholder = "") =>
        h(Input, {
          modelValue: draft[key],
          placeholder,
          class: "echo-cover-host-input",
          "onUpdate:modelValue": (value) =>
            setDraftValue(key, String(value ?? "")),
        });

      const renderButton = (label, props = {}) =>
        h(Button, props, { default: () => label });

      const renderSection = (title, description, children) =>
        h("section", { class: "echo-cover-section" }, [
          h("div", { class: "echo-cover-section-heading" }, [
            h("div", { class: "echo-cover-section-copy" }, [
              h("h3", title),
              description
                ? h(
                    "span",
                    { class: "echo-cover-section-description" },
                    description,
                  )
                : null,
            ]),
          ]),
          h("div", { class: "echo-cover-field-grid" }, children),
        ]);

      return () =>
        h("div", { class: "echo-cover-settings" }, [
          h("aside", { class: "echo-cover-preview-panel" }, [
            h("div", { class: "echo-cover-preview-heading" }, [
              h("span", "封面预览"),
              h(
                "span",
                {
                  class: ["echo-cover-pill", draft.enabled ? "is-active" : ""],
                },
                draft.enabled ? "已启用" : "已停用",
              ),
            ]),
            h("div", { class: "echo-cover-preview-box" }, [
              previewUrl.value
                ? h("img", { src: previewUrl.value, alt: "封面兜底预览" })
                : h(
                    "div",
                    { class: "echo-cover-preview-empty" },
                    draft.enabled ? "保存后显示本地图片预览" : "封面兜底已关闭",
                  ),
            ]),
            h("div", { class: "echo-cover-preview-meta" }, [
              h("span", modeLabel.value),
              h("small", previewCaption.value),
            ]),
          ]),
          h("div", { class: "echo-cover-settings-fields" }, [
            renderSection(
              "显示方式",
              "决定无封面时是否接管，以及兜底封面的来源。",
              [
                h("div", { class: "echo-cover-switch-row" }, [
                  h("div", { class: "echo-cover-switch-copy" }, [
                    h("span", "启用封面兜底"),
                    h("small", "关闭后恢复 EchoMusic 默认无封面显示。"),
                  ]),
                  h(Switch, {
                    modelValue: draft.enabled,
                    "onUpdate:modelValue": (value) =>
                      setDraftValue("enabled", Boolean(value)),
                  }),
                ]),
                renderField(
                  "兜底类型",
                  h(Select, {
                    modelValue: draft.mode,
                    class: "echo-cover-host-select",
                    options: [
                      { label: "文字渲染", value: "text" },
                      { label: "自定义图片", value: "image" },
                    ],
                    "onUpdate:modelValue": (value) =>
                      setDraftValue(
                        "mode",
                        value === "image" ? "image" : "text",
                      ),
                  }),
                ),
              ],
            ),
            draft.mode === "image"
              ? renderSection(
                  "图片来源",
                  "适合固定品牌图、专辑占位图或本地素材。",
                  [
                    renderField(
                      "本地图片",
                      h("div", { class: "echo-cover-path-row" }, [
                        h(
                          "div",
                          {
                            class: "echo-cover-path-value",
                            title: draft.imagePath || "未选择本地图片",
                          },
                          draft.imagePath || "未选择本地图片",
                        ),
                        renderButton("选择", {
                          variant: "outline",
                          size: "xs",
                          onClick: selectImage,
                        }),
                      ]),
                    ),
                    renderField(
                      "图片地址",
                      renderTextInput(
                        "imageUrl",
                        "https://example.com/cover.png",
                      ),
                      "支持 https、file:// 和 data:image/*。",
                    ),
                  ],
                )
              : renderSection(
                  "文字封面",
                  "生成轻量 SVG，占位色跟随当前主题。",
                  [
                    renderField("主文字", renderTextInput("text")),
                    renderField("副文字", renderTextInput("subtext")),
                    h("div", { class: "echo-cover-switch-row" }, [
                      h("div", { class: "echo-cover-switch-copy" }, [
                        h("span", "显示副文字"),
                        h("small", "副文字为空时会自动隐藏。"),
                      ]),
                      h(Switch, {
                        modelValue: draft.showSubtext,
                        "onUpdate:modelValue": (value) =>
                          setDraftValue("showSubtext", Boolean(value)),
                      }),
                    ]),
                    renderField(
                      "文字大小",
                      h(Slider, {
                        modelValue: draft.fontSize,
                        min: 22,
                        max: 72,
                        step: 1,
                        showValue: true,
                        class: "echo-cover-host-slider",
                        "onUpdate:modelValue": (value) =>
                          setDraftValue("fontSize", Number(value)),
                      }),
                    ),
                  ],
                ),
            h("div", { class: "echo-cover-footer" }, [
              renderButton("恢复默认", {
                variant: "ghost",
                size: "xs",
                disabled: saving.value,
                onClick: resetDraft,
              }),
              renderButton(saving.value ? "保存中..." : "保存", {
                variant: "primary",
                size: "xs",
                loading: saving.value,
                disabled: saving.value,
                onClick: saveDraft,
              }),
              message.value
                ? h("span", { class: "echo-cover-message" }, message.value)
                : null,
            ]),
          ]),
        ]);
    },
  });

const registerSettings = (ctx) => {
  settingsDispose?.();
  settingsStyleDispose?.();
  settingsStyleDispose = ctx.css.inject(SETTINGS_PANEL_CSS, {
    id: "cover-fallback-settings",
  });
  settingsDispose = ctx.ui.settings.define({
    title: "封面兜底",
    description: "自定义无封面或封面加载失败时的显示内容。",
    component: createSettingsComponent(ctx),
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

export async function activate(ctx) {
  state = ctx.vue.reactive({
    settings: normalizeSettings(await ctx.storage.get(STORAGE_KEY)),
    imageUrl: "",
  });

  setupChannel(ctx);
  registerSettings(ctx);
  await applySettings(ctx, state.settings, { broadcast: false });
}

export function deactivate() {
  fallbackDispose?.();
  fallbackDispose = null;
  settingsDispose?.();
  settingsDispose = null;
  settingsStyleDispose?.();
  settingsStyleDispose = null;
  channel?.close();
  channel = null;
  state = null;
}
