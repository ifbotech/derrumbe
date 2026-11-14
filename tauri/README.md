# Envoltura de escritorio (Tauri v2)

Configuración, sin binarios. El juego es `dist/web` (`npm run build:web`); la envoltura lo sirve en una
ventana de 1280 × 800 redimensionable. La pantalla completa va a mano (F o R3, como en la web).

| Archivo | Qué es |
|---|---|
| `tauri.conf.json` | Nombre, identificador, ventana, CSP y `frontendDist: ../dist/web`. El título lo vigila `tests/tauri.test.ts` contra `src/shared/brand.ts`. |
| `Cargo.toml`, `build.rs`, `src/main.rs` | Lo mínimo para `tauri build`, **sin Steam**. |
| `capabilities/default.json` | Permisos de la ventana `main`: los de siempre y cambiar el título (el juego lo cambia con el idioma). |
| `icons/` | Iconos sacados de `public/favicon.svg` (`artifacts/mision/v10/juice/iconos.ts`). `npx tauri icon tauri/icons/icon.png` rehace el juego entero, con el `.icns` de macOS. |

Construir, en una máquina con Rust y la CLI de Tauri v2: `npx @tauri-apps/cli build --config tauri/tauri.conf.json` (o `cargo tauri build` dentro de `tauri/`).

## El puente con Steam

`app.withGlobalTauri` deja `window.__TAURI__.core.invoke`. `src/client/main.ts` solo arranca el puente de
escritorio (`startDesktop`, en `src/client/platform.ts`) si existe `window.__TAURI__`. El puente llama a
estos comandos; **si la envoltura no los registra o fallan, hace lo de la web**:

| Comando | Argumentos → respuesta | Para qué |
|---|---|---|
| `steam_unlock_achievement` | `{ id }` → nada | Logro de la Orden (los `id` de `src/rules/achievements.ts`). |
| `steam_language` | → `string \| null` | Idioma del cliente de Steam. `spanish` y `latam` → español; el resto → inglés. Solo decide si no hay nada en `derrumbe:idioma`. |
| `steam_open_overlay` | `{ url }` → `bool` | Abrir la comunidad en la capa de Steam; con `false`, el navegador. |
| `steam_set_presence` | `{ key, value }` → nada | Rich Presence (gancho listo; el juego aún no lo llama). |
| `steam_cloud_push` | `{ data }` (JSON de `derrumbe:*`) → `bool` | Copia en Steam Cloud, 1,5 s después del último guardado. |
| `steam_cloud_pull` | → `string \| null` | Equipo nuevo (sin `derrumbe:meta`): recupera la copia y recarga. |
| `plugin:window\|set_title` | `{ label: 'main', value }` | Título de la ventana al cambiar de idioma (`brandFor(lang).fullTitle`). |

Para conectarlos hace falta una cuenta de Steamworks (AppID), el SDK y el crate `steamworks` en
`Cargo.toml`, crear los logros en el panel de Steamworks con los mismos `id`, registrar los seis comandos
con `tauri::generate_handler!` en `src/main.rs` y llamar a `SteamAPI_RunCallbacks` en un hilo.
