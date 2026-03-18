// FinalWishes Desktop — Tauri Entry Point (Rust)
// This is the native macOS application shell powered by Tauri + Rust
// It wraps the React web application with native OS integration

#![cfg_attr(
    all(not(debug_assertions), target_os = "macos"),
    windows_subsystem = "windows"
)]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running FinalWishes desktop app");
}
