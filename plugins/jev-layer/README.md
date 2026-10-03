# JEV Decision Layer for DeepSeek Harness

English | [中文](README.zh.md)

This optional plugin adds bounded JEV decisions, independent worker/explorer/researcher tasks, and a read-only reviewer. Every child inherits the parent’s selected provider and model, including a configured DeepSeek V4.1 route. JEV uses the TypeSafe System One endpoint; a missing key, invalid answer, timeout or HTTP error returns `unavailable` with no invented confidence.

## Install in the desktop application

Use an Intel-compatible DeepSeek Harness desktop application. The plugin is JavaScript and contains no native binaries, platform restriction, install script or new local inference runtime. It cannot add Intel support to an ARM-only application.

1. Open **Plugins → Install** (the add-plugin interface).
2. Paste the package URL below and install it.
3. Restart the application if the plugin manager requests it. The installed bundle appears as **JEV Decision Layer**.
4. Keep your current model selected. The plugin never replaces your model configuration.

```text
https://raw.githubusercontent.com/xxxxxwater/deepseek-harness/refs/heads/feat/jev-decision-layer/plugins/jev-layer/releases/puregamma-dsh-jev-layer-0.1.0.tgz
```

If downloading from GitHub is blocked, download the `.tgz` from this branch to your Mac and paste its absolute path, such as `/Users/chris/Downloads/puregamma-dsh-jev-layer-0.1.0.tgz`, into the same installer. Do not install the monorepo root URL as an npm plugin.

The manifest admits the DSH runtime versions `0.2.0-rc.2` and `0.2.1-alpha.1`. Other versions remain blocked until verified; do not grant a version exemption to bypass a mismatch. Desktop’s shell version may differ from its DSH runtime version. Compatibility and teardown tests run against the repository runtime; macOS desktop execution needs a real Intel Mac.

## Connect JEV

Open the installed plugin’s configuration and set its `apiKeyEnv` credential reference to a TypeSafe API key using DSH’s credential picker. The default reference is `TYPESAFE_API_KEY`. Shell launches may instead supply that environment variable; a Finder-launched Mac application normally does not inherit your shell environment. The key is resolved at call time and is never included in decisions, logs or child prompts.

Without JEV credentials, delegation and review still use the selected DeepSeek model. Decisions visibly report `unavailable`. The plugin does not emulate calibrated JEV probabilities with an LLM.

## Use the agent

```text
Use the JEV decision layer for this task. First ask an explorer to map the relevant files. Propose the plan and use jev_review at before_plan. Use jev_decide only when choosing between explicit files, tools, roles or retry/switch/stop options. Integrate worker changes yourself, run the relevant checks, then use jev_review at before_done and address its findings.
```

| Tool | Behavior |
|---|---|
| `jev_decide` | Validates 2–32 candidate labels and the complete probability distribution. Returns `sharp`, `split`, or `unavailable`; it does not execute a selected action. |
| `jev_delegate` | Runs a one-shot worker, explorer or researcher. `role=auto` dispatches only a sharp JEV choice; split/unavailable returns without starting a child. |
| `jev_review` | Runs a separate read-only reviewer at `before_plan`, `repeated_error` or `before_done`. |

A `sharp` route requires the configured confidence, top-two margin and normalized entropy thresholds. The initial values are deployment choices, not calibration evidence for your projects. A `split` or `unavailable` decision returns control to the main agent. Test assertions, compilation results and permission checks remain deterministic host operations.

Only the parent integrates results. Workers cannot use the JEV delegation tools; read-only roles can execute only names in `readTools`, including when a scoped tool remains visible. Do not add shell, write, command-execution or arbitrary MCP tools to `readTools`: names do not establish that a tool is actually read-only. The default read tools are intersected with tools available in the host. The configured `spawn` provider is present in standard base-backed DSH profiles; custom compositions need a provider supporting persona, tool filters and depth limits.

## Configure and disable

The installed **JEV Decision Layer** configuration exposes endpoint, credential reference, thresholds, deadlines, child capacity and read-tool names. Decision requests include only the explicit state and candidates supplied to `jev_decide`; they do not automatically send the conversation. `maxContextChars` bounds the complete decision JSON and delegated task/output. `maxResponseBytes` bounds the complete JEV response.

Repeated failures of the same tool produce one recovery reminder at `failureThreshold`. `reviewBeforeDone` is off by default: enabling it invokes at most one reviewer per root turn, appends its findings as attributed context and resumes the main agent. Automatic completion review sends the latest eight assistant/tool events to the selected model; it can add cost even on routine turns. Review results provide advice and never approve actions or guarantee that the main agent applies every finding.

Disable or remove the bundle in the application’s plugin manager. Disabling aborts owned network calls and waits for owned child runs to dispose. Each child has a deadline; simultaneous children are limited globally within this plugin instance. Worker tool calls are scheduled exclusively by the tool’s concurrency policy. The plugin does not make a whole worker task transactional, isolate worker worktrees or prevent unrelated host subagent tools from launching other workers.

## Build and test from this fork

This addon is isolated under `plugins/`; the upstream product composition remains opt-in. Install the repository’s development dependencies, then provide the addon’s pinned Zod development dependency (`npm install --ignore-scripts --legacy-peer-deps --prefix plugins/jev-layer`). The DSH runtime supplies the optional peers at installation time; the release bundles Zod.

```sh
pnpm exec tsc -b plugins/jev-layer/tsconfig.json
pnpm exec vitest run --config plugins/jev-layer/vitest.config.ts
node plugins/jev-layer/build.mjs
```

The build emits ESM, packages the bundle patch and localized metadata, and writes the archive checksum under `releases/`. The test composition loads the production Loader, agent loop, tool registry and in-process child provider. Only model and HTTP responses are scripted. The package does not extend the agent loop or introduce a new persisted Session event type; decision tool results and attributed review context use the host’s existing log.

## Model and cache effects

The plugin appends a stable routing instruction and three tool schemas to assembled prompts. Tool results retain validated decision fields or child findings; reviewer context adds another parent step when enabled. JEV inference is an independent request and has no shared KV cache with DeepSeek. Changing plugin configuration or enabling/disabling it changes the prompt prefix and can invalidate provider prefix reuse.

## Limits

This plugin does not train RLCD, demonstrate calibration on local coding tasks, or promise the screenshot’s latency/cost figures. Its confidence comes from the provider and needs task-specific evaluation. It does not automatically replace every file/tool choice or fork the main agent on every ambiguity. A separate reviewer using the same selected model has context independence, not model diversity. Intel Mac desktop launch and live TypeSafe/DeepSeek credentials are separate validation steps from the keyless tests.
