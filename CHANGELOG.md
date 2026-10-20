# 更新日志

所有显著变更记录于此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.1.0] - 2026-10-20

### 新增
- 第 9 步替换管线 + 上下文限定规则表 `patch/dicts/t_round5_ctx.txt`（40 条）：
  覆盖属性正则打不到的形态——枚举映射值、条件表达式 / 空值合并、JSX 数组非首元素、
  插件 switch 分支返回值、带引号属性名（`"aria-label":"..."`）
- 属性名扩展 5 类：`displayName` / `sectionNameTranslationKeyOrTitle` / `sectionPrettyName` /
  `routeName` / `alt`（激活字典中长期休眠的条目）
- `patch/patch-extra.js`：主进程 `main/index.js`（启用思考 / 控制支持 enable_thinking 的对话模板）
  + 内置插件包 `bundled-plugin-rag-v1.tar.gz`（检索数量上限 / 检索相似度阈值）；
  解压 → 改 → 重打包 → 重新解压校验 → 替换，支持 `--dry-run` / `--restore`
- `tools/run-patch.bat`：非交互批量运行器，依次执行三个脚本并汇总到 `tools/patch-run.log`
- 第 10 步替换管线 + 字典 `patch/dicts/t_round6_aria.txt`（131 条）：按钮提示 / 无障碍标签 / 输入占位批量汉化。
  按形态精确匹配（`"aria-label":"…"` / `tooltip:"…"` / `placeholder:"…"`），不误伤同名标识符；
  刻意保留 6 条开发态与状态令牌（`Input variant: …`、`inputSize: …`、`NOT_READY`）不动

### 变更
- `install.bat` / `tools/run-patch.bat`：Node 探测改为三级（系统 PATH → WorkBuddy 托管运行时 →
  Program Files），不再硬依赖系统 PATH；提权链改为**以管理员身份重新调用自身**，
  确保提权后仍走同一套探测；`install.bat` 提权链同步补上 `patch-extra.js`
- `apply-patch.js`：全部替换步骤加入 CJK 闸门（源串含中日韩字符即跳过并计数），落实「只新增不覆盖」
- `tools/patch-model-yamls.js`：改为递归扫描全部 `**/model.yaml`（原先硬编码 3 个文件，
  新装模型必然漏网）
- 用语对齐官方 zh_CN 译文：Speculative Decoding → 投机解码、Local Server → 本地服务器、
  Flash Attention → 快速注意力

### 修复
- 语言下拉「简体中文 (Beta)」「繁體中文 (Beta)」「日本語 (Beta)」「한국어 (Beta)」被字典误覆盖，
  Beta 标记消失（删除 4 条含 CJK 的键 + 全步骤闸门）
- `flashAttention/title` 字典值误写为英文 `Flash Attention`，会把官方 zh_CN 译文「快速注意力」
  反向覆盖回英文
- 8 个参数说明 subTitle 为占位符「副标题」（原文即西班牙语占位符），补齐正经译文
- 插件筛选 / 插件选项按钮的 `aria-label` 未汉化（属性名带引号，属性正则打不到）
- 新增 27 条界面文案（General / Quickstart / Overview / Embeddings / 物理批大小 / 上下文检查点 /
  输出约束 / 算力调优 / 内存与压缩 等）与 9 条参数键
- gpt-oss-20b 的 Reasoning Effort 漏网（displayName / description / 低中高 共 5 处）

### 验证（LM Studio 0.4.25+1 / Windows x64 实测）
- 7184 处替换（round5 7014 + round6 170）；384 个内联 JSON chunk 全量解析 0 失败；写回后整文件语法校验通过
- 剩余英文 tooltip/aria-label/placeholder = 6 条，全部为刻意保留的开发态字符串
- 连续运行两次结果一致（幂等）：第二次同值、模型 yaml 0 处、
  主进程与插件包均自原版备份重算

## [1.0.0] - 2026-10-10

### 首个公开发布版本（实测于 LM Studio 0.4.25 / Windows x64）

#### 新增
- 一键安装脚本 `install.bat`（Windows，自动提权与 Node 检测）/ `install.sh`（macOS / Linux）
- 一键回滚脚本 `uninstall.bat`（Windows）
- 核心补丁脚本 `patch/apply-patch.js`：8 步替换管线，约 6700 处界面文本汉化
- 翻译字典 2166 条（基础 1953 + 参数键 196 + 杂项 17）：
  - 基础字典含源自 C2H12O6/lm-studio-simplified-chinese 的 1084 条（MIT）
  - 新增参数面板键 196 条（温度/采样/GPU 卸载/KV 缓存/推测解码/思考预算等）
  - 新增对话输入框、右键菜单、模型分类等杂项
- 模型包自定义字段汉化工具 `tools/patch-model-yamls.js`
- 升级适配工具链 `tools/`（6 个脚本）

#### 安全机制
- 转义感知替换：值含 `\"` `\\` 等转义序列时跳过（修复 JSON 断裂白屏）
- 逻辑值黑名单：3650 个预扫描逻辑值（tabId/panelId、状态机 case、Zod literal、键盘 key），
  防止"右侧参数面板消失、点设置无反应、回车失效"类静默故障
- 产物校验：384 个内联 JSON chunk 全量解析 + 整文件语法检查，失败拒绝写盘，写后失败自动回滚
- 幂等基线：始终从原版备份重算，按版本号存放，升级后重跑不会版本错乱

#### 禁用
- 常量赋值替换（原 Step4）：会破坏状态机常量与 TS 枚举反向映射，禁用（损失 34 处文案）

#### 已知局限
- "Thought for N minutes"（运行时拼接）、KaTeX 库说明（13 条）、Monaco 编辑器配置（约 300 条）、
  Chromium 原生对话框均不翻译，详见 README
