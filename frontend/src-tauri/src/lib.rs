use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            // Get the main window and set focus
            if let Some(window) = app.get_webview_window("main") {
                window.set_focus().ok();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tax Free RDC");
}
