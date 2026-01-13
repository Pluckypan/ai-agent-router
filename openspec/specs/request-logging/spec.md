# request-logging Specification

## Purpose
TBD - created by archiving change init-api-gateway. Update Purpose after archive.
## Requirements
### Requirement: 请求日志记录
The system SHALL record all API requests passing through the gateway.

#### Scenario: 记录请求信息
- **WHEN** 客户端向网关发送请求
- **THEN** 请求信息记录到数据库
- **AND** 记录包括：请求方法、路径、请求头、query 参数、请求体
- **AND** 记录响应信息：状态码、响应体、响应时间

#### Scenario: 日志存储
- **WHEN** 请求处理完成
- **THEN** 日志立即写入数据库
- **AND** 日志包含时间戳和关联的模型信息
- **AND** 敏感信息（API Key、Token）自动脱敏

### Requirement: 日志查看界面
The system SHALL provide a web interface to view and inspect request logs.

#### Scenario: 查看日志列表
- **WHEN** 用户访问日志页面
- **THEN** 显示请求日志列表（按时间倒序）
- **AND** 显示关键信息：时间、模型、状态码、响应时间
- **AND** 支持分页加载
- **AND** 支持按模型、状态码、时间范围筛选

#### Scenario: 查看日志详情
- **WHEN** 用户点击日志列表中的某条记录
- **THEN** 显示完整的请求和响应详情
- **AND** 请求头以 JSON 格式展示（美化）
- **AND** 请求 query 以 JSON 格式展示（美化）
- **AND** 请求 body 以 JSON 格式展示（美化）
- **AND** 响应 body 以 JSON 格式展示（美化）
- **AND** JSON 格式化，支持折叠展开

#### Scenario: JSON 美化展示
- **WHEN** 日志详情中的 JSON 数据渲染
- **THEN** JSON 格式化显示（缩进、语法高亮）
- **AND** 支持展开/折叠嵌套对象
- **AND** 长文本支持滚动查看

### Requirement: 敏感信息脱敏
The system SHALL automatically mask sensitive information in logs.

#### Scenario: API Key 脱敏
- **WHEN** 请求头或请求体中包含 API Key
- **THEN** 日志中 API Key 被替换为 `***` 或部分隐藏
- **AND** 原始值不存储在日志中

#### Scenario: Token 脱敏
- **WHEN** 请求中包含 Authorization Token
- **THEN** Token 在日志中被脱敏处理
- **AND** 只显示 Token 类型和部分标识

