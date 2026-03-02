---
title: "Gemini 3.1 Flash 图片编辑 - PPIO 派欧云文档中心"
url: "https://ppio.com/docs/models/reference-gemini-3.1-flash-image-edit"
captured_at: "2026-02-28T13:56:07.337Z"
---
# Gemini 3.1 Flash 图片编辑

## API 端点
`POST https://api.ppio.com/v3/gemini-3.1-flash-image-edit`

## 描述
Gemini 3.1 Flash 图片编辑 API，基于 Google Gemini 3.1 Flash 模型提供高效的图片编辑能力。支持通过自然语言描述编辑图片，输出分辨率从 0.5K 到 4K，并支持扩展的宽高比。

## 请求头
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Content-Type | string | 是 | 枚举值: `application/json` |
| Authorization | string | 是 | Bearer 身份验证格式，例如：`Bearer {{API 密钥}}` |

## 请求体
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| size | string | 否 | "1K" | 输出图片的像素尺寸。可选值：`0.5K` (约512px)、`1K` (约1024px)、`2K` (约2048px)、`4K` (约4096px) |
| prompt | string | 是 | - | 描述期望图片编辑效果的文本提示词 |
| image_urls | array | 否 | - | 用于编辑的输入图片 URL 列表，最多支持 14 张参考图。数组长度：0 - 14 |
| aspect_ratio | string | 否 | - | 输出图片的宽高比。支持标准比例和新增的超宽/超长比例（1:4、4:1、1:8、8:1）。可选值：`1:1`、`1:4`、`1:8`、`2:3`、`3:2`、`3:4`、`4:1`、`4:3`、`4:5`、`5:4`、`8:1`、`9:16`、`16:9`、`21:9` |
| image_base64s | array | 否 | - | 用于编辑的 Base64 编码图片列表。`image_urls` 和 `image_base64s` 的总数不超过 14 张。数组长度：0 - 14 |
| output_format | string | 否 | "image/png" | 输出图片的 MIME 类型。支持格式：`image/png`、`image/jpeg`。默认为 `image/png`。可选值：`image/png`、`image/jpeg` |

## 响应
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_urls | array | 是 | 编辑后的图片 URL 列表 |

## 示例请求 (cURL)
```bash
curl --request POST \
 --url https://api.ppio.com/v3/gemini-3.1-flash-image-edit \
 --header 'Authorization: <authorization>' \
 --header 'Content-Type: <content-type>' \
 --data '
{
 "size": "<string>",
 "prompt": "<string>",
 "image_urls": [
 {}
 ],
 "aspect_ratio": "<string>",
 "image_base64s": [
 {}
 ],
 "output_format": "<string>"
}
'
```

## 示例响应 (200)
```json
{
 "image_urls": [
 {}
 ]
}
```