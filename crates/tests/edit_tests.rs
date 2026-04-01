use gazo_wasm::edit;

// --- Helper: 10x10 red PNG ---
fn test_png_10x10() -> Vec<u8> {
    let img = image::ImageBuffer::from_fn(10, 10, |_, _| image::Rgba([255u8, 0, 0, 255]));
    let mut buf = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut buf);
    encoder
        .encode(img.as_raw(), 10, 10, image::ExtendedColorType::Rgba8)
        .unwrap();
    buf
}

// --- Helper: decode PNG and get dimensions ---
fn decode_dimensions(data: &[u8]) -> (u32, u32) {
    let img = image::load_from_memory(data).unwrap();
    (img.width(), img.height())
}

// ============================================================
// resize tests
// ============================================================

#[test]
fn test_resize_basic() {
    let png = test_png_10x10();
    let result = edit::resize(&png, 5, 5, false);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (5, 5));
}

#[test]
fn test_resize_maintain_aspect() {
    let png = test_png_10x10();
    let result = edit::resize(&png, 5, 20, true);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    // Should fit within 5x20 while maintaining 1:1 aspect ratio
    assert!(w <= 5 && h <= 20);
    assert_eq!(w, h); // original is square
}

#[test]
fn test_resize_upscale() {
    let png = test_png_10x10();
    let result = edit::resize(&png, 100, 100, false);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (100, 100));
}

#[test]
fn test_resize_to_1x1() {
    let png = test_png_10x10();
    let result = edit::resize(&png, 1, 1, false);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (1, 1));
}

#[test]
fn test_resize_invalid_input() {
    let result = edit::resize(&[0u8, 1, 2], 5, 5, false);
    assert!(result.is_err());
}

// ============================================================
// crop tests
// ============================================================

#[test]
fn test_crop_basic() {
    let png = test_png_10x10();
    let result = edit::crop(&png, 2, 2, 5, 5);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (5, 5));
}

#[test]
fn test_crop_full_image() {
    let png = test_png_10x10();
    let result = edit::crop(&png, 0, 0, 10, 10);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (10, 10));
}

#[test]
fn test_crop_single_pixel() {
    let png = test_png_10x10();
    let result = edit::crop(&png, 0, 0, 1, 1);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (1, 1));
}

#[test]
fn test_crop_invalid_input() {
    let result = edit::crop(&[0u8], 0, 0, 5, 5);
    assert!(result.is_err());
}

// ============================================================
// rotate tests
// ============================================================

#[test]
fn test_rotate_90() {
    let png = test_png_10x10();
    let result = edit::rotate(&png, 90);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (10, 10)); // square remains square
}

#[test]
fn test_rotate_180() {
    let png = test_png_10x10();
    let result = edit::rotate(&png, 180);
    assert!(result.is_ok());
}

#[test]
fn test_rotate_270() {
    let png = test_png_10x10();
    let result = edit::rotate(&png, 270);
    assert!(result.is_ok());
}

#[test]
fn test_rotate_non_square() {
    // Create a 10x5 image
    let img = image::ImageBuffer::from_fn(10, 5, |_, _| image::Rgba([0u8, 255, 0, 255]));
    let mut buf = Vec::new();
    image::codecs::png::PngEncoder::new(&mut buf)
        .encode(img.as_raw(), 10, 5, image::ExtendedColorType::Rgba8)
        .unwrap();

    let result = edit::rotate(&buf, 90);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (5, 10)); // dimensions swapped
}

#[test]
fn test_rotate_invalid_degrees() {
    let png = test_png_10x10();
    let result = edit::rotate(&png, 45);
    assert!(result.is_err());
}

#[test]
fn test_rotate_invalid_input() {
    let result = edit::rotate(&[0u8], 90);
    assert!(result.is_err());
}

// ============================================================
// flip tests
// ============================================================

#[test]
fn test_flip_horizontal() {
    let png = test_png_10x10();
    let result = edit::flip(&png, true);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (10, 10)); // dimensions unchanged
}

#[test]
fn test_flip_vertical() {
    let png = test_png_10x10();
    let result = edit::flip(&png, false);
    assert!(result.is_ok());
    let (w, h) = decode_dimensions(&result.unwrap());
    assert_eq!((w, h), (10, 10));
}

#[test]
fn test_flip_invalid_input() {
    let result = edit::flip(&[], true);
    assert!(result.is_err());
}

// ============================================================
// adjustment tests
// ============================================================

#[test]
fn test_brightness_positive() {
    let png = test_png_10x10();
    let result = edit::adjust_brightness(&png, 50);
    assert!(result.is_ok());
}

#[test]
fn test_brightness_negative() {
    let png = test_png_10x10();
    let result = edit::adjust_brightness(&png, -50);
    assert!(result.is_ok());
}

#[test]
fn test_brightness_zero_noop() {
    let png = test_png_10x10();
    let result = edit::adjust_brightness(&png, 0);
    assert!(result.is_ok());
}

#[test]
fn test_contrast() {
    let png = test_png_10x10();
    let result = edit::adjust_contrast(&png, 25.0);
    assert!(result.is_ok());
}

#[test]
fn test_hue_rotation() {
    let png = test_png_10x10();
    let result = edit::adjust_hue(&png, 180);
    assert!(result.is_ok());
}

// ============================================================
// filter tests
// ============================================================

#[test]
fn test_blur() {
    let png = test_png_10x10();
    let result = edit::blur(&png, 2.0);
    assert!(result.is_ok());
}

#[test]
fn test_sharpen() {
    let png = test_png_10x10();
    let result = edit::sharpen(&png, 1.0, 5);
    assert!(result.is_ok());
}

#[test]
fn test_grayscale() {
    let png = test_png_10x10();
    let result = edit::grayscale(&png);
    assert!(result.is_ok());
}

#[test]
fn test_invert() {
    let png = test_png_10x10();
    let result = edit::invert(&png);
    assert!(result.is_ok());
}

#[test]
fn test_grayscale_invalid_input() {
    let result = edit::grayscale(&[]);
    assert!(result.is_err());
}

// ============================================================
// roundtrip tests (edit then verify still valid PNG)
// ============================================================

#[test]
fn test_edit_chain_resize_then_rotate() {
    let png = test_png_10x10();
    let resized = edit::resize(&png, 6, 4, false).unwrap();
    let rotated = edit::rotate(&resized, 90).unwrap();
    let (w, h) = decode_dimensions(&rotated);
    assert_eq!((w, h), (4, 6)); // 6x4 rotated 90 = 4x6
}

#[test]
fn test_edit_chain_flip_then_grayscale() {
    let png = test_png_10x10();
    let flipped = edit::flip(&png, true).unwrap();
    let gray = edit::grayscale(&flipped).unwrap();
    assert!(image::load_from_memory(&gray).is_ok());
}

#[test]
fn test_edit_chain_all_adjustments() {
    let png = test_png_10x10();
    let step1 = edit::adjust_brightness(&png, 20).unwrap();
    let step2 = edit::adjust_contrast(&step1, 10.0).unwrap();
    let step3 = edit::adjust_hue(&step2, 90).unwrap();
    assert!(image::load_from_memory(&step3).is_ok());
}
