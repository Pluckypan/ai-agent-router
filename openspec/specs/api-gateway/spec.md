# api-gateway Specification

## Purpose
TBD - created by archiving change init-api-gateway. Update Purpose after archive.
## Requirements
### Requirement: API 网关核心功能
The system SHALL provide an API gateway that routes requests from clients (Claude, Zcode, Alma) to appropriate AI model providers based on model configuration.

#### Scenario: 启动网关服务
- **WHEN** 用户执行 `api-gateway start` 命令
- **THEN** 网关服务器启动并监听配置的端口
- **AND** Web 管理界面同时启动

#### Scenario: 接收客户端请求
- **WHEN** 客户端（Claude/Zcode/Alma）向网关发送 API 请求
- **THEN** 网关接收请求并解析模型标识符
- **AND** 根据模型配置路由到对应的供应商 API

#### Scenario: 转发请求到供应商
- **WHEN** 网关确定目标供应商和模型
- **THEN** 使用对应的协议适配器转发请求
- **AND** 将供应商的响应返回给客户端

#### Scenario: 处理请求错误
- **WHEN** 供应商 API 返回错误或超时
- **THEN** 网关返回适当的错误响应给客户端
- **AND** 错误信息记录到日志中

### Requirement: 协议支持
The system SHALL support multiple AI model protocols including Anthropic, OpenAI, and Gemini.

#### Scenario: OpenAI 协议请求
- **WHEN** 客户端请求使用 OpenAI 模型
- **THEN** 网关使用 OpenAI 协议适配器转发请求
- **AND** 请求格式符合 OpenAI API 规范

#### Scenario: Anthropic 协议请求
- **WHEN** 客户端请求使用 Anthropic 模型
- **THEN** 网关使用 Anthropic 协议适配器转发请求
- **AND** 请求格式符合 Anthropic API 规范

#### Scenario: Gemini 协议请求
- **WHEN** 客户端请求使用 Gemini 模型
- **THEN** 网关使用 Gemini 协议适配器转发请求
- **AND** 请求格式符合 Gemini API 规范

