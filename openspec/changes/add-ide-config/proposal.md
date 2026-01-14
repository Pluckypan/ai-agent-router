# Change: 添加 IDE 配置管理支持

## Why

当前网关系统已支持模型供应商管理和路由，但缺少将网关模型配置直接应用到 Claude Code 和 Cursor IDE 的功能。用户需要手动手动配置 IDE 的环境变量来实现通过网关调用供应商模型，操作繁琐且容易出错。通过提供一键配置功能，可以简化用户操作，降低使用门槛。

## What Changes

### 新增功能
- 添加 IDE 配置管理模块，支持 Claude Code 和 Cursor（预留 Gemini）

### Web UI 新增
- 新增 IDE 配置管理页面，使用 TAB 标签页切换不同 IDE 配置
- Claude 配置 TAB：
  - 三个下拉选择框，分别配置 Haiku、Sonnet、Opus 对应的供应商模型
  - 应用开关（Switch）：启用时自动应用配置，禁用时自动还原备份
  - 配置预览区域：可折叠展示生成的 settings.json 内容
- Cursor 配置 TAB：结构与 Claude 相同（预留）

### 配置管理逻辑
- 启用时：
  1. 备份原有 `~/.claude/settings.json` 到 `~/.claude/settings.json.aar.bak`
  2. 读取当前网关地址（如 `http://127.0.0.1:1357`）
  3. 根据用户选择的模型映射生成新的 settings.json
  4. 保存到 `~/.claude/settings.json`
- 禁用时：
  1. 检查备份文件是否存在
  2. 从备份还原原有配置到 `~/.claude/settings.json`
  3. 可选保留或删除备份文件

### 生成的 settings.json 格式
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "网关 API Key",
    "ANTHROPIC_BASE_URL": "当前网关地址",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "${Haiku选择模型}",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "${Opus选择模型}",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "${Sonnet选择模型}",
    "ANTHROPIC_MODEL": "${默认模型}",
    "ANTHROPIC_REASONING_MODEL": "${默认推理模型}",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
    "hasCompletedOnboarding": true
  }
}
```

### 初始默认值
- Haiku: GLM-4.5-air
- Sonnet: MiniMax-M2.1
- Opus: GLM-4.7
- 默认模型: GLM-4.7

## Impact

### 影响的 Spec
- **web-ui**: 添加 IDE 配置管理界面
- **ide-config** (新增): IDE 配置管理能力

### 影响的代码
- `src/app/api/ide/` (新增): IDE 配置相关 API
- `src/app/page.tsx`: 添加 IDE 配置导航入口
- `src/app/ide/` (新增): IDE 配置前台页面

### 依赖
- 模型供应商配置已就绪（model-provider spec）
- 网关运行状态可获取

### 后续扩展
- 未来可支持 Gemini 等其他 IDE
- 可添加更细粒度的模型配置选项
- 可支持导出/导入手动配置文件
