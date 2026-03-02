---
title: "Seedream5 Lite 图生图 - KIE API"
url: "https://docs.kie.ai/cn/market/seedream/5-lite-image-to-image"
captured_at: "2026-03-01T11:43:38.193Z"
---
# Seedream5 Lite 图生图 API 文档

## API 端点

**POST** `/api/v1/jobs/createTask`

## 请求示例

使用 `seedream/5-lite-image-to-image` 生成内容：

```bash
curl --request POST \
 --url https://api.kie.ai/api/v1/jobs/createTask \
 --header 'Authorization: Bearer <token>' \
 --header 'Content-Type: application/json' \
 --data @- <<EOF
{
 "model": "seedream/5-lite-image-to-image",
 "callBackUrl": "https://your-domain.com/api/callback",
 "input": {
 "prompt": "Keep the model's pose and the flowing shape of the liquid dress unchanged. Change the clothing material from silver metal to completely transparent clear water (or glass). Through the liquid water, the model's skin details are visible. Lighting changes from reflection to refraction.",
 "image_urls": [
 "https://static.aiquickdraw.com/tools/example/1764851484363_ScV1s2aq.webp"
 ],
 "aspect_ratio": "1:1",
 "quality": "basic"
 }
}
EOF
```

## 响应示例

```json
{
 "code": 200,
 "msg": "success",
 "data": {
 "taskId": "task_seedream_1765173396122"
 }
}
```

## 请求参数

### Authorization (header)
- **类型**: string
- **必填**: 是
- **说明**: 所有 API 都需要通过 Bearer Token 进行身份验证
- **获取方式**: 访问 API Key 管理页面获取您的 API Key
- **使用方法**: 添加到请求头：`Authorization: Bearer YOUR_API_KEY`
- **注意**: 请妥善保管您的 API Key，不要与他人共享；如果怀疑泄露，请立即重置

### model
- **类型**: enum<string>
- **默认值**: `seedream/5-lite-image-to-image`
- **必填**: 是
- **说明**: 用于生成的模型名称
- **可用选项**: `seedream/5-lite-image-to-image`
- **示例**: `"seedream/5-lite-image-to-image"`

### callBackUrl
- **类型**: string<uri>
- **必填**: 否
- **说明**: 接收生成任务完成更新的 URL。建议在生产环境中使用
- **说明**: 当生成完成时，系统将向此 URL POST 任务状态和结果；回调包含生成的内容 URL 和任务信息；您的回调端点应接受包含结果的 JSON 负载的 POST 请求；或者，使用获取任务详情端点轮询任务状态；为确保回调安全性，请参阅 Webhook 校验指南了解签名验证实现方法
- **示例**: `"https://your-domain.com/api/callback"`

### input
- **类型**: object
- **必填**: 是
- **说明**: 生成任务的输入参数

#### input.prompt
- **类型**: string
- **必填**: 是
- **说明**: 您想要生成的图像的文本描述（最大长度：3000 字符）
- **最大长度**: 3000 字符
- **示例**: `"Keep the model's pose and the flowing shape of the liquid dress unchanged. Change the clothing material from silver metal to completely transparent clear water (or glass). Through the liquid water, the model's skin details are visible. Lighting changes from reflection to refraction."`

#### input.image_urls
- **类型**: string<uri>[]
- **必填**: 是
- **说明**: 上传图像文件作为 API 的输入（上传后的文件 URL，非文件内容；支持类型：image/jpeg、image/png、image/webp；最大大小：10.0MB）
- **最大数组长度**: 14
- **示例**: 
```json
[
 "https://static.aiquickdraw.com/tools/example/1764851484363_ScV1s2aq.webp"
]
```

#### input.aspect_ratio
- **类型**: enum<string>
- **默认值**: `1:1`
- **必填**: 是
- **说明**: 图像的宽高比，决定其视觉形态
- **可用选项**: `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `2:3`, `3:2`, `21:9`
- **示例**: `"1:1"`

#### input.quality
- **类型**: enum<string>
- **默认值**: `basic`
- **必填**: 是
- **说明**: 基础质量输出 2K 图像，高质量输出 4K 图像
- **可用选项**: `basic`, `high`
- **示例**: `"basic"`

## 响应参数

### code
- **类型**: enum<integer>
- **说明**: 响应状态码
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

### msg
- **类型**: string
- **说明**: 响应消息，失败时为错误描述
- **示例**: `"success"`

### data
- **类型**: object
- **说明**: 响应数据

## 查询任务状态

提交任务后，可通过统一查询端点查看进度并获取结果。生产环境中，建议使用 `callBackUrl` 参数在生成完成时接收自动通知，而非轮询状态端点。

## 相关资源

- **市场概览**: 探索所有可用模型
- **通用 API**: 查看积分与账户使用情况
- **授权**: Authorization