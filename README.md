# LM Studio 简体中文补充补丁

补齐 LM Studio 官方中文（Beta）未覆盖的界面英文。在官方中文基础上额外替换约 6700 处文本，覆盖参数面板、模型管理、MCP、右键菜单、设置页等区域。

实测版本：**LM Studio 0.4.25**（Windows x64），其他版本见[兼容性](#兼容性)。

LM Studio 内置的简体中文翻译只覆盖部分界面，选了中文后仍会看到大量英文——右侧参数面板（温度、采样、GPU 卸载、KV 缓存等）、右键菜单、部分按钮和状态文本。这些文本硬编码在程序文件里，不经过翻译系统，本补丁负责替换它们。

## 功能

- 约 6700 处替换：对话、模型管理、参数面板、MCP、本地服务、设置页、LM Link、转录等
- 参数面板 196 个配置键的标题与说明（官方翻译缺失部分）
- 自动备份原版文件，`--restore` 一键回滚
- 可重复运行，不会叠加损坏
- 写盘前自动校验文件完整性，异常时拒绝写入

## 环境要求

- LM Studio 0.4.25
- [Node.js](https://nodejs.org) 16 或更高（无其他依赖）

## 安装

### Windows

1. 完全退出 LM Studio（右键托盘图标 → Quit，或任务管理器结束全部 `LM Studio.exe`）
2. 双击 `install.bat`，按提示授权
3. 重新打开 LM Studio

### 手动（Windows / macOS / Linux）

```bash
node patch/apply-patch.js --dry-run    # 预览替换数量，不写任何文件
node patch/apply-patch.js              # 应用
node patch/apply-patch.js --path "安装目录"   # 自动检测失败时手动指定
```

输出以 `语法校验: 通过` 结尾即为成功。

### 模型包自定义字段（可选）

"Enable Thinking" 等开关文字来自模型包（`~/.lmstudio/hub/models/<厂商>/<模型>/model.yaml`），运行下面命令一并汉化：

```bash
node tools/patch-model-yamls.js
```

## 回滚

```bash
node patch/apply-patch.js --restore
```

原版备份在 `~/.lmstudio-chinese-patch/backups/`。补丁只改程序界面文件，模型、对话、设置数据（`~/.lmstudio`）不受影响。

## 升级后重新应用

LM Studio 升级会覆盖补丁。重新运行 `node patch/apply-patch.js` 即可，脚本按版本号存放备份，不会混淆。

若输出中的替换数量与之前差异很大，说明新版本界面结构变了，参考[为新版本适配](#为新版本适配)。

## 工作原理

LM Studio 的界面文本分三层：i18n 翻译键（官方 zh_CN 已覆盖约 98%）、硬编码英文（约 3100 处，不走翻译系统）、Chromium 原生对话框（本补丁不涉及）。

补丁按 8 个步骤依次处理 i18n 初始语言、JSX 属性、数组子元素、参数面板键值对、调用默认值、唯一短语和上下文短语。替换过程中有三道保护：

- **转义感知**：值里含转义序列时跳过，避免破坏内嵌 JSON
- **逻辑值黑名单**：约 27 个字符串同时充当界面文本和逻辑标识（如 tab 标识 `Inference`、状态机 `loading`、按键 `Enter`），翻译它们会导致参数面板消失、回车失效，因此保持英文
- **写盘校验**：内嵌 JSON 全量解析 + 文件语法检查，不通过则拒绝写入，写后异常自动回滚

另外，数学公式库（KaTeX）与代码编辑器（Monaco）的内部说明文字、以及运行时动态生成的文本（如消息上方的耗时统计）不在汉化范围内。

## 兼容性

| 版本 | 状态 |
|---|---|
| 0.4.25 (Windows x64) | 已充分测试 |
| 0.4.x 其他小版本 | 先跑 `--dry-run` 自检（见下） |
| 0.3.x 及更早 | 未测试 |
| macOS / Linux | 结构相同、路径已适配，未实测 |

自检方法：`node patch/apply-patch.js --dry-run`，输出中 `JSON 校验` 失败为 0、替换总数在 6000 以上即可放心应用。

## 为新版本适配

`tools/` 目录提供适配工具链：

| 脚本 | 用途 |
|---|---|
| `extract-missing-strings.js` | 提取硬编码英文清单 |
| `extract-llm-keys.js` | 提取参数面板键值对 |
| `extract-missing-i18n.js` | 找出官方翻译缺失的 i18n 键 |
| `diag-risky-all.js` | 重新生成逻辑值黑名单（新版本必跑） |
| `merge-dicts.js` | 合并字典 |
| `patch-model-yamls.js` | 汉化模型包 model.yaml |

> 工具脚本顶部的路径常量默认为 `D:/Program Files/LM Studio`，按实际安装路径修改。新版本适配时**必须重跑 `diag-risky-all.js`**，否则新增的逻辑标识可能被误翻。

## 常见问题

**应用后界面没变化？**
LM Studio 有托盘进程，右键托盘图标 Quit 后重新打开。

**应用后白屏或打不开？**
`node patch/apply-patch.js --restore` 恢复原版，然后把 `--dry-run` 的完整输出发到 issue。

**右侧参数面板消失？**
使用的补丁版本缺少逻辑值黑名单。恢复原版后按上文重新生成补丁。

**官方以后出正式中文怎么办？**
`--restore` 退役本补丁即可；也可以继续用，硬编码文本官方大概率不会迁移到翻译系统。

## 项目结构

```
├── README.md / LICENSE / CHANGELOG.md
├── install.bat / install.sh
├── patch/
│   ├── apply-patch.js          # 核心补丁脚本
│   └── dicts/                  # 翻译字典 + 逻辑值黑名单
└── tools/                      # 升级适配工具
```

## 致谢

- [C2H12O6/lm-studio-simplified-chinese](https://github.com/C2H12O6/lm-studio-simplified-chinese)（MIT）——基础字典与思路
- [lmstudio-ai/localization](https://github.com/lmstudio-ai/localization)——官方社区翻译

## 许可

MIT。翻译字典中源自 C2H12O6 项目的部分遵循其原许可。
