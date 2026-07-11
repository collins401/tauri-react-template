// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_log::Builder::new()
            .targets([
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("app".into()),
                }),
            ])
            .build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            // ── Single instance lock ────────────────────────────────

            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir).ok();
            let pid_path = data_dir.join("app.pid");

            if let Ok(pid_str) = fs::read_to_string(&pid_path) {
                if let Ok(pid) = pid_str.trim().parse::<u32>() {
                    let exists = std::process::Command::new("kill")
                        .args(["-0", &pid.to_string()])
                        .status()
                        .map(|s| s.success())
                        .unwrap_or(false);
                    if exists {
                        let _ = std::process::Command::new("osascript")
                            .args(["-e", "tell application \"create-tauri-react\" to activate"])
                            .status();
                        std::process::exit(0);
                    }
                }
            }
            fs::write(&pid_path, std::process::id().to_string()).ok();

            // ── Window state persistence ───────────────────────────

            let data_dir = app.path().app_data_dir()?.clone();
            let state_path = data_dir.join("window-state.json");

            if let Some(window) = app.get_webview_window("main") {
                if let Ok(json) = fs::read_to_string(&state_path) {
                    if let Ok(state) = serde_json::from_str::<serde_json::Value>(&json) {
                        if let (Some(x), Some(y)) = (state["x"].as_f64(), state["y"].as_f64()) {
                            let _ = window.set_position(tauri::Position::Physical(
                                tauri::PhysicalPosition::new(x as i32, y as i32),
                            ));
                        }
                        if let (Some(w), Some(h)) = (state["width"].as_f64(), state["height"].as_f64()) {
                            let _ = window.set_size(tauri::Size::Physical(
                                tauri::PhysicalSize::new(w as u32, h as u32),
                            ));
                        }
                    }
                }

                let window_clone = window.clone();
                let state_path_clone = state_path.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) = event {
                        if let Ok(pos) = window_clone.outer_position() {
                            if let Ok(size) = window_clone.outer_size() {
                                let state = serde_json::json!({
                                    "x": pos.x,
                                    "y": pos.y,
                                    "width": size.width,
                                    "height": size.height,
                                });
                                fs::write(&state_path_clone, state.to_string()).ok();
                            }
                        }
                    }
                });
            }

            // ── Tray ────────────────────────────────────────────────

            let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
            let hide = MenuItemBuilder::with_id("hide", "Hide").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).item(&show).item(&hide).separator().item(&quit).build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&menu)
                .tooltip("tauri-react-template")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
