## ADDED Requirements

### Requirement: Web 管理界面
The system SHALL provide a web-based management interface built with Next.js and Tailwind CSS.

#### Scenario: 访问管理界面
- **WHEN** 网关服务启动
- **THEN** Web 管理界面可通过浏览器访问（默认端口或配置的端口）
- **AND** 界面使用 Tailwind CSS 样式，美观现代

#### Scenario: 网关配置界面
- **WHEN** 用户访问主页面
- **THEN** 显示网关配置选项（端口、API_KEY）
- **AND** 可以修改配置并保存
- **AND** 配置保存后立即生效或提示重启

#### Scenario: 启动/停止网关
- **WHEN** 用户点击启动按钮
- **THEN** 网关服务启动
- **AND** 按钮状态变为"运行中"
- **AND** 显示网关运行状态和端口信息

#### Scenario: 供应商管理页面
- **WHEN** 用户访问供应商管理页面
- **THEN** 显示供应商列表
- **AND** 可以添加、编辑、删除供应商
- **AND** 界面响应式设计，支持移动端

#### Scenario: 模型管理页面
- **WHEN** 用户访问模型管理页面
- **THEN** 显示模型列表（按供应商分组）
- **AND** 可以手动添加模型
- **AND** 可以点击按钮拉取模型列表
- **AND** 可以启用/禁用、删除模型

#### Scenario: UI 优化
- **WHEN** 界面渲染
- **THEN** 使用 ui-ux-pro-max 进行 UI 优化
- **AND** 界面美观、易用、符合现代设计规范
- **AND** 交互流畅，反馈及时

### Requirement: 响应式设计
The system SHALL provide responsive web interface that works on different screen sizes.

#### Scenario: 移动端访问
- **WHEN** 用户在移动设备上访问管理界面
- **THEN** 界面自适应屏幕大小
- **AND** 所有功能可用
- **AND** 布局合理，易于操作
