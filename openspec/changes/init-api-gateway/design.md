# Design: API 网关架构设计

## Context
需要构建一个类似 NewAPI 的 API 网关，支持多种 AI 模型协议，提供统一的管理界面和请求日志功能。项目将作为 npm CLI 工具发布，需要支持本地部署和配置。

## Goals / Non-Goals

### Goals
- 支持多种 AI 模型协议（Anthropic、OpenAI、Gemini）
- 提供 Web 界面进行配置和管理
- 记录所有请求日志并提供可视化查看
- 支持动态添加模型供应商和模型
- 打包为 CLI 工具，易于安装和使用
- 使用 SQLite3 作为轻量级数据存储

### Non-Goals
- 不支持多租户或用户认证（单用户本地使用）
- 不支持分布式部署（单机运行）
- 不支持请求限流和配额管理（后续可扩展）
- 不支持请求缓存（后续可扩展）

## Decisions

### Decision: 使用 Next.js 作为全栈框架
**Rationale**: 
- Next.js 提供前后端一体化开发，简化项目结构
- 内置 API Routes 可以处理网关请求转发
- 支持 SSR/SSG，便于构建管理界面
- 生态成熟，易于集成 Tailwind CSS

**Alternatives considered**:
- Express + React: 需要分别管理前后端，增加复杂度
- Fastify + Vue: 团队对 Next.js 更熟悉

### Decision: 使用 SQLite3 作为数据库
**Rationale**:
- 轻量级，无需额外数据库服务
- 适合单机部署场景
- 文件存储，便于备份和迁移
- Node.js 有成熟的 SQLite3 驱动

**Alternatives considered**:
- PostgreSQL: 对于单机场景过于重量级
- JSON 文件: 并发写入和查询性能较差

### Decision: 网关架构采用代理转发模式
**Rationale**:
- 简单直接，易于实现和维护
- 支持协议转换和请求适配
- 可以统一添加日志、错误处理等横切关注点

**Implementation**:
- 网关监听配置的端口
- 接收客户端请求（Claude、Zcode、Alma）
- 根据模型配置路由到对应的供应商 API
- 转发请求并返回响应

### Decision: CLI 工具使用 Commander.js
**Rationale**:
- 成熟的 Node.js CLI 框架
- 支持子命令、参数解析、帮助信息
- 易于集成到 npm 包

**Commands**:
- `api-gateway start` - 启动网关服务
- `api-gateway config` - 配置管理（可选）

### Decision: 使用 ui-ux-pro-max 优化 UI
**Rationale**:
- 项目已有 ui-ux-pro-max 技能，可以用于生成优化的 UI 设计
- 确保界面美观和用户体验良好

## Architecture

### 项目结构
```
api-gateway/
├── src/
│   ├── server/          # 网关服务器
│   │   ├── gateway.ts   # 核心网关逻辑
│   │   ├── providers/   # 协议适配器
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   └── gemini.ts
│   │   └── logger.ts    # 请求日志记录
│   ├── db/              # 数据库层
│   │   ├── schema.ts    # SQLite 表结构
│   │   └── queries.ts   # 数据库查询
│   ├── app/             # Next.js 应用
│   │   ├── api/         # API 路由
│   │   │   ├── providers/  # 供应商管理 API
│   │   │   ├── models/     # 模型管理 API
│   │   │   ├── config/     # 配置管理 API
│   │   │   └── logs/       # 日志查询 API
│   │   └── (pages)/     # 前端页面
│   │       ├── page.tsx    # 主页面（配置）
│   │       └── logs/       # 日志查看页面
│   └── cli/             # CLI 入口
│       └── index.ts
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

### 数据模型

#### providers 表
- id: INTEGER PRIMARY KEY
- name: TEXT (供应商名称，如 "OpenAI")
- protocol: TEXT (协议类型: "openai", "anthropic", "gemini")
- base_url: TEXT (API 基础 URL)
- api_key: TEXT (加密存储)
- created_at: DATETIME
- updated_at: DATETIME

#### models 表
- id: INTEGER PRIMARY KEY
- provider_id: INTEGER (外键到 providers)
- name: TEXT (模型名称，如 "gpt-4")
- model_id: TEXT (供应商的模型标识符)
- enabled: BOOLEAN (是否启用)
- created_at: DATETIME
- updated_at: DATETIME

#### request_logs 表
- id: INTEGER PRIMARY KEY
- model_id: INTEGER (外键到 models)
- request_method: TEXT (HTTP 方法)
- request_path: TEXT (请求路径)
- request_headers: TEXT (JSON 字符串)
- request_query: TEXT (JSON 字符串)
- request_body: TEXT (JSON 字符串)
- response_status: INTEGER (HTTP 状态码)
- response_body: TEXT (JSON 字符串)
- response_time_ms: INTEGER (响应时间)
- created_at: DATETIME

#### config 表
- key: TEXT PRIMARY KEY
- value: TEXT (JSON 字符串)
- updated_at: DATETIME

### 协议适配

每个协议需要实现统一的适配器接口：
```typescript
interface ProviderAdapter {
  forwardRequest(model: Model, request: GatewayRequest): Promise<GatewayResponse>
  listModels(provider: Provider): Promise<Model[]>
}
```

### 安全考虑
- API Key 加密存储（使用简单的加密或环境变量）
- 网关 API_KEY 验证（可选）
- 请求日志中的敏感信息脱敏（API Key、Token 等）

## Risks / Trade-offs

### Risk: 协议差异导致适配复杂
**Mitigation**: 先实现核心协议（OpenAI、Anthropic），其他协议逐步添加

### Risk: SQLite 并发写入性能
**Mitigation**: 
- 日志写入使用批量插入
- 考虑使用 WAL 模式提升并发性能
- 如果性能不足，后续可迁移到 PostgreSQL

### Risk: CLI 工具打包体积
**Mitigation**: 
- 使用 Next.js standalone 输出
- 排除不必要的依赖
- 考虑使用 pkg 或类似工具打包为单文件

### Trade-off: 单机部署 vs 分布式
**Decision**: 先实现单机部署，满足 MVP 需求，后续可扩展

## Migration Plan
N/A - 全新项目，无需迁移

## Open Questions
1. API Key 加密方案：使用环境变量还是数据库加密？
2. 日志保留策略：是否需要自动清理旧日志？
3. 模型列表自动拉取：是否需要定时刷新？
4. 网关启动时的端口冲突处理？
