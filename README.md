# LM Studio 简体中文补充汉化补丁

> 一键把 LM Studio 的界面残缺英文补齐为简体中文。基于官方内置中文（Beta）之上工作，共替换约 **6700 处**界面文本，覆盖参数面板、模型管理、MCP、设置页、右键菜单等区域。
>
> 实测版本：**LM Studio 0.4.25**（Windows x64）。其他版本请先看[兼容性](#兼容性)。

---

## 这是什么

LM Studio 从 0.3.x 起内置了社区维护的简体中文翻译（Settings → Language → 简体中文，标注 Beta），但它只覆盖了一部分界面。选了中文后你仍会看到大量英文——右侧参数面板（温度、采样、GPU 卸载、KV 缓存、推测解码）、右键菜单、部分按钮和状态文本——因为那部分文本**硬编码在编译产物里，不经过翻译系统**。

本补丁做的事：

1. 把 i18next 初始语言切换为 `zh_CN`（等效于官方设置里的语言选项）；
2. 替换约 3100 处硬编码英文（按钮、标签、提示、aria 标签等 11 种属性形态）；
3. 补齐官方翻译缺失的 196 个参数键 + 若干默认值键；
4. 顺带汉化模型包 `model.yaml` 里的自定义字段显示名（如 "Enable Thinking" → "启用思考"）。

**与 C2H12O6/lm-studio-simplified-chinese 的关系**：本项目最初基于该补丁的思路与字典（1084 条，MIT）扩展而来，在其基础上新增了转义感知、逻辑值黑名单、产物校验三道安全闸门，并修复了它在 0.4.25 上的兼容问题。感谢原项目作者。

---

## 特性

- ✅ 约 6700 处替换，覆盖 26+ 功能区域（对话、模型管理、参数面板、MCP、服务、设置、LM Link、转录……）
- ✅ 纯本地运行：无网络请求、无注册表修改、无外部命令，脚本可全程人工审查（约 200 行）
- ✅ 自动备份原版文件到用户目录，`--restore` 一键回滚，无需管理员权限
- ✅ 幂等：从原版基线重算，重复运行不会叠加损坏
- ✅ 三道安全闸门（转义感知 / 逻辑值黑名单 / 产物校验），坏文件拒绝写盘，写盘后语法校验失败自动回滚

### 已知局限（诚实版）

| 局限 | 说明 |
|---|---|
| 消息上方 "Thought for 1 minutes 16 seconds" | 运行时动态拼接，程序文件里不存在这句，无法翻译 |
| KaTeX 数学库的约 13 条内部说明串 | 库内部文档，翻错风险高，刻意放弃 |
| 代码编辑器（Monaco）约 300 条配置描述 | 只在开发者模式深层设置偶尔露出，ROI 低，刻意放弃 |
| Chromium 原生对话框（文件选择等） | 由 .pak 文件控制，本补丁不碰 |
| 约 27 个"双身份"字符串 | 既当显示文本又当逻辑标识（如 tabId `Inference`、状态机 `loading`、回车键 `Enter`），翻了会导致右侧参数面板消失、点设置无反应——**刻意保留英文** |
| LM Studio 升级后失效 | 升级会覆盖主文件，需重新运行补丁（见下文） |

---

## 环境要求

- LM Studio **0.4.25**（其他版本见[兼容性](#兼容性)）
- Node.js **16 或更高**（无第三方依赖）。没有的话去 https://nodejs.org 下载安装 LTS 版即可。

---

## 安装

### Windows 一键

1. **完全退出 LM Studio**（右键托盘图标 → Quit；若托盘无图标，用任务管理器结束全部 `LM Studio.exe`）；
2. 双击 `install.bat`；
3. 看到 `COPY OK` / `完成` 后重新打开 LM Studio。

> 某些安装位置（如 `D:\Program Files\LM Studio`）写入需要管理员权限，bat 会自动请求 UAC 授权。

### 手动（Windows / macOS / Linux）

```bash
# 预览将替换多少处（不写任何文件，建议先跑）
node patch/apply-patch.js --dry-run

# 应用汉化
node patch/apply-patch.js

# 若自动检测不到安装目录，手动指定
node patch/apply-patch.js --path "/Applications/LM Studio.app/Contents/Resources"
```

预期输出以 `共替换: 6691 处`（数字随版本浮动）+ `JSON 校验: 384 个 chunk, 失败 0` + `语法校验: 通过` 结尾。

### 模型包自定义字段（可选）

"Enable Thinking / Truncate Thinking History" 这组开关来自**模型包**（`~/.lmstudio/hub/models/<厂商>/<模型>/model.yaml`），不在程序里。要汉化它们：

```bash
node tools/patch-model-yamls.js
```

脚本会自动备份（`.bak`）并只改显示文本，不动功能键。注意 LM Studio 的模型清单同步可能会覆盖此修改，重新运行脚本即可。

---

## 回滚

```bash
node patch/apply-patch.js --restore
```

原版备份存放在 `~/.lmstudio-chinese-patch/backups/main_window.js.<版本号>.original`（带版本号，升级后不会被误恢复成旧版文件）。恢复后重启 LM Studio 即可。

**终极兜底**：补丁不碰模型、对话、设置数据（都在 `~/.lmstudio`），重装 LM Studio 即可彻底还原。

---

## LM Studio 升级后怎么办

升级会覆盖补丁，汉化失效。处理流程：

1. 完全退出 LM Studio；
2. 重新运行 `node patch/apply-patch.js`（脚本自动从新版文件重算，原版备份按版本号分开存放，不会版本错乱）；
3. `--dry-run` 的命中数若与上次记录（约 6700）差很多，说明新版本 UI 结构变了——先看[为新版本适配](#为新版本适配)。

---

## 兼容性

| 版本 | 状态 |
|---|---|
| 0.4.25 (Windows x64) | ✅ 充分实测（本项目的诞生环境） |
| 0.4.x 其他小版本 | ⚠️ 大概率可用：先跑 `--dry-run`，若命中数在 6000+ 且 JSON 校验 0 失败即可放心应用 |
| 0.3.x 及更早 | ❌ 未测试，界面结构与 0.4 差异大 |
| macOS / Linux | ⚠️ 结构相同，路径已适配，但未实测，欢迎反馈 |

**兼容性自检命令**：

```bash
node patch/apply-patch.js --dry-run
```

看输出末尾三行：`JSON 校验: 384 个 chunk, 失败 0` + `语法校验: 通过`（--dry-run 模式下语法校验跳过，JSON 校验必须 0 失败）。失败 0 = 可以安全应用。

---

## 为新版本适配（进阶）

LM Studio 更新后 UI 文本会变化。`tools/` 目录提供了完整的适配工具链：

| 脚本 | 用途 |
|---|---|
| `extract-missing-strings.js` | 提取硬编码英文短语清单（供翻译补充字典） |
| `extract-llm-keys.js` | 提取参数面板 `llm.*` 键值对 |
| `extract-missing-i18n.js` | 找出官方 zh_CN 缺失、代码里以默认值形式存在的 i18n 键 |
| `diag-risky-all.js` | **扫描逻辑值黑名单**（生成 `patch/dicts/logic-values.json`，新版本必跑） |
| `merge-dicts.js` | 合并新旧字典 |
| `patch-model-yamls.js` | 汉化模型包 model.yaml 的自定义字段 |

> 注意：tools 内脚本顶部的 `FILE` 常量默认指向 `D:/Program Files/LM Studio`，请按你的安装路径修改。**新版本适配的关键是重跑 `diag-risky-all.js`**——新 UI 可能引入新的逻辑值，跳过它们才能避免"面板消失"类问题。

### 为什么需要逻辑值黑名单（血泪教训）

LM Studio 里约 27 个字符串**既当显示文本又当逻辑标识**：

- `Inference` / `Overrides` / `Load` / `Info` → 模型面板的 tabId/panelId，翻成"推理"后右侧参数面板整栏消失；
- `loading` / `unloading` / `downloading` / `ready` → 模型加载状态机与 Zod 校验值；
- `Enter` / `Continue` → 键盘按键与语句标签；
- `t.DOWNLOADING="Downloading"` → 下载状态常量。

这些词翻了之后**语法校验和 JSON 校验都通过**，但功能静默失效——这是本补丁开发过程中踩过的最深的坑。黑名单机制保证它们永远保持英文原样。

---

## 项目结构

```
lm-studio-chinese-patch/
├── README.md
├── LICENSE                  # MIT（字典部分翻译源自 C2H12O6 项目，见致谢）
├── install.bat              # Windows 一键安装
├── install.sh               # macOS / Linux 一键安装
├── CHANGELOG.md
├── patch/
│   ├── apply-patch.js       # 核心补丁脚本（约 230 行，可全程人工审查）
│   └── dicts/
│       ├── T_dict.json          # 基础字典 1953 条（含 C2H12O6 的 1084 条）
│       ├── T_llm_title.json     # 参数面板标题键 112 条
│       ├── T_llm_desc.json      # 参数面板描述键 84 条
│       ├── T_round2.json        # 聊天输入框/侧栏杂项 11 条
│       ├── T_missing2.json      # i18n 默认值补键 2 条
│       ├── t_round3_pairs.txt   # 全局唯一短语 9 条
│       ├── t_round3_ctx.txt     # 上下文限定短语 5 条
│       └── logic-values.json    # 逻辑值黑名单 3650 项（0.4.25 生成）
└── tools/                   # 升级适配工具链（见上文）
```

---

## 常见问题

**Q: 应用后界面没变化？**
A: 99% 是没完全退出——LM Studio 有托盘进程，右键托盘图标 Quit 后重开。

**Q: 应用后白屏 / 打不开？**
A: 脚本有三道闸门理论上不会发生。若发生（比如版本不兼容），跑 `node patch/apply-patch.js --restore` 秒回原版，然后把 `--dry-run` 的完整输出发到 issue。

**Q: 右侧参数面板消失了 / 点设置没反应？**
A: 说明你用的补丁版本没有逻辑值黑名单（或该版本逻辑值变了）。恢复原版 → 按[为新版本适配](#为新版本适配)重跑 `diag-risky-all.js` → 重新生成补丁。

**Q: 会影响我的模型和对话数据吗？**
A: 不会。补丁只改程序界面文件，模型、对话、设置全部在 `~/.lmstudio`，与安装目录无关。

**Q: 官方以后出正式中文版怎么办？**
A: 直接 `--restore` 退役本补丁。也可以继续用——硬编码文本官方大概率不会迁移到 i18n 体系。

---

## 致谢

- [C2H12O6/lm-studio-simplified-chinese](https://github.com/C2H12O6/lm-studio-simplified-chinese)（MIT）——基础字典 1084 条与 i18n 切换思路
- [lmstudio-ai/localization](https://github.com/lmstudio-ai/localization)——官方社区翻译，本项目的 zh_CN 基线
- 所有 LM Studio 中文社区用户

## 许可

MIT。翻译字典中源自 C2H12O6 项目的部分遵循其原 MIT 许可。
