---
title: "Google Nano Banana 2 - KIE API"
url: "https://docs.kie.ai/cn/market/google/nano-banana-2"
captured_at: "2026-03-01T11:42:34.492Z"
---
# Google Nano Banana 2 API 文档

## 基于 Nano Banana 2 模型实现图像生成

### 端点信息
- **方法**: POST
- **路径**: `/api/v1/jobs/createTask`

### 请求示例
使用 nano-banana-2 生成内容：
```bash
curl --request POST \
 --url https://api.kie.ai/api/v1/jobs/createTask \
 --header 'Authorization: Bearer <token>' \
 --header 'Content-Type: application/json' \
 --data '
{
 "model": "nano-banana-2",
 "callBackUrl": "https://your-domain.com/api/callback",
 "input": {
 "prompt": "一幅高度细致的插画：香蕉造型的未来飞船在夜晚的霓虹城市上空飞行，光影真实、具有电影感效果、4K 质量。",
 "aspect_ratio": "auto",
 "resolution": "2K",
 "output_format": "jpg",
 "google_search": false,
 "image_input": []
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
 "taskId": "task_nano-banana-2_1765178625768"
 }
}
```

## 请求参数

### Authorization
- **类型**: string
- **位置**: header
- **必填**: 是
- **说明**: 所有 API 都需要通过 Bearer Token 进行身份验证。
  - 获取 API Key：访问 API Key 管理页面获取您的 API Key
  - 使用方法：在请求头中添加：`Authorization: Bearer YOUR_API_KEY`
  - 注意事项：
    - 请妥善保管您的 API Key，切勿泄露给他人
    - 若怀疑 API Key 泄露，请立即在管理页面重置

### 请求体 (application/json)

#### model
- **类型**: enum<string>
- **默认值**: nano-banana-2
- **必填**: 是
- **说明**: 用于生成任务的模型名称。必填字段。
  - 该端点必须使用 nano-banana-2 模型
- **可用选项**: nano-banana-2
- **示例**: "nano-banana-2"

#### callBackUrl
- **类型**: string<uri>
- **必填**: 否
- **说明**: 接收生成任务完成通知的回调 URL。可选配置，建议在生产环境中使用。
  - 任务生成完成后，系统会向该 URL POST 任务状态与结果
  - 回调内容包含生成的资源 URL 与任务相关信息
  - 您的回调端点需要支持接收带 JSON 负载的 POST 请求
  - 也可以选择调用任务详情端点，主动轮询任务状态
  - 为确保回调安全性，请参阅 Webhook 校验指南了解签名验证实现方法
- **示例**: "https://your-domain.com/api/callback"

#### input
- **类型**: object
- **说明**: 生成任务的输入参数

##### input.prompt
- **类型**: string
- **必填**: 是
- **说明**: 用于描述待生成图像的文本提示词（最大长度：20000 字符）
- **最大长度**: 20000 字符
- **示例**: "一幅高度细致的插画：香蕉造型的未来飞船在夜晚的霓虹城市上空飞行，光影真实、具有电影感效果、4K 质量。"

##### input.aspect_ratio
- **类型**: enum<string>
- **默认值**: auto
- **说明**: 生成图像的宽高比
- **可用选项**: auto, 1:1, 1:4, 16:9, 1:8, 21:9, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16
- **示例**: "auto"

##### input.google_search
- **类型**: boolean
- **说明**: Google 搜索：使用 Google Web Search 实时检索信息，以基于实时数据（如天气、体育比分、近期事件等）进行图像生成。
- **示例**: false

##### input.image_input
- **类型**: string<uri>[]
- **说明**: 用于图像变换或作为参考的输入图像（最多支持 14 张图片）（为上传后的文件 URL，非文件内容；支持的类型：image/jpeg、image/png、image/webp；最大文件大小：30.0MB）
- **最大数组长度**: 14
- **示例**: []

##### input.output_format
- **类型**: enum<string>
- **默认值**: jpg
- **说明**: 生成图像的输出格式
- **可用选项**: jpg, png
- **示例**: "jpg"

##### input.resolution
- **类型**: enum<string>
- **默认值**: 1K
- **说明**: 生成图像的分辨率
- **可用选项**: 1K, 2K, 4K
- **示例**: "1K"

## 响应

### 200 (application/json)
请求成功

#### code
- **类型**: enum<integer>
- **说明**: 响应状态码
- **可用选项**:
  - 200: 成功 - 请求已处理完成
  - 401: 未授权 - 身份验证凭据缺失或无效
  - 402: 积分不足 - 账户积分不足以执行该操作
  - 404: 未找到 - 请求的资源或端点不存在
  - 422: 验证错误 - 请求参数未通过校验
  - 429: 速率限制 - 已超出该资源的请求频次限制
  - 455: 服务不可用 - 系统正在维护中
  - 500: 服务器错误 - 处理请求时发生意外故障
  - 501: 生成失败 - 内容生成任务执行失败
  - 505: 功能禁用 - 当前请求的功能暂未开放

#### msg
- **类型**: string
- **说明**: 响应消息，请求失败时为错误描述
- **示例**: "success"

#### data
- **类型**: object
- **说明**: 包含任务ID等数据

## 查询任务状态
提交任务后，可通过统一的查询端点查看任务进度并获取生成结果：
- 获取任务详情：了解如何查询任务状态并获取生成结果

**生产环境中，建议使用 callBackUrl 参数接收生成完成的自动通知，而非频繁轮询状态端点。这样可以降低请求次数、减少延迟，并提升整体稳定性。**

## 相关资源
- 市场概览：浏览所有可用模型
- 通用 API：查看账户积分与使用情况
- 授权：获取 API Key 和使用说明