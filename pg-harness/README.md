# PureGamma Harness

English | [中文](README.zh.md)

PureGamma Harness is a PG Research desktop edition of DeepSeek Harness, based on the upstream `dsh-v0.2.1-alpha.2` source. The first PureGamma edition is `puregamma-harness-v0.1.0`; the compatible bundled engine and application version remain `0.2.1-alpha.2`.

The PureGamma Research swallow inspired the new application artwork. PureGamma Harness replaces the desktop, welcome, sidebar, conversation hero, and browser icons. The plugin rail starts below the macOS window controls, stays visible when the sidebar is collapsed, and provides plugin name/version previews, a more menu, and device-local pins. The conversation turn rail previews real questions and replies and jumps to the selected turn. Optional UI packages provide IDE code colors, deep-blue message bubbles, and Chinese/English pixel typography without changing sizes or colors.

## Install on Intel macOS

Download the release ZIP, extract it, move `PureGamma Harness.app` to your preferred location, quit any running Harness instance, and run the included `Install PureGamma Harness.command` beside the app. The command uses the app's bundled runtime, installs the bundled plugins, and launches the app. No system Node installation is required. A fresh installation downloads any missing plugin libraries; existing installed plugin versions take precedence. This build is ad-hoc signed and has not been Apple notarized.

The existing `.dsh` sessions, settings, credentials, and third-party plugins remain local. The application id and Electron data directory stay compatible with the upstream desktop installation. The UI installer preserves other profile dependencies and configuration and writes a backup under `.dsh/pg-harness-backups`. No personal profile or credentials are included in the source or release.

## Build and verify

Use the repository's supported `pnpm run package:desktop:mac:x64:unsigned --dir` build. The app carries this directory in `Contents/Resources/pg-harness`. Run `node --test pg-harness/install.test.mjs` for the profile-preservation checks, and the owning client and desktop tests for brand and turn-preview changes. The upstream MIT license and third-party notices apply; package names and provider identifiers retain their original values.

## Bundled plugins

The release includes 13 third-party plugin code archives, 4 PureGamma UI packages, and the official bundles named in [the inventory](bundled-plugins/inventory.json). Archives preserve the installed package versions and their upstream notices. The installer verifies SHA-256 values, retains existing plugin dependency sources, and adds missing packages. Plugin authentication must be configured locally; no sessions, context records, API credentials, or personal profile files are shipped.
