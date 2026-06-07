# 插件浮窗与 Now Playing

EchoMusic 插件可以声明独立的受控浮窗，用于桌面悬浮歌词、轻量工具条等场景。浮窗由主进程创建，插件只提供窗口入口脚本和样式，不直接接触 `BrowserWindow`。

## Manifest

```json
{
  "id": "dynamic-island-lyric",
  "name": "灵动岛歌词",
  "version": "1.0.0",
  "main": "index.js",
  "contributes": {
    "windows": [
      {
        "id": "island",
        "type": "floating",
        "title": "灵动岛歌词",
        "main": "island.js",
        "style": "island.css",
        "defaultWidth": 420,
        "defaultHeight": 72,
        "minWidth": 260,
        "minHeight": 56,
        "maxWidth": 720,
        "maxHeight": 180,
        "position": "top-center",
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": false,
        "movable": true,
        "acceptFirstMouse": true,
        "rememberBounds": true
      }
    ]
  }
}
```

窗口入口只允许插件目录内的 `.js` / `.mjs` 文件，样式只允许 `.css` 文件。

## 主插件入口

```js
export function activate(ctx) {
  ctx.windows.show("island", {
    width: 420,
    height: 72,
    alwaysOnTop: true,
  });
}

export function deactivate(ctx) {
  ctx.windows.close("island");
}
```

`ctx.windows` 会自动绑定当前插件 id，不能操作其他插件的窗口。`show(windowId, options?)` 支持临时覆盖 `width`、`height`、`x`、`y` 和 `alwaysOnTop`；不传时使用 manifest 中的默认尺寸、位置和置顶设置。

## 窗口入口

窗口脚本可以导出 `activateWindow(ctx)`、`activate(ctx)` 或默认函数。入口上下文独立于主插件上下文，只提供窗口渲染所需的 Vue、容器、私有存储、CSS 注入、Now Playing 和当前窗口控制 API。

```js
export function activateWindow(ctx) {
  const { h, createApp, ref, onMounted, onBeforeUnmount } = ctx.vue;

  const App = {
    setup() {
      const snapshot = ref(null);
      let dispose = null;

      onMounted(async () => {
        snapshot.value = await ctx.nowPlaying.getSnapshot();
        dispose = ctx.nowPlaying.onSnapshot((next) => {
          snapshot.value = next;
        });
      });

      onBeforeUnmount(() => dispose?.());

      return () =>
        h(
          "div",
          { class: "island" },
          snapshot.value?.lyric?.lines[
            snapshot.value?.lyric?.currentIndex ?? -1
          ]?.text ||
            snapshot.value?.playback?.title ||
            "EchoMusic",
        );
    },
  };

  const app = createApp(App);
  app.mount(ctx.container);
  ctx.dispose(() => app.unmount());
}
```

## Now Playing

插件浮窗通过 `ctx.nowPlaying` 读取与订阅中性的当前播放快照：

- `getSnapshot()`：读取当前快照。
- `onSnapshot(handler)`：订阅播放、歌词、主题变化。
- `command(command)`：发送播放/歌词命令。

快照包含：

- `playback`：当前歌曲、封面、时长、进度、播放状态、倍速和快照更新时间。
- `lyric`：歌词行、当前行索引、翻译/音译开关、歌词偏移、加载状态。
- `appearance`：深浅色、主题色、全局字体。

### 本地进度推算

`onSnapshot` 适合订阅状态变化，但它不是逐帧歌词时钟。歌词滚动、桌面歌词这类对时序敏感的插件，应使用 `playback.currentTime`、`playback.updatedAt` 和 `playback.playbackRate` 在本地推算当前播放时间，再叠加 `lyric.timeOffset` 计算歌词行，避免显示慢半拍。

```js
function getEstimatedPlaybackMs(playback) {
  if (!playback) return 0;
  const baseMs = Math.max(0, Number(playback.currentTime || 0) * 1000);
  if (!playback.isPlaying) return baseMs;

  const updatedAt = Number(playback.updatedAt || Date.now());
  const playbackRate = Math.max(0.1, Number(playback.playbackRate || 1));
  const elapsedMs = Math.max(0, Date.now() - updatedAt) * playbackRate;
  const durationMs = Math.max(0, Number(playback.duration || 0) * 1000);
  const seekMs = baseMs + elapsedMs;

  return durationMs > 0 ? Math.min(seekMs, durationMs) : seekMs;
}

function getLyricSeekMs(snapshot) {
  return (
    getEstimatedPlaybackMs(snapshot.playback) +
    Number(snapshot.lyric?.timeOffset || 0)
  );
}
```

`lyric.currentIndex` 仍可作为降级显示依据；如果插件需要更顺滑的歌词体验，建议优先按推算后的时间在 `lyric.lines` 中查找当前行。

常用命令：

```js
ctx.nowPlaying.command("togglePlayback");
ctx.nowPlaying.command("previousTrack");
ctx.nowPlaying.command("nextTrack");
ctx.nowPlaying.command("toggleTranslation");
ctx.nowPlaying.command("toggleRomanization");
ctx.nowPlaying.command("lyricOffsetBackward");
ctx.nowPlaying.command("lyricOffsetForward");
ctx.nowPlaying.command("lyricOffsetReset");
```

## 窗口控制

窗口入口中的 `ctx.window` 只控制当前插件窗口：

- `getBounds()`
- `move({ x, y, width, height })`
- `hide()`
- `close()`
- `setIgnoreMouseEvents(ignore)`

拖拽和锁定穿透应由插件窗口 UI 自己决定，但最终移动与穿透仍通过宿主 IPC 执行。

主插件入口中的 `ctx.windows` 可以控制当前插件声明的任意窗口：

- `show(windowId, options?)`
- `hide(windowId)`
- `close(windowId)`
- `move(windowId, bounds)`
- `getBounds(windowId)`
- `setIgnoreMouseEvents(windowId, ignore)`
