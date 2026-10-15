# 更新日志

所有显著变更记录于此。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

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
