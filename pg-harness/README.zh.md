# PureGamma Harness 安装与插件

[English](README.md) | 中文

安装适合本机的版本、添加内置插件能力，并继续使用原有本地 Harness 数据。此定制版本为 `puregamma-harness-v0.1.0`；实际引擎版本为 `0.2.1-alpha.2`。

<a id="installation"></a>

## 安装

安装插件前请退出所有 Harness 实例。安装程序保留已有依赖、设置、会话和凭据，并在 `.dsh/pg-harness-backups` 下生成可恢复的配置备份。全新安装需要联网下载缺少的插件依赖；无需在系统安装 Node.js。

| 平台 | 步骤 |
| --- | --- |
| Intel Mac | 解压 x64 ZIP。将 `Install PureGamma Harness.command` 与 `PureGamma Harness.app` 放在一起，运行一次后启动应用。 |
| M 系列 Mac | 解压 arm64 ZIP，运行同样的配套命令。Apple Silicon 使用 arm64 应用。 |
| Windows x64 | 运行 EXE 安装程序，若应用自动启动请先退出。在应用安装目录中运行 `resources/pg-harness/Install PureGamma Harness.cmd`，然后打开应用。 |
| 源码 | 解压源码 ZIP 或克隆仓库，按照下方构建步骤操作。 |

安装插件后可移动 Mac 应用。Mac 构建采用临时签名，未经 Apple 公证；Windows 构建未签名。应用标识和 Electron 数据目录保持与上游桌面版兼容。所有发布文件均不包含个人会话、上下文记录、API 凭据和用户配置。

<a id="plugins-and-local-setup"></a>

## 插件与本地配置

[清单](bundled-plugins/inventory.json)记录 13 个第三方插件归档、确切版本、许可证、SHA-256 校验值及官方插件组合。安装程序校验新归档，并保留已有依赖的版本和来源。4 个 PureGamma 界面插件提供插件图标栏、IDE 代码配色、蓝色消息和中英文像素字体。

| 插件 | 能力与配置 |
| --- | --- |
| `dsh-context` | 查看上下文构成及其变化。 |
| `billion-context` | 压缩会话上下文；在本机配置与模型有关的设置。 |
| `@vectorize-io/hindsight-coding-agents` | 接入编程长期记忆；在本机配置 Hindsight 连接。 |
| `dsh-better-sidebar` | 在会话旁浏览文件、编辑、检查变更并访问工作区面板。 |
| `dsh-at-file` | 使用 `@` 查找并引用工作区路径。 |
| `@linxin666/dsh-client-ui-skill-explorer` | 浏览并管理不同来源的技能。 |
| `@dhicoc/dsh-reverse-skill` | 路由逆向工程和经授权的安全研究技能。 |
| `dsh-ego-browser` | 自动操作浏览器并查看实时面板；在本机安装插件要求的浏览器。 |
| `dsh-magicpath` | 从会话调用 MagicPath；在本机完成其 CLI 认证。 |
| `dsh-sentinelx` | 接入 SentinelX 工具；在本机完成平台的 OAuth 授权。 |
| `dsh-univer-office` | 通过网关和查看器预览、协作办公文件。 |
| `dshmarket` | 浏览、搜索和安装社区插件。 |
| `open-sea-skin` | 在支持 WebGPU 的环境显示可选海洋皮肤。 |

Codex 与 Claude Code 子智能体组合已包含在上游源码和运行时中；服务提供商仍需本机配置。内置代码不提供任何账户、订阅或 API 凭据。能力图标栏展示已挂载的插件，置顶选择保存在设备上；部分入口打开相应设置或工具面板，而非独立页面。

安装程序为内置 `dsh-univer-office` 0.3.7 客户端加入预览兼容修复。原生调用和嵌套代码工具调用均可生成会话审阅卡片与实时窗口；在右侧边栏打开 `.univer` 文件即可使用文件预览。修复订阅当前轮次的 Chat 工具数据源，因此嵌套调用结果无需刷新整个会话即可显示。插件设置与依赖版本保持不变，原客户端会备份；无法识别的 0.3.7 构建会拒绝修改，其他版本保持原样。可读实现位于 `plugin-patches/univer-office`。

<a id="build-and-verify"></a>

## 构建与验证

使用 Node.js 24、`package.json` 指定的 pnpm 版本，以及与目标匹配的原生主机。构建前安装锁定依赖。各打包命令会构建源码、准备运行时并执行打包运行时冒烟检查。

| 目标 | 命令 |
| --- | --- |
| Intel Mac | `pnpm run package:desktop:mac:x64:unsigned --dir` |
| Apple Silicon Mac | `pnpm run package:desktop:mac:arm64:unsigned --dir` |
| Windows x64 | `pnpm run package:desktop:win:x64:unsigned` |

手动[发布构建工作流](../.github/workflows/puregamma-desktop-release.yml)在独立原生主机上构建 Windows 和 Apple Silicon 版本。源码包来自发布提交。运行 `node --test pg-harness/install.test.mjs pg-harness/plugin-patches/univer-office/preview.test.mjs` 验证配置保留与办公预览回归。预览测试通过真实 React 运行已发布客户端，并包含未修补客户端缺失预览的对照场景。对应的客户端与桌面测试覆盖品牌及打包约定。

应用的资源目录包含本目录。Windows 配套程序与 Mac 命令使用内置运行时执行 `install.mjs`，将可选插件添加到专用桌面配置中。适用上游 MIT 许可证和第三方声明，像素字体许可证包含在 `licenses` 下。
