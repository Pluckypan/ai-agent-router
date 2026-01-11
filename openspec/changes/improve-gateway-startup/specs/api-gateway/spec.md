## MODIFIED Requirements

### Requirement: API 网关核心功能
The system SHALL provide an API gateway that routes requests from clients (Claude, Zcode, Alma) to appropriate AI model providers based on model configuration.

#### Scenario: 启动网关服务
- **WHEN** 用户执行 `api-gateway start` 命令
- **THEN** 网关服务器启动并监听配置的端口
- **AND** Web 管理界面同时启动
- **WHEN** 用户通过 Web UI 点击启动按钮
- **THEN** 系统启动网关服务进程（通过 CLI 命令）
- **AND** 服务在后台运行，不依赖前端会话
- **AND** 服务状态保存到数据库
- **AND** 服务持续运行直到用户点击停止或进程异常退出

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

## ADDED Requirements

### Requirement: 服务进程管理
The system SHALL provide service management capabilities to start, stop, and query the status of the gateway service through the Web UI.

#### Scenario: 启动服务
- **WHEN** 用户通过 Web UI 点击启动按钮
- **THEN** 系统检查服务是否已在运行
- **AND** 如果未运行，启动服务进程
- **AND** 如果端口已被占用，返回错误信息
- **AND** 服务状态保存到数据库
- **AND** 返回启动结果给前端

#### Scenario: 停止服务
- **WHEN** 用户通过 Web UI 点击停止按钮
- **THEN** 系统查找运行中的服务进程
- **AND** 终止服务进程
- **AND** 更新数据库状态为已停止
- **AND** 返回停止结果给前端

#### Scenario: 查询服务状态
- **WHEN** 前端请求服务状态
- **THEN** 系统查询数据库中的服务状态
- **AND** 验证进程是否真实存在（通过 PID）
- **AND** 如果进程不存在但状态为运行中，更新状态为已停止
- **AND** 返回当前服务状态（运行中/已停止、端口、启动时间等）

#### Scenario: 服务状态持久化
- **WHEN** 服务启动成功
- **THEN** 服务状态（运行中、端口、PID、启动时间）保存到数据库
- **WHEN** 服务停止
- **THEN** 数据库状态更新为已停止
- **WHEN** 用户刷新页面
- **THEN** 系统从数据库查询服务状态并正确显示

#### Scenario: 单实例防护
- **WHEN** 用户尝试启动服务
- **THEN** 系统检查是否已有服务在运行
- **AND** 如果已有服务运行，拒绝启动并返回错误
- **AND** 如果数据库状态为运行中但进程不存在，清理状态并允许启动

#### Scenario: 进程异常退出处理
- **WHEN** 服务进程异常退出（崩溃、被 kill）
- **THEN** 系统检测到进程退出事件
- **AND** 自动更新数据库状态为已停止
- **AND** 前端能够通过状态查询检测到变化

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
