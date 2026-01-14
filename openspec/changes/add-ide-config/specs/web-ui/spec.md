# web-ui Spec Delta

## ADDED Requirements

### Requirement: IDE 配置管理界面
The system SHALL provide a web-based IDE configuration management interface.

#### Scenario: 访问 IDE 配置页面
- **WHEN** 用户访问 IDE 配置页面
- **THEN** 显示配置管理界面
- **AND** 使用 TAB 标签页切换不同 IDE 配置
- **AND** 默认显示 Claude 配置 TAB

#### Scenario: Claude 配置 TAB 展示
- **WHEN** 用户切换到 Claude 配置 TAB
- **THEN** 显示三个模型选择下拉框（Haiku、Sonnet、Opus）
- **AND** 每个选择框显示当前配置的模型名称
- **AND** 显示应用开关（Switch 组件）
- **AND** 显示配置预览区域（可折叠）

#### Scenario: 模型选择下拉框交互
- **WHEN** 用户点击 Haiku 模型选择框
- **THEN** 展开供应商模型列表
- **AND** 选中模型后更新显示的模型名称
- **AND** 模型列表只显示可用且启用的模型

#### Scenario: 应用配置启用
- **WHEN** 用户点击应用开关将其设置为启用状态
- **THEN** 显示确认对话框
- **AND** 提示用户将自动备份并应用新配置
- **AND** 确认后调用 API 应用配置

#### Scenario: 应用配置禁用
- **WHEN** 用户点击应用开关将其设置为禁用状态
- **THEN** 显示确认对话框
- **AND** 提示用户将还原原有配置
- **AND** 确认后调用 API 还原配置

#### Scenario: 配置预览展开/折叠
- **WHEN** 用户点击配置预览区域
- **THEN** 展开/折叠预览内容
- **AND** 预览内容以格式化的 JSON 显示
- **AND** 支持 JSON 语法高亮

#### Scenario: 配置预览实时更新
- **WHEN** 用户修改任何模型选择
- **THEN** 配置预览实时更新
- **AND** 预览中的 `ANTHROPIC_DEFAULT_HAIKU_MODEL` 等值立即反映当前选择

#### Scenario: Cursor 配置 TAB 预留
- **WHEN** 用户切换到 Cursor 配置 TAB
- **THEN** 显示配置界面（占位符）
- **AND** 提示功能开发中

### Requirement: 配置状态展示
The system SHALL display current IDE configuration status.

#### Scenario: 显示配置应用状态
- **WHEN** 用户访问 IDE 配置页面
- **THEN** 显示当前应用状态（已应用/未应用）
- **AND** 显示最后配置更新时间
- **AND** 显示当前网关地址

#### Scenario: 配置应用成功提示
- **WHEN** 配置应用成功
- **THEN** 显示成功提示信息
- **AND** 自动关闭确认对话框
- **AND** 更新状态显示为"已应用"

#### Scenario: 配置应用失败提示
- **WHEN** 配置应用失败
- **THEN** 显示错误提示信息
- **AND** 提示具体失败原因
- **AND** 不修改当前状态

### Requirement: 响应式设计
The system SHALL provide responsive IDE configuration interface.

#### Scenario: 移动端访问 IDE 配置
- **WHEN** 用户在移动设备上访问
- **THEN** TAB 标签页自适应水平滚动或堆叠显示
- **AND** 配置预览在移动端默认折叠
- **AND** 所有输入框和按钮支持触控操作
