# Change: 添加供应商测试连接功能

## Why
用户需要验证供应商配置是否正确，特别是 API Key 和 Base URL 是否有效。通过测试连接功能，用户可以在添加或编辑供应商后立即验证配置，避免在后续使用过程中才发现配置错误，提升用户体验和配置效率。

## What Changes
- **新增测试连接按钮**：在供应商管理页面的操作列添加"测试连接"按钮
- **新增模型选择下拉菜单**：点击测试连接按钮后，显示该供应商下的可用模型列表，用户可以选择一个模型进行测试
- **新增测试连接 API**：实现后端 API 端点，用于测试供应商连接和模型可用性
- **新增测试结果反馈**：测试完成后显示成功或失败提示，失败时显示具体错误信息

## Impact
- Affected specs: 
  - `model-provider` (修改：添加测试连接功能)
- Affected code: 
  - `src/app/providers/page.tsx` (前端：添加测试连接按钮和模型选择下拉)
  - `src/app/api/providers/route.ts` (后端：添加测试连接 API 端点)
  - `src/server/providers/index.ts` (可能需要添加测试连接方法)
  - `src/server/providers/types.ts` (可能需要扩展接口)
- 技术栈：
  - 使用现有的 ProviderAdapter 接口进行测试
  - 通过调用供应商的 API 验证连接
