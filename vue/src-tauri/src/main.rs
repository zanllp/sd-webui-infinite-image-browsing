// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::api::process::Command;
use tauri::WindowEvent;
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
struct AppState {
    port: u16,
}
#[derive(serde::Serialize)]
struct AppConf {
    port: u16,
}
#[tauri::command]
fn get_tauri_conf(state: tauri::State<'_, AppState>) -> AppConf {
    AppConf { port: state.port }
}

fn main() {
    let listener = std::net::TcpListener::bind("localhost:0").expect("无法绑定到任何可用端口");
    let port = listener.local_addr().unwrap().port();

    Command::new_sidecar("iib_api_server")
        .expect("failed to create `iib_api_server` binary command")
        .args(&[
            "--port",
            &port.to_string(),
            "--allow_cors",
            "--sd_webui_config",
            "C:/Users/zanllp/Desktop/stable-diffusion-webui/config.json",
            "--sd_webui_path_relative_to_config",
            "--enable_shutdown",
        ])
        .spawn()
        .expect("Failed to spawn sidecar");
    tauri::Builder::default()
        .manage(AppState { port })
        .invoke_handler(tauri::generate_handler![greet, get_tauri_conf])
        .on_window_event(move |event| match event.event() {
            WindowEvent::CloseRequested { .. } => {
                let url = format!("http://127.0.0.1:{}/infinite_image_browsing/shutdown", port);
                reqwest::blocking::Client::new().post(url).send().unwrap();
            }
            _ => (),
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
