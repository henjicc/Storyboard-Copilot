pub mod ai;
pub mod commands;

use commands::image;
use commands::project_state;
use commands::ai as ai_commands;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn setup_logging() {
    let file_appender = tracing_appender::rolling::daily("logs", "storyboard.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,storyboard_copilot=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer().with_writer(non_blocking))
        .init();

    info!("Storyboard Copilot starting...");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    setup_logging();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            image::split_image,
            image::save_image,
            image::load_image,
            ai_commands::set_api_key,
            ai_commands::generate_image,
            ai_commands::list_models,
            project_state::save_project_state,
            project_state::load_project_state,
            project_state::clear_project_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
