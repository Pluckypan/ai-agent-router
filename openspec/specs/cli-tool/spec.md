# cli-tool Specification

## Purpose
TBD - created by archiving change init-api-gateway. Update Purpose after archive.
## Requirements
### Requirement: CLI 工具
The system SHALL be packaged as a Node.js CLI tool that can be installed via npm.

#### Scenario: 安装 CLI 工具
- **WHEN** 用户执行 `npm install -g api-gateway`（或包名）
- **THEN** CLI 工具安装到全局
- **AND** 可以通过命令行执行 `api-gateway` 命令

#### Scenario: 启动网关
- **WHEN** 用户执行 `api-gateway start`
- **THEN** 网关服务器启动
- **AND** Web 管理界面启动
- **AND** 显示启动信息和访问地址

#### Scenario: 查看帮助信息
- **WHEN** 用户执行 `api-gateway --help` 或 `api-gateway -h`
- **THEN** 显示命令使用说明
- **AND** 列出所有可用命令和选项

#### Scenario: 配置命令（可选）
- **WHEN** 用户执行 `api-gateway config set port 3000`
- **THEN** 配置项保存
- **AND** 下次启动时使用新配置

### Requirement: npm 发布
The system SHALL be published to npmjs registry.

#### Scenario: 发布到 npm
- **WHEN** 开发者执行 `npm publish`
- **THEN** 包发布到 npmjs
- **AND** 其他用户可以通过 npm 安装
- **AND** package.json 配置正确（bin 字段、版本号等）

#### Scenario: 包信息配置
- **WHEN** 用户查看 npm 包信息
- **THEN** 显示正确的包名、版本、描述
- **AND** 包含 README.md 说明文档
- **AND** 包含必要的元数据（author、license 等）

