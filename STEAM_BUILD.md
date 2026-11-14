# SANGRE Y PALO en Steam: cómo se construye y qué falta

Escrito por el Director al cerrar la 10.0 (2026-11-14), a partir de `tauri/`, `src/client/platform.ts`, sus pruebas y la bitácora de `juice-ux` (`artifacts/mision/v10/progreso-juice-ux.md`).

**Resumen honesto.** La versión de escritorio está **preparada, no hecha**. Hay una configuración de Tauri v2 y un puente con seis comandos de Steam que el juego ya llama. No se ha compilado ningún binario, no hay cuenta de Steamworks, ni AppID, ni depósitos, ni logros dados de alta. Ninguna medida de este documento viene de una Steam Deck física.

## 1. Qué está probado y qué no

| | Estado | Cómo se sabe |
|---|---|---|
| El juego web (`dist/web`) | Probado | Todas las puertas de la 10.0: 309 pruebas, 172 + 172 capturas (ES y EN) sin fallos, 306 + 306 comprobaciones de humo con ratón, teclado y mando virtual (`artifacts/mision/v10/puertas.md`) |
| `tauri/tauri.conf.json` | Leído por una prueba | `tests/tauri.test.ts` (6 pruebas): rutas, nombres contra `src/shared/brand.ts`, ventana, CSP, `withGlobalTauri`, archivos de Rust, permisos e iconos |
| El puente (`src/client/platform.ts`) | Probado con un `invoke` falso | `tests/platform.test.ts` (9 pruebas): logro → comando con su `id`; tabla de idiomas de Steam; comando que falla → lo de la web; título que sigue al idioma; Steam Cloud sube sin la dirección del servidor y un equipo nuevo recupera; sin `__TAURI__`, el puente es el de la web |
| Compilar la envoltura | **No hecho** | No se instaló Rust ni la CLI de Tauri |
| El lado Rust de los seis comandos | **No escrito** | `tauri/src/main.rs` abre la ventana y nada más |
| SDK de Steamworks | **No está** | Ni en el repositorio ni en `Cargo.toml` |
| Cuenta, AppID, depósitos, ramas, logros, página de tienda | **No existen** | — |
| Capa de Steam, Steam Cloud, firma del binario | **Sin probar** | — |
| Steam Deck física | **Sin probar** | El panel simulado da 4 aprobaciones de 36 en Steam Deck |

## 2. Construir la envoltura de escritorio

### Requisitos (no instalados en esta misión)
- Node.js 20 o superior y `npm install` (ya lo pide el juego).
- Rust estable con `cargo` (vía `rustup`).
- La CLI de Tauri v2 (`npx @tauri-apps/cli`, o `cargo install tauri-cli` para `cargo tauri`).
- Las dependencias de sistema de Tauri v2 para cada plataforma (en Windows, WebView2 y las herramientas de compilación de C++; en Linux, WebKitGTK). La lista exacta, en la guía de requisitos de Tauri v2.

### Órdenes
1. `npm run build:web` (la envoltura sirve `dist/web`; `tauri.conf.json` lo lanza solo con `beforeBuildCommand`).
2. Desde la raíz: `npx @tauri-apps/cli build --config tauri/tauri.conf.json`. O, dentro de `tauri/`: `cargo tauri build`.
3. Para macOS falta el `.icns`: `npx tauri icon tauri/icons/icon.png` rehace el juego de iconos entero.

### Qué fija la configuración
- `productName` «Sangre y Palo» (la cara española en prosa, `brandFor('es').titleProse`) y `mainBinaryName` `sangre-y-palo` (`SLUG`).
- `identifier` `com.sangreypalo.juego`; `version` leída de `package.json` (10.0.0).
- Ventana `main` de 1280 × 800, redimensionable (mínimo 960 × 600), centrada, sin pantalla completa de entrada (F o R3, como en la web). Título inicial «SANGRE Y PALO · Blood & Suits»; el juego lo cambia con el idioma.
- `app.withGlobalTauri: true`: el puente usa `window.__TAURI__.core.invoke`, sin dependencias npm nuevas.
- CSP sin `*` ni `http:`. `connect-src 'self' ws: wss: https:`: `ws:`/`wss:` para el servidor de la conjura que se escribe en Ajustes; `https:` para el recolector de `VITE_TELEMETRY_URL`, que se fija al construir. `style-src 'unsafe-inline'` hace falta: el juego pinta con atributos `style`.
- Permisos (`tauri/capabilities/default.json`): `core:default` y `core:window:allow-set-title` para la ventana `main`.

### Steam Deck
Hay dos caminos y **ninguno está probado**: un binario de Linux (Tauri con WebKitGTK) o el de Windows bajo Proton (con WebView2). Hay que elegir uno, probarlo en el aparato y medir allí lo que el panel solo pudo simular.

## 3. El puente (`src/client/platform.ts`)

`PlatformBridge` aísla todo lo que el juego le pide a la máquina. `tauriPlatform()` parte del puente de la web y llama por `invoke` a seis comandos. `main.ts` solo lo arranca (`startDesktop`) si existe `window.__TAURI__`: en la web no cambia nada. **Si un comando no está registrado o falla, el puente hace lo de la web y el juego no se entera.**

| Comando | Argumentos → respuesta | Qué hace el juego |
|---|---|---|
| `steam_unlock_achievement` | `{ id }` → nada | Lo llama en cada logro nuevo de la Orden (enganche en `guild.ts`). `id` = el de `src/rules/achievements.ts` |
| `steam_language` | → `string \| null` | Al arrancar. Si `derrumbe:idioma` está vacío: `spanish` y `latam` → español; cualquier otro → inglés (`steamLang`). Después manda el conmutador ES \| EN |
| `steam_open_overlay` | `{ url }` → `bool` | «Comunidad» y el aviso de GitHub. Con `false` o un fallo, abre el navegador |
| `steam_set_presence` | `{ key, value }` → nada | Gancho listo; el juego aún no lo llama (falta decidir qué enseñar) |
| `steam_cloud_push` | `{ data }` → `bool` | 1,5 s después del último guardado de una clave `derrumbe:*`. `data` es el JSON de esas claves, sin `derrumbe:server` |
| `steam_cloud_pull` | → `string \| null` | Al arrancar en un equipo sin `derrumbe:meta`: escribe la copia y recarga una vez |

Además, el título de la ventana sigue al idioma con el comando del núcleo de Tauri `plugin:window|set_title` (`{ label: 'main', value }`, con `brandFor(getLang()).fullTitle`), al arrancar y en cada cambio de idioma.

**Lo que queda por conectar, del lado Rust**:
- el crate de Steamworks en `tauri/Cargo.toml`, con el SDK;
- los seis comandos, registrados con `tauri::generate_handler!` en `tauri/src/main.rs`;
- las llamadas de vuelta de Steam (`run_callbacks`), bombeadas en un hilo;
- `steam_appid.txt` junto al ejecutable, para probar fuera del cliente de Steam.

## 4. La ficha de Steamworks

### Nombre de la aplicación, por idioma
| Idioma de Steam | Nombre |
|---|---|
| `spanish` (Español - España) | **SANGRE Y PALO** |
| `latam` (Español - Latinoamérica) | **SANGRE Y PALO** |
| `english` | **BLOOD & SUITS** |
| Por defecto (cualquier otro) | **BLOOD & SUITS** |

Los dos títulos van en los términos de búsqueda de la tienda, en los dos idiomas: quien busque uno tiene que encontrar el otro.

### Descripción corta
Sale de `src/shared/brand.ts` (lema y frase de cada cara). Propuesta:
- **Español**: «La conjura de los naipes. Roguelike de conjura con baraja francesa.»
- **Inglés**: «A card conspiracy against the court. A conspiracy roguelike with a French deck.»

El largo máximo de la descripción corta: por comprobar en la documentación de Steamworks. Si `brand.ts` cambia, esta ficha se cambia con él.

### Idiomas admitidos
| Idioma | Interfaz | Audio completo | Subtítulos |
|---|---|---|---|
| Español - España | Sí | No (el juego no tiene voces habladas) | No aplica |
| Español - Latinoamérica | Sí (el mismo texto que España) | No | No aplica |
| Inglés | Sí, **sin revisión de un hablante nativo** | No | No aplica |

### Mando
El juego se juega entero con mando: la prueba de humo hace una campaña completa con un mando virtual, con las insignias de cada botón en pantalla y el conmutador de idioma y «Alto contraste» alcanzables. Antes de marcar «compatibilidad completa con mando», comprobar en una Steam Deck física los campos de texto (dirección del servidor de salas, semilla, código de sala): el juego no llama al teclado en pantalla de Steam.

### Logros: 36
Los `id` salen de `src/rules/achievements.ts` (`ACHIEVEMENTS`), y su lista congelada está en `tests/congelacion.json` (`logros`):
- 28 fijos: `primera`, `capataz`, `media`, `madre`, `asc3`, `abismo`, `abismo3`, `diaria`, `doblepar`, `color`, `full`, `poker`, `real`, `golpe100`, `golpe500`, `golpe2000`, `limpio10`, `limpio50`, `pisos100`, `pisos500`, `intacto`, `rico`, `cinturon`, `forja`, `contratos`, `atajo`, `coleccion`, `ferretero`;
- 7 trofeos de monarca: `j-doble`, `j-escasez`, `j-sequia`, `j-intemperie`, `j-blindaje`, `j-furia`, `j-inestable`;
- 1 final: `jefes`.

El nombre y la descripción de cada logro, en los dos idiomas, son las claves `logro.<id>.nombre` y `logro.<id>.desc` de `src/shared/i18n/es.ts` y `en.ts`. Los `id` son internos y no se renombran. Si Steamworks no admite el guion en el nombre de API (por comprobar), la traducción (`j-doble` → `j_doble`) se hace en el comando de Rust, no en el juego. Faltan los iconos de cada logro (conseguido y sin conseguir): no hay ninguno en el repositorio.

### Imágenes de la tienda y de la biblioteca
Las medidas **no se copian de memoria**: no se pudo consultar la documentación vigente al escribir esto. Fuentes, a consultar el día que se suba:
- Recursos gráficos de la tienda: https://partner.steamgames.com/doc/store/assets
- Recursos de la biblioteca: https://partner.steamgames.com/doc/store/assets/libraryassets
- Localización de recursos gráficos: https://partner.steamgames.com/doc/store/localization

| Recurso | Medida | Con qué candado |
|---|---|---|
| Cápsula de cabecera | por comprobar en la documentación de Steamworks | ES: SANGRE Y PALO con la cinta BLOOD & SUITS · EN y por defecto: al revés |
| Cápsula pequeña | por comprobar | Igual |
| Cápsula principal | por comprobar | Igual |
| Cápsula vertical | por comprobar | Igual |
| Fondo de la página | por comprobar | Sin texto |
| Cápsula de la biblioteca | por comprobar | Igual que las cápsulas |
| Cabecera de la biblioteca | por comprobar | Igual |
| Imagen principal de la biblioteca (hero) | por comprobar | Sin texto (el logo va aparte) |
| Logo de la biblioteca | por comprobar | Un logo por idioma |
| Capturas de pantalla (cuántas y qué tamaño mínimo) | por comprobar | Españolas para `spanish`/`latam`; inglesas para el resto |
| Icono de la aplicación y de la comunidad | por comprobar | El candado sin texto |

**Lo que ya existe en el repositorio:**
- `public/og-card-es.png` y `public/og-card-en.png` (1200 × 630): tarjetas para redes. Son **la fuente del candado** de cada idioma, no cápsulas: cada cápsula pide su propio arte y su propio encuadre.
- `tauri/icons/`: 32 × 32, 128 × 128, 256 × 256 (`128x128@2x.png`), 512 × 512, 1024 × 1024 (`icon.png`) e `icon.ico` (un PNG de 256 dentro). Salen de `public/favicon.svg`.
- Candidatas a captura: `artifacts/visual-qa/1920x1080/` (43 estados, en español) y `artifacts/visual-qa-en/1920x1080/` (los mismos, en inglés). Son capturas de QA con estados fijos: elegir las que enseñan juego (mesa, monarca, La Taberna, Mapa) y no las de ajustes o pruebas.

### Steam Cloud
Dos opciones, sin decidir:
1. **Los dos comandos del puente** (`steam_cloud_push` y `steam_cloud_pull`): el juego ya los llama; falta escribirlos en Rust con la API de almacenamiento remoto.
2. **Auto-Cloud** sobre la carpeta de datos de la WebView (donde vive el `localStorage` con las claves `derrumbe:*`), sin código. La ruta exacta, por comprobar en la máquina compilada. Riesgo: la WebView escribe esa carpeta mientras el juego corre.

### Capa de Steam
La capa sobre una ventana de WebView2 o WebKitGTK no es la de un juego de OpenGL o DirectX: probar si aparece. Si no, `steam_open_overlay` devuelve `false` y el juego abre el navegador.

## 5. Pasos, para quien tenga la cuenta

1. Crear la aplicación en Steamworks y anotar el AppID. Poner `steam_appid.txt` con ese número junto al ejecutable de pruebas (no se publica).
2. Rellenar los nombres por idioma (apartado 4), las descripciones y los idiomas admitidos.
3. Instalar Rust, las dependencias de Tauri v2 y su CLI. Comprobar que `npm run build:web` y `npx @tauri-apps/cli build --config tauri/tauri.conf.json` dan un ejecutable que abre el juego. Jugar la partida guiada en los dos idiomas dentro de la ventana.
4. Añadir el SDK de Steamworks y su crate a `tauri/Cargo.toml`. Escribir los seis comandos del apartado 3, registrarlos con `tauri::generate_handler!` y bombear las llamadas de vuelta en un hilo. Sin tocar `src/client/`: el puente ya llama a esos nombres.
5. Dar de alta los 36 logros con los mismos `id` (o con la traducción del guion, si hace falta), con sus nombres y descripciones en los dos idiomas y sus iconos.
6. Decidir Steam Cloud (comandos o Auto-Cloud) y configurarlo. Probar: guardar en un equipo y recuperar en otro.
7. Decidir qué enseña Rich Presence, crear sus claves y su archivo de localización, y llamar a `setPresence` desde el juego (esto sí toca `src/client/`: es una celda de `juice-ux`).
8. Probar la capa de Steam y el idioma del primer arranque (cliente en `spanish`, en `latam` y en `english`, con `derrumbe:idioma` vacío).
9. Encargar el arte de las cápsulas, en los dos idiomas, con las medidas que diga la documentación ese día. Elegir y recortar las capturas.
10. Crear los depósitos y las ramas (por ejemplo, una de pruebas), firmar los binarios de cada sistema y subirlos.
11. Probar en una Steam Deck física: legibilidad a 40 cm, el mando de punta a punta, los campos de texto con el teclado en pantalla y el binario elegido (Linux o Proton). Solo después, marcar la compatibilidad con mando y pedir la revisión de Steam Deck.
12. Antes de abrir la página de tienda: la prueba con amigos y familia de `EVOLUCION_V4_V10.md` (apartado 10), y una revisión del inglés por un hablante nativo.
