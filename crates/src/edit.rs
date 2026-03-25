use wasm_bindgen::prelude::*;
use image::{DynamicImage, ImageReader, ImageFormat};
use std::io::Cursor;

/// Resize image to given dimensions
#[wasm_bindgen]
pub fn resize(input: &[u8], width: u32, height: u32, maintain_aspect: bool) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;

    let resized = if maintain_aspect {
        img.resize(width, height, image::imageops::FilterType::Lanczos3)
    } else {
        img.resize_exact(width, height, image::imageops::FilterType::Lanczos3)
    };

    encode_png(&resized)
}

/// Crop image: x, y, width, height
#[wasm_bindgen]
pub fn crop(input: &[u8], x: u32, y: u32, width: u32, height: u32) -> Result<Vec<u8>, JsError> {
    let mut img = decode_input(input)?;
    let cropped = img.crop(x, y, width, height);
    encode_png(&cropped)
}

/// Rotate image by 90, 180, or 270 degrees
#[wasm_bindgen]
pub fn rotate(input: &[u8], degrees: u32) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;
    let rotated = match degrees {
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        _ => return Err(JsError::new("Rotation must be 90, 180, or 270")),
    };
    encode_png(&rotated)
}

/// Flip image horizontally or vertically
#[wasm_bindgen]
pub fn flip(input: &[u8], horizontal: bool) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;
    let flipped = if horizontal { img.fliph() } else { img.flipv() };
    encode_png(&flipped)
}

/// Adjust brightness (-100 to 100)
#[wasm_bindgen]
pub fn adjust_brightness(input: &[u8], value: i32) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;
    let adjusted = img.brighten(value);
    encode_png(&adjusted)
}

/// Adjust contrast (-100 to 100 as float)
#[wasm_bindgen]
pub fn adjust_contrast(input: &[u8], value: f32) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;
    let adjusted = img.adjust_contrast(value);
    encode_png(&adjusted)
}

/// Adjust hue rotation (degrees)
#[wasm_bindgen]
pub fn adjust_hue(input: &[u8], degrees: i32) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;
    let adjusted = img.huerotate(degrees);
    encode_png(&adjusted)
}

/// Apply Gaussian blur
#[wasm_bindgen]
pub fn blur(input: &[u8], sigma: f32) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;
    let blurred = img.blur(sigma);
    encode_png(&blurred)
}

/// Apply unsharpen mask
#[wasm_bindgen]
pub fn sharpen(input: &[u8], sigma: f32, threshold: i32) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;
    let sharpened = img.unsharpen(sigma, threshold);
    encode_png(&sharpened)
}

/// Convert to grayscale
#[wasm_bindgen]
pub fn grayscale(input: &[u8]) -> Result<Vec<u8>, JsError> {
    let img = decode_input(input)?;
    let gray = img.grayscale();
    encode_png(&gray)
}

/// Invert colors
#[wasm_bindgen]
pub fn invert(input: &[u8]) -> Result<Vec<u8>, JsError> {
    let mut img = decode_input(input)?;
    img.invert();
    encode_png(&img)
}

// --- Helpers ---

fn decode_input(input: &[u8]) -> Result<DynamicImage, JsError> {
    ImageReader::new(Cursor::new(input))
        .with_guessed_format()
        .map_err(|e| JsError::new(&format!("Format detection failed: {}", e)))?
        .decode()
        .map_err(|e| JsError::new(&format!("Decode failed: {}", e)))
}

fn encode_png(img: &DynamicImage) -> Result<Vec<u8>, JsError> {
    let mut output = Vec::new();
    img.write_to(&mut Cursor::new(&mut output), ImageFormat::Png)
        .map_err(|e| JsError::new(&format!("PNG encode failed: {}", e)))?;
    Ok(output)
}
