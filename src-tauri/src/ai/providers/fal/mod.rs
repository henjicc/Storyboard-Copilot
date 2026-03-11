use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tracing::info;

use crate::ai::error::AIError;
use crate::ai::{
    AIProvider, GenerateRequest, ProviderTaskHandle, ProviderTaskPollResult, ProviderTaskSubmission,
};

const FAL_QUEUE_BASE_URL: &str = "https://queue.fal.run";
const FAL_NANO_BANANA_2_T2I_MODEL_PATH: &str = "fal-ai/nano-banana-2";
const FAL_NANO_BANANA_2_I2I_MODEL_PATH: &str = "fal-ai/nano-banana-2/edit";
const FAL_NANO_BANANA_PRO_T2I_MODEL_PATH: &str = "fal-ai/nano-banana-pro";
const FAL_NANO_BANANA_PRO_I2I_MODEL_PATH: &str = "fal-ai/nano-banana-pro/edit";
const POLL_INTERVAL_MS: u64 = 2000;

#[derive(Debug, Deserialize)]
struct FalSubmitResponse {
    request_id: String,
    status_url: Option<String>,
    response_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FalStatusResponse {
    status: String,
}

pub struct FalProvider {
    client: Client,
    api_key: Arc<RwLock<Option<String>>>,
}

impl FalProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            api_key: Arc::new(RwLock::new(None)),
        }
    }

    fn sanitize_model(model: &str) -> String {
        model
            .split_once('/')
            .map(|(_, bare)| bare.to_string())
            .unwrap_or_else(|| model.to_string())
    }

    fn extract_result_url(body: &Value) -> Option<String> {
        let pointers = [
            "/response/images/0/url",
            "/response/images/0/image/url",
            "/images/0/url",
            "/images/0/image/url",
        ];

        for pointer in pointers {
            let url = body.pointer(pointer).and_then(|raw| raw.as_str());
            if let Some(value) = url.filter(|raw| !raw.trim().is_empty()) {
                return Some(value.to_string());
            }
        }

        None
    }

    fn resolve_model_paths(model: &str, has_reference_images: bool) -> &'static str {
        let sanitized_model = Self::sanitize_model(model);
        match sanitized_model.as_str() {
            "nano-banana-pro" => {
                if has_reference_images {
                    FAL_NANO_BANANA_PRO_I2I_MODEL_PATH
                } else {
                    FAL_NANO_BANANA_PRO_T2I_MODEL_PATH
                }
            }
            _ => {
                if has_reference_images {
                    FAL_NANO_BANANA_2_I2I_MODEL_PATH
                } else {
                    FAL_NANO_BANANA_2_T2I_MODEL_PATH
                }
            }
        }
    }

    fn resolve_poll_endpoints(
        request_id: &str,
        metadata: Option<&Value>,
    ) -> (Vec<String>, Vec<String>) {
        let model_path_from_metadata = metadata
            .and_then(|raw| raw.get("model_path"))
            .and_then(|raw| raw.as_str())
            .map(|raw| raw.to_string());
        let submit_status_url = metadata
            .and_then(|raw| raw.get("status_url"))
            .and_then(|raw| raw.as_str())
            .map(|raw| raw.to_string());
        let submit_response_url = metadata
            .and_then(|raw| raw.get("response_url"))
            .and_then(|raw| raw.as_str())
            .map(|raw| raw.to_string());

        let model_path = model_path_from_metadata.unwrap_or_else(|| FAL_NANO_BANANA_2_T2I_MODEL_PATH.to_string());
        let status_endpoint = format!(
            "{}/{}/requests/{}/status",
            FAL_QUEUE_BASE_URL, model_path, request_id
        );
        let result_endpoint = format!(
            "{}/{}/requests/{}",
            FAL_QUEUE_BASE_URL, model_path, request_id
        );
        let fallback_status_endpoint = format!("{}/requests/{}/status", FAL_QUEUE_BASE_URL, request_id);
        let fallback_result_endpoint = format!("{}/requests/{}", FAL_QUEUE_BASE_URL, request_id);

        let mut status_endpoints = Vec::new();
        if let Some(url) = submit_status_url {
            status_endpoints.push(url);
        }
        status_endpoints.push(status_endpoint);
        status_endpoints.push(fallback_status_endpoint);

        let mut result_endpoints = Vec::new();
        if let Some(url) = submit_response_url {
            result_endpoints.push(url);
        }
        result_endpoints.push(result_endpoint);
        result_endpoints.push(fallback_result_endpoint);

        (status_endpoints, result_endpoints)
    }
}

impl Default for FalProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl AIProvider for FalProvider {
    fn name(&self) -> &str {
        "fal"
    }

    fn supports_model(&self, model: &str) -> bool {
        matches!(
            Self::sanitize_model(model).as_str(),
            "nano-banana-2" | "nano-banana-pro"
        )
    }

    fn list_models(&self) -> Vec<String> {
        vec![
            "fal/nano-banana-2".to_string(),
            "fal/nano-banana-pro".to_string(),
        ]
    }

    async fn set_api_key(&self, api_key: String) -> Result<(), AIError> {
        let mut key = self.api_key.write().await;
        *key = Some(api_key);
        Ok(())
    }

    fn supports_task_resume(&self) -> bool {
        true
    }

    async fn submit_task(&self, request: GenerateRequest) -> Result<ProviderTaskSubmission, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let enable_web_search = request
            .extra_params
            .as_ref()
            .and_then(|params| params.get("enable_web_search"))
            .and_then(|raw| raw.as_bool())
            .unwrap_or(false);

        let has_reference_images = request
            .reference_images
            .as_ref()
            .map(|images| !images.is_empty())
            .unwrap_or(false);
        let model_path = Self::resolve_model_paths(&request.model, has_reference_images);
        let submit_endpoint = format!("{}/{}", FAL_QUEUE_BASE_URL, model_path);
        let mut input = json!({
            "prompt": request.prompt,
            "num_images": 1,
            "aspect_ratio": request.aspect_ratio,
            "output_format": "png",
            "safety_tolerance": 6,
            "resolution": request.size,
            "limit_generations": true,
            "enable_web_search": enable_web_search
        });

        if let Some(reference_images) = request.reference_images.as_ref().filter(|images| !images.is_empty()) {
            input["image_urls"] = json!(reference_images);
        }

        info!(
            "[FAL Request] model: {}, route: {}, size: {}, aspect_ratio: {}, web_search: {}",
            request.model, model_path, request.size, request.aspect_ratio, enable_web_search
        );
        let submit_response = self
            .client
            .post(&submit_endpoint)
            .header("Authorization", format!("Key {}", api_key))
            .header("Content-Type", "application/json")
            .header("X-Fal-No-Retry", "1")
            .json(&input)
            .send()
            .await?;

        if !submit_response.status().is_success() {
            let status = submit_response.status();
            let error_text = submit_response.text().await.unwrap_or_default();
            return Err(AIError::Provider(format!(
                "FAL submit failed {}: {}",
                status, error_text
            )));
        }

        let submit_raw = submit_response.text().await.unwrap_or_default();
        let submit_body = serde_json::from_str::<FalSubmitResponse>(&submit_raw).map_err(|err| {
            AIError::Provider(format!(
                "FAL submit invalid JSON response: {}; raw={}",
                err, submit_raw
            ))
        })?;

        Ok(ProviderTaskSubmission::Queued(ProviderTaskHandle {
            task_id: submit_body.request_id,
            metadata: Some(json!({
                "model_path": model_path,
                "status_url": submit_body.status_url,
                "response_url": submit_body.response_url
            })),
        }))
    }

    async fn poll_task(&self, handle: ProviderTaskHandle) -> Result<ProviderTaskPollResult, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let (status_endpoints, result_endpoints) =
            Self::resolve_poll_endpoints(handle.task_id.as_str(), handle.metadata.as_ref());

        let mut status_body: Option<FalStatusResponse> = None;
        let mut last_status_error: Option<String> = None;
        for endpoint in status_endpoints {
            let response = self
                .client
                .get(endpoint.as_str())
                .header("Authorization", format!("Key {}", api_key))
                .send()
                .await?;
            if response.status().is_success() {
                status_body = Some(response.json::<FalStatusResponse>().await?);
                break;
            }
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            last_status_error = Some(format!("{} {} -> {}", endpoint, status, error_text));
            if status != reqwest::StatusCode::METHOD_NOT_ALLOWED
                && status != reqwest::StatusCode::NOT_FOUND
            {
                return Err(AIError::Provider(format!(
                    "FAL status check failed {}: {}",
                    status, error_text
                )));
            }
        }
        let status_body = status_body.ok_or_else(|| {
            AIError::Provider(format!(
                "FAL status check failed on all endpoints: {}",
                last_status_error.unwrap_or_else(|| "unknown".to_string())
            ))
        })?;

        match status_body.status.as_str() {
            "IN_QUEUE" | "IN_PROGRESS" => Ok(ProviderTaskPollResult::Running),
            "COMPLETED" => {
                let mut result_raw: Option<String> = None;
                let mut last_result_error: Option<String> = None;
                for endpoint in result_endpoints {
                    let response = self
                        .client
                        .get(endpoint.as_str())
                        .header("Authorization", format!("Key {}", api_key))
                        .send()
                        .await?;
                    if response.status().is_success() {
                        result_raw = Some(response.text().await.unwrap_or_default());
                        break;
                    }
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    last_result_error = Some(format!("{} {} -> {}", endpoint, status, error_text));
                    if status != reqwest::StatusCode::METHOD_NOT_ALLOWED
                        && status != reqwest::StatusCode::NOT_FOUND
                    {
                        return Err(AIError::Provider(format!(
                            "FAL result fetch failed {}: {}",
                            status, error_text
                        )));
                    }
                }
                let result_raw = result_raw.ok_or_else(|| {
                    AIError::Provider(format!(
                        "FAL result fetch failed on all endpoints: {}",
                        last_result_error.unwrap_or_else(|| "unknown".to_string())
                    ))
                })?;
                let result_body = serde_json::from_str::<Value>(&result_raw).map_err(|err| {
                    AIError::Provider(format!(
                        "FAL result invalid JSON response: {}; raw={}",
                        err, result_raw
                    ))
                })?;
                if let Some(url) = Self::extract_result_url(&result_body) {
                    return Ok(ProviderTaskPollResult::Succeeded(url));
                }

                Err(AIError::Provider(format!(
                    "FAL result has no image URL: {}",
                    result_body
                )))
            }
            "FAILED" | "ERROR" | "CANCELLED" => Ok(ProviderTaskPollResult::Failed(format!(
                "FAL task ended with status {}",
                status_body.status
            ))),
            other => Err(AIError::Provider(format!("FAL unexpected status: {}", other))),
        }
    }

    async fn generate(&self, request: GenerateRequest) -> Result<String, AIError> {
        let submitted = self.submit_task(request).await?;
        let handle = match submitted {
            ProviderTaskSubmission::Succeeded(result) => return Ok(result),
            ProviderTaskSubmission::Queued(handle) => handle,
        };
        loop {
            match self.poll_task(handle.clone()).await? {
                ProviderTaskPollResult::Running => {
                    sleep(Duration::from_millis(POLL_INTERVAL_MS)).await;
                }
                ProviderTaskPollResult::Succeeded(url) => return Ok(url),
                ProviderTaskPollResult::Failed(message) => return Err(AIError::TaskFailed(message)),
            }
        }
    }
}
