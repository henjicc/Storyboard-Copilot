---
title: "Gemini 3.1 Flash 图片生成 - PPIO 派欧云文档中心"
url: "https://ppio.com/docs/models/reference-gemini-3.1-flash-image-text-to-image"
captured_at: "2026-02-28T13:55:59.373Z"
---
# Gemini 3.1 Flash 图片生成

## API 端点

**POST** `https://api.ppio.com/v3/gemini-3.1-flash-image-text-to-image`

## 描述

Gemini 3.1 Flash 文生图 API。从文本提示词生成高质量图片，支持可配置的宽高比、分辨率和思考深度，低延迟。

## 请求头

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `Content-Type` | string | 是 | 枚举值: `application/json` |
| `Authorization` | string | 是 | Bearer 身份验证格式，例如：`Bearer {{API 密钥}}` |

## 请求体

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `size` | string | 否 | `"1K"` | 输出图片的像素尺寸（宽*高）。0.5K（512px）仅适用于 Gemini 3.1 Flash。可选值：`0.5K`, `1K`, `2K`, `4K` |
| `prompt` | string | 是 | - | 描述要生成图片的文本提示词 |
| `aspect_ratio` | string | 否 | `"1:1"` | 生成图片的宽高比。可选值：`1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9` |
| `output_format` | string | 否 | `"image/png"` | 输出图片的 MIME 类型，支持 PNG 和 JPEG 格式。可选值：`image/png`, `image/jpeg` |

## 响应

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image_urls` | array | 是 | 生成的图片 URL 列表 |

## 示例

### cURL

```bash
curl --request POST \
 --url https://api.ppio.com/v3/gemini-3.1-flash-image-text-to-image \
 --header 'Authorization: <authorization>' \
 --header 'Content-Type: <content-type>' \
 --data '
{
 "size": "<string>",
 "prompt": "<string>",
 "aspect_ratio": "<string>",
 "output_format": "<string>"
}
'
```

### 响应示例

```json
{
 "image_urls": [
  {}
 ]
}
```