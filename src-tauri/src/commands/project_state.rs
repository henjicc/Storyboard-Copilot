use std::path::PathBuf;

use tauri::{AppHandle, Manager};

fn resolve_state_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(app_data_dir.join("project-state.json"))
}

#[tauri::command]
pub async fn save_project_state(app: AppHandle, state_json: String) -> Result<(), String> {
    let path = resolve_state_file_path(&app)?;
    std::fs::write(path, state_json).map_err(|e| format!("Failed to save project state: {}", e))
}

#[tauri::command]
pub async fn load_project_state(app: AppHandle) -> Result<Option<String>, String> {
    let path = resolve_state_file_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }

    let content =
        std::fs::read_to_string(path).map_err(|e| format!("Failed to load project state: {}", e))?;
    Ok(Some(content))
}

#[tauri::command]
pub async fn clear_project_state(app: AppHandle) -> Result<(), String> {
    let path = resolve_state_file_path(&app)?;
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| format!("Failed to clear project state: {}", e))?;
    }

    Ok(())
}
