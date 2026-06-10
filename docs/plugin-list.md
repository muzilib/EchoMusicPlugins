# 插件列表

本页收录当前仓库提供的 EchoMusic 插件。

插件 manifest 顶层 `icon` 字段指向的图标会用作插件管理页卡片图标；推荐通过在线插件源安装，也可以手动复制整个插件文件夹。

## 在线安装

EchoMusic 的“插件管理”支持添加 GitHub 插件源。本仓库已提供根目录索引文件 `echo-plugins.json`，可直接添加以下地址：

```text
https://github.com/hoowhoami/EchoMusicPlugins
```

添加后可以在“在线插件”中浏览、安装和更新本仓库收录的插件。插件源索引只记录插件位置和标签；插件名称、版本、描述、图标和兼容性要求都来自对应插件目录中的 `manifest.json`。插件源索引也可以收录其他 GitHub 仓库中的插件：在 `echo-plugins.json` 中为插件填写 `repo` 即可指向独立插件仓库，`path` 为空时表示插件位于该仓库根目录。网络环境不佳时，可在 EchoMusic 设置的“实验性功能”里配置 GitHub 加速地址，插件源索引、插件清单读取和插件下载会复用该地址。

## 手动安装

如果需要离线安装，也可以继续手动复制插件目录：

1. 在 EchoMusic 的“插件管理”里打开插件目录。
2. 将插件文件夹复制到 EchoMusic 插件目录。
3. 回到 EchoMusic 刷新插件并启用对应插件。

## 封面兜底

路径：[`cover-fallback`](../cover-fallback)

功能：

- 无封面或封面加载失败时自定义显示内容。
- 支持跟随当前主题色的文字 SVG 渲染。
- 支持本地图片文件或图片地址。
- 支持主窗口和 mini 播放器。

安装方式：

- 在线安装：添加本仓库插件源后，在“在线插件”中安装“封面兜底”。
- 手动安装：将 `cover-fallback` 整个文件夹复制到 EchoMusic 插件目录。

更多说明见 [封面兜底 README](../cover-fallback/README.md)。

## 信息区歌词滚动

路径：[`lyric-info-scroll`](../lyric-info-scroll)

功能：

- 在主播放器 PlayerBar 信息区用当前歌词替换歌曲名/歌手展示。
- 在 mini 播放器信息区用当前歌词替换歌曲名/歌手展示。
- 支持翻译或音译副文本。
- 支持滚动速度、显示强度和空歌词文案设置。
- 使用本地播放时间推算减少歌词显示延迟。

安装方式：

- 在线安装：添加本仓库插件源后，在“在线插件”中安装“信息区歌词滚动”。
- 手动安装：将 `lyric-info-scroll` 整个文件夹复制到 EchoMusic 插件目录。

更多说明见 [信息区歌词滚动 README](../lyric-info-scroll/README.md)。

## 频谱可视化

路径：[`spectrum-visualizer`](../spectrum-visualizer)

功能：

- 在主窗口 PlayerBar 显示跟随当前音频变化的频谱背景。
- 在 mini 播放器卡片显示频谱背景。
- 在歌词页底部控制栏上方显示频谱区域。
- 支持三个显示位置分别开关。
- 支持柱状、波形、混合模式和频谱采样参数设置。

安装方式：

- 在线安装：添加本仓库插件源后，在“在线插件”中安装“频谱可视化”。
- 手动安装：将 `spectrum-visualizer` 整个文件夹复制到 EchoMusic 插件目录。

更多说明见 [频谱可视化 README](../spectrum-visualizer/README.md)。
