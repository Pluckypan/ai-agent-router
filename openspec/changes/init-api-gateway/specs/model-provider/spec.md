## ADDED Requirements

### Requirement: 模型供应商管理
The system SHALL allow users to add, configure, and manage multiple AI model providers.

#### Scenario: 添加新供应商
- **WHEN** 用户在 Web 界面填写供应商信息（名称、协议类型、baseUrl、API Key）
- **THEN** 供应商信息保存到数据库
- **AND** API Key 加密存储
- **AND** 供应商出现在供应商列表中

#### Scenario: 编辑供应商配置
- **WHEN** 用户修改供应商的 baseUrl 或 API Key
- **THEN** 更新后的配置保存到数据库
- **AND** 配置立即生效，无需重启网关

#### Scenario: 删除供应商
- **WHEN** 用户删除供应商
- **THEN** 供应商从数据库删除
- **AND** 关联的模型也被标记为不可用（或删除）

#### Scenario: 验证供应商配置
- **WHEN** 用户添加或编辑供应商
- **THEN** 系统验证 baseUrl 格式和 API Key 格式
- **AND** 如果配置无效，显示错误提示

### Requirement: 供应商协议类型
The system SHALL support different provider protocol types.

#### Scenario: 选择协议类型
- **WHEN** 用户添加供应商
- **THEN** 可以从下拉列表选择协议类型（OpenAI、Anthropic、Gemini）
- **AND** 根据协议类型显示相应的配置字段
