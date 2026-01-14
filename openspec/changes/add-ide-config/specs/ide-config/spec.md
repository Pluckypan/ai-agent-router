# ide-config Specification (Delta)

## ADDED Requirements

### Requirement: 配置应用 API
The system SHALL provide API endpoint for applying IDE configurations.

#### Scenario: 应用 Claude 配置
- **WHEN** 前端调用 `/api/ide/claude/apply` 接口
- **THEN** 系统读取请求中指定的模型映射关系
- **AND** 系统获取当前网关地址
- **AND** 系统备份原有 `~/.claude/settings.json` 到 `~/.claude/settings.json.aar.bak`
- **AND** 系统生成新的 settings.json 配置文件
- **AND** 系统保存到 `~/.claude/settings.json`
- **AND** 返回成功状态和生成的配置内容

#### Scenario: 应用 Claude 配置备份失败
- **WHEN** 备份原有文件失败
- **THEN** 返回错误状态
- **AND** 错误信息包含失败原因
- **AND** 不修改原配置文件

#### Scenario: 应用 Claude 配置写入失败
- **WHEN** 写入新配置文件失败
- **THEN** 返回错误状态
- **AND** 保留原有配置文件（不删除）
- **AND** 错误信息包含权限或路径错误等详情

#### Scenario: 生成配置包含网关地址
- **WHEN** 生成 Claude 配置
- **THEN** `ANTHROPIC_BASE_URL` 设置为当前网关地址
- **AND** 网关地址格式为 `http://host:port` 或 `https://host:port`

#### Scenario: 生成配置包含模型映射
- **WHEN** 生成 Claude 配置
- **THEN** `ANTHROPIC_DEFAULT_HAIKU_MODEL` 使用用户选择的 Haiku 模型
- **AND** `ANTHROPIC_DEFAULT_SONNET_MODEL` 使用用户选择的 Sonnet 模型
- **AND** `ANTHROPIC_DEFAULT_OPUS_MODEL` 使用用户选择的 Opus 模型
- **AND** `ANTHROPIC_MODEL` 和 `ANTHROPIC_REASONING_MODEL` 使用默认模型

### Requirement: 配置还原 API
The system SHALL provide API endpoint for restoring original IDE configurations.

#### Scenario: 还原 Claude 配置
- **WHEN** 前端调用 `/api/ide/claude/restore` 接口
- **THEN** 系统检查备份文件 `~/.claude/settings.json.aar.bak` 是否存在
- **AND** 如果存在，系统将备份内容复制到 `~/.claude/settings.json`
- **AND** 返回成功状态
- **AND** 返回还原的配置内容

#### Scenario: 配置还原备份不存在
- **WHEN** 备份文件不存在
- **THEN** 返回错误状态
- **AND** 错误信息提示用户未找到备份文件
- **AND** 不执行任何文件操作

#### Scenario: 配置还原文件读取失败
- **WHEN** 读取备份文件失败
- **THEN** 返回错误状态
- **AND** 错误信息包含文件权限或损坏等详情

### Requirement: 配置状态查询 API
The system SHALL provide API endpoint for querying current IDE configuration status.

#### Scenario: 查询 Claude 配置状态
- **WHEN** 前端调用 `/api/ide/claude/status` 接口
- **THEN** 返回当前配置状态（已应用/未应用）
- **AND** 返回最后配置更新时间
- **AND** 返回当前模型映射关系
- **AND** 返回当前网关地址
- **AND** 返回备份文件是否存在

#### Scenario: 配置状态首次查询
- **WHEN** 系统首次查询配置状态
- **THEN** 返回未应用状态
- **AND** 所有模型映射为空值
- **AND** 不存在备份文件

### Requirement: 网关地址获取
The system SHALL retrieve current gateway address for configuration generation.

#### Scenario: 获取网关地址
- **WHEN** 系统生成 IDE 配置
- **THEN** 读取系统配置中的网关监听地址
- **AND** 格式化为完整的 HTTP URL
- **AND** 包含端口号

### Requirement: 配置文件格式验证
The system SHALL validate generated settings.json format before writing.

#### Scenario: 配置格式正确
- **WHEN** 生成的 settings.json 格式正确
- **THEN** 配置保存成功

#### Scenario: 配置格式错误
- **WHEN** 生成的 settings.json 格式错误（如 JSON 语法错误）
- **THEN** 返回验证失败错误
- **AND** 错误信息指明具体的格式问题
- **AND** 不写入文件

### Requirement: 可用模型查询
The system SHALL provide API endpoint for querying available models for IDE configuration.

#### Scenario: 查询可用模型列表
- **WHEN** 前端调用 `/api/ide/claude/available-models` 接口
- **THEN** 返回所有已启用且可用的模型列表
- **AND** 模型列表包含模型 ID、名称、供应商信息
- **AND** 按供应商分组显示
- **AND** 过滤不兼容的模型
