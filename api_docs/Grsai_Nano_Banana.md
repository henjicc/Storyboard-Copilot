# API文档

## 节点信息

**Host(海外)**: `https://grsaiapi.com`

**Host(国内直连)**: `https://grsai.dakka.com.cn`

**使用方式**: `Host` + 接口，例如: `https://grsai.dakka.com.cn/v1/draw/nano-banana`

---

## 绘画接口

### `POST /v1/draw/nano-banana`

Nano Banana绘画核心接口。

- **请求方式**: POST
- **响应方式**: stream 或 回调接口

### 请求头 (Headers)
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer apikey"
}
```

### 请求参数 (JSON)
```json
{
  "model": "nano-banana-fast",
  "prompt": "提示词",
  "aspectRatio": "auto",
  "imageSize": "1K",
  "urls": [
    "https://example.com/example.png"
  ],
  "webHook": "https://example.com/callback",
  "shutProgress": false
}
```

### 参数说明

| 参数 | 类型 | 必填 | 示例 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| **model** | `string` | 是 | `"nano-banana-fast"` | **支持的模型**: `nano-banana-fast`, `nano-banana`, `nano-banana-pro`, `nano-banana-pro-vt`, `nano-banana-pro-cl`, `nano-banana-pro-vip`, `nano-banana-pro-4k-vip` |
| **urls** | `array` | 否 | `["https://example.com/example.png"]` | 参考图URL或Base64 |
| **prompt** | `string` | 是 | `"一只可爱的猫咪在草地上玩耍"` | 提示词 |
| **aspectRatio** | `string` | 否 | `"auto"` | **支持的图像比例**: `auto`, `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `5:4`, `4:5`, `21:9` (默认： `auto`) |
| **imageSize** | `string` | 否 | `"1K"` | **支持的图像大小**: `1K`, `2K`, `4K` (默认： `1K`)。**注意**: 分辨率越高，生成时间越长。<br>**各模型支持的分辨率**: `nano-banana-pro`， `nano-banana-pro-vt`， `nano-banana-pro-cl` 支持1K,2K,4K；`nano-banana-pro-vip`支持1K,2K；`nano-banana-pro-4k-vip`支持4K。 |
| **webHook** | `string` | 否 | `"https://your-webhook-url.com/callback"` | 进度与结果的回调链接。<br>1. 默认以Stream流式响应回复。<br>2. 填写后，将以Post请求回调到该地址。<br>3. 如需使用轮询`/v1/draw/result`接口方式获取结果，且希望立即返回一个任务ID，可将参数填写为`"-1"`。 |
| **shutProgress** | `boolean` | 否 | `false` | 关闭进度回复，直接回复最终结果。建议搭配webHook使用。（默认： `false`） |

### WebHook模式 - 立即响应 (当`webHook`不为空或不为`"-1"`时跳过此步骤)
如果请求参数中`webHook`设置为`"-1"`，接口将立即返回一个任务ID，供后续轮询使用。

**立即响应示例**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "id"
  }
}
```

**响应参数说明（立即响应）**:
| 参数 | 类型 | 示例 | 描述 |
| :--- | :--- | :--- | :--- |
| **code** | `number` | `0` | 状态码：`0`为成功 |
| **msg** | `string` | `"success"` | 状态信息 |
| **data** | `object` | - | 数据对象 |
| **data.id** | `string` | `"f44bcf50-f2d0-4c26-a467-26f2014a771b"` | 程序任务ID，用于在回调数据或轮询结果接口中对应任务 |

### 响应参数 (JSON) （流式响应与WebHook回调通用）
```json
{
  "id": "xxxxx",
  "results": [
    {
      "url": "https://example.com/example.png",
      "content": "这是一只可爱的猫咪在草地上玩耍"
    }
  ],
  "progress": 100,
  "status": "succeeded",
  "failure_reason": "",
  "error": ""
}
```

**响应参数说明**:
| 参数 | 类型 | 示例 | 描述 |
| :--- | :--- | :--- | :--- |
| **id** | `string` | `"f44bcf50-f2d0-4c26-a467-26f2014a771b"` | 任务ID (WebHook回调时可用此ID对应数据) |
| **results** | `array` | `[{"url": "...", "content": "..."}]` | 结果数组。<br>- `content`: 回复内容<br>- `url`: 生成的图片URL（有效期为2小时） |
| **progress** | `number` | `100` | 任务进度，0 ~ 100 |
| **status** | `string` | `"succeeded"` | **任务状态**: `"running"`(进行中), `"succeeded"`(成功), `"failed"`(失败) |
| **failure_reason** | `string` | `"error"` | **失败原因**: `"output_moderation"`(输出违规)， `"input_moderation"`(输入违规)， `"error"`(其他错误)。<br>**提示**: 当触发`"error"`时，可尝试重新提交任务以确保系统稳定性。 |
| **error** | `string` | `"Invalid input parameters"` | 失败详细信息 |

---

## 获取结果接口

### `POST /v1/draw/result`

一个用于单独获取任务结果的接口。如有单独获取结果的需求（例如轮询），可以使用该接口。

- **请求方式**: POST

### 请求参数
```json
{
  "id": "xxxxx"
}
```

### 响应结果
```json
{
  "code": 0,
  "data": {
    "id": "xxxxx",
    "results": [
      {
        "url": "https://example.com/example.png",
        "content": "这是一只可爱的猫咪在草地上玩耍"
      }
    ],
    "progress": 100,
    "status": "succeeded",
    "failure_reason": "",
    "error": ""
  },
  "msg": "success"
}
```

### 响应参数说明
| 参数 | 类型 | 示例 | 描述 |
| :--- | :--- | :--- | :--- |
| **code** | `number` | `0` | 状态码：`0`成功， `-22`任务不存在 |
| **msg** | `string` | `"success"` | 状态信息 |
| **data** | `object` | - | 绘画结果，数据格式与上方“响应参数”的`data`对象一致 |
