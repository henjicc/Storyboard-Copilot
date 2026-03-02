# POST Seedream4.5 文生图

基于 Seedream 先进 AI 模型的高质量写实风格图像生成。

**请求方法:** POST
**请求路径:** `/api/v1/jobs/createTask`

## 快速开始

使用 `seedream/4.5-text-to-image` 模型生成图像。

```bash
curl --request POST \
  --url https://api.kie.ai/api/v1/jobs/createTask \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "model": "seedream/4.5-text-to-image",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "prompt": "A full-process cafe design tool for entrepreneurs and designers. It covers core needs including store layout, functional zoning, decoration style, equipment selection, and customer group adaptation, supporting integrated planning of \"commercial attributes + aesthetic design.\" Suitable as a promotional image for a cafe design SaaS product, with a 16:9 aspect ratio.",
    "aspect_ratio": "1:1",
    "quality": "basic"
  }
}
'
```

**成功响应示例：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_seedream_1765166238716"
  }
}
```

## 查询任务状态

提交任务后，可通过统一查询端点查看进度并获取结果。详情请参考 [获取任务详情](/cn/market/common/get-task-detail)。

生产环境中，建议使用 `callBackUrl` 参数在生成完成时接收自动通知，而非轮询状态端点。

## 相关资源

* [市场概览](/cn/market/quickstart)
* [通用 API](/cn/common-api/get-account-credits)

## 请求参数

### Authorizations

| 参数名 | 类型 | 位置 | 必填 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `Authorization` | `string` | `header` | 是 | 所有 API 都需要通过 Bearer Token 进行身份验证。<br>获取 API Key：<br>1. 访问 [API Key 管理页面](https://kie.ai/api-key) 获取您的 API Key。<br>使用方法：添加到请求头：`Authorization: Bearer YOUR_API_KEY`。<br>**注意：** 请妥善保管您的 API Key，不要与他人共享。如果您怀疑 API Key 已泄露，请立即在管理页面重置。 |

### Body (application/json)

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `model` | `enum<string>` | 是 | `seedream/4.5-text-to-image` | 用于生成的模型名称。此端点必须使用 `seedream/4.5-text-to-image`。<br>**可用选项:** `seedream/4.5-text-to-image`<br>**示例:** `"seedream/4.5-text-to-image"` |
| `callBackUrl` | `string<uri>` | 否 | - | 接收生成任务完成更新的 URL。可选但建议在生产环境中使用。<br>当生成完成时，系统将向此 URL POST 任务状态和结果。回调包含生成的内容 URL 和任务信息。您的回调端点应接受包含结果的 JSON 负载的 POST 请求。或者，使用获取任务详情端点轮询任务状态。<br>**示例:** `"https://your-domain.com/api/callback"` |
| `input` | `object` | 是 | - | 生成任务的输入参数。 |

#### input 对象属性

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `prompt` | `string` | 是 | - | 您想要生成的图像的文本描述（最大长度：3000 字符）。<br>**最大长度:** `3000`<br>**示例:** `"A full-process cafe design tool for entrepreneurs and designers. It covers core needs including store layout, functional zoning, decoration style, equipment selection, and customer group adaptation, supporting integrated planning of \"commercial attributes + aesthetic design.\" Suitable as a promotional image for a cafe design SaaS product, with a 16:9 aspect ratio."` |
| `aspect_ratio` | `enum<string>` | 是 | `1:1` | 图像的宽高比，决定其视觉形态。<br>**可用选项:** `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `2:3`, `3:2`, `21:9`<br>**示例:** `"1:1"` |
| `quality` | `enum<string>` | 是 | `basic` | 基础质量输出 2K 图像，高质量输出 4K 图像。<br>**可用选项:** `basic`, `high`<br>**示例:** `"basic"` |

## 响应

### 请求成功

| 参数名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `code` | `enum<integer>` | 响应状态码。<br>**可用选项:** `200`, `401`, `402`, `404`, `422`, `429`, `455`, `500`, `501`, `505`<br>**状态码说明:**<br>- `200`: 成功 - 请求已成功处理<br>- `401`: 未授权 - 身份验证凭据缺失或无效<br>- `402`: 积分不足 - 账户没有足够的积分执行操作<br>- `404`: 未找到 - 请求的资源或端点不存在<br>- `422`: 验证错误 - 请求参数未通过验证检查<br>- `429`: 速率限制 - 已超过此资源的请求限制<br>- `455`: 服务不可用 - 系统正在维护中<br>- `500`: 服务器错误 - 处理请求时发生意外错误<br>- `501`: 生成失败 - 内容生成任务失败<br>- `505`: 功能已禁用 - 请求的功能当前已禁用 |
| `msg` | `string` | 响应消息，失败时为错误描述。<br>**示例:** `"success"` |
| `data` | `object` | 响应数据。 |

#### data 对象属性

| 参数名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `taskId` | `string` | 任务 ID，可用于获取任务详情端点查询任务状态。<br>**示例:** `"task_seedream_1765166238715"` |