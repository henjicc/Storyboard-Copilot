# Z-Image

使用 z-image 模型生成图像。

## 接口

**POST** `/api/v1/jobs/createTask`

## 请求示例

```bash
curl --request POST \
  --url https://api.kie.ai/api/v1/jobs/createTask \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "model": "z-image",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "prompt": "Generate a photorealistic image of a cafe terrace in the Marais district of Paris on a Wednesday morning in March 2025. It is a crisp, cool spring morning with clear skies. Locals are drinking coffee. In sharp focus should be a young woman with a pixie cut wearing a scarf, stirring a cappuccino and looking thoughtfully to the side; the waiter and street traffic behind her are blurred. The photo should have the candid, natural morning light feel of an iPhone image.",
    "aspect_ratio": "1:1"
  }
}
'
```

## 响应示例

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_z-image_1765174270120"
  }
}
```

## 查询任务状态

提交任务后，可通过统一查询端点查看进度并获取结果。

生产环境中，建议使用 `callBackUrl` 参数在生成完成时接收自动通知，而非轮询状态端点。

## 请求头

### Authorization

**类型**: `string` (Header, Required)

所有 API 都需要通过 Bearer Token 进行身份验证。

**获取 API Key**:
1. 访问 [API Key 管理页面](https://kie.ai/api-key) 获取您的 API Key。

**使用方法**:
添加到请求头：
```
Authorization: Bearer YOUR_API_KEY
```

**注意**:
* 请妥善保管您的 API Key，不要与他人共享。
* 如果您怀疑 API Key 已泄露，请立即在管理页面重置。

## 请求体 (application/json)

### model

**类型**: `enum<string>` (Required, Default: `z-image`)

用于生成的模型名称。此端点必须使用 `z-image`。

**示例**: `"z-image"`

### callBackUrl

**类型**: `string<uri>` (Optional)

接收生成任务完成更新的 URL。可选但建议在生产环境中使用。

* 当生成完成时，系统将向此 URL POST 任务状态和结果。
* 回调包含生成的内容 URL 和任务信息。
* 您的回调端点应接受包含结果的 JSON 负载的 POST 请求。
* 或者，使用获取任务详情端点轮询任务状态。

**示例**: `"https://your-domain.com/api/callback"`

### input

**类型**: `object`

生成任务的输入参数。

#### input.prompt

**类型**: `string` (Required)

您想要生成的图像的文本描述（最大长度：1000 字符）。

**最大长度**: `1000`

**示例**: `"Generate a photorealistic image of a cafe terrace in the Marais district of Paris on a Wednesday morning in March 2025. It is a crisp, cool spring morning with clear skies. Locals are drinking coffee. In sharp focus should be a young woman with a pixie cut wearing a scarf, stirring a cappuccino and looking thoughtfully to the side; the waiter and street traffic behind her are blurred. The photo should have the candid, natural morning light feel of an iPhone image."`

#### input.aspect_ratio

**类型**: `enum<string>` (Required, Default: `1:1`)

生成图像的宽高比。

**可用选项**:
* `1:1`
* `4:3`
* `3:4`
* `16:9`
* `9:16`

**示例**: `"1:1"`

## 响应

### code

**类型**: `enum<integer>`

响应状态码。

**可用选项**:
* `200`: 成功 - 请求已成功处理
* `401`: 未授权 - 身份验证凭据缺失或无效
* `402`: 积分不足 - 账户没有足够的积分执行操作
* `404`: 未找到 - 请求的资源或端点不存在
* `422`: 验证错误 - 请求参数未通过验证检查
* `429`: 速率限制 - 已超过此资源的请求限制
* `455`: 服务不可用 - 系统正在维护中
* `500`: 服务器错误 - 处理请求时发生意外错误
* `501`: 生成失败 - 内容生成任务失败
* `505`: 功能已禁用 - 请求的功能当前已禁用

### msg

**类型**: `string`

响应消息，失败时为错误描述。

**示例**: `"success"`

### data

**类型**: `object`

#### data.taskId

**类型**: `string`

任务 ID，可用于获取任务详情端点查询任务状态。

**示例**: `"task_z-image_1765174270120"`