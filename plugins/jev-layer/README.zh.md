# DeepSeek Harness 的 JEV 决策层

[English](README.md) | 中文

这个可选插件提供有边界的 JEV 决策、独立的 worker/explorer/researcher 任务和只读 reviewer。每个子 Agent 都继承父 Agent 选择的供应商和模型，包括你配置的 DeepSeek V4.1 路由。JEV 使用 TypeSafe System One 接口；缺少密钥、无效回答、超时或 HTTP 错误会返回 `unavailable`，不会编造置信度。

## 在桌面应用中安装

使用支持 Intel 的 DeepSeek Harness 桌面应用。插件使用 JavaScript，不包含原生二进制、平台限制、安装脚本或新的本地推理运行时。它无法为仅支持 ARM 的应用增加 Intel 支持。

1. 打开 **插件 → 安装**（添加插件界面）。
2. 粘贴下面的包地址并安装。
3. 如果插件管理器提示，则重启应用。已安装的插件显示为 **JEV 决策层**。
4. 保持当前选择的模型。插件不会替换你的模型配置。

```text
https://raw.githubusercontent.com/xxxxxwater/deepseek-harness/refs/heads/feat/jev-decision-layer/plugins/jev-layer/releases/puregamma-dsh-jev-layer-0.1.0.tgz
```

如果 GitHub 下载被阻止，从此分支下载 `.tgz` 到 Mac，再把绝对路径（例如 `/Users/chris/Downloads/puregamma-dsh-jev-layer-0.1.0.tgz`）粘贴到同一个安装框。不要把整个仓库的首页地址当作 npm 插件安装。

清单允许的 DSH 运行时版本是 `0.2.0-rc.2` 和 `0.2.1-alpha.1`。其他版本须验证后才能支持；不要通过版本豁免绕过不匹配。桌面外壳版本可能与 DSH 运行时版本不同。兼容性与清理测试针对仓库运行时执行；macOS 桌面运行需要真实 Intel Mac。

## 接入 JEV

打开已安装插件的配置，通过 DSH 凭据选择器将 `apiKeyEnv` 凭据引用设置为 TypeSafe API Key。默认引用是 `TYPESAFE_API_KEY`。从终端启动时也可以提供同名环境变量；Finder 启动的 Mac 应用通常不会继承终端环境。密钥在调用时解析，不会包含在决策、日志或子 Agent 提示词中。

没有 JEV 凭据时，委派和审查仍使用选定的 DeepSeek 模型。决策明确报告 `unavailable`。插件不会用 LLM 模拟经过校准的 JEV 概率。

## 使用 Agent

```text
Use the JEV decision layer for this task. First ask an explorer to map the relevant files. Propose the plan and use jev_review at before_plan. Use jev_decide only when choosing between explicit files, tools, roles or retry/switch/stop options. Integrate worker changes yourself, run the relevant checks, then use jev_review at before_done and address its findings.
```

| 工具 | 行为 |
|---|---|
| `jev_decide` | 验证 2–32 个候选标签和完整概率分布。返回 `sharp`、`split` 或 `unavailable`；不会执行选定动作。 |
| `jev_delegate` | 执行一次性 worker、explorer 或 researcher 任务。`role=auto` 仅在 JEV 选择为 sharp 时调度；split/unavailable 不启动子 Agent。 |
| `jev_review` | 在 `before_plan`、`repeated_error` 或 `before_done` 时运行独立的只读 reviewer。 |

`sharp` 路由需要满足配置的置信度、前两名概率差和归一化熵阈值。初始值是部署选择，不是你的项目上的校准证据。`split` 或 `unavailable` 将控制权交回主 Agent。测试断言、编译结果和权限检查仍由宿主确定性执行。

只有父 Agent 负责集成结果。worker 不能使用 JEV 委派工具；只读角色只能执行 `readTools` 中的工具名，包括作用域工具仍然可见的情况。不要将 shell、写入、命令执行或任意 MCP 工具加入 `readTools`：名称无法证明工具确实只读。默认读取工具与宿主中可用工具取交集。配置的 `spawn` 供应商存在于基于标准 base 的 DSH 配置中；自定义组合需要支持角色提示、工具过滤和深度限制的供应商。

## 配置与停用

已安装的 **JEV 决策层** 配置提供接口、凭据引用、阈值、截止时间、子 Agent 容量和读取工具名称。决策请求只包含传给 `jev_decide` 的显式状态和候选，不会自动发送对话。`maxContextChars` 限制完整决策 JSON 和委派任务/输出。`maxResponseBytes` 限制完整 JEV 响应。

同名工具重复失败达到 `failureThreshold` 时会产生一次恢复提醒。`reviewBeforeDone` 默认关闭：启用后，每个根 Agent 回合最多调用一次 reviewer，将发现作为注明来源的上下文添加，再恢复主 Agent。自动完成审查会向选定模型发送最近八条 assistant/tool 事件；简单回合也可能增加开销。审查结果提供建议，不批准动作，也不保证主 Agent 采纳全部发现。

在应用的插件管理器中禁用或移除插件包。禁用会取消插件拥有的网络调用，并等待它拥有的子 Agent 清理完成。每个子 Agent 都有截止时间；并发子 Agent 数量在插件实例内统一限制。工具并发策略会独占调度 worker 工具调用。插件不会使整个 worker 任务成为事务，不隔离 worker 的 worktree，也不阻止其他宿主子 Agent 工具启动额外 worker。

## 从此分支构建和测试

插件独立放在 `plugins/` 下；上游产品组合仍需主动选择接入。安装仓库开发依赖后，再提供插件固定版本的 Zod 开发依赖（`npm install --ignore-scripts --legacy-peer-deps --prefix plugins/jev-layer`）。DSH 运行时在安装时提供可选对等依赖；发布包已打包 Zod。

```sh
pnpm exec tsc -b plugins/jev-layer/tsconfig.json
pnpm exec vitest run --config plugins/jev-layer/vitest.config.ts
node plugins/jev-layer/build.mjs
pnpm run build:lib:host
pnpm exec vitest run --config plugins/jev-layer/vitest.install.config.ts
```

构建输出 ESM，打包插件配置补丁和本地化元数据，并将压缩包校验和写入 `releases/`。测试组合加载生产 Loader、Agent 循环、工具注册表和进程内子 Agent 供应商。只有模型和 HTTP 响应使用预设结果。包不扩展 Agent 循环，也不引入新的持久化 Session 事件类型；决策工具结果和注明来源的审查上下文使用宿主已有日志。

源码测试包含 21 个无密钥用例。独立的安装测试包含两个用例，需要已构建的宿主库：它使用真实 pnpm 和配置启用流程，通过宿主对等依赖解析器启动已安装的压缩包，并检查禁用、移除和版本不兼容拒绝。默认离线安装本地压缩包；将 `DSH_JEV_INSTALL_SPEC` 设置为包地址可验证包安装服务的下载流程。这些检查在 Linux 上运行，不验证 Intel Mac 桌面执行或真实 JEV/DeepSeek 凭据。

## 模型与缓存影响

插件在组装后的提示词中添加稳定的路由指令和三个工具 schema。工具结果保留验证后的决策字段或子 Agent 发现；启用 reviewer 上下文后会增加一个父 Agent 步骤。JEV 推理是独立请求，与 DeepSeek 不共享 KV 缓存。修改插件配置或启用/禁用插件会改变提示词前缀，可能使供应商的前缀复用失效。

## 限制

插件不会训练 RLCD，不证明本地编程任务上的校准效果，也不承诺截图中的延迟/成本数据。置信度来自供应商，需要按任务评估。它不会自动替换所有文件/工具选择，也不会在每次存在歧义时分叉主 Agent。同一选定模型的独立 reviewer 提供上下文独立性，而非模型多样性。Intel Mac 桌面启动和真实 TypeSafe/DeepSeek 凭据验证是无密钥测试之外的独立验证步骤。
