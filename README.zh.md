# PureGamma Harness

[English](README.md) | 中文

![PureGamma Harness 燕子标志](pg-harness/assets/pg-harness-mark-ui.png)

PureGamma Harness 将编程、浏览器自动化、办公、技能和上下文工具整合进一个可定制的智能体工作区。桌面版基于 DeepSeek Harness `dsh-v0.2.1-alpha.2`，保留其插件架构。首个 PureGamma 版本为 `puregamma-harness-v0.1.0`；内置引擎仍显示真实版本 `0.2.1-alpha.2`。

[下载桌面版](https://github.com/xxxxxwater/deepseek-harness/releases) · [安装与插件说明](pg-harness/README.zh.md) · [用户指南](docs/user/guide/index.zh.md)

<a id="harness-capabilities"></a>

## Harness 能力

在同一个会话里操作文件、执行命令、检查代码变更，并协调编程智能体。选择模型后，在本机配置凭据。Harness 提供 Web 与桌面界面、项目和用户技能、外部工具，以及可恢复的本地会话。Cordis 架构允许插件同时扩展智能体工具和应用界面。

| 能力 | 可以完成的工作 |
| --- | --- |
| 编程工作区 | 读取和编辑项目文件、执行命令、检查变更，并在配置后使用 Codex 或 Claude Code 子智能体。 |
| 上下文管理 | 查看上下文构成、回顾会话轮次，并使用已安装的压缩或记忆插件。 |
| 浏览器与设计 | 使用 ego-browser 操作浏览器，通过桥接插件调用 MagicPath。 |
| 办公 | 使用 Univer 预览和协作文档、表格；桌面运行时还包含办公文件转换工具。 |
| 技能与工具 | 浏览技能、通过 `@` 引用工作区路径，并通过认证桥接接入 SentinelX 工具。 |
| 插件生态 | 在插件市场发现社区插件，扩展工作区而无需替换核心。 |

<a id="a-desktop-built-around-plugins"></a>

## 围绕插件设计的桌面界面

常驻左侧图标栏以矢量图标展示插件能力。鼠标悬停可查看名称和版本；通过省略号菜单浏览其他入口并置顶常用项。侧边栏隐藏时图标栏仍可使用，其顶部为 macOS 窗口按钮留出空间。

会话轮次导航在对话旁显示紧凑的刻度。悬停可预览对应轮次的提问与回复，点击可跳转。应用统一使用 PureGamma 燕子标志和完整的像素字标。代码块采用 IDE 风格的语法对比，消息与发送控件使用深蓝色，中英文字体采用像素字体并保留既有字号与颜色。

<a id="included-plugin-capabilities"></a>

## 内置插件能力

此版本包含 13 个第三方插件代码归档、4 个 PureGamma 界面插件，以及[版本清单](pg-harness/bundled-plugins/inventory.json)中的官方插件组合。源码包包含相同的插件代码。安装时优先保留已有插件版本和设置。

| 插件分组 | 包含的插件 |
| --- | --- |
| 上下文与记忆 | `dsh-context`、`billion-context`、`@vectorize-io/hindsight-coding-agents` |
| 编程工作区 | `dsh-better-sidebar`、`dsh-at-file` |
| 技能 | `@linxin666/dsh-client-ui-skill-explorer`、`@dhicoc/dsh-reverse-skill` |
| 浏览器、设计与工具桥接 | `dsh-ego-browser`、`dsh-magicpath`、`dsh-sentinelx` |
| 办公与插件发现 | `dsh-univer-office`、`dshmarket` |
| 视觉定制 | `open-sea-skin`、PureGamma 插件图标栏、代码主题、蓝色气泡与像素字体 |

插件代码已经包含；MagicPath、SentinelX、Hindsight 等服务仍需各自在本机完成配置或认证。安装插件不等于已配置服务连接。详见[插件说明](pg-harness/README.zh.md#plugins-and-local-setup)。

<a id="choose-a-download"></a>

## 选择下载内容

选择与本机匹配的文件。两个 Mac 包均包含应用和插件安装程序；Windows EXE 包含应用及内置插件代码。首次启动前请阅读[安装步骤](pg-harness/README.zh.md#installation)。

| 文件 | 适用平台 |
| --- | --- |
| Windows EXE | Windows x64 |
| Intel macOS ZIP | Intel Mac，x86_64 |
| Apple Silicon macOS ZIP | M 系列芯片 Mac，arm64 |
| Source ZIP | 完整的已提交源码和插件归档 |

发布内容不包含个人会话、上下文记录、API 密钥或本地配置文件。升级会保留电脑上的这些文件。社区构建未使用 Apple Developer ID 或 Windows 签名证书；Mac 版采用临时签名，未经 Apple 公证。

<a id="run"></a>

<a id="run-from-source"></a>

<a id="build-from-source"></a>

## 从源码构建

安装 Node.js 24 和仓库指定的 pnpm 版本，然后克隆本版本的 `master` 分支：

```sh
git clone --branch master https://github.com/xxxxxwater/deepseek-harness.git
cd deepseek-harness
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

Web 命令会在 `http://127.0.0.1:3080` 启动已构建的界面。使用[桌面构建指南](pg-harness/README.zh.md#build-and-verify)生成包含运行时和插件的安装包。原生桌面构建需要匹配的操作系统和处理器架构。

<a id="development-and-attribution"></a>

## 开发与致谢

阅读[开发指南](docs/development.zh.md)、[架构文档](docs/architecture.zh.md)和[贡献指南](CONTRIBUTING.zh.md)。智能体遵循 [AGENTS.md](AGENTS.md)。上游仍处于开发者预览阶段，可能引入兼容性变更；请阅读[安全说明](SAFETY.zh.md)。

PureGamma Harness 是 [PG Research](https://pgresearch.org/) 对 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的定制，原项目由 DeepSeek AI 开发并由 [Cordis](https://github.com/cordiverse/cordis) 驱动。为兼容性保留原有包标识和服务提供商名称。项目使用 [MIT 许可证](LICENSE)；依赖与插件归档保留各自声明，包括[第三方声明](THIRD_PARTY_NOTICES.md)及内置像素字体许可证。
