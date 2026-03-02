---
title: "Seedream5 Lite 文生图 - KIE API"
url: "https://docs.kie.ai/cn/market/seedream/5-lite-text-to-image"
captured_at: "2026-03-01T11:43:35.069Z"
---
# KIE API 文档

## Seedream5 Lite 文生图

### 简介
基于 Seedream5 Lite 先进 AI 模型的高质量写实风格图像生成。

### API 端点
**POST** `/api/v1/jobs/createTask`

### 请求示例
使用 `seedream/5-lite-text-to-image` 生成图像。

```bash
curl --request POST \
 --url https://api.kie.ai/api/v1/jobs/createTask \
 --header 'Authorization: Bearer <token>' \
 --header 'Content-Type: application/json' \
 --data '
{
 "model": "seedream/5-lite-text-to-image",
 "callBackUrl": "https://your-domain.com/api/callback",
 "input": {
 "prompt": "A full-process cafe design tool for entrepreneurs and designers. It covers core needs including store layout, functional zoning, decoration style, equipment selection, and customer group adaptation, supporting integrated planning of \"commercial attributes + aesthetic design.\" Suitable as a promotional image for a cafe design SaaS product, with a 16:9 aspect ratio.",
 "aspect_ratio": "1:1",
 "quality": "basic"
 }
}
'
```

### 响应示例
```json
{
 "code": 200,
 "msg": "success",
 "data": {
 "taskId": "task_seedream_1765166238716"
 }
}
```

### 查询任务状态
提交任务后，可通过统一查询端点查看进度并获取结果。生产环境中，建议使用 `callBackUrl` 参数在生成完成时接收自动通知，而非轮询状态端点。

### 请求参数

#### Authorization
- **类型**: `string` (header)
- **必填**: 是
- **说明**: 所有 API 都需要通过 Bearer Token 进行身份验证。
- **获取 API Key**: 访问 API Key 管理页面获取您的 API Key。
- **使用方法**: 添加到请求头：`Authorization: Bearer YOUR_API_KEY`
- **注意**: 请妥善保管您的 API Key，不要与他人共享。如果怀疑 API Key 已泄露，请立即在管理页面重置。

#### 请求体 (application/json)

##### model
- **类型**: `enum<string>`
- **默认值**: `seedream/5-lite-text-to-image`
- **必填**: 是
- **说明**: 用于生成的模型名称。此端点必须使用 `seedream/5-lite-text-to-image`。
- **可用选项**: `seedream/5-lite-text-to-image`
- **示例**: `"seedream/5-lite-text-to-image"`

##### callBackUrl
- **类型**: `string<uri>`
- **必填**: 否
- **说明**: 接收生成任务完成更新的 URL。可选但建议在生产环境中使用。当生成完成时，系统将向此 URL POST 任务状态和结果。回调包含生成的内容 URL 和任务信息。您的回调端点应接受包含结果的 JSON 负载的 POST 请求。或者，使用获取任务详情端点轮询任务状态。为确保回调安全性，请参阅 Webhook 校验指南了解签名验证实现方法。
- **示例**: `"https://your-domain.com/api/callback"`

##### input
- **类型**: `object`
- **必填**: 是
- **说明**: 生成任务的输入参数。

###### input.prompt
- **类型**: `string`
- **必填**: 是
- **说明**: 您想要生成的图像的文本描述（最大长度：3000 字符）。
- **最大长度**: 3000 字符
- **示例**: `"A full-process cafe design tool for entrepreneurs and designers. It covers core needs including store layout, functional zoning, decoration style, equipment selection, and customer group adaptation, supporting integrated planning of \"commercial attributes + aesthetic design.\" Suitable as a promotional image for a cafe design SaaS product, with a 16:9 aspect ratio."`

###### input.aspect_ratio
- **类型**: `enum<string>`
- **默认值**: `1:1`
- **必填**: 是
- **说明**: 图像的宽高比，决定其视觉形态。
- **可用选项**: `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `2:3`, `3:2`, `21:9`
- **示例**: `"1:1"`

###### input.quality
- **类型**: `enum<string>`
- **默认值**: `basic`
- **必填**: 是
- **说明**: 基础质量输出 2K 图像，高质量输出 4K 图像。
- **可用选项**: `basic`, `high`
- **示例**: `"basic"`

### 响应

#### 200 (application/json)
请求成功。

##### code
- **类型**: `enum<integer>`
- **说明**: 响应状态码。
- **可用选项**:
  - `200`: 成功 - 请求已成功处理
  - `401`: 未授权 - 身份验证凭据缺失或无效
  - `402`: 积分不足 - 账户没有足够的积分执行操作
  - `404`: 未找到 - 请求的资源或端点不存在
  - `422`: 验证错误 - 请求参数未通过验证检查
  - `429`: 速率限制 - 已超过此资源的请求限制
  - `455`: 服务不可用 - 系统正在维护中
  - `500`: 服务器错误 - 处理请求时发生意外错误
  - `501`: 生成失败 - 内容生成任务失败
  - `505`: 功能已禁用 - 请求的功能当前已禁用

##### msg
- **类型**: `string`
- **说明**: 响应消息，失败时为错误描述。
- **示例**: `"success"`

##### data
- **类型**: `object`
- **说明**: 包含任务 ID 等数据。

### 相关资源
- **市场概览**: 探索所有可用模型
- **通用 API**: 查看积分与账户使用情况
- **授权**: 获取 API Key 和管理权限