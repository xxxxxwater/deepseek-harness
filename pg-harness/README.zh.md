# PureGamma Harness

[English](README.md) | 中文

PureGamma Harness 是基于上游 `dsh-v0.2.1-alpha.2` 源码的 PureGamma Research 桌面定制版。首个定制版本为 `puregamma-harness-v0.1.0`；兼容的内置引擎与应用版本保留为 `0.2.1-alpha.2`。

PureGamma Research 的飞鸟启发了新版应用标志。PureGamma Harness 替换应用、欢迎页、侧栏、会话首屏和浏览器图标。插件图标栏从 macOS 窗口按钮下方开始，侧栏收起时仍显示，并提供插件名称和版本预览、省略号菜单和本机置顶。会话轮次导航预览真实提问与回复，点击后定位到对应轮次。可选 UI 插件提供 IDE 代码配色、深蓝气泡和保持字号与颜色的中英文像素字体。

## Intel macOS 安装

下载并解压发布 ZIP，将 `PureGamma Harness.app` 放到所需位置，退出正在运行的 Harness，然后运行与应用位于同一目录的 `Install PureGamma Harness.command`。安装命令使用应用内置运行时安装内置插件并启动应用，无需系统 Node。首次安装会下载缺少的插件依赖库；已有插件版本优先保留。本构建采用临时签名，未经过 Apple 公证。

现有 `.dsh` 会话、设置、凭据和第三方插件保留在本机。应用标识和 Electron 数据目录与上游桌面安装兼容。UI 安装器保留其他 profile 依赖与配置，并将备份写入 `.dsh/pg-harness-backups`。源码和发布包不含个人 profile 或凭据。

## 构建与验证

使用仓库支持的 `pnpm run package:desktop:mac:x64:unsigned --dir` 构建。应用将此目录放入 `Contents/Resources/pg-harness`。执行 `node --test pg-harness/install.test.mjs` 检查 profile 保留行为，品牌和轮次预览由对应客户端与桌面测试验证。上游 MIT 许可与第三方声明继续适用；包名与服务提供方标识保持原值。

## 内置插件

发布包包含 13 个第三方插件代码包、4 个 PureGamma 界面插件，以及[清单](bundled-plugins/inventory.json)中的官方插件。代码包保留本机已安装版本及上游声明。安装器校验 SHA-256，保留已有插件依赖来源，并补充缺少的插件。插件登录需在本机自行配置；发布包不携带会话、上下文记录、API 凭据或个人 profile 文件。
