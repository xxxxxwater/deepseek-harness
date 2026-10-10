# PureGamma Harness

English | [中文](README.zh.md)

![PureGamma Harness swallow](pg-harness/assets/pg-harness-mark-ui.png)

PureGamma Harness brings coding, browser automation, office work, skills, and context tools into one customizable agent workspace. This desktop edition builds on DeepSeek Harness `dsh-v0.2.1-alpha.2` and preserves its plugin architecture. The first PureGamma release is `puregamma-harness-v0.1.0`; the bundled engine reports its real version, `0.2.1-alpha.2`.

[Download the desktop release](https://github.com/xxxxxwater/deepseek-harness/releases) · [Installation and plugin guide](pg-harness/README.md) · [User guide](docs/user/guide/index.md)

<a id="harness-capabilities"></a>

## Harness capabilities

Use one conversation to work with files, run commands, inspect code changes, and coordinate coding agents. Choose a model and configure its credentials locally. The Harness supports Web and Desktop interfaces, project and user skills, external tools, and recoverable local conversations. Its Cordis architecture lets plugins extend both the agent tools and the interface.

| Capability | What you can do |
| --- | --- |
| Coding workspace | Read and edit project files, run commands, inspect changes, and use Codex or Claude Code subagents when configured. |
| Context management | Inspect context composition, review conversation turns, and use installed compression or memory plugins. |
| Browser and design | Drive the browser with ego-browser and invoke MagicPath through its bridge. |
| Office work | Preview and collaborate on documents and spreadsheets with Univer; the desktop runtime also includes office conversion tools. |
| Skills and tools | Browse skills, reference workspace paths with `@`, and connect SentinelX tools through its authenticated bridge. |
| Plugin ecosystem | Discover community packages in the plugin market and customize the workspace without replacing the core. |

<a id="a-desktop-built-around-plugins"></a>

## A desktop built around plugins

The permanent left rail exposes plugin capabilities as vector icons. Hover an icon to see its name and version; use the ellipsis menu to browse the remaining entries and pin favorites. The rail stays available when the sidebar is hidden, and its top edge leaves room for the macOS window controls.

The conversation turn rail displays compact marks beside the conversation. Hover a mark to preview that turn's question and reply, then click to jump to it. PureGamma's swallow and full pixel wordmark appear across the application. Code blocks use IDE-style syntax contrast, messages and sending controls use deep blue, and Chinese/English pixel fonts preserve the existing text sizes and colors.

<a id="included-plugin-capabilities"></a>

## Included plugin capabilities

The edition includes 13 third-party plugin code archives, four PureGamma UI packages, and the official bundles in the [versioned inventory](pg-harness/bundled-plugins/inventory.json). The source archive includes the same plugin code. Existing installed versions and settings take precedence during installation.

| Plugin group | Included packages |
| --- | --- |
| Context and memory | `dsh-context`, `billion-context`, `@vectorize-io/hindsight-coding-agents` |
| Coding workspace | `dsh-better-sidebar`, `dsh-at-file` |
| Skills | `@linxin666/dsh-client-ui-skill-explorer`, `@dhicoc/dsh-reverse-skill` |
| Browser, design, and tool bridges | `dsh-ego-browser`, `dsh-magicpath`, `dsh-sentinelx` |
| Office and discovery | `dsh-univer-office`, `dshmarket` |
| Visual customization | `open-sea-skin`, PureGamma plugin rail, code theme, blue bubbles, and pixel fonts |

Plugin code is included; services such as MagicPath, SentinelX, and Hindsight still require their own local setup or authentication. Installation does not prove that a provider connection has been configured. See the [plugin guide](pg-harness/README.md#plugins-and-local-setup) for details.

<a id="choose-a-download"></a>

## Choose a download

Select the artifact that matches your machine. Both Mac archives contain the app and a plugin installer; the Windows EXE contains the application and bundled plugin code. Read the [installation steps](pg-harness/README.md#installation) before first launch.

| Artifact | Target |
| --- | --- |
| Windows EXE | Windows x64 |
| Intel macOS ZIP | Intel Mac, x86_64 |
| Apple Silicon macOS ZIP | M-series Mac, arm64 |
| Source ZIP | Complete tracked source and bundled plugin archives |

Personal conversations, context records, API keys, and local profile files are excluded from the release. An upgrade preserves those files on your computer. These community builds do not use an Apple Developer ID or a Windows signing certificate; Mac builds are ad-hoc signed and are not notarized.

<a id="run"></a>

<a id="run-from-source"></a>

<a id="build-from-source"></a>

## Build from source

Install Node.js 24 and the repository's pnpm version, then clone this edition's `master` branch:

```sh
git clone --branch master https://github.com/xxxxxwater/deepseek-harness.git
cd deepseek-harness
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

The Web command starts the built UI at `http://127.0.0.1:3080`. Use the [desktop build guide](pg-harness/README.md#build-and-verify) to create native installers with the bundled runtime and plugins. Native desktop builds require a matching operating system and architecture.

<a id="development-and-attribution"></a>

## Development and attribution

Read the [development guide](docs/development.md), [architecture](docs/architecture.md), and [contribution guide](CONTRIBUTING.md). Agents follow [AGENTS.md](AGENTS.md). The upstream project remains in developer preview and can introduce compatibility changes; read its [safety notice](SAFETY.md).

PureGamma Harness is a [PG Research](https://pgresearch.org/) customization of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), developed by DeepSeek AI and powered by [Cordis](https://github.com/cordiverse/cordis). Original package identities and provider names remain intact for compatibility. The project uses the [MIT license](LICENSE); dependencies and plugin archives retain their own notices, including [third-party notices](THIRD_PARTY_NOTICES.md) and the pixel font's bundled licenses.
