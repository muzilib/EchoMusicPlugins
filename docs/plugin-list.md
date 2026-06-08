# 插件列表

本页收录当前仓库提供的 EchoMusic 插件。

插件 manifest 顶层 `icon` 字段指向的图标会用作插件管理页卡片图标；安装时复制整个插件文件夹即可。

## 在线安装

EchoMusic 的“插件管理”支持添加 GitHub 插件源。本仓库已提供根目录索引文件 `echo-plugins.json`，可直接添加以下地址：

```text
https://github.com/hoowhoami/EchoMusicPlugins
```

添加后可以在“在线插件”中浏览、安装和更新本仓库收录的插件。网络环境不佳时，可在 EchoMusic 设置的“实验性功能”里配置 GitHub 加速地址，插件源索引和插件下载会复用该地址。

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
