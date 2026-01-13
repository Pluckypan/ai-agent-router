# TODO

## 2026-01-13

- [x] [优化] 供应商测试连接，仅展示已启动的模型
- [x] [优化] 测试连接弹窗搜索模型应该跟下拉列表整合起来，期望在弹窗中可以直接展示模型列表而不是需要再点一次下拉列表，模型列表限制高度最大可展示5个模型，在搜索框输入的时候可以实时检索模型
- [x] [需求] 请求日志需要支持批量清除
- [x] [需求] 日志详情支持复制
- [x] [需求] 日志列表展示模型为 Unknow，实际是有模型的
- [x] [优化] 希望修改 package.json 中的 version 的时候，cli 中的 version 可以同步跟着变化，现在是需要手动修改代码的
- [x] [优化] 模型列表需要展示分页、目前模型名称太长会导致列表横向无法展示开，需要支持横向滚动
- [ ] [需求] 开启网关代理后，需要支持将所有供应商提供的模型转换为 Claude Code、Cursor 的格式，按 TAB 支持切换配置；拿 claude 为例， 可以有三个输入框可以分别选择 claude Haiku、Sonnet、Opus 三种类型的模型， 点击应用的时候，先备份原有 claude 的配置，目录为 `~/.claude/settings.json`，备份为 `~/.claude/settings.json.aar.bak`，生成的 json 格式支持预览，大概为 `{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "网关 apikey",
    "ANTHROPIC_BASE_URL": "当前网关地址,
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "GLM-4.5-air",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "GLM-4.7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "MiniMax-M2.1",
    "ANTHROPIC_MODEL": "GLM-4.7",
    "ANTHROPIC_REASONING_MODEL": "GLM-4.7",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1,
    "hasCompletedOnboarding": true
  }
}` 然后保存到 `~/.claude/settings.json`，应用按钮为一个 Switch，关闭应用则对原有备份的配置进行还原。Curosr 参考 claude 进行同样的实现。

## 2026-01-11

- [x] [需求] 模型列表支持按供应商分类，支持搜索
- [x] [修复] 一键拉取模型出现了 成功拉取了undefine个模型的提示
- [x] [需求] 供应商测试连接应该只能选取该供应商下的模型，并支持搜索
- [x] [需求] 开启AI网关之后，支持点击测试按钮进行测试，模型可以搜索选择，可以给出示例链接配置，以 json 的格式

## 2026-01-10

- [x] [需求] 需要简化 cli 指令为 aar
- [x] [优化] 一键拉取模型列表 名称改为 快捷拉取
- [x] [优化] 供应商和网关配置 API Key 需要加上小眼睛切换按钮，方便查看和拷贝
- [x] [修复] 供应商 API Key 无法保存的问题修复
- [x] [优化] Toast 的位置需要水平居中
- [x] [需求] 数据库存储到用户目录下，路径如 `~/.aar/`
- [x] [需求] 点击启动之后，后台服务需要保持启动状态，不能因为刷新页面就没了
- [x] [需求] 供应商添加测试连接按钮，可下拉选择某个模型进行测试连接 
