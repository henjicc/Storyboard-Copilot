# Nano Banana Pro 图生图 - KIE API

## 概述
基于 Nano Banana Pro 模型实现图像生成。

## API 端点
**POST** `/api/v1/jobs/createTask`

## 请求示例

### 使用 nano-banana-pro 生成内容

**cURL**
```bash
curl --request POST \
  --url https://api.kie.ai/api/v1/jobs/createTask \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "model": "nano-banana-pro",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "aspect_ratio": "1:1",
    "resolution": "1K",
    "output_format": "png"
  }
}
'
```

**成功响应 (200)**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_nano-banana-pro_1765178625768"
  }
}
```

## 查询任务状态
提交任务后，可通过统一的查询端点查看任务进度并获取生成结果：[Get Task Details](/cn/market/common/get-task-detail)。

生产环境中，建议使用 `callBackUrl` 参数接收生成完成的自动通知，而非轮询状态端点。

## 授权
所有 API 都需要通过 Bearer Token 进行身份验证。

**获取 API Key：**
1.  访问 [API Key 管理页面](https://kie.ai/api-key) 获取您的 API Key。

**使用方法：**
在请求头中添加：`Authorization: Bearer YOUR_API_KEY`

**注意事项：**
*   请妥善保管您的 API Key，切勿泄露给他人。
*   若怀疑 API Key 泄露，请立即在管理页面重置。

## 请求体 (application/json)

| 参数 | 类型 | 必填 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `model` | `enum<string>` | 是 | `nano-banana-pro` | 用于生成任务的模型名称。**该端点必须使用 `nano-banana-pro` 模型**。<br>可用选项: `nano-banana-pro` |
| `callBackUrl` | `string<uri>` | 否 | - | 接收生成任务完成通知的回调 URL。可选配置，建议在生产环境中使用。<br>• 任务生成完成后，系统会向该 URL POST 任务状态与结果。<br>• 回调内容包含生成的资源 URL 与任务相关信息。<br>• 您的回调端点需要支持接收带 JSON 负载的 POST 请求。<br>• 也可以选择调用任务详情端点，主动轮询任务状态。 |
| `input` | `object` | 是 | - | 生成任务的输入参数。 |

### `input` 对象属性

| 参数 | 类型 | 必填 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `prompt` | `string` | 是 | - | 用于描述待生成图像的文本提示词。<br>**最大长度：** 10000 字符。 |
| `image_input` | `string<uri>[]` | 否 | `[]` | 用于图像变换或作为参考的输入图像（最多支持 8 张图片）。<br>• 值为上传后的文件 URL，非文件内容。<br>• 支持的类型：`image/jpeg`, `image/png`, `image/webp`。<br>• 最大文件大小：30.0MB。 |
| `aspect_ratio` | `enum<string>` | 否 | `1:1` | 生成图像的宽高比。<br>可用选项: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, `auto` |
| `resolution` | `enum<string>` | 否 | `1K` | 生成图像的分辨率。<br>可用选项: `1K`, `2K`, `4K` |
| `output_format` | `enum<string>` | 否 | `png` | 生成图像的输出格式。<br>可用选项: `png`, `jpg` |

## 响应

### 200 - 请求成功
**Content-Type:** `application/json`

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `code` | `enum<integer>` | 响应状态码。<br>可用选项: `200`, `401`, `402`, `404`, `422`, `429`, `455`, `500`, `501`, `505` |
| `msg` | `string` | 响应消息，请求失败时为错误描述。 |
| `data` | `object` | 响应数据。 |

#### `data` 对象属性
| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `taskId` | `string` | 任务 ID，可用于调用任务详情端点查询任务状态。 |