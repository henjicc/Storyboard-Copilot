# POST Seedream4.0 文生图

使用 `bytedance/seedream-v4-text-to-image` 模型生成高质量写实风格图像。

## 请求示例

```bash
curl --request POST \
  --url https://api.kie.ai/api/v1/jobs/createTask \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "model": "bytedance/seedream-v4-text-to-image",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "prompt": "在黑板上绘制下列二元一次方程组及对应的解题步骤：5x + 2y = 26；2x - y = 5",
    "image_size": "square_hd",
    "image_resolution": "1K",
    "max_images": 1
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
    "taskId": "task_bytedance_1765176547151"
  }
}
```

## 查询任务状态

提交任务后，可通过统一的查询端点查看任务进度并获取生成结果。建议参考 [获取任务详情](/cn/market/common/get-task-detail)。

生产环境中，建议使用 `callBackUrl` 参数接收生成完成的自动通知，而非轮询状态端点。

## 请求参数

### Authorizations

**Authorization**
*   **类型**: string
*   **位置**: header
*   **必需**: 是
*   **描述**: 所有 API 都需要通过 Bearer Token 进行身份验证。
    *   **获取 API Key**：访问 [API Key 管理页面](https://kie.ai/api-key) 获取。
    *   **使用方法**：在请求头中添加 `Authorization: Bearer YOUR_API_KEY`。
    *   **注意事项**：请妥善保管您的 API Key，切勿泄露给他人。若怀疑 API Key 泄露，请立即在管理页面重置。

### Body (application/json)

**model**
*   **类型**: enum<string>
*   **默认值**: `bytedance/seedream-v4-text-to-image`
*   **必需**: 是
*   **描述**: 用于生成任务的模型名称。该端点必须使用 `bytedance/seedream-v4-text-to-image` 模型。
*   **可用选项**: `bytedance/seedream-v4-text-to-image`
*   **示例**: `"bytedance/seedream-v4-text-to-image"`

**callBackUrl**
*   **类型**: string<uri>
*   **必需**: 否
*   **描述**: 接收生成任务完成通知的回调 URL。可选配置，建议在生产环境中使用。
    *   任务生成完成后，系统会向该 URL POST 任务状态与结果。
    *   回调内容包含生成的资源 URL 与任务相关信息。
    *   您的回调端点需要支持接收带 JSON 负载的 POST 请求。
    *   也可以选择调用任务详情端点，主动轮询任务状态。
*   **示例**: `"https://your-domain.com/api/callback"`

**input**
*   **类型**: object
*   **必需**: 是
*   **描述**: 生成任务的输入参数。

**input.prompt**
*   **类型**: string
*   **必需**: 是
*   **描述**: 用于生成图像的文本提示词。
*   **最大长度**: 5000 字符
*   **示例**: `"在黑板上绘制下列二元一次方程组及对应的解题步骤：5x + 2y = 26；2x - y = 5"`

**input.image_size**
*   **类型**: enum<string>
*   **默认值**: `square_hd`
*   **必需**: 否
*   **描述**: 生成图像的尺寸规格。
*   **可用选项**: `square`, `square_hd`, `portrait_4_3`, `portrait_3_2`, `portrait_16_9`, `landscape_4_3`, `landscape_3_2`, `landscape_16_9`, `landscape_21_9`
*   **示例**: `"square_hd"`

**input.image_resolution**
*   **类型**: enum<string>
*   **默认值**: `1K`
*   **必需**: 否
*   **描述**: 最终图像分辨率由 `image_size`（宽高比）和 `image_resolution`（像素尺度）共同决定。例如，选择 4:3 比例 + 4K 分辨率，将得到 4096 × 3072 像素的图像。
*   **可用选项**: `1K`, `2K`, `4K`
*   **示例**: `"1K"`

**input.max_images**
*   **类型**: number
*   **默认值**: `1`
*   **必需**: 否
*   **描述**: 设置单次生成任务可产出的图像数量上限（取值范围 1–6）。由于这些图像是一次性生成而非分批次请求，你需要在提示词中明确说明所需图像数量，确保与该参数设置保持一致。
*   **范围**: `1 <= x <= 6`
*   **示例**: `1`

**input.seed**
*   **类型**: integer
*   **必需**: 否
*   **描述**: 用于控制图像生成随机性的随机种子。

## 响应参数

**code**
*   **类型**: enum<integer>
*   **描述**: 响应状态码。
*   **可用选项及含义**:
    *   `200`: 成功 - 请求已处理完成
    *   `401`: 未授权 - 身份验证凭据缺失或无效
    *   `402`: 积分不足 - 账户积分不足以执行该操作
    *   `404`: 未找到 - 请求的资源或端点不存在
    *   `422`: 验证错误 - 请求参数未通过校验
    *   `429`: 速率限制 - 已超出该资源的请求频次限制
    *   `455`: 服务不可用 - 系统正在维护中
    *   `500`: 服务器错误 - 处理请求时发生意外故障
    *   `501`: 生成失败 - 内容生成任务执行失败
    *   `505`: 功能禁用 - 当前请求的功能暂未开放

**msg**
*   **类型**: string
*   **描述**: 响应消息，请求失败时为错误描述。
*   **示例**: `"success"`

**data**
*   **类型**: object
*   **描述**: 响应数据。

**data.taskId**
*   **类型**: string
*   **描述**: 任务 ID，可用于调用任务详情端点查询任务状态。
*   **示例**: `"task_bytedance_1765176547151"`