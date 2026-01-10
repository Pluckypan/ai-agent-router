# AI Agent Router

一个统一的 API 网关，用于管理多个 AI 模型供应商（Anthropic、OpenAI、Gemini 等），为 Claude、Zcode、Alma 等客户端软件提供统一的接口。

## 功能特性

- ✅ 支持多种 AI 模型协议（OpenAI、Anthropic、Gemini）
- ✅ Web 管理界面，可视化配置和管理
- ✅ 模型供应商管理（添加、编辑、删除）
- ✅ 模型管理（手动添加、自动拉取模型列表）
- ✅ 请求日志记录和查看（JSON 美化展示）
- ✅ CLI 工具，易于安装和使用
- ✅ SQLite 数据库，轻量级存储

## 安装

```bash
npm install -g ai-agent-router
```

## 使用方法

### 启动网关

```bash
aar start
```

默认在 `http://localhost:3000` 启动，你可以通过浏览器访问 Web 管理界面。

### 配置选项

```bash
# 指定端口
aar start --port 8080

# 指定主机名
aar start --hostname 0.0.0.0
```

### 配置管理

```bash
# 获取配置
aar config --get port

# 设置配置
aar config --set port 8080
```

## Web 管理界面

启动后访问 `http://localhost:3000`，你可以：

1. **配置网关**：设置端口、API Key 等
2. **管理供应商**：添加、编辑、删除模型供应商
3. **管理模型**：手动添加模型或一键拉取模型列表
4. **查看日志**：查看所有 API 请求日志，包括请求头、query、body 和响应

## 添加供应商

1. 访问 Web 界面，进入"供应商"页面
2. 点击"添加供应商"
3. 填写信息：
   - 名称：供应商名称（如 "OpenAI"）
   - 协议：选择协议类型（OpenAI、Anthropic、Gemini）
   - Base URL：API 基础 URL（如 `https://api.openai.com/v1`）
   - API Key：供应商的 API Key

## 添加模型

### 手动添加

1. 进入"模型"页面
2. 点击"手动添加"
3. 选择供应商，填写模型名称和模型 ID

### 自动拉取

1. 进入"模型"页面
2. 在"一键拉取模型列表"区域，点击对应供应商的"拉取模型"按钮
3. 系统会自动从供应商 API 拉取可用模型列表

## 使用网关

配置好供应商和模型后，客户端可以通过以下方式使用：

### OpenAI 兼容接口

```
POST http://localhost:3000/api/gateway/v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [...]
}
```

### Anthropic 兼容接口

```
POST http://localhost:3000/api/gateway/v1/messages
Content-Type: application/json
x-api-key: your-gateway-api-key

{
  "model": "claude-3-5-sonnet-20241022",
  "messages": [...]
}
```

## 开发

### 本地开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 启动生产模式
npm start
```

### 项目结构

```
aar/
├── src/
│   ├── server/          # 网关服务器
│   │   ├── gateway.ts   # 核心网关逻辑
│   │   ├── providers/   # 协议适配器
│   │   └── logger.ts    # 请求日志记录
│   ├── db/              # 数据库层
│   │   ├── schema.ts    # SQLite 表结构
│   │   └── queries.ts   # 数据库查询
│   ├── app/             # Next.js 应用
│   │   ├── api/         # API 路由
│   │   └── (pages)/     # 前端页面
│   └── cli/             # CLI 入口
├── package.json
└── README.md
```

## 技术栈

- **Next.js 14** - 全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **SQLite3** - 数据库
- **Commander.js** - CLI 框架

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
