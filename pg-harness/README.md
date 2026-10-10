# PureGamma Harness installation and plugins

English | [中文](README.zh.md)

Install the release for your computer, add the bundled plugin capabilities, and continue using your existing local Harness data. The edition release is `puregamma-harness-v0.1.0`; the actual engine version is `0.2.1-alpha.2`.

<a id="installation"></a>

## Installation

Quit all Harness instances before installing plugins. The installer preserves existing dependencies, settings, sessions, and credentials, and writes reversible configuration backups under `.dsh/pg-harness-backups`. A fresh installation needs network access to download missing plugin libraries; no system Node.js installation is required.

| Platform | Steps |
| --- | --- |
| Intel Mac | Extract the x64 ZIP. Keep `Install PureGamma Harness.command` beside `PureGamma Harness.app`, run it once, then launch the app. |
| M-series Mac | Extract the arm64 ZIP and run the same adjacent command. Use the arm64 app on Apple Silicon. |
| Windows x64 | Run the EXE installer and quit the app if it opens. In the installed application folder, run `resources/pg-harness/Install PureGamma Harness.cmd`, then open the app. |
| Source | Extract the source ZIP or clone this repository. Follow the build steps below. |

You can move the Mac app after plugin installation. Mac builds are ad-hoc signed and have not been Apple notarized; the Windows build is unsigned. The application id and Electron data directory remain compatible with the upstream desktop installation. Personal conversations, context records, API credentials, and user profiles are excluded from every published artifact.

<a id="plugins-and-local-setup"></a>

## Plugins and local setup

The [inventory](bundled-plugins/inventory.json) records 13 third-party plugin archives, their exact versions, licenses, SHA-256 hashes, and the official bundles. The installer validates each new archive and retains an existing dependency's version and source. Four PureGamma UI packages add the plugin rail, IDE code colors, blue messages, and Chinese/English pixel typography.

| Package | Capability and setup |
| --- | --- |
| `dsh-context` | Inspect how the context is composed and how it changes. |
| `billion-context` | Compress conversation context; configure its model-related settings locally. |
| `@vectorize-io/hindsight-coding-agents` | Integrate long-term coding memory; configure a Hindsight connection locally. |
| `dsh-better-sidebar` | Browse files, edit, inspect changes, and access workspace panels beside a conversation. |
| `dsh-at-file` | Find and reference workspace paths with `@`. |
| `@linxin666/dsh-client-ui-skill-explorer` | Browse and manage skills from available sources. |
| `@dhicoc/dsh-reverse-skill` | Route reverse-engineering and authorized security-research skills. |
| `dsh-ego-browser` | Automate the browser and watch its live panel; install the plugin's required browser locally. |
| `dsh-magicpath` | Invoke MagicPath from a session; authenticate its CLI locally. |
| `dsh-sentinelx` | Connect SentinelX tools; complete the hub's OAuth authorization locally. |
| `dsh-univer-office` | Preview and collaborate on office files through its gateway and viewer. |
| `dshmarket` | Browse, search, and install community plugins. |
| `open-sea-skin` | Display an optional ocean skin where WebGPU is supported. |

Codex and Claude Code subagent bundles are part of the upstream source and runtime; their providers require local configuration. Included code does not supply any account, subscription, or API credentials. The capability rail shows mounted plugins and keeps pinned choices on the device; some entries open the relevant settings or tool panel rather than a dedicated page.

<a id="build-and-verify"></a>

## Build and verify

Use Node.js 24, the pnpm version in `package.json`, and a native host that matches the target. Install the locked dependencies before building. Each packaging command builds the source, prepares the runtime, and runs the packaged-runtime smoke checks.

| Target | Command |
| --- | --- |
| Intel Mac | `pnpm run package:desktop:mac:x64:unsigned --dir` |
| Apple Silicon Mac | `pnpm run package:desktop:mac:arm64:unsigned --dir` |
| Windows x64 | `pnpm run package:desktop:win:x64:unsigned` |

The manual [release build workflow](../.github/workflows/puregamma-desktop-release.yml) builds Windows and Apple Silicon on separate native runners. The source archive comes from the release commit. Run `node --test pg-harness/install.test.mjs` for profile-preservation checks. The owning client and desktop tests cover the brand, conversation previews, and packaging contracts.

The app carries this directory in its resources. The Windows helper and Mac command use the bundled runtime to run `install.mjs`; optional plugins are added to the reserved desktop profile. The upstream MIT license and third-party notices apply, and the pixel font licenses are included under `licenses`.
