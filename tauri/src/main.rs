// Envoltura de escritorio, sin Steam: sirve dist/web en una ventana. El juego (src/client/platform.ts)
// pide a la envoltura los comandos de Steam por `invoke` (steam_unlock_achievement, steam_language,
// steam_open_overlay, steam_set_presence, steam_cloud_push, steam_cloud_pull); mientras no estén
// registrados aquí, cada uno falla y el juego hace lo de la web. Cómo conectarlos: tauri/README.md.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("no se pudo arrancar la envoltura de escritorio");
}
