use thiserror::Error;

#[derive(Error, Debug)]
pub enum AIError {
    #[error("Provider error: {0}")]
    Provider(String),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Image processing error: {0}")]
    Image(#[from] image::ImageError),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Model not supported: {0}")]
    ModelNotSupported(String),

    #[error("Task not found: {0}")]
    TaskNotFound(String),

    #[error("Task failed: {0}")]
    TaskFailed(String),
}

impl serde::Serialize for AIError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
