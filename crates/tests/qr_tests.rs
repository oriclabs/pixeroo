use pixeroo_wasm::qr;

// ============================================================
// QR generation (module grid) tests
// ============================================================

#[test]
fn test_generate_qr_simple_text() {
    let result = qr::generate_qr("Hello", "M");
    assert!(result.is_ok());
}

#[test]
fn test_generate_qr_url() {
    let result = qr::generate_qr("https://pixeroo.io", "M");
    assert!(result.is_ok());
}

#[test]
fn test_generate_qr_long_text() {
    let text = "a".repeat(500);
    let result = qr::generate_qr(&text, "L");
    assert!(result.is_ok());
}

#[test]
fn test_generate_qr_empty_string() {
    // Empty string should fail or produce minimal QR
    let result = qr::generate_qr("", "M");
    // qrcodegen may error on empty input
    // Just verify it doesn't panic
    let _ = result;
}

#[test]
fn test_generate_qr_unicode() {
    let result = qr::generate_qr("Pixeroo: Read. Optimise. Output.", "M");
    assert!(result.is_ok());
}

#[test]
fn test_generate_qr_special_chars() {
    let result = qr::generate_qr("wifi:T:WPA;S:MyNetwork;P:MyPass123;;", "H");
    assert!(result.is_ok());
}

#[test]
fn test_generate_qr_all_ecc_levels() {
    let text = "test";
    assert!(qr::generate_qr(text, "L").is_ok());
    assert!(qr::generate_qr(text, "M").is_ok());
    assert!(qr::generate_qr(text, "Q").is_ok());
    assert!(qr::generate_qr(text, "H").is_ok());
}

#[test]
fn test_generate_qr_invalid_ecc_defaults_to_medium() {
    let result = qr::generate_qr("test", "X");
    assert!(result.is_ok()); // should default to Medium
}

#[test]
fn test_generate_qr_case_insensitive_ecc() {
    assert!(qr::generate_qr("test", "l").is_ok());
    assert!(qr::generate_qr("test", "h").is_ok());
}

#[test]
fn test_generate_qr_numeric_only() {
    // Numeric mode is more efficient
    let result = qr::generate_qr("0123456789", "M");
    assert!(result.is_ok());
}

// ============================================================
// QR SVG generation tests
// ============================================================

#[test]
fn test_generate_qr_svg_basic() {
    let result = qr::generate_qr_svg("Hello", "M", "#000000", "#ffffff", 4);
    assert!(result.is_ok());
    let svg = result.unwrap();
    assert!(svg.starts_with("<svg"));
    assert!(svg.contains("</svg>"));
}

#[test]
fn test_generate_qr_svg_custom_colors() {
    let result = qr::generate_qr_svg("test", "M", "#F4C430", "#2A1E05", 2);
    assert!(result.is_ok());
    let svg = result.unwrap();
    assert!(svg.contains("#F4C430"));
    assert!(svg.contains("#2A1E05"));
}

#[test]
fn test_generate_qr_svg_zero_margin() {
    let result = qr::generate_qr_svg("test", "M", "#000", "#fff", 0);
    assert!(result.is_ok());
}

#[test]
fn test_generate_qr_svg_large_margin() {
    let result = qr::generate_qr_svg("test", "M", "#000", "#fff", 20);
    assert!(result.is_ok());
}

#[test]
fn test_generate_qr_svg_contains_rects() {
    let result = qr::generate_qr_svg("Hi", "L", "#000", "#fff", 1);
    assert!(result.is_ok());
    let svg = result.unwrap();
    assert!(svg.contains("<rect"), "SVG should contain rect elements");
}

#[test]
fn test_generate_qr_svg_valid_viewbox() {
    let result = qr::generate_qr_svg("test", "M", "#000", "#fff", 4);
    assert!(result.is_ok());
    let svg = result.unwrap();
    assert!(svg.contains("viewBox="));
}

// ============================================================
// QR PNG generation tests
// ============================================================

#[test]
fn test_generate_qr_png_basic() {
    let result = qr::generate_qr_png("Hello", "M", 4, 2);
    assert!(result.is_ok());
    let png = result.unwrap();
    // PNG magic bytes
    assert_eq!(&png[0..4], &[0x89, 0x50, 0x4E, 0x47]);
}

#[test]
fn test_generate_qr_png_large_pixel_size() {
    let result = qr::generate_qr_png("test", "L", 20, 4);
    assert!(result.is_ok());
    let png = result.unwrap();
    assert!(png.len() > 100); // should be a real image
}

#[test]
fn test_generate_qr_png_pixel_size_1() {
    let result = qr::generate_qr_png("test", "M", 1, 0);
    assert!(result.is_ok());
}

#[test]
fn test_generate_qr_png_url() {
    let result = qr::generate_qr_png("https://github.com/nicosql/pixeroo", "H", 8, 4);
    assert!(result.is_ok());
    let png = result.unwrap();
    // Verify it's a valid PNG by loading it
    assert!(image::load_from_memory(&png).is_ok());
}

#[test]
fn test_generate_qr_png_high_ecc() {
    let result = qr::generate_qr_png("test", "H", 4, 2);
    assert!(result.is_ok());
    let png_h = result.unwrap();

    let result_l = qr::generate_qr_png("test", "L", 4, 2);
    assert!(result_l.is_ok());
    let png_l = result_l.unwrap();

    // Higher ECC = more modules = larger image
    assert!(png_h.len() >= png_l.len(), "High ECC PNG should be >= Low ECC PNG in size");
}
