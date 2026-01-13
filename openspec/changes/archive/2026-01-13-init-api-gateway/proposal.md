# Change: 初始化 API 网关项目

## Why
需要一个统一的 API 网关来管理和路由多个 AI 模型供应商（Anthropic、OpenAI、Gemini 等），为 Claude、Zcode、Alma 等客户端软件提供统一的接口。该网关需要支持灵活的模型配置、请求日志记录和可视化管理界面，最终发布为 npm CLI 工具以便于部署和使用。

## What Changes
- **新增 API 网关核心功能**：支持多种协议（Anthropic、OpenAI、Gemini），统一路由和转发请求
- **新增模型供应商管理**：支持添加、配置多个模型供应商（baseUrl、API Key）
- **新增模型管理功能**：支持手动添加模型和自动拉取模型列表
- **新增 Web 管理界面**：基于 Next.js + Tailwind CSS 的前端界面，用于配置网关、管理供应商和模型
- **新增请求日志系统**：记录所有 API 请求，提供可视化的日志查看界面（请求头、query、body、response）
- **新增 CLI 工具**：将网关打包为 Node.js CLI 工具，支持通过 npm 发布和安装
- **新增数据库存储**：使用 SQLite3 存储配置和日志数据

## Impact
- Affected specs: 
  - `api-gateway` (新增核心网关功能)
  - `model-provider` (新增供应商管理)
  - `model-management` (新增模型管理)
  - `web-ui` (新增 Web 管理界面)
  - `request-logging` (新增请求日志)
  - `cli-tool` (新增 CLI 工具)
- Affected code: 
  - 全新项目，无现有代码影响
- 技术栈：
  - Next.js (前端框架)
  - Tailwind CSS (样式)
  - SQLite3 (数据库)
  - Node.js (后端运行时)
  - npm (包管理)
