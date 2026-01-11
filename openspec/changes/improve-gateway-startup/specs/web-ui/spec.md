## MODIFIED Requirements

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
- **THEN** 系统调用后端 API 启动网关服务进程
- **AND** 服务在后台启动并持续运行
- **AND** 按钮状态变为"运行中"
- **AND** 显示网关运行状态和端口信息
- **AND** 服务状态持久化到数据库
- **WHEN** 用户刷新页面
- **THEN** 系统从数据库查询服务状态并正确显示
- **AND** 如果服务正在运行，状态显示为"运行中"
- **WHEN** 用户点击停止按钮
- **THEN** 系统调用后端 API 停止网关服务进程
- **AND** 服务进程被终止
- **AND** 按钮状态变为"已停止"
- **AND** 数据库状态更新为已停止

#### Scenario: 服务状态同步
- **WHEN** 服务在前台运行（通过 CLI 启动）
- **THEN** Web UI 能够检测到服务状态并正确显示
- **WHEN** 服务异常退出（崩溃或被 kill）
- **THEN** Web UI 能够检测到状态变化并更新显示
- **WHEN** 用户打开多个浏览器标签页
- **THEN** 所有标签页都能正确显示服务状态

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
