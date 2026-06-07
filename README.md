# EchoMusic 插件系统

本仓库收录 EchoMusic 插件开发文档与示例插件。

## 插件列表

- [插件列表](docs/plugin-list.md)：当前收录的插件、功能简介和安装方式。

## 插件开发文档

EchoMusic 支持本地插件。插件由用户主动放入插件目录并在"插件管理"中启用，定位接近 VS Code / Obsidian 的高自由度本地扩展：插件可以注册 UI、监听播放器状态、访问 Pinia store、注入 CSS、调用受控的播放器/队列/存储 API，也可以通过 selector 把 Vue 组件挂到主界面的任意 DOM 位置。

扩展文档：

- [插件浮窗与 Now Playing](docs/plugin-windows.md)：声明独立桌面浮窗、订阅当前播放/歌词快照、发送播放与歌词命令。

插件属于用户信任后运行的本地代码。当前插件运行在渲染进程的浏览器 ESM 环境中，EchoMusic 不声明也不伪装成权限沙箱；请只启用来源可信的插件。如果插件导致界面异常，可以在插件管理页启用"插件安全模式"、禁用或卸载对应插件。

## 安全模式与故障恢复

"插件管理"提供全局插件安全模式。开启后不会加载任何插件，但会保留每个插件原本的启用状态，方便排查后恢复。

EchoMusic 会记录插件启动阶段和运行阶段的活动插件列表。如果插件导致渲染进程异常退出，主进程会尝试自动切到安全模式并重载主窗口；如果应用被迫关闭或渲染进程无响应，下次启动时也会自动进入安全模式。插件管理页会在对应插件卡片上用警告标记展示启动失败、运行异常或最近一次疑似故障；点击后可查看异常来源、时间、消息和堆栈，也可以清除该插件的异常记录。也可以通过命令行主动进入安全模式：

```bash
EchoMusic --safe-mode
```

开发环境可使用：

```bash
pnpm exec electron . --safe-mode
```

插件禁用或卸载前，运行时会调用插件的 `deactivate(ctx)`，随后清理通过宿主 API 注册的页面、统一设置、歌曲菜单、命令、事件监听、`ctx.css.inject` 样式、manifest 样式、`ctx.ui.mount` / `ctx.ui.teleport` 挂载组件和 `ctx.dom.observe` 监听。插件如果直接修改 DOM 或注册了宿主无法感知的全局副作用，应通过 `ctx.dispose(() => ...)` 或 `deactivate(ctx)` 自行归还。

卸载插件会删除插件目录、移除启用状态、清除已追踪的插件私有 KV 数据，并清除与该插件相关的最近故障记录。

## 插件目录

在"插件管理"中点击"打开目录"。EchoMusic 的本地插件目录会直接包含各个插件文件夹；本仓库中的 `cover-fallback`、`lyric-info-scroll` 这类文件夹复制进去即可，不需要额外套一层 `plugins`。

```text
<EchoMusic 插件目录>/
  hello-echo/
    manifest.json
    index.js
    style.css
```

## manifest.json

```json
{
  "id": "hello-echo",
  "name": "Hello Echo",
  "version": "1.0.0",
  "description": "EchoMusic 插件示例",
  "author": "EchoMusic User",
  "main": "index.js",
  "style": "style.css",
  "contributes": {
    "image": "icon.svg",
    "runInMiniPlayer": false
  }
}
```

`main` 默认为 `index.js`，支持 `.js` / `.mjs`。`style` 可选，仅支持 `.css`。
`contributes.image` 可选，用于插件管理页卡片图标，建议使用插件根目录下的 `icon.svg`。该字段也支持插件目录内的相对图片路径、`https` 图片和 `data:image/*`。`contributes.icon` 作为历史兼容字段仍会被识别，新插件请优先使用 `contributes.image`。

`contributes.runInMiniPlayer` 可选。设为 `true` 后，EchoMusic 会在 mini 播放器窗口中单独加载该插件。mini 是独立窗口，只需要影响主窗口的插件不应开启该项；如果插件同时影响主窗口和 mini 窗口，需要把两边看成两个独立运行时，它们不共享 JS 内存。

## 最小插件

```js
export function activate(ctx) {
  ctx.toast.success(`${ctx.manifest.name} 已启用`);

  ctx.ui.settings.define({
    title: "Hello Echo 设置",
    sections: [
      {
        id: "general",
        title: "常规",
        fields: [
          {
            key: "enabled",
            type: "switch",
            label: "启用提示",
            default: true,
          },
        ],
      },
    ],
    onChange(values) {
      ctx.toast.info(values.enabled ? "提示已启用" : "提示已关闭");
    },
  });

  ctx.ui.addSongContextMenuItem({
    id: "copy-song-title",
    label: "复制歌曲标题",
    async onSelect(song) {
      await navigator.clipboard.writeText(song.title || "");
      ctx.toast.success("已复制歌曲标题");
    },
  });

  ctx.events.onTrackChange((track) => {
    console.log("[hello-echo] track changed:", track);
  });
}
```

插件入口是浏览器 ESM 单文件。未打包插件不要直接写 `import { defineComponent } from 'vue'` 这类 bare import；可以使用 `ctx.vue`：

```js
export default {
  activate(ctx) {
    const Page = ctx.vue.defineComponent({
      setup() {
        return () =>
          ctx.vue.h("div", { class: "hello-page" }, [
            ctx.vue.h("h2", "Hello Echo"),
            ctx.vue.h("p", "这是插件注册的独立页面。"),
          ]);
      },
    });

    ctx.ui.addPage({
      id: "home",
      title: "Hello Echo",
      icon: "tabler:sparkles",
      component: Page,
    });
  },
};
```

如果要使用 TypeScript、Vue SFC 或第三方依赖，请自行将插件打包为单文件 ESM，再放入插件目录。

## 可用上下文

插件的 `activate(ctx)` 会获得高自由度宿主上下文：

| API                                                                   | 说明                                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ctx.vue`                                                             | Vue 运行时，包含 `defineComponent`、`h`、`ref`、`computed`、`watch` 等                                                                                                                                                    |
| `ctx.app` / `ctx.router` / `ctx.pinia`                                | 主应用实例、路由和 Pinia 实例                                                                                                                                                                                             |
| `ctx.stores.player` / `.playlist` / `.lyric` / `.settings` / `.theme` | 应用核心 store                                                                                                                                                                                                            |
| `ctx.player`                                                          | 播放控制便捷 API：`currentTrack`（computed）、`isPlaying`（computed）、`toggle()`、`next()`、`prev()`、`seek(time)`、`setVolume(vol)`、`setPlayMode(mode)`                                                                |
| `ctx.playlist`                                                        | 播放队列便捷 API                                                                                                                                                                                                          |
| `ctx.lyric` / `ctx.settings`                                          | 歌词 store 与设置 store 的快捷引用，等价于 `ctx.stores.lyric` / `ctx.stores.settings`                                                                                                                                     |
| `ctx.storage`                                                         | 插件私有 KV 存储，按插件 id 自动隔离                                                                                                                                                                                      |
| `ctx.dialog.selectDirectory(options?)`                                | 打开系统文件夹选择对话框，返回 `{ canceled, paths }`                                                                                                                                                                      |
| `ctx.dialog.selectFiles(options?)`                                    | 打开系统文件选择对话框，支持 `multiple` 和 `filters`                                                                                                                                                                      |
| `ctx.fs.listImageFiles(directory, options?)`                          | 枚举指定文件夹内图片，返回文件路径、`file://` URL、大小和修改时间                                                                                                                                                         |
| `ctx.fs.getFileUrl(filePath)`                                         | 将用户选择的本地文件路径转换为可渲染的 `file://` URL                                                                                                                                                                      |
| `ctx.theme.surface.set(options)`                                      | 请求宿主调整主界面表面透明度和模糊效果，适合背景图、沉浸皮肤等插件                                                                                                                                                        |
| `ctx.theme.surface.clear()`                                           | 清理当前插件提交的表面效果                                                                                                                                                                                                |
| `ctx.nowPlaying`                                                      | 当前播放/歌词/外观快照 API，可读取快照、订阅变化、发送播放与歌词命令                                                                                                                                                      |
| `ctx.windows`                                                         | 控制当前插件在 manifest 中声明的独立窗口：`show()`、`hide()`、`close()`、`move()` 等                                                                                                                                      |
| `ctx.toast`                                                           | 应用内提示：`info()`、`success()`、`warning()`、`danger()`                                                                                                                                                                |
| `ctx.net.fetch`                                                       | 网络请求                                                                                                                                                                                                                  |
| `ctx.electron`                                                        | 当前 preload 暴露的 Electron API                                                                                                                                                                                          |
| `ctx.electron.platform`                                               | 当前平台：`'darwin'` / `'win32'` / `'linux'`                                                                                                                                                                              |
| `ctx.css.inject(cssText, options?)`                                   | 注入全局 CSS，禁用插件时自动清理                                                                                                                                                                                          |
| `ctx.commands.register(id, handler)`                                  | 注册插件命令                                                                                                                                                                                                              |
| `ctx.events.onTrackChange(handler)`                                   | 监听当前曲目变化                                                                                                                                                                                                          |
| `ctx.events.onPlaybackChange(handler)`                                | 监听播放/暂停状态变化                                                                                                                                                                                                     |
| `ctx.dom.query(selector)` / `ctx.dom.queryAll(selector)`              | 查询主界面 DOM                                                                                                                                                                                                            |
| `ctx.dom.observe(selector, handler)`                                  | 监听动态出现的 DOM，禁用插件时自动断开                                                                                                                                                                                    |
| `ctx.ui.settings.define(schema)`                                      | 声明插件设置 schema，由插件管理页统一渲染、保存并回调                                                                                                                                                                     |
| `ctx.ui.cover.setFallback(resolver)`                                  | 设置无封面或封面加载失败时的兜底图片 URL，resolver 必须同步返回字符串                                                                                                                                                     |
| `ctx.ui.components`                                                   | 异步加载宿主 UI 组件：`Avatar`、`Badge`、`Button`、`Cover`、`Dialog`、`Drawer`、`Input`、`InputNumber`、`Popover`、`Scrollbar`、`Select`、`Slider`、`Switch`、`Tabs`、`TabsContent`、`TabsList`、`TabsTrigger`、`Tooltip` |
| `ctx.icons`                                                           | 宿主图标库（Iconify 格式）                                                                                                                                                                                                |
| `ctx.commands.execute(id, ...args)`                                   | 执行已注册的插件命令                                                                                                                                                                                                      |
| `ctx.dispose(fn)`                                                     | 注册资源清理回调，禁用时自动调用                                                                                                                                                                                          |

### 平台判断

```js
const isMac = ctx.electron.platform === "darwin";
const isWindows = ctx.electron.platform === "win32";
const isLinux = ctx.electron.platform === "linux";
```

### 响应式访问播放状态

`ctx.player.currentTrack` 和 `ctx.player.isPlaying` 是 Vue `computed`，在 Vue 组件的 `setup` 中直接使用即可自动响应更新：

```js
const MyWidget = ctx.vue.defineComponent({
  setup() {
    const track = ctx.player.currentTrack;
    const playing = ctx.player.isPlaying;
    return () =>
      ctx.vue.h("span", playing.value ? `♫ ${track.value?.title}` : "已暂停");
  },
});
```

在非组件上下文中，也可以用 `ctx.vue.watch` 监听：

```js
ctx.vue.watch(ctx.player.currentTrack, (track) => {
  console.log("曲目变化:", track?.title);
});
```

### 使用宿主图标

`ctx.icons` 提供项目内置的 Iconify 图标对象，可直接用于 `Icon` 组件：

```js
const { h } = ctx.vue;
const Icon = ctx.vue.resolveComponent("Icon");
h(Icon, { icon: ctx.icons.iconPictureInPicture, width: 16, height: 16 });
```

## UI 能力

插件既可以用稳定的宿主贡献 API，也可以直接介入主界面 DOM。

- `ctx.ui.addPage(...)`：注册完整插件页面，可通过 `/main/plugin/:pluginId/:pageId` 访问。
- `ctx.ui.settings.define(...)`：声明插件设置，由插件管理页统一渲染、保存并在变更后回调插件。
- `ctx.ui.cover.setFallback(...)`：设置无封面或封面加载失败时的显示图片。
- `ctx.ui.addSongContextMenuItem(...)`：注册歌曲右键菜单项。
- `ctx.ui.mount(selectorOrElement, component, options)`：把 Vue 组件挂载到任意 DOM 位置。
- `ctx.ui.teleport(component, options)`：把 Vue 组件挂载到 `document.body`，适合全局浮层/悬浮窗。

这些挂点由宿主管理生命周期。插件禁用后，已注册的页面、按钮、菜单、样式和监听器会被自动清理。

### `ctx.ui.mount` 定位说明

`ctx.ui.mount(target, component, options)` 的 `options.position` 控制 DOM 插入位置：

| position           | 行为                             |
| ------------------ | -------------------------------- |
| `'append'`（默认） | 作为目标元素的最后一个子元素插入 |
| `'prepend'`        | 作为目标元素的第一个子元素插入   |
| `'before'`         | 插入到目标元素之前（同级）       |
| `'after'`          | 插入到目标元素之后（同级）       |
| `'replace'`        | 包裹替换目标元素                 |

插入后的视觉位置取决于目标容器的 CSS 布局。对于 flex 布局的容器，DOM 插入顺序即为视觉顺序；对于使用绝对定位的容器，插件需要自行通过 `ctx.css.inject` 或 inline style 控制视觉定位。

## 独立页面示例

注册插件页面后，可以通过路由跳转打开：

```js
export function activate(ctx) {
  const Page = ctx.vue.defineComponent({
    setup() {
      return () => ctx.vue.h("div", { class: "p-6" }, "Hello Echo 页面");
    },
  });

  ctx.ui.addPage({
    id: "home",
    title: "Hello Echo",
    icon: "tabler:sparkles",
    component: Page,
  });

  ctx.router.push(`/main/plugin/${encodeURIComponent(ctx.id)}/home`);
}
```

## 统一设置示例

插件设置应优先使用 `ctx.ui.settings.define(...)`。设置入口会显示在插件管理页对应插件卡片上。宿主会读取插件私有存储中的 `settings`、合并字段默认值、统一渲染表单，用户点击保存后写回 `ctx.storage` 并调用 `onChange(values)`。

```js
export function activate(ctx) {
  ctx.ui.settings.define({
    title: "Hello Echo 设置",
    description: "这些设置显示在插件管理页的统一设置对话框中。",
    sections: [
      {
        id: "general",
        title: "常规",
        fields: [
          { key: "enabled", type: "switch", label: "启用", default: true },
          { key: "name", type: "text", label: "名称", default: "Hello Echo" },
          {
            key: "opacity",
            type: "slider",
            label: "透明度",
            min: 0,
            max: 100,
            step: 1,
            unit: "%",
            default: 80,
          },
          {
            key: "mode",
            type: "select",
            label: "模式",
            default: "normal",
            width: 360,
            options: [
              { label: "普通", value: "normal" },
              { label: "紧凑", value: "compact" },
            ],
          },
          {
            key: "folderPath",
            type: "directory",
            label: "文件夹",
            default: "",
          },
          {
            key: "imageFiles",
            type: "file",
            label: "图片文件",
            multiple: true,
            filters: [{ name: "Images", extensions: ["jpg", "png", "webp"] }],
            default: [],
          },
        ],
      },
    ],
    onChange(values) {
      console.log("插件设置已更新:", values);
    },
  });
}
```

字段类型：

| type        | 值类型                          | 说明                                             |
| ----------- | ------------------------------- | ------------------------------------------------ |
| `text`      | `string`                        | 单行文本                                         |
| `textarea`  | `string`                        | 多行文本                                         |
| `number`    | `number`                        | 数字输入，可配合 `min` / `max` / `step` / `unit` |
| `slider`    | `number`                        | 滑块，可配合 `min` / `max` / `step` / `unit`     |
| `switch`    | `boolean`                       | 开关                                             |
| `select`    | `string` / `number` / `boolean` | 下拉选择，必须提供 `options`                     |
| `file`      | `string` / `string[]`           | 文件路径；`multiple: true` 时保存为字符串数组    |
| `directory` | `string`                        | 文件夹路径                                       |

字段通用属性：

| 属性                   | 说明                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `key`                  | 必填，设置项保存和回调时使用的字段名                                                                     |
| `type`                 | 必填，未知类型会按 `text` 处理                                                                           |
| `label`                | 必填，设置项名称                                                                                         |
| `description`          | 可选，设置项说明                                                                                         |
| `placeholder`          | 可选，文本类控件占位提示                                                                                 |
| `default`              | 可选，默认值；应使用 `string`、`number`、`boolean`、`string[]` 或 `null`                                 |
| `unit`                 | 可选，数字和滑块的单位显示                                                                               |
| `min` / `max` / `step` | 可选，数字和滑块的范围与步进                                                                             |
| `multiple`             | 可选，仅 `file` 有效                                                                                     |
| `width`                | 可选，控件宽度；支持数字 px 或有效 CSS 宽度字符串，例如 `360`、`"100%"`、`"24rem"`、`"min(100%, 420px)"` |
| `filters`              | 可选，仅 `file` 有效；扩展名不需要写点号，例如 `png`                                                     |
| `options`              | 可选，仅 `select` 有效；`value` 只能是字符串、数字或布尔值                                               |

`file` / `directory` 会调用宿主文件选择 API，插件不需要自己处理系统对话框。设置里保存的是本地路径，不是可直接渲染的 `file://` URL；需要展示本地图片或文件时，先通过 `ctx.fs.getFileUrl(filePath)` 转换。

设置值和跨窗口消息都应使用可克隆的普通数据。不要把 Vue `reactive` / `ref`、DOM 节点、函数、`File`、`Error` 等对象写入 `ctx.storage`、IPC 或 `BroadcastChannel`。如果插件开启了 `runInMiniPlayer` 并需要同步设置，建议先归一化并展开成普通对象：

```js
const broadcastSettings = (settings) => {
  channel.postMessage({
    type: "settings",
    settings: normalizeSettings({ ...settings }),
  });
};
```

## 封面兜底接入

`ctx.ui.cover.setFallback(...)` 用于定制无封面或封面加载失败时的图片。resolver 必须同步返回字符串、`null` 或 `undefined`；不能在 resolver 中 `await`。如果兜底图片来自本地文件，应在设置保存或初始化阶段提前调用 `ctx.fs.getFileUrl(...)`，把结果缓存成可直接返回的 URL。

```js
let fallbackImageUrl = "";

async function applySettings(ctx, values = {}) {
  const imagePath = String(values?.imagePath || "");
  if (imagePath) {
    const result = await ctx.fs.getFileUrl(imagePath);
    fallbackImageUrl = result?.ok ? result.url : "";
  }
}

export async function activate(ctx) {
  await applySettings(ctx, await ctx.storage.get("settings"));

  ctx.ui.cover.setFallback({
    id: "default",
    resolveUrl(context) {
      if (context.reason === "empty" && fallbackImageUrl)
        return fallbackImageUrl;
      return null;
    },
  });
}
```

封面兜底是全局行为，建议只由一个插件负责。若多个插件同时注册兜底，后注册的插件会成为当前兜底。

## 主题表面接入

需要让主界面露出背景图、动态壁纸或沉浸式皮肤时，插件应优先使用 `ctx.theme.surface.set(...)`，不要直接覆盖 `.bg-bg-main`、`.player-bar`、`.dialog-content` 等宿主选择器。宿主会统一调整主内容、侧栏、卡片、弹层和播放器的语义背景 token，并在插件禁用时自动清理。

```js
export function activate(ctx) {
  ctx.theme.surface.set({
    enabled: true,
    mainOpacity: 82,
    sidebarOpacity: 82,
    cardOpacity: 86,
    elevatedOpacity: 88,
    dialogOpacity: 90,
    playerOpacity: 92,
    backdropFilter: "blur(10px)",
    playerBackdropFilter: "blur(20px) saturate(180%)",
  });
}
```

`mainOpacity`、`sidebarOpacity`、`cardOpacity`、`elevatedOpacity`、`dialogOpacity`、`playerOpacity` 支持 `0-100` 数字、`0-1` 小数或百分比字符串。`ctx.theme.surface.set(...)` 返回提前清理函数，插件禁用时宿主也会自动清理。多个插件同时提交时，后提交的插件对同一字段优先生效。

## 完整 UI 接入示例

把组件插入播放器右侧：

```js
export function activate(ctx) {
  const Badge = ctx.vue.defineComponent({
    setup() {
      return () =>
        ctx.vue.h(
          "button",
          {
            class: "my-plugin-badge",
            onClick: () => ctx.toast.info("插件按钮"),
          },
          "插件",
        );
    },
  });

  ctx.ui.mount(".player-actions", Badge, {
    id: "playerbar-badge",
    position: "prepend",
  });
}
```

直接挂到任意 DOM selector：

```js
export function activate(ctx) {
  const Floating = ctx.vue.defineComponent({
    setup() {
      return () =>
        ctx.vue.h("div", { class: "my-floating-widget" }, "全局浮层");
    },
  });

  ctx.ui.mount(".main-layout", Floating, {
    id: "floating-widget",
    position: "append",
  });
}
```

监听动态 DOM 并介入：

```js
export function activate(ctx) {
  ctx.dom.observe("[data-song-row]", (row) => {
    row.classList.add("my-plugin-song-row");
    return () => row.classList.remove("my-plugin-song-row");
  });
}
```

复用宿主 UI 组件：

```js
export async function activate(ctx) {
  const Button = await ctx.ui.components.Button();
  const Panel = ctx.vue.defineComponent({
    setup() {
      return () =>
        ctx.vue.h(Button, { variant: "ghost", size: "xs" }, () => "宿主按钮");
    },
  });

  ctx.ui.mount(".main-content", Panel, {
    id: "host-button",
    position: "prepend",
  });
}
```

## 跨平台 DOM 挂载示例

对于根据平台条件渲染的容器，插件应选择始终存在的父元素，并通过 CSS 定位控制视觉位置：

```js
export function activate(ctx) {
  const isMac = ctx.electron.platform === "darwin";

  const MiniButton = ctx.vue.defineComponent({
    setup() {
      const Icon = ctx.vue.resolveComponent("Icon");
      return () =>
        ctx.vue.h(
          "button",
          {
            class: "plugin-mini-btn no-drag",
            title: "mini 模式",
            onClick: () => ctx.electron.miniPlayer?.show(),
          },
          [
            ctx.vue.h(Icon, {
              icon: ctx.icons.iconPictureInPicture,
              width: 16,
              height: 16,
            }),
          ],
        );
    },
  });

  ctx.css.inject(
    `
    .plugin-mini-btn {
      position: absolute;
      top: 0;
      right: ${isMac ? "16px" : "200px"};
      height: 100%;
      width: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-main);
      opacity: 0.68;
      background: transparent;
      border: none;
      z-index: 10;
      transition: all 0.2s;
    }
    .plugin-mini-btn:hover {
      color: var(--color-primary);
      opacity: 1;
    }
  `,
    { id: "mini-btn-style" },
  );

  // 挂载到始终存在的 .overlay-header，不依赖平台条件渲染的子元素
  ctx.dom.observe(".overlay-header", (el) => {
    return ctx.ui.mount(el, MiniButton, { position: "append" });
  });
}
```
