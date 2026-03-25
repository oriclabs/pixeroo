use pixeroo_wasm::convert;

// --- Helper: create a minimal valid 1x1 PNG ---
fn minimal_png() -> Vec<u8> {
    let mut img = image::ImageBuffer::new(1, 1);
    img.put_pixel(0, 0, image::Rgba([255u8, 0, 0, 255]));
    let mut buf = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut buf);
    encoder
        .encode(img.as_raw(), 1, 1, image::ExtendedColorType::Rgba8)
        .unwrap();
    buf
}

// --- Helper: create a minimal 2x2 JPEG ---
fn minimal_jpeg() -> Vec<u8> {
    let img = image::DynamicImage::ImageRgb8(image::ImageBuffer::from_fn(2, 2, |x, y| {
        image::Rgb([(x * 127) as u8, (y * 127) as u8, 128])
    }));
    let mut buf = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut buf),
        image::ImageFormat::Jpeg,
    )
    .unwrap();
    buf
}

// --- Helper: create a minimal 2x2 BMP ---
fn minimal_bmp() -> Vec<u8> {
    let img = image::DynamicImage::ImageRgb8(image::ImageBuffer::from_fn(2, 2, |_, _| {
        image::Rgb([0u8, 128, 255])
    }));
    let mut buf = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut buf),
        image::ImageFormat::Bmp,
    )
    .unwrap();
    buf
}

// ============================================================
// convert_image tests
// ============================================================

#[test]
fn test_convert_png_to_jpeg() {
    let png = minimal_png();
    let result = convert::convert_image(&png, "jpeg", 85);
    assert!(result.is_ok());
    let jpeg_bytes = result.unwrap();
    assert!(!jpeg_bytes.is_empty());
    // JPEG magic bytes: FF D8 FF
    assert_eq!(&jpeg_bytes[0..2], &[0xFF, 0xD8]);
}

#[test]
fn test_convert_png_to_webp() {
    let png = minimal_png();
    let result = convert::convert_image(&png, "webp", 85);
    assert!(result.is_ok());
    let webp_bytes = result.unwrap();
    assert!(!webp_bytes.is_empty());
    // WebP magic: RIFF....WEBP
    assert_eq!(&webp_bytes[0..4], b"RIFF");
    assert_eq!(&webp_bytes[8..12], b"WEBP");
}

#[test]
fn test_convert_png_to_bmp() {
    let png = minimal_png();
    let result = convert::convert_image(&png, "bmp", 100);
    assert!(result.is_ok());
    let bmp_bytes = result.unwrap();
    // BMP magic: BM
    assert_eq!(&bmp_bytes[0..2], b"BM");
}

#[test]
fn test_convert_png_to_gif() {
    let png = minimal_png();
    let result = convert::convert_image(&png, "gif", 100);
    assert!(result.is_ok());
    let gif_bytes = result.unwrap();
    // GIF magic: GIF89a or GIF87a
    assert_eq!(&gif_bytes[0..3], b"GIF");
}

#[test]
fn test_convert_png_to_tiff() {
    let png = minimal_png();
    let result = convert::convert_image(&png, "tiff", 100);
    assert!(result.is_ok());
    let tiff_bytes = result.unwrap();
    assert!(!tiff_bytes.is_empty());
    // TIFF magic: II (little-endian) or MM (big-endian)
    assert!(
        &tiff_bytes[0..2] == b"II" || &tiff_bytes[0..2] == b"MM",
        "Expected TIFF header, got {:?}",
        &tiff_bytes[0..2]
    );
}

#[test]
fn test_convert_png_to_qoi() {
    let png = minimal_png();
    let result = convert::convert_image(&png, "qoi", 100);
    assert!(result.is_ok());
    let qoi_bytes = result.unwrap();
    // QOI magic: qoif
    assert_eq!(&qoi_bytes[0..4], b"qoif");
}

#[test]
fn test_convert_jpeg_to_png() {
    let jpeg = minimal_jpeg();
    let result = convert::convert_image(&jpeg, "png", 100);
    assert!(result.is_ok());
    let png_bytes = result.unwrap();
    // PNG magic: 89 50 4E 47
    assert_eq!(&png_bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);
}

#[test]
fn test_convert_bmp_to_png() {
    let bmp = minimal_bmp();
    let result = convert::convert_image(&bmp, "png", 100);
    assert!(result.is_ok());
    let png_bytes = result.unwrap();
    assert_eq!(&png_bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);
}

#[test]
fn test_convert_unsupported_format_returns_error() {
    let png = minimal_png();
    let result = convert::convert_image(&png, "xyz", 85);
    assert!(result.is_err());
}

#[test]
fn test_convert_invalid_input_returns_error() {
    let garbage = vec![0u8, 1, 2, 3, 4, 5];
    let result = convert::convert_image(&garbage, "png", 100);
    assert!(result.is_err());
}

#[test]
fn test_convert_empty_input_returns_error() {
    let result = convert::convert_image(&[], "png", 100);
    assert!(result.is_err());
}

#[test]
fn test_convert_png_to_png_roundtrip() {
    let png = minimal_png();
    let result = convert::convert_image(&png, "png", 100);
    assert!(result.is_ok());
    let output = result.unwrap();
    assert_eq!(&output[0..4], &[0x89, 0x50, 0x4E, 0x47]);
}

#[test]
fn test_convert_format_case_insensitive() {
    let png = minimal_png();
    assert!(convert::convert_image(&png, "JPEG", 85).is_ok());
    assert!(convert::convert_image(&png, "Png", 100).is_ok());
    assert!(convert::convert_image(&png, "jpg", 85).is_ok());
}

// ============================================================
// get_dimensions tests
// ============================================================

#[test]
fn test_get_dimensions_png() {
    let png = minimal_png();
    let result = convert::get_dimensions(&png);
    assert!(result.is_ok());
}

#[test]
fn test_get_dimensions_invalid_returns_error() {
    let result = convert::get_dimensions(&[0u8, 1, 2]);
    assert!(result.is_err());
}

// ============================================================
// detect_mime tests
// ============================================================

#[test]
fn test_detect_mime_png() {
    let png = minimal_png();
    let mime = convert::detect_mime(&png);
    assert!(
        mime.contains("png"),
        "Expected PNG MIME, got: {}",
        mime
    );
}

#[test]
fn test_detect_mime_jpeg() {
    let jpeg = minimal_jpeg();
    let mime = convert::detect_mime(&jpeg);
    assert!(
        mime.contains("jpeg") || mime.contains("jpg"),
        "Expected JPEG MIME, got: {}",
        mime
    );
}

#[test]
fn test_detect_mime_bmp() {
    let bmp = minimal_bmp();
    let mime = convert::detect_mime(&bmp);
    assert!(
        mime.contains("bmp") || mime.contains("image"),
        "Expected BMP MIME, got: {}",
        mime
    );
}

// ============================================================
// supported_formats tests
// ============================================================

#[test]
fn test_supported_input_formats_not_empty() {
    let formats = convert::supported_input_formats();
    assert!(!formats.is_empty());
}

#[test]
fn test_supported_output_formats_not_empty() {
    let formats = convert::supported_output_formats();
    assert!(!formats.is_empty());
}
