use pixeroo_wasm::info;

// --- Helper: create test images ---
fn test_png() -> Vec<u8> {
    let img = image::ImageBuffer::from_fn(8, 4, |x, y| {
        image::Rgba([(x * 30) as u8, (y * 60) as u8, 128, 255])
    });
    let mut buf = Vec::new();
    image::codecs::png::PngEncoder::new(&mut buf)
        .encode(img.as_raw(), 8, 4, image::ExtendedColorType::Rgba8)
        .unwrap();
    buf
}

fn test_jpeg() -> Vec<u8> {
    let img = image::DynamicImage::ImageRgb8(image::ImageBuffer::from_fn(16, 8, |_, _| {
        image::Rgb([100u8, 150, 200])
    }));
    let mut buf = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut buf),
        image::ImageFormat::Jpeg,
    )
    .unwrap();
    buf
}

// ============================================================
// get_image_info tests
// ============================================================

#[test]
fn test_get_image_info_png() {
    let png = test_png();
    let result = info::get_image_info(&png);
    assert!(result.is_ok());
}

#[test]
fn test_get_image_info_jpeg() {
    let jpeg = test_jpeg();
    let result = info::get_image_info(&jpeg);
    assert!(result.is_ok());
}

#[test]
fn test_get_image_info_invalid() {
    let result = info::get_image_info(&[0u8, 1, 2, 3]);
    assert!(result.is_err());
}

#[test]
fn test_get_image_info_empty() {
    let result = info::get_image_info(&[]);
    assert!(result.is_err());
}

// ============================================================
// get_exif tests
// ============================================================

#[test]
fn test_get_exif_png_no_exif() {
    let png = test_png();
    let result = info::get_exif(&png);
    assert!(result.is_ok());
    // PNG without EXIF should return empty array
}

#[test]
fn test_get_exif_jpeg_no_exif() {
    let jpeg = test_jpeg();
    let result = info::get_exif(&jpeg);
    assert!(result.is_ok());
    // Synthetic JPEG without EXIF should return empty array
}

#[test]
fn test_get_exif_invalid_input() {
    let result = info::get_exif(&[0u8, 1, 2, 3]);
    assert!(result.is_ok()); // Should return empty, not error
}

#[test]
fn test_get_exif_empty_input() {
    let result = info::get_exif(&[]);
    assert!(result.is_ok()); // Empty returns empty exif
}
