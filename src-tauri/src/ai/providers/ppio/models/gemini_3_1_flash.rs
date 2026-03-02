use serde::Serialize;
use serde_json::json;

use crate::ai::error::AIError;
use crate::ai::GenerateRequest;

use super::super::adapter::{PPIOModelAdapter, PreparedRequest};

pub struct Gemini31FlashAdapter;

#[derive(Debug, Serialize)]
struct TextToImageRequest {
    prompt: String,
    size: Option<String>,
    aspect_ratio: Option<String>,
    output_format: Option<String>,
}

#[derive(Debug, Serialize)]
struct ImageEditRequest {
    prompt: String,
    size: Option<String>,
    aspect_ratio: Option<String>,
    image_base64s: Option<Vec<String>>,
    output_format: Option<String>,
}

impl Gemini31FlashAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl Default for Gemini31FlashAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl PPIOModelAdapter for Gemini31FlashAdapter {
    fn matches(&self, model: &str) -> bool {
        matches!(
            model,
            "ppio/gemini-3.1-flash" | "gemini-3.1-flash" | "gemini-3.1-flash-edit"
        )
    }

    fn build_request(&self, request: &GenerateRequest, base_url: &str) -> Result<PreparedRequest, AIError> {
        let has_reference_images = request
            .reference_images
            .as_ref()
            .map(|images| !images.is_empty())
            .unwrap_or(false);

        if has_reference_images {
            let image_base64s = request
                .reference_images
                .as_ref()
                .map(|images| {
                    images
                        .iter()
                        .filter_map(|image| image.split(',').nth(1).map(|payload| payload.to_string()))
                        .collect::<Vec<String>>()
                })
                .unwrap_or_default();

            if image_base64s.is_empty() {
                return Err(AIError::InvalidRequest(
                    "Reference images are present but no valid base64 payload was found".to_string(),
                ));
            }

            let body = ImageEditRequest {
                prompt: request.prompt.clone(),
                size: Some(request.size.clone()),
                aspect_ratio: Some(request.aspect_ratio.clone()),
                image_base64s: Some(image_base64s.clone()),
                output_format: Some("image/png".to_string()),
            };

            let summary = format!(
                "model: ppio/gemini-3.1-flash, mode: edit, images: {}, size: {}, aspect_ratio: {}, prompt: {}",
                image_base64s.len(),
                request.size,
                request.aspect_ratio,
                &request.prompt[..request.prompt.len().min(100)]
            );

            Ok(PreparedRequest {
                endpoint: format!("{}/v3/gemini-3.1-flash-image-edit", base_url),
                body: json!(body),
                summary,
            })
        } else {
            let body = TextToImageRequest {
                prompt: request.prompt.clone(),
                size: Some(request.size.clone()),
                aspect_ratio: Some(request.aspect_ratio.clone()),
                output_format: Some("image/png".to_string()),
            };

            let summary = format!(
                "model: ppio/gemini-3.1-flash, mode: generate, size: {}, aspect_ratio: {}, prompt: {}",
                request.size,
                request.aspect_ratio,
                &request.prompt[..request.prompt.len().min(100)]
            );

            Ok(PreparedRequest {
                endpoint: format!("{}/v3/gemini-3.1-flash-image-text-to-image", base_url),
                body: json!(body),
                summary,
            })
        }
    }
}
