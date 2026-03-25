use wasm_bindgen::prelude::*;
use image::{DynamicImage, ImageFormat, ImageReader};
use std::io::Cursor;

/// Convert image bytes from one format to another
/// Returns the converted image as a byte array
#[wasm_bindgen]
pub fn convert_image(input: &[u8], output_format: &str, quality: u8) -> Result<Vec<u8>, JsError> {
    let reader = ImageReader::new(Cursor::new(input))
        .with_guessed_format()
        .map_err(|e| JsError::new(&format!("Failed to detect format: {}", e)))?;

    let img = reader
        .decode()
        .map_err(|e| JsError::new(&format!("Failed to decode image: {}", e)))?;

    let format = match output_format.to_lowercase().as_str() {
        "png" => ImageFormat::Png,
        "jpeg" | "jpg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        "bmp" => ImageFormat::Bmp,
        "gif" => ImageFormat::Gif,
        "tiff" | "tif" => ImageFormat::Tiff,
        "tga" => ImageFormat::Tga,
        "qoi" => ImageFormat::Qoi,
        "ico" => ImageFormat::Ico,
        _ => return Err(JsError::new(&format!("Unsupported format: {}", output_format))),
    };

    let mut output = Vec::new();
    img.write_to(&mut Cursor::new(&mut output), format)
        .map_err(|e| JsError::new(&format!("Failed to encode: {}", e)))?;

    Ok(output)
}

/// Get image dimensions without fully decoding
#[wasm_bindgen]
pub fn get_dimensions(input: &[u8]) -> Result<JsValue, JsError> {
    match imagesize::blob_size(input) {
        Ok(size) => {
            let result = serde_wasm_bindgen::to_value(&(size.width, size.height))
                .map_err(|e| JsError::new(&e.to_string()))?;
            Ok(result)
        }
        Err(e) => Err(JsError::new(&format!("Failed to get dimensions: {:?}", e))),
    }
}

/// Detect MIME type from image bytes
#[wasm_bindgen]
pub fn detect_mime(input: &[u8]) -> String {
    tree_magic_mini::from_u8(input).to_string()
}

/// Get supported input formats
#[wasm_bindgen]
pub fn supported_input_formats() -> Vec<JsValue> {
    vec![
        "PNG", "JPEG", "GIF", "WebP", "BMP", "TIFF", "TGA", "QOI",
        "ICO", "PNM", "DDS", "EXR", "HDR", "AVIF", "SVG",
    ]
    .into_iter()
    .map(|s| JsValue::from_str(s))
    .collect()
}

/// Get supported output formats
#[wasm_bindgen]
pub fn supported_output_formats() -> Vec<JsValue> {
    vec![
        "PNG", "JPEG", "WebP", "BMP", "GIF", "TIFF", "TGA", "QOI", "ICO",
    ]
    .into_iter()
    .map(|s| JsValue::from_str(s))
    .collect()
}
