use serde_json::Value;

use crate::ai::error::AIError;
use crate::ai::GenerateRequest;

pub struct PreparedRequest {
    pub endpoint: String,
    pub body: Value,
    pub summary: String,
}

pub trait PPIOModelAdapter: Send + Sync {
    fn matches(&self, model: &str) -> bool;
    fn build_request(&self, request: &GenerateRequest, base_url: &str) -> Result<PreparedRequest, AIError>;
}
