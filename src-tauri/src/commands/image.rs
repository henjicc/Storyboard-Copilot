use base64::{engine::general_purpose::STANDARD, Engine};
use image::GenericImageView;
use std::io::Cursor;
use tracing::info;

#[tauri::command]
pub async fn split_image(
    image_base64: String,
    rows: u32,
    cols: u32,
) -> Result<Vec<String>, String> {
    info!("Splitting image into {}x{}", rows, cols);

    let image_data = STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let img = image::load_from_memory(&image_data)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let (width, height) = img.dimensions();
    let cell_width = width / cols;
    let cell_height = height / rows;

    let mut results = Vec::new();

    for row in 0..rows {
        for col in 0..cols {
            let x = col * cell_width;
            let y = row * cell_height;

            let cropped = img.crop_imm(x, y, cell_width, cell_height);

            let mut buffer = Cursor::new(Vec::new());
            cropped
                .write_to(&mut buffer, image::ImageFormat::Png)
                .map_err(|e| format!("Failed to encode cropped image: {}", e))?;

            let base64_data = STANDARD.encode(buffer.get_ref());
            results.push(format!("data:image/png;base64,{}", base64_data));
        }
    }

    info!("Split into {} images", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn save_image(image_base64: String, file_path: String) -> Result<(), String> {
    info!("Saving image to: {}", file_path);

    let image_data = STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    std::fs::write(&file_path, image_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    info!("Image saved successfully");
    Ok(())
}

#[tauri::command]
pub async fn load_image(file_path: String) -> Result<String, String> {
    info!("Loading image from: {}", file_path);

    let image_data = std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let base64_data = STANDARD.encode(&image_data);

    let mime = if file_path.ends_with(".png") {
        "image/png"
    } else if file_path.ends_with(".jpg") || file_path.ends_with(".jpeg") {
        "image/jpeg"
    } else if file_path.ends_with(".gif") {
        "image/gif"
    } else if file_path.ends_with(".webp") {
        "image/webp"
    } else {
        "image/png"
    };

    Ok(format!("data:{};base64,{}", mime, base64_data))
}
