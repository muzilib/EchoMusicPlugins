# EchoMusic 插件系统

本仓库收录 EchoMusic 插件开发文档与示例插件。

## 插件列表

- [插件列表](docs/plugin-list.md)：当前收录的插件、功能简介和安装方式。

## 在线插件源

EchoMusic 2.2.6-beta.11 起支持在"插件管理"中浏览在线插件源。本仓库根目录提供 `echo-plugins.json`，可以直接作为插件源添加：

```text
https://github.com/hoowhoami/EchoMusicPlugins
```

添加后，EchoMusic 会读取仓库根目录的 `echo-plugins.json`，展示可安装插件。索引中的插件可以通过 `path` 指向当前仓库内的插件目录；安装时 EchoMusic 会下载仓库 zip，只提取该目录并校验其中的 `manifest.json`。

插件源索引格式：

```json
{
  "name": "EchoMusic 官方插件源",
  "homepage": "https://github.com/hoowhoami/EchoMusicPlugins",
  "plugins": [
    {
      "id": "hello-echo",
      "name": "Hello Echo",
      "version": "1.0.0",
      "description": "EchoMusic 插件示例",
      "author": "EchoMusic User",
      "icon": "icon.svg",
      "path": "hello-echo",
      "repo": "https://github.com/owner/repo/tree/main/hello-echo",
      "homepage": "https://github.com/owner/repo/tree/main/hello-echo",
      "tags": ["example"],
      "requires": {
        "echoMusicVersion": ">=2.2.6"
      }
    }
  ]
}
```

字段说明：

- `path`：插件目录相对仓库根目录的路径，目录内必须包含 `manifest.json`。
- `downloadUrl`：可选。留空时 EchoMusic 下载插件源仓库 zip；如果插件单独发布 zip，可填写 GitHub Release 资源地址。
- `checksum` / `sha256`：可选。填写 64 位 sha256 或 `sha256:<hash>` 后，安装时会校验下载包。
- `requires.echoMusicVersion`：和插件 manifest 中的版本要求一致，用于在线列表提前判断兼容性。

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
  "icon": "icon.svg",
  "main": "index.js",
  "style": "style.css",
  "runtime": {
    "miniPlayer": false,
    "desktopLyric": false
  },
  "requires": {
    "echoMusicVersion": ">=2.2.6-beta.9"
  }
}
```

`main` 默认为 `index.js`，支持 `.js` / `.mjs`。`style` 可选，仅支持 `.css`。
`icon` 可选，用于插件管理页卡片图标，建议使用插件根目录下的 `icon.svg`。该字段支持插件目录内的相对图片路径、`https` 图片和 `data:image/*`。

`runtime.miniPlayer` 可选。设为 `true` 后，EchoMusic 会在 mini 播放器窗口中单独加载该插件。mini 是独立窗口，只需要影响主窗口的插件不应开启该项；如果插件同时影响主窗口和 mini 窗口，需要把两边看成两个独立运行时，它们不共享 JS 内存。

`runtime.desktopLyric` 可选。设为 `true` 后，EchoMusic 会在桌面歌词窗口中单独加载该插件。桌面歌词同样是独立窗口，只需要影响主窗口或 mini 窗口的插件不应开启该项。

`requires.echoMusicVersion` 可选，表示插件要求的 EchoMusic 主程序版本范围，使用 semver range。常见写法是 `>=2.2.6`；如果插件明确不支持下一个大版本，也可以写 `>=2.2.6 <3`。如果只写 `2.2.6`，EchoMusic 会按 `>=2.2.6` 处理。版本范围写错会被标记为 manifest 无效；范围有效但当前主程序不满足时，插件管理页会提示“版本不兼容”并阻止启用。

`contributes.windows` 可选，用于声明由主进程创建的插件独立浮窗，详见 [插件浮窗与 Now Playing](docs/plugin-windows.md)。

## 最小插件

```js
export function activate(ctx) {
  ctx.toast.success(`${ctx.manifest.name} 已启用`);

  const { defineAsyncComponent, defineComponent, h, ref } = ctx.vue;
  const Button = defineAsyncComponent(ctx.ui.components.Button);
  const Switch = defineAsyncComponent(ctx.ui.components.Switch);

  const SettingsPanel = defineComponent({
    setup() {
      const enabled = ref(true);

      ctx.storage.get("settings").then((saved) => {
        if (saved && typeof saved.enabled === "boolean") {
          enabled.value = saved.enabled;
        }
      });

      const save = async () => {
        await ctx.storage.set("settings", { enabled: enabled.value });
        ctx.toast.info(enabled.value ? "提示已启用" : "提示已关闭");
      };

      return () =>
        h("div", { style: "display: grid; gap: 12px;" }, [
          h(
            "label",
            {
              style:
                "display: flex; justify-content: space-between; gap: 12px;",
            },
            [
              h("span", "启用提示"),
              h(Switch, {
                modelValue: enabled.value,
                "onUpdate:modelValue": (value) => {
                  enabled.value = Boolean(value);
                },
              }),
            ],
          ),
          h(Button, { size: "xs", onClick: save }, { default: () => "保存" }),
        ]);
    },
  });

  ctx.ui.settings.define({
    title: "Hello Echo 设置",
    component: SettingsPanel,
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
      sidebar: true,
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
| `ctx.ui.settings.define(options)`                                     | 声明插件设置入口，必须提供自定义 Vue 组件                                                                                                                                                                                 |
| `ctx.ui.sidebar.addItem(item)`                                        | 注册正式侧边栏导航入口，支持路由匹配、高亮和折叠侧栏图标                                                                                                                                                                  |
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

- `ctx.ui.addPage(...)`：注册完整插件页面，可通过 `/main/plugin/:pluginId/:pageId` 访问；传入 `sidebar` 后会同时注册正式侧边栏入口。
- `ctx.ui.sidebar.addItem(...)`：为插件页面或自定义动作注册正式侧边栏导航入口，支持路由匹配、高亮和折叠侧栏图标。
- `ctx.ui.settings.define(...)`：声明插件设置入口，传入自定义 Vue 组件自由渲染。
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
    sidebar: {
      section: "plugins",
      sectionTitle: "插件",
      order: 10,
    },
  });

  ctx.router.push(`/main/plugin/${encodeURIComponent(ctx.id)}/home`);
}
```

`sidebar` 也可以简写为 `true`，此时入口会使用页面的 `id`、`title`、`icon` 并放入默认的“插件”分组。如果页面已经注册，也可以单独调用 `ctx.ui.sidebar.addItem(...)`：

```js
ctx.ui.sidebar.addItem({
  id: "home-entry",
  title: "Hello Echo",
  icon: "tabler:sparkles",
  pageId: "home",
  section: "plugins",
  order: 10,
});
```

## 插件设置示例

插件设置入口会显示在插件管理页对应插件卡片上。设置页需要提供自定义 Vue 组件；组件可以通过 `ctx.ui.components` 复用 EchoMusic 的现成控件，也可以自己组织布局、读取和保存设置。

```js
export function activate(ctx) {
  const { defineAsyncComponent, defineComponent, h, reactive } = ctx.vue;
  const Button = defineAsyncComponent(ctx.ui.components.Button);
  const Input = defineAsyncComponent(ctx.ui.components.Input);
  const Select = defineAsyncComponent(ctx.ui.components.Select);
  const Slider = defineAsyncComponent(ctx.ui.components.Slider);
  const Switch = defineAsyncComponent(ctx.ui.components.Switch);

  const defaults = {
    enabled: true,
    name: "Hello Echo",
    opacity: 80,
    mode: "normal",
    folderPath: "",
  };

  const SettingsPanel = defineComponent({
    setup() {
      const draft = reactive({ ...defaults });

      ctx.storage.get("settings").then((saved) => {
        if (saved && typeof saved === "object") {
          Object.assign(draft, { ...defaults, ...saved });
        }
      });

      const save = async () => {
        await ctx.storage.set("settings", { ...draft });
        ctx.toast.success("设置已保存");
      };

      const selectFolder = async () => {
        const result = await ctx.dialog.selectDirectory({
          title: "选择插件文件夹",
        });
        if (!result.canceled && result.paths[0]) {
          draft.folderPath = result.paths[0];
        }
      };

      return () =>
        h("div", { style: "display: grid; gap: 12px;" }, [
          h(
            "label",
            {
              style:
                "display: flex; justify-content: space-between; gap: 12px;",
            },
            [
              h("span", "启用"),
              h(Switch, {
                modelValue: draft.enabled,
                "onUpdate:modelValue": (value) => {
                  draft.enabled = Boolean(value);
                },
              }),
            ],
          ),
          h(Input, {
            modelValue: draft.name,
            placeholder: "名称",
            "onUpdate:modelValue": (value) => {
              draft.name = String(value ?? "");
            },
          }),
          h(Select, {
            modelValue: draft.mode,
            options: [
              { label: "普通", value: "normal" },
              { label: "紧凑", value: "compact" },
            ],
            "onUpdate:modelValue": (value) => {
              draft.mode = value === "compact" ? "compact" : "normal";
            },
          }),
          h(Slider, {
            modelValue: draft.opacity,
            min: 0,
            max: 100,
            step: 1,
            showValue: true,
            valueSuffix: "%",
            "onUpdate:modelValue": (value) => {
              draft.opacity = Number(value);
            },
          }),
          h("div", { style: "display: flex; gap: 8px; align-items: center;" }, [
            h(
              "span",
              { style: "flex: 1; overflow: hidden; text-overflow: ellipsis;" },
              draft.folderPath || "未选择文件夹",
            ),
            h(
              Button,
              { variant: "outline", size: "xs", onClick: selectFolder },
              { default: () => "选择" },
            ),
          ]),
          h(Button, { size: "xs", onClick: save }, { default: () => "保存" }),
        ]);
    },
  });

  ctx.ui.settings.define({
    title: "Hello Echo 设置",
    component: SettingsPanel,
  });
}
```

文件和文件夹选择由插件组件主动调用 `ctx.dialog.selectFiles(...)` / `ctx.dialog.selectDirectory(...)`。设置里通常保存本地路径，不是可直接渲染的 `file://` URL；需要展示本地图片或文件时，先通过 `ctx.fs.getFileUrl(filePath)` 转换。

设置值和跨窗口消息都应使用可克隆的普通数据。不要把 Vue `reactive` / `ref`、DOM 节点、函数、`File`、`Error` 等对象写入 `ctx.storage`、IPC 或 `BroadcastChannel`。如果插件开启了 `runtime.miniPlayer` / `runtime.desktopLyric` 并需要同步设置，建议先归一化并展开成普通对象：

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
