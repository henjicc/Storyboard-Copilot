use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::info;

use crate::ai::{GenerateRequest, ProviderRegistry};
use crate::ai::providers::PPIOProvider;

static REGISTRY: std::sync::OnceLock<ProviderRegistry> = std::sync::OnceLock::new();
static PPIO_PROVIDER: std::sync::OnceLock<Arc<PPIOProvider>> = std::sync::OnceLock::new();

fn get_registry() -> &'static ProviderRegistry {
    REGISTRY.get_or_init(|| {
        let ppio = get_ppio_provider();
        let mut registry = ProviderRegistry::new();
        registry.register_provider(ppio);
        registry
    })
}

fn get_ppio_provider() -> Arc<PPIOProvider> {
    PPIO_PROVIDER.get_or_init(|| {
        Arc::new(PPIOProvider::new())
    }).clone()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateRequestDto {
    pub prompt: String,
    pub model: String,
    pub size: String,
    pub aspect_ratio: String,
    pub reference_images: Option<Vec<String>>,
}

#[tauri::command]
pub async fn set_api_key(provider: String, api_key: String) -> Result<(), String> {
    info!("Setting API key for provider: {}", provider);

    match provider.as_str() {
        "ppio" => {
            let ppio = get_ppio_provider();
            ppio.set_api_key(api_key).await;
            Ok(())
        }
        _ => Err(format!("Unknown provider: {}", provider))
    }
}

#[tauri::command]
pub async fn generate_image(request: GenerateRequestDto) -> Result<String, String> {
    info!("Generating image with model: {}", request.model);

    let registry = get_registry();

    let provider = registry
        .get_provider("ppio")
        .ok_or_else(|| "Provider not found".to_string())?;

    let req = GenerateRequest {
        prompt: request.prompt,
        model: request.model,
        size: request.size,
        aspect_ratio: request.aspect_ratio,
        reference_images: request.reference_images,
    };

    provider.generate(req).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_models() -> Result<Vec<String>, String> {
    Ok(vec![
        "ppio/gemini-3.1-flash".to_string(),
    ])
}
