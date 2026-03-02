# Seedream 图片生成 4.0

> 来源: https://ppio.com/docs/models/reference-seedream4.0

Seedream 4.0 是一款先进的图像生成模型，提供灵活的图像创建功能，包括支持4K分辨率，可以从文本和其他图像生成图像。

本接口支持个人认证及企业认证用户调用。请参见 [实名认证](/docs/support/identity-verification)，完成个人用户认证或企业用户认证，以确保可以正常使用本功能。

## 请求示例

**请求**

```bash
curl --request POST \
  --url https://api.ppinfra.com/v3/seedream-4.0 \
  --header 'Authorization: <authorization>' \
  --header 'Content-Type: <content-type>' \
  --data '
{
  "prompt": "<string>",
  "images": [
    "<string>"
  ],
  "size": "<string>",
  "sequential_image_generation": "<string>",
  "max_images": 123,
  "watermark": true
}
'
```

**响应**

```json
{
  "images": [
    "<string>"
  ]
}
```

## 接口信息

*   **方法**: POST
*   **端点**: `https://api.ppinfra.com/v3/seedream-4.0`

## 请求头

| 参数 | 类型 | 是否必需 | 说明 |
| :--- | :--- | :--- | :--- |
| `Content-Type` | string | 是 | 必须为 `application/json`。 |
| `Authorization` | string | 是 | Bearer 身份验证格式，例如：`Bearer {{API 密钥}}`。 |

## 请求体

| 参数 | 类型 | 是否必需 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `prompt` | string | 是 | - | 用于生成图像的提示词，支持中英文。建议不超过300个汉字或600个英文单词。字数过多信息容易分散，模型可能因此忽略细节，只关注重点，造成视图片缺失部分元素。 |
| `images` | string[] | 否 | - | 输入要编辑的图像的Base64编码或可访问的URL。支持输入单张或多张图像。<br> • **图像URL**：确保图像URL可访问。<br> • **Base64编码**：格式必须为 `data:image/<图像格式>;base64,<Base64编码>`。<br><br>**图像要求**：<br> • 格式：jpeg, png<br> • 宽高比（宽度/高度）：范围为 `[1/3, 3]`<br> • 宽度和高度（像素）：> 14<br> • 大小：不超过10 MB<br> • 总像素值：不超过 `6000×6000` PX<br> • 支持上传最多10张参考图像。 |
| `size` | string | 否 | `2048x2048` | 设置生成图像的规格。有两种方法可用，但不能同时使用。<br> 1. **指定分辨率**：可选值 `1K`, `2K`, `4K`。<br> 2. **指定宽高像素**：总像素值范围 `[1024x1024, 4096x4096]`，宽高比值范围 `[1/16, 16]`。<br><br>**推荐尺寸**：<br><br> \| 宽高比 \| 宽度和高度像素值 \|<br>\| --- \| --- \|<br>\| 1:1 \| 2048x2048 \|<br>\| 4:3 \| 2304x1728 \|<br>\| 3:4 \| 1728x2304 \|<br>\| 16:9 \| 2560x1440 \|<br>\| 9:16 \| 1440x2560 \|<br>\| 3:2 \| 2496x1664 \|<br>\| 2:3 \| 1664x2496 \|<br>\| 21:9 \| 3024x1296 \| |
| `sequential_image_generation` | string | 否 | `disabled` | 控制是否禁用批量生成功能。<br> • `auto`：模型根据提示词自动决定是否返回多张图像以及数量。<br> • `disabled`：禁用批量生成，只生成一张图像。 |
| `max_images` | integer | 否 | 15 | 指定此请求中要生成的最大图像数量。**仅在 `sequential_image_generation` 设置为 `auto` 时有效**。取值范围：`[1, 15]`。<br>**说明**：实际生成的图像数量受 `max_images` 和输入参考图像数量的影响。规则为：输入参考图像数量 + 生成图像数量 ≤ 15。 |
| `watermark` | boolean | 否 | `true` | 为生成的图像添加水印。<br> • `false`：不添加水印。<br> • `true`：在图像的右下角添加带有 “AI生成” 文字的水印。 |

## 响应

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `images` | string[] | 包含生成图像下载链接的数组。 |

[Seedream 文生图](/docs/models/reference-seedream-text-to-image) [即梦文生图 3.0](/docs/models/reference-seedream3.0-text-to-image)