# Change: Add Logging Functionality

## Why
当前项目缺乏统一的日志记录机制，难以追踪技能脚本的执行情况和调试问题。添加日志功能将帮助开发者了解系统运行状态，快速定位问题。

## What Changes
- 添加 Python 日志模块集成到核心脚本
- 支持不同日志级别（DEBUG, INFO, WARNING, ERROR）
- 日志输出到控制台和可选的文件
- 在关键操作点添加日志记录（搜索查询、结果数量、错误处理）

## Impact
- Affected specs: `core` (新增日志记录能力)
- Affected code: 
  - `.claude/skills/ui-ux-pro-max/scripts/core.py`
  - `.claude/skills/ui-ux-pro-max/scripts/search.py`
  - `.shared/ui-ux-pro-max/scripts/core.py`
  - `.shared/ui-ux-pro-max/scripts/search.py`
