use super::adapter::PPIOModelAdapter;
use super::models::Gemini31FlashAdapter;

pub struct PPIOModelRegistry {
    adapters: Vec<Box<dyn PPIOModelAdapter>>,
}

impl PPIOModelRegistry {
    pub fn new() -> Self {
        let mut registry = Self { adapters: Vec::new() };
        registry.register(Box::new(Gemini31FlashAdapter::new()));
        registry
    }

    pub fn register(&mut self, adapter: Box<dyn PPIOModelAdapter>) {
        self.adapters.push(adapter);
    }

    pub fn resolve(&self, model: &str) -> Option<&dyn PPIOModelAdapter> {
        self.adapters
            .iter()
            .find(|adapter| adapter.matches(model))
            .map(|adapter| adapter.as_ref())
    }

    pub fn supports(&self, model: &str) -> bool {
        self.resolve(model).is_some()
    }
}

impl Default for PPIOModelRegistry {
    fn default() -> Self {
        Self::new()
    }
}
