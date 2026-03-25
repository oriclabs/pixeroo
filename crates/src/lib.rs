use wasm_bindgen::prelude::*;

pub mod convert;
pub mod edit;
pub mod info;
pub mod qr;
pub mod svg;

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen]
pub fn ping() -> String {
    "pixeroo-wasm ready".to_string()
}
