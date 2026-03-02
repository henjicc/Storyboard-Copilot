---
title: "Seedream 图片生成 5.0 lite - PPIO 派欧云文档中心"
url: "https://ppio.com/docs/models/reference-seedream-5.0-lite"
captured_at: "2026-02-28T08:34:05.122Z"
---
# Seedream 图片生成 5.0 lite

## API 调用

### cURL 示例

```bash
curl --request POST \
 --url https://api.ppio.com/v3/seedream-5.0-lite \
 --header 'Authorization: <authorization>' \
 --header 'Content-Type: <content-type>' \
 --data '
{
 "size": "<string>",
 "image": [
 {}
 ],
 "prompt": "<string>",
 "watermark": true,
 "optimize_prompt_options": {
 "mode": "<string>"
 },
 "sequential_image_generation": "<string>",
 "sequential_image_generation_options": {
 "max_images": 123
 }
}
'
```

### 响应示例

```json
{
 "images": [
 {}
 ]
}
```

## 请求头

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Content-Type | string | 是 | 枚举值: `application/json` |
| Authorization | string | 是 | Bearer 身份验证格式，例如：`Bearer {{API 密钥}}` |

## 请求体

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| size | string | `"2048x2048"` | 指定生成图像的尺寸信息。方式1：指定分辨率（2K、3K）；方式2：指定宽高像素值（如2048x2048）。总像素取值范围：[2560x1440=3686400, 3072x3072x1.1025=10404496]，宽高比取值范围：[1/16, 16]。 |
| image | array | - | 输入的图片信息数组，支持 URL 或 Base64 编码。最多支持传入 14 张参考图。图片格式支持 jpeg、png、webp、bmp、tiff、gif。数组长度：1 - 14 |
| prompt | string | 是 | 用于生成图像的提示词，支持中英文。建议不超过300个汉字或600个英文单词。 |
| watermark | boolean | `true` | 是否在生成的图片中添加水印。 |
| optimize_prompt_options | object | - | 提示词优化功能的配置。 |
| sequential_image_generation | string | `"disabled"` | 控制是否关闭组图功能。`auto`：自动判断模式，模型会根据提示词自主判断是否返回组图；`disabled`：关闭组图功能，只生成一张图。可选值：`auto`, `disabled` |
| sequential_image_generation_options | object | - | 组图功能的配置。仅当 `sequential_image_generation` 为 `auto` 时生效。 |

### optimize_prompt_options 子字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| mode | string | `"standard"` | 设置提示词优化功能使用的模式。`standard`：标准模式，质量更高，耗时较长；`fast`：快速模式，耗时更短，质量一般。当前仅支持 standard 模式。可选值：`standard` |

### sequential_image_generation_options 子字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| max_images | integer | `15` | 指定本次请求最多可生成的图片数量。输入的参考图数量+最终生成的图片数量≤15张。取值范围：[1, 15] |

## 响应

| 字段 | 类型 | 说明 |
|------|------|------|
| images | array | 生成的图片信息数组。 |

## 说明

图片生成模型 Seedream 5.0 lite 的调用 API，支持文生图、单图生图、多图生图，以及组图生成功能。