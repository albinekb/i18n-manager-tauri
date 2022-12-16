#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{
    AboutMetadata, CustomMenuItem, EventLoopMessage, Manager, Menu, MenuItem, Submenu,
    WindowMenuEvent, Wry,
};
use tauri_plugin_store::PluginBuilder;

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}
#[derive(Clone, serde::Serialize)]
struct MenuPayload {
    action: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn allow_directory(app_handle: tauri::AppHandle, path: &str) -> String {
    app_handle.fs_scope().allow_directory(path, true);
    format!("Hello, {}! You've been greeted from Rust!", path)
}

fn create_menu(app_name: &str) -> Menu {
    let mut menu = Menu::new();

    {
        menu = menu.add_submenu(Submenu::new(
            app_name,
            Menu::new()
                .add_native_item(MenuItem::About(
                    app_name.to_string(),
                    AboutMetadata::default(),
                ))
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Services)
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Hide)
                .add_native_item(MenuItem::HideOthers)
                .add_native_item(MenuItem::ShowAll)
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Quit),
        ));
    }

    let mut file_menu = Menu::new();
    file_menu = file_menu.add_native_item(MenuItem::CloseWindow);

    menu = menu.add_submenu(Submenu::new("File", file_menu));

    let mut edit_menu = Menu::new();

    edit_menu = edit_menu.add_native_item(MenuItem::Undo);
    edit_menu = edit_menu.add_native_item(MenuItem::Redo);
    edit_menu = edit_menu.add_native_item(MenuItem::Separator);

    edit_menu = edit_menu.add_native_item(MenuItem::Cut);
    edit_menu = edit_menu.add_native_item(MenuItem::Copy);
    edit_menu = edit_menu.add_native_item(MenuItem::Paste);

    edit_menu = edit_menu.add_native_item(MenuItem::SelectAll);

    menu = menu.add_submenu(Submenu::new("Edit", edit_menu));

    menu = menu.add_submenu(Submenu::new(
        "View",
        Menu::new().add_native_item(MenuItem::EnterFullScreen),
    ));

    let mut window_menu = Menu::new();
    window_menu = window_menu.add_native_item(MenuItem::Minimize);

    window_menu = window_menu.add_native_item(MenuItem::Zoom);
    window_menu = window_menu.add_native_item(MenuItem::Separator);

    window_menu = window_menu.add_native_item(MenuItem::CloseWindow);
    menu = menu.add_submenu(Submenu::new("Window", window_menu));

    menu = menu.add_submenu(Submenu::new(
        "File",
        Menu::new()
            .add_item(CustomMenuItem::new("open", "Open"))
            .add_item(CustomMenuItem::new("close", "Close")),
    ));

    menu = menu.add_submenu(Submenu::new(
        "Navigation",
        Menu::new()
            .add_item(CustomMenuItem::new("home", "Home"))
            .add_item(CustomMenuItem::new("back", "Back")),
    ));

    menu
}

fn main() {
    let app_name = "i18n";
    let menu = create_menu(app_name);

    tauri::Builder::default()
        .plugin(PluginBuilder::default().build())
        .menu(menu)
        //      .setup(|app| {
        //   let main_window = app.get_window("main").unwrap();
        //   let menu_handle = main_window.menu_handle();
        //   std::thread::spawn(move || {
        //     // you can also `set_selected`, `set_enabled` and `set_native_image` (macOS only).
        //     menu_handle.get_item("item_id").set_title("New title");
        //   });
        //   Ok(())
        // })
        .on_menu_event(|event| match event.menu_item_id() {
            "quit" => {
                std::process::exit(0);
            }
            "close" => {
                go_back(event);
                // event.window().close().unwrap();
            }
            "back" => {
                go_back(event);
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![allow_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn go_back(event: WindowMenuEvent) {
    event
        .window()
        .app_handle()
        .emit_all(
            "menu",
            MenuPayload {
                action: "back".into(),
            },
        )
        .unwrap();
}
