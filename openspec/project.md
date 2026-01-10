# Project Context

## Purpose
AI Agent Router 是一个用于管理和路由 AI 代理的项目。项目包含多个 AI 助手技能（如 UI/UX Pro Max），使用 OpenSpec 进行规范驱动的开发，确保变更的可追溯性和一致性。

主要目标：
- 提供结构化的 AI 代理技能管理
- 使用 OpenSpec 规范管理项目变更
- 支持多种 AI 助手平台（Claude, Cursor）

## Tech Stack
- **Python 3** - 用于技能脚本（BM25 搜索算法、CSV 数据处理）
- **Markdown** - 规范文档和技能描述
- **Git** - 版本控制
- **OpenSpec** - 规范驱动开发框架

## Project Conventions

### Code Style
- **Python**: 使用 PEP 8 风格，UTF-8 编码（`# -*- coding: utf-8 -*-`）
- **文件命名**: kebab-case（如 `ui-ux-pro-max`）
- **目录结构**: 使用 `.claude/` 和 `.cursor/` 分别管理不同平台的配置
- **注释**: 使用中文或英文，保持清晰简洁

### Architecture Patterns
- **技能模块化**: 每个技能独立目录，包含数据、脚本和文档
- **数据驱动**: 使用 CSV 文件存储结构化数据（样式、颜色、字体等）
- **搜索优先**: 使用 BM25 算法进行语义搜索，而非硬编码规则
- **规范驱动**: 使用 OpenSpec 管理所有变更，确保可追溯性

### Testing Strategy
- 当前项目主要关注功能正确性
- Python 脚本应处理文件不存在、空数据等边界情况
- 建议添加单元测试验证 BM25 搜索算法和 CSV 解析逻辑

### Git Workflow
- **主分支**: `main` 分支用于稳定代码
- **提交信息**: 使用清晰的中文或英文描述变更
- **变更管理**: 使用 OpenSpec 变更提案流程，变更完成后归档到 `changes/archive/`

## Domain Context
- **AI Agent Skills**: 技能是模块化的功能单元，可以被 AI 助手调用
- **UI/UX Pro Max**: 当前主要技能，提供 UI/UX 设计智能搜索功能
  - 支持 50+ 样式、21 调色板、50 字体配对、20 图表类型
  - 支持 8 种技术栈（React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind）
- **BM25 搜索**: 使用 Okapi BM25 算法进行文本相关性排序
- **OpenSpec**: 规范驱动开发框架，通过 `proposal.md`、`tasks.md`、`design.md` 和规范增量管理变更

## Important Constraints
- **文件路径**: 技能脚本需要处理相对路径，确保在不同目录下都能正确找到数据文件
- **编码**: 所有文本文件使用 UTF-8 编码，支持中文内容
- **平台兼容**: 需要同时支持 Claude 和 Cursor 平台，保持配置同步
- **数据格式**: CSV 文件必须包含表头，使用逗号分隔

## External Dependencies
- **Python 3**: 必需，用于运行技能脚本
- **标准库**: 使用 Python 标准库（csv, re, pathlib, math, collections），无需额外依赖
- **OpenSpec CLI**: 用于验证和管理规范变更（如果已安装）
