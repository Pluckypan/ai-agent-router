# model-management Specification

## Purpose
TBD - created by archiving change init-api-gateway. Update Purpose after archive.
## Requirements
### Requirement: 模型管理
The system SHALL allow users to add and manage AI models for each provider.

#### Scenario: 手动添加模型
- **WHEN** 用户选择供应商并填写模型信息（名称、模型 ID）
- **THEN** 模型保存到数据库并关联到供应商
- **AND** 模型出现在模型列表中
- **AND** 模型默认启用状态

#### Scenario: 一键拉取模型列表
- **WHEN** 用户点击"拉取模型列表"按钮
- **THEN** 系统调用供应商 API 获取可用模型列表
- **AND** 新模型自动添加到数据库
- **AND** 已存在的模型更新信息
- **AND** 显示拉取结果（成功/失败，新增模型数量）

#### Scenario: 启用/禁用模型
- **WHEN** 用户切换模型的启用状态
- **THEN** 模型状态更新到数据库
- **AND** 禁用的模型不再接受请求路由

#### Scenario: 删除模型
- **WHEN** 用户删除模型
- **THEN** 模型从数据库删除
- **AND** 该模型不再可用

#### Scenario: 查看模型列表
- **WHEN** 用户访问模型管理页面
- **THEN** 显示所有供应商的模型列表
- **AND** 可以按供应商筛选
- **AND** 显示模型状态（启用/禁用）

### Requirement: 模型自动拉取
The system SHALL support automatic fetching of model lists from provider APIs.

#### Scenario: 拉取 OpenAI 模型列表
- **WHEN** 用户为 OpenAI 供应商点击拉取按钮
- **THEN** 系统调用 OpenAI API 获取模型列表
- **AND** 解析返回的模型数据
- **AND** 更新或创建模型记录

#### Scenario: 拉取失败处理
- **WHEN** 拉取模型列表时 API 调用失败
- **THEN** 显示错误信息给用户
- **AND** 不影响已存在的模型

