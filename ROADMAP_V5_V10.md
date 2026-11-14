# Hoja de ruta SANGRE Y PALO · BLOOD & SUITS · V5 a V10

Escrita por el Director. Primera versión el 2026-11-12 sobre DERRUMBE 4.0.0; rehecha tras la 5.0 para el cambio de tema; rehecha el 2026-11-13, con la 6.1, como guion de la misión que lleva el juego hasta la 10.0. El juego se llamó **DERRUMBE** hasta la 5.0 y **CORONA ROTA** en la 6.0. Desde la 6.1 tiene marca dual: **SANGRE Y PALO** en español (sello «BLOOD & SUITS») y **BLOOD & SUITS** en los demás idiomas (sello «SANGRE Y PALO»). Todo sale de `src/shared/brand.ts`.

El encargo del usuario está en `artifacts/mision/MISION.md` y manda sobre este documento. Las normas de trabajo de cada celda, en `artifacts/mision/NORMAS.md`.

## Cómo leer los números

- Las cifras del panel salen de una **simulación** con modelos locales (`..\panelAgentesGaming`, en la RTX 3090, sala `QA-3090`). Ordena prioridades. No sustituye a jugadores.
- Dos tamaños de corrida:
  - **`rapido-60`**: 60 personas, estratificada y con semilla fija. Línea base de la 6.1, y puertas de la V7, la V8 y la V9. Ruido de la aprobación: unos **±12 puntos** (IC95 con n = 60).
  - **Censo de 240**: solo en la V10. Ruido: unos **±6 puntos**. La última corrida de 240 es la de la V4 (`panelAgentesGaming\salidas\v4-completo-20261112-084346\`), sobre el juego viejo.
- Solo se comparan corridas del mismo preset: `rapido-60` contra `rapido-60` (con `--comparar-con <run_id>`), censo contra censo.
- Corridas `rapido-60` hechas: la 6.1 (`rapido-60-20261113-112234`, línea base), la 7.0 (`rapido-60-20261113-141123`, contra la 6.1), la 8.0 (`rapido-60-20261113-164104`, contra la 7.0) y la 9.0 (`rapido-60-20261113-222433`, contra la 8.0). El censo de la V10 se compara contra la de la 9.0 (`--comparar-con` acepta un censo contra un `rapido-60`; la consola avisa de que la muestra no es la misma). Las cifras de la V4 hablan del juego viejo: orientan, no son línea base.
- El panel no publica el IC95 de la claridad media. Para la puerta se calcula a partir de las reseñas (`resenas[].claridad` de `agregados.json`, aproximación normal). En la 6.1 sale 4,63–5,24; en la 7.0, 4,62–5,25; en la 8.0, 4,91–5,49; en la 9.0, 4,93–5,67.
- Los números de balance (victorias, ritmo, letalidad) no vienen del panel: vienen del laboratorio (`npm run analyze:meta`). Si chocan, manda el laboratorio.
- Laboratorio de referencia: el de la 6.1, idéntico al de la 6.0 (`artifacts/mision/v6.1/meta-report-6.0.json`; 55.640 campañas; sin avisos; peor P95 de los asaltos 4–8: 18).

## Tabla resumen

| Versión | Tema | Orden de celdas | Panel | Estado |
|---|---|---|---|---|
| V5 | Claridad de cristal, ergonomía y balance con datos (DERRUMBE) | a mano | sin correr | Hecha (`6d319ec`) |
| V6 | Cambio de tema 360° y vocabulario universal (CORONA ROTA) | a mano, en paralelo | sin correr | Hecha (`2308e18`) |
| 6.1 | Marca dual SANGRE Y PALO · BLOOD & SUITS y La Taberna | reglas-balance → arte-ui → juice-ux → director → panel | `rapido-60`: línea base | Hecha (`71ae962`) |
| V7 | Partida guiada de 60 segundos y Mesa brava: monarcas con cara, maldición a la vista y voz | director → reglas-balance → arte-ui → juice-ux | `rapido-60` contra la 6.1: sin regresión | Hecha (`1c33ef6`, `v7.0.0`) |
| V8 | Jugo visceral, lacre con brillo y banda sonora de corte de 3 horas | director → arte-ui → juice-ux | `rapido-60` contra la 7.0: sin regresión | Hecha (`f3c4a67`, `v8.0.0`) |
| V9 | Cooperativo a prueba de cortes, `balance-config.json` con autoajuste y telemetría de prueba | director → reglas-balance → juice-ux → arte-ui | `rapido-60` contra la 8.0: sin regresión | Hecha (`v9.0.0`; candidata `76f628c`) |
| V10 | Candidata de lanzamiento con funciones congeladas: ES / EN, accesibilidad y Steam | director → reglas-balance → arte-ui → juice-ux → triaje → arreglos | censo de 240: pasa (29,2 % ≥ 17,1; 5,01 ≥ 4,93) | Hecha (candidata `20dbf5f`, arreglos `edbbf4c`; la etiqueta `v10.0.0` la pone el orquestador) |

## Resultados por versión

Una fila por versión medida en esta misión. Panel: corridas `rapido-60` (n = 60; ruido de la aprobación de unos ±12 puntos) de la 6.1 a la 9.0, cada una sobre su commit candidato. **La columna 10.0 es otra muestra: el censo de 240** (ruido de unos ±6 puntos); entre paréntesis va el subconjunto de las mismas 60 personas, que es lo único comparable con las columnas anteriores. Quejas: el recuento de cada corrida con su propio clasificador (los informes de comparación reclasifican la base y pueden dar una cifra algo distinta); con 240 reseñas salen unas cuatro veces más menciones. Fuentes: `agregados.json` de cada corrida, `artifacts/mision/v{n}/puertas.md` y `CHANGELOG.md`.

| | 6.1 | 7.0 | 8.0 | 9.0 | 10.0 (censo, n = 240) |
|---|---|---|---|---|---|
| Commit | `71ae962` (`v6.1.0`) | `1c33ef6` (`v7.0.0`) | `f3c4a67` (`v8.0.0`; candidata `c12191c`) | `v9.0.0` (candidata `76f628c`) | candidata `20dbf5f`; arreglos `edbbf4c` |
| Corrida del panel | `rapido-60-20261113-112234` | `rapido-60-20261113-141123` | `rapido-60-20261113-164104` | `rapido-60-20261113-222433` | `v6-completo-20261114-041529` |
| Aprobación por persona (IC95) | 23,3 % (14,4–35,4) | 25,0 % (15,8–37,2) | 25,0 % (15,8–37,2) | 26,7 % (17,1–39,0) | 29,2 % (23,8–35,2) · (mismas 60: 30,0 %, 19,9–42,5) |
| Claridad media (IC95 de las reseñas) | 4,93 (4,63–5,24) | 4,93 (4,62–5,25) | 5,20 (4,91–5,49) | 5,30 (4,93–5,67) | 5,01 (4,85–5,17) · (mismas 60: 5,10) |
| Veredicto contra la anterior | línea base | sin regresión | sin regresión | sin regresión | pasa los límites fijos (≥ 17,1 % y ≥ 4,93); mismas 60, dentro del ruido |
| Claridad PC · portátil · móvil | 4,81 · 5,07 · 4,93 | 5,10 · 5,00 · 4,60 | 5,33 · 5,20 · 5,47 | 5,48 · 5,07 · 5,27 | 5,27 · 4,88 · 4,78 · (mismas 60: 5,10 · 5,00 · 5,00) |
| Steam Deck: aprobación · claridad | 0 de 9 · 5,00 | 0 de 9 · 5,00 | 0 de 9 · 4,44 | 0 de 9 · 5,33 (escena distinta: no comparable) | 4 de 36 · 4,97 · (mismas 9: 0 de 9 · 5,44) |
| Quejas: texto chico · contraste · fatiga visual | 82 · 61 · 50 | 84 · 67 · 46 | 75 · 68 · 53 | 87 · 59 · 46 | 247 · 290 · 183 (V4, n = 240: 355 · 205 · 205) |
| Precio justo (mediana) · óptimo de Van Westendorp | 8,0 · 6,25 USD | 8,0 · 8,0 USD | 8,0 · 6,0 USD | 8,0 · 6,25 USD | 8,0 · 8,19 USD |
| En deseados | 61,7 % | 55,0 % | 58,3 % | 61,7 % | 62,5 % |
| Laboratorio | idéntico a la 6.0; 0 avisos; peor P95 tardío 18 | idéntico a la 6.1 | idéntico a la 6.1 (no se repitió: reglas sin tocar) | idéntico a la 8.0 tras sacar los números a `balance-config.json`; 0 avisos; peor P95 tardío 18 | idéntico a la 9.0; 0 avisos; peor P95 tardío 18; huella `aed6a8feb2f230d1` |
| Pruebas (Vitest) | 188 | 205 | 205 | 254 | 309 |
| QA visual (capturas, 0 fallos) | 112 | 132 | 148 | 160 | 172 en español + 172 en inglés |
| Prueba de humo (comprobaciones) | 164 | 193 | 213 | 272 | 306 en español + 306 en inglés |

Lo que no se movió en toda la misión: **Steam Deck** (0 de 9 en las cinco corridas con las mismas nueve personas; 4 de 36 en el censo, igual que en la V4) y la aprobación global (28,8 % en el censo de la V4, 29,2 % en el de la V10). Lo que sí: la claridad, censo contra censo, de 4,62 a 5,01, con intervalos que no se tocan.

Regla común: **ninguna versión añade un sistema nuevo sin retirar o simplificar otro**, y todas respetan la constitución anticomplejidad: ≤ 6 palabras clave, ≤ 56 reliquias (hoy 52), toda descripción de reliquia, carta especial, monarca y Reinado ≤ 115 caracteres, P95 ≤ 19 turnos en los asaltos 4 a 8 con las seis barajas. El vocabulario es el del glosario (`SPECS/V6-normas-y-glosario.md`, con La Taberna desde la 6.1).

## Cómo se ejecuta cada versión

Lo lleva el orquestador de la misión. El guion por lotes `scripts/estudio-autonomo.ps1` es de la 5.0: todavía usa ramas `estudio/v{n}` y el preset de 240; en esta misión **no se usa**. Sigue leyendo los bloques `### Celda:` de cada especificación, así que el formato se mantiene.

1. Rama `release/v{n}` desde `main`.
2. Las celdas, **de una en una**, en el orden en que aparecen en `SPECS/V{n}.md`. A cada una le basta con «haz tu celda de `SPECS/V{n}.md`»: el bloque es autosuficiente. Cada celda deja su bitácora en `artifacts/mision/v{n}/progreso-<celda>.md` y, al acabar, su señal de fin `artifacts/mision/v{n}/<celda>.listo` (o `BLOQUEADO: motivo`). Sin esa señal la misión no sigue.
3. La celda `director` va **primera**: abre la versión (lee lo que dejó la anterior y el panel, y rellena lo que la especificación deja abierto). Tras las puertas (las de CPU y, si la hay, la de GPU) y antes de fusionar, el orquestador la relanza con el mismo encargo y hace el **cierre** (registro de cambios con las medidas reales y notas para la versión siguiente), que deja `director-cierre.listo`. La celda distingue las dos fases por las señales que encuentra.
4. **Puertas de CPU**, en este orden y en la rama: `npm run typecheck`, `npm test`, `npm run forja` (si se tocó arte), `npm run analyze:meta` (sin avisos), `npm run docs`, `npm run qa:visual` (cero fallos en las cuatro ventanas, y mirar las capturas), `npm run qa:smoke` («Todo en orden»), `npm run build` y `npm run build:web`. Cada especificación añade las suyas. El orquestador deja los resultados en `artifacts/mision/v{n}/puertas.md` (orden, resultado y cifra clave por puerta; y, si hubo panel, el `run_id` y la carpeta de la corrida): el cierre del Director los lee de ahí.
5. Si una puerta falla, el orquestador relanza a la celda dueña con el final del registro. Dos intentos. Al tercero, la versión se aparta.
6. **Puerta de GPU** (V7, V8, V9 y V10), sobre el commit candidato: `rapido-60` con `--comparar-con` la corrida anterior (V7, V8 y V9), o el censo de 240 (V10). La orden exacta está en `artifacts/mision/v6.1/panel.listo`. Con `OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_KV_CACHE_TYPE=q8_0` y `OLLAMA_NUM_PARALLEL=2`.
7. **Regresión** es que la aprobación por persona o la claridad media de la corrida nueva queden **por debajo del límite inferior del IC95 de la anterior** (los dos intervalos están en `agregados.json`). Una diferencia dentro del intervalo es ruido: ni regresión ni mejora probada. Si hay regresión o una puerta rota: se arregla o se revierte el cambio que la causa antes de etiquetar. Si no se puede, la rama se renombra a `rechazado/v{n}-<fecha>` y `main` queda como estaba. Nunca `git reset --hard` ni `push --force` sobre `main`.
8. Si pasa: fusión en `main`, etiqueta `v{n}.0.0` y `git push origin main --tags`. Commits solo con la autoría del usuario.

---

## V5 · Claridad de cristal, ergonomía y balance con datos (entonces DERRUMBE)

**Hecha** (2026-11-12, `6d319ec`). Legibilidad (texto ≥ 13 px, tramas de palo, dianas ≥ 44 px), cuenta paso a paso, causa de la derrota, mando sin huecos, balance del Reinado 8 con el laboratorio y el estudio de agentes. Evidencia de partida (panel V4, n = 240): aprobación 28,8 % (IC95 23,4–34,8); «texto chico» 355 quejas; casual 10,4 % (n = 48); Steam Deck 11,1 % (n = 36). Detalle en `SPECS/V5.md` y en `CHANGELOG.md`.

## V6 · Cambio de tema 360° y vocabulario universal (CORONA ROTA)

**Hecha** (2026-11-12, `2308e18`). De obra y demolición a conjura contra una corte de naipes, sin tocar una cuenta: laboratorio idéntico al de la 5.0. Tres redes contra la jerga vieja. Motivo (panel V4): «reglas confusas / tutorial» 187 menciones; claridad del casual 3,58/10. Detalle en `SPECS/V6.md`.

## 6.1 · Marca dual y La Taberna

**Hecha** (2026-11-13, `71ae962`). Línea base del panel: `rapido-60-20261113-112234`, con una aprobación del 23,3 % (IC95 14,4–35,4) y una claridad media de 4,93. Encargo en `artifacts/mision/v6.1/encargos.md`.

- Marca dual en `src/shared/brand.ts`; candado de grabado en la portada con la cinta de lacre del otro nombre; `index.html`, manifest, tarjeta para compartir, lámina y Crónica con los dos títulos.
- La tienda pasa a **La Taberna**; el final de victoria, a **«Corte vencida»**.
- Medidas: laboratorio idéntico al de la 6.0; 188 pruebas en verde; QA visual de 112 capturas sin fallos; humo «Todo en orden» dos veces seguidas.

---

## V7 · Partida guiada de 60 segundos y Mesa brava

**Tema.** Se aprende jugando en menos de un minuto, y cada monarca se reconoce por su cara, su maldición a la vista y su voz de mesa de naipes.

**Entregables.**
1. **Partida guiada de 60 segundos**: cinco pasos de una línea, haciendo, con foco sobre la mesa: poder del palo, escudo de inmunidad del trono, guardar en La Manga, Daño × Multi y un Golpe exacto. Guion y mano preparada (`reglas-balance`), foco y placa (`arte-ui`), flujo y prueba de tiempo (`juice-ux`).
2. **Las tres primeras quejas** de claridad o interfaz de la auditoría `rapido-60` de la 6.1: el Director las anota al abrir la V7 y las reparte por dueño.
3. **Los siete monarcas tiranos**: retrato de grabado expresivo y distinto, maldición real anunciada sobre el tablero, y una frase de una línea al entrar, al contraatacar y al caer, con filo de envido y retruco que no se confunda con una regla.
4. **Secretos de la cripta**: cada opción se lee en dos segundos, con su grabado.

**Puertas.** CPU completas (incluida la forja) + `rapido-60` contra la 6.1. Detalle en `SPECS/V7.md`.

**Resultado** (2026-11-13, candidata `44714cb`). Todas las puertas de CPU pasan.
- Partida guiada: 5 pasos y 5 jugadas, de 29,1 a 32,5 s según el dispositivo.
- Laboratorio idéntico al de la 6.1.
- QA visual: 132 capturas sin fallos.
- Prueba de humo: 193 comprobaciones en orden.
- Panel: aprobación 23,3 % → 25,0 %, claridad media 4,93 → 4,93. **Sin regresión y sin mejora medible.**

No se movieron:
- las quejas de texto chico (82 → 84) y de contraste (61 → 67);
- la claridad en móvil (4,93 → 4,60, n = 15);
- la aprobación en Steam Deck (0 de 9).

Esto pasa a la V8 con dueño y comprobación (`SPECS/V8.md`, apartado 1.2). Detalle en `CHANGELOG.md` y `artifacts/mision/v7/puertas.md`.

## V8 · Jugo visceral, lacre con brillo y banda sonora de corte de 3 horas

**Tema.** Cada golpe se siente a 60 fotogramas por segundo, y tres horas de juego no cansan el oído.

**Entregables.**
1. **Coreografía del golpe**: esquirlas de corona que se parte y tajo de naipe en SVG, impacto de sello de lacre caliente, brillo de lámina en las cartas con acabado, monedas en La Taberna y muelles de selección inmediatos. Solo `transform` y `opacity`; «Reducir movimiento» respetado. Dibujos (`arte-ui`), coreografía (`juice-ux`).
2. **Música generativa en re menor** que evoluciona del asalto 1 al 8: laúd y bajo cálido en La Taberna y el Mapa; tambores y metales ante un monarca o con poca Vida. Foley de tajo, bloqueo de Escudo, carta a La Manga, sello de lacre y cadenas de Golpe exacto con tono que sube (`juice-ux`).
3. Presupuesto de fotograma medido y medidor de variedad del audio.
4. Lo que dejó abierto la V7 y es de sensación: el foco del mando en la mano (Steam Deck), el bocadillo del monarca fuera de los tronos y la barra del pulgar en móvil.

Se construye sobre lo que la 7.0 ya trae y no se rehace:
- `fx.ts`: pausa de impacto, temblor, escombros, estandarte rasgado, corona partida, sello «¡Exacto!» y monedas en combate;
- `audio.ts`: marcha en re menor por escena, con cuernos ante un monarca y presión con poca Vida.

**Puertas.** CPU completas (incluida la forja) + `qa:audio` + `qa:fps` (presupuesto de 60 fps, con aceleración gráfica) + `rapido-60` contra la 7.0 (`rapido-60-20261113-141123`). Regresión: aprobación por debajo del 15,8 % o claridad media por debajo de 4,62, los límites inferiores del IC95 de la 7.0. El encargo pide el panel en cada versión, y la V8 trae los arreglos de claridad A1–A3. Detalle en `SPECS/V8.md`.

**Resultado** (2026-11-13, candidata `c12191c`). Todas las puertas de CPU pasan.
- Caída del trono: 1.142 ms a 1×, 595 ms a 2×, 311 ms a 4×. Reserva de piezas: 0 nodos nuevos tras calentarse.
- `qa:fps` con GPU real: p95 de 6,1 a 12,2 ms en 5 escenarios × 3 ventanas, 0 fotogramas > 50 ms.
- `qa:audio`: 3 h × 3 semillas, tramo repetido más largo 3,3 s (tope 30), todas las notas en re menor.
- A1–A3 hechos y con su regla de QA en verde. QA visual: 148 capturas sin fallos. Humo: 213 comprobaciones en orden.
- Laboratorio idéntico al de la 6.1 (no se tocaron las reglas).
- Panel (`rapido-60-20261113-164104`): aprobación 25,0 % → 25,0 %, claridad media 4,93 → 5,20. **Sin regresión y sin mejora medible.** El panel no oye ni ve movimiento: del trabajo de la versión solo juzga capturas quietas.

No se movió:
- la aprobación en Steam Deck: **0 de 9 por tercera corrida**, con la claridad del estrato en 5,00 → 4,44 (n = 9, dentro del ruido, y con una auditoría más que en la 7.0, la de `mesa-mando`);
- las quejas de contraste (67 → 68) y de fatiga visual (46 → 53).

Lo que tiene base en las capturas de Steam Deck pasa a la V9 (`SPECS/V9.md`, apartado 1.2). Detalle en `CHANGELOG.md` y `artifacts/mision/v8/puertas.md`.

## V9 · Cooperativo a prueba de cortes, autoajuste y telemetría de prueba

**Tema.** El balance vive en un archivo y una herramienta propone ajustes acotados; amigos y familia mandan su partida en un toque; y una conjura de cuatro sobrevive a un corte de red.

**Entregables.**
1. `src/rules/balance-config.json` con tipos y `npm run balance:tune` (`scripts/auto-balance.ts`): busca variaciones de ±15 % como mucho contra los objetivos del laboratorio y, por defecto, solo propone; aplica únicamente con una bandera explícita (`reglas-balance`). Sacar los números al archivo no cambia ninguno: el laboratorio sale idéntico.
2. `src/client/telemetry.ts`: métricas locales de cada campaña (< 5 KB, nada que identifique a nadie), envío con `VITE_TELEMETRY_URL` solo si la versión se construyó con esa variable **y** el jugador pulsa el botón de un toque **«Enviar Crónica / Feedback de Prueba»**, en la Crónica y en Ajustes; nunca en segundo plano. Sin la variable, el botón copia o descarga la crónica (`juice-ux` el módulo, `arte-ui` los botones).
3. Batería de cooperativo de 2 a 4 jugadores con WebSocket de verdad: señas en La Taberna y el Mapa, corte a mitad de turno, el bot cubre y la reconexión vuelve sin costuras; dentro de `npm test`, deterministas y sin alargarlo más de unos 20 s (`juice-ux`).
4. Lo que la 8.0 dejó abierto con base en las capturas de Steam Deck: la placa «−n CAE» que pisa la de ventaja, el Escudo bajo el rótulo de la Vida y el foco en La Taberna con mando (`arte-ui`); y el nombre por defecto «OBRERO» del servidor (`juice-ux`).

**Puertas.** CPU completas + `rapido-60` contra la 8.0 (`rapido-60-20261113-164104`). Regresión: aprobación por debajo del 15,8 % o claridad media por debajo de 4,91, los límites inferiores del IC95 de la 8.0. Detalle en `SPECS/V9.md`.

**Hecha** (2026-11-13, `v9.0.0`). **Resultado** (candidata `76f628c`). Todas las puertas de CPU pasan (`artifacts/mision/v9/puertas.md`).
- `balance-config.json` con 244 números. Laboratorio completo idéntico al de la 8.0 (55.640 campañas, 0 avisos, peor P95 tardío 18).
- `balance:tune`: propuesta vacía; todos los objetivos se cumplen. No se aplicó nada. La hipótesis del panel (`STAGES[0].hp` 3 y `FATIGUE.start` 10) saca 5 objetivos de rango: descartada.
- Telemetría: un registro de campaña mide 657 bytes. 0 peticiones sin pulsar el botón; 1 por pulsación solo con `VITE_TELEMETRY_URL`.
- Cooperativo: 8 pruebas con WebSocket de verdad en 6,6 s; 50 cortes, 50 reconexiones, 0 desincronizaciones.
- V8-1 a V8-4, B1 y B2 hechos. 254 pruebas, 160 capturas sin fallos, 272 comprobaciones de humo.
- Panel: aprobación 25,0 % → 26,7 %, claridad media 5,20 → 5,30. **Sin regresión** (las dos, dentro del ruido: no es una mejora probada).

No se movió:
- Steam Deck: **0 de 9 por cuarta corrida**. Su claridad (4,44 → 5,33) no se compara: el panel cambió las capturas que enseña a ese estrato (desde la 9.0, solo con mando).
- La queja de texto chico sube de 75 a 87.

Leídas las 9 reseñas de Steam Deck y las 15 de portátil y miradas las capturas de 1280×800 y 1366×768: lo que tiene base en una captura pasa a la V10 con su regla de QA (`SPECS/V10.md`, filas SD1–SD5). Detalle en `CHANGELOG.md`.

## V10 · Candidata de lanzamiento con funciones congeladas

**Tema.** Cero mecánicas nuevas: el juego entero en español y en inglés, accesible y listo para Steam.

**Entregables.**
1. `src/shared/i18n.ts`: diccionario con tipos, `es` por defecto (pruebas y navegadores en español), interruptor **ES | EN** en la Portada y en Ajustes que cambia al instante y se guarda. Interfaz, palabras clave, reliquias, especiales, monarcas y partida guiada, sin claves sin traducir: prueba de paridad en Vitest y QA visual en `EN` sin recortes. **Sin tocar los archivos de la huella del laboratorio** (`engine`, `run`, `tools`, `specials`, `bot` y `balance-config.json`): el laboratorio tiene que salir idéntico.
2. Pulido de lo que dejaron V7–V9 y arreglos concretos para Steam Deck y portátil (SD1–SD5); accesibilidad completa (4 tintas y tramas, Alto contraste, Reducir movimiento, teclado y Steam Deck).
3. `tauri/` con `tauri.conf.json` y enganches de Steamworks en `PlatformBridge` (configuración, sin compilar binario); `STEAM_BUILD.md` con los nombres localizados (`spanish`/`latam` = SANGRE Y PALO; `english` y por defecto = BLOOD & SUITS); `og-card-es.png` y `og-card-en.png`.
4. Censo de 240 personas en la 3090 contra la 9.0; todo P0 con base en una captura se arregla y se vuelve a verificar.
5. `EVOLUCION_V4_V10.md` (lo escribe el orquestador, a partir de la tabla «Resultados por versión» de este archivo).

**Puertas.** `typecheck`, `test`, `analyze:meta` sin avisos, `docs`, `og`, `qa:visual` (ES y EN), `qa:smoke` (ES y EN), `qa:fps`, `qa:audio`, `build`, `build:web` + censo de 240. Tras la etiqueta, `git ls-remote` confirma `origin/main`. Detalle en `SPECS/V10.md`.

**Hecha** (2026-11-14). **Resultado** (candidata `20dbf5f`, arreglos del censo `edbbf4c`; `artifacts/mision/v10/puertas.md`). Ninguna mecánica nueva y ningún número cambiado.
- 1.479 claves por idioma (618 de reglas, 768 de pantalla, 93 de avisos y voces). El español, letra por letra el de la 9.0.
- Conmutador ES | EN en la Portada y en Ajustes, al instante y guardado. «Alto contraste» sin mover la maquetación.
- SD1–SD5 hechos, cada uno con su regla de QA. Pulido V7-1 a V9-1 hecho; de V8-7 queda un fotograma de ~55 ms en frío.
- `tauri/` y el puente de Steam con 15 pruebas; sin compilar. `STEAM_BUILD.md` con lo que falta.
- Censo de 240: aprobación 29,2 % (IC95 23,8–35,2), claridad 5,01. **Pasa.** Contra el censo de la V4 (28,8 % y 4,62), la aprobación no se mueve y la claridad sube. Mismas 60: 26,7 → 30,0 % y 5,30 → 5,10, dentro del ruido. Steam Deck: 4 de 36, igual que en la V4.
- Triaje: 3 P0 de la síntesis y 107 de las auditorías. Con base, tres, los tres de `arte-ui`: la cuenta plegada no cuadraba («54 × 3,7 = 197»), el palo de la esquina medía de 7 a 13 px y el pie de la Crónica quedaba tapado en 1366 y 1280. Arreglados con sus reglas («cuenta», «esquina», «acta-pie») y certificados otra vez. El panel no se repitió.
- Incidencia: Node 24 se cae de forma nativa en Windows en las pruebas de cooperativo (`0xC0000409`, nunca el servidor). `npm test` va en dos pasadas y repite solo esa caída.

### Lista de salida de la 10.0

| Puerta | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm test` | 309 de 309 (20 archivos: 301 + 8 de cooperativo aparte); 14 pasadas seguidas en verde con `scripts/test.mjs` |
| `npm run analyze:meta` | 55.640 campañas, 0 avisos, peor P95 tardío 18 (tope 19); **IDÉNTICO** a la 9.0; huella `aed6a8feb2f230d1` |
| `npm run docs` | sin cambios de contenido |
| `npm run og` | `og-card-es.png`, `og-card-en.png` y `og-card.png`, 1200 × 630 |
| `npm run qa:visual` (ES) | 172 capturas, 0 fallos, 0 avisos |
| `npm run qa:visual -- --lang=en` | 172 capturas, 0 fallos, 0 avisos; regla «fuga» sin excepciones |
| `npm run qa:smoke` (ES) | 306 comprobaciones, «Todo en orden»; guía 29,0 · 29,2 · 32,3 s |
| `npm run qa:smoke -- --lang=en` | 306 comprobaciones, «Todo en orden»; guía 29,1 · 29,1 · 32,8 s |
| `npm run qa:fps` | «60 fps: todo en orden», tres pasadas seguidas |
| `npm run qa:audio` | «La música no cansa: todo en orden» |
| `npm run build` · `build:web` | compilan |
| Constitución | 52 reliquias (tope 56), 6 palabras clave, descripciones ≤ 115 en ES y EN (la inglesa más larga, 104) |
| Paridad (`tests/i18n.test.ts`) | 24 pruebas en verde: mismas claves, variables y cifras; nombres ingleses ≤ 24; 0 restos de español |
| Congelación (`tests/congelacion.test.ts`) | 0 identificadores añadidos o quitados |
| Huella del laboratorio | `git diff v9.0.0` vacío en los seis archivos |
| Censo de 240 | 29,2 % ≥ 17,1 % y 5,01 ≥ 4,93: pasa; 0 P0 con base abiertos tras los arreglos |

---

## Después de la 10.0

Lo que la misión deja abierto, en orden:

1. **Steam Deck.** 4 de 36 en el censo, igual que en la V4; las mismas nueve personas, 0 de 9 en cinco corridas. Nadie lo ha probado en el aparato. Lo primero: una Steam Deck física (`STEAM_BUILD.md`, paso 11) y personas reales con una.
2. **Contraste percibido.** La queja «contraste y color de palos» sube de 205 a 290 menciones con todas las medidas en verde (7,9:1 a 13,8:1). O el panel repite la queja, o la estética cansa de una forma que la regla de contraste no mide. Solo jugadores reales lo dirán.
3. **El casual.** 16,7 % de aprobación y claridad 4,29, pese a la partida guiada.
4. **Revisión del inglés por un hablante nativo.** Ningún angloparlante lo ha leído y el panel no lo mide. Lista de dudas abajo.
5. **Compilar y probar la envoltura.** Ni un binario compilado; el lado Rust de los seis comandos, sin escribir; sin cuenta de Steamworks.
6. **Tres hipótesis de lanzamiento** que votó el panel (V11), todas a favor de la propuesta: una demo con la partida guiada y los tres primeros asaltos, **81,2 %**; el Asalto diario con una tabla entre amigos, **70,0 %**; una campaña corta de cuatro asaltos, **63,1 %**. Sesgo de posición del 38,8 % de los pares: son pistas, no mandatos. Cualquiera de las tres es un sistema nuevo: entra solo si retira o simplifica otro.
7. Menores: el fotograma de ~55 ms del primer sello caliente en 1920×1080; la caída de Node en Windows, rodeada y sin comprobar en Linux; el bloque de feedback a medias bajo el pie de la Crónica en 1366×768; el aviso largo de `mesa-peligro` (redacción).

### Para revisar con un hablante nativo

Nombres propios de `src/shared/i18n/en.ts` que pueden confundir o sonar mal. **No se cambiaron**: la 10.0 estaba congelada y certificada. Que los lea un nativo antes de tocarlos.

| Clave | Inglés | Duda |
|---|---|---|
| `reliquia.cinta.nombre` | Grand Staircase | Da Mult con escaleras de póker. En inglés la jugada es *straight*: «staircase» no la evoca |
| `reliquia.puntales.nombre` | Spare Deck | «Deck» ya es el Mazo y el nombre de las seis barajas iniciales: se confunde con ellos |
| `reliquia.catalizador.nombre` | Philosopher's Stone | Término alquímico corriente, pero también es el título británico de un libro y una película muy conocidos |
| `acabado.policromado.nombre` | Polychrome Wax | Calco de «Lacre policromo». «Polychrome» es también el nombre de una edición de carta en otro juego de cartas comercial muy conocido: valorar el parecido |
| `guia.cuenta.titulo` | The Count | En una corte, «The Count» se lee como «el Conde». Mejor algo como «The Tally» o «Damage × Mult» |
| `logro.full.nombre` | House Full | Juego de palabras con *full house*; invertido suena a error |
| `logro.limpio50.nombre` | Thief's Touch | Premia 50 Golpes exactos; «touch» no dice precisión |
| `mejora.caja_limite.nombre` | Chest of the Edge | Calco de «filo»: suena raro. ¿«Chest of Blades»? |
| `mejora.bronce.nombre` | Royal Glazier | «Glazier» (vidriero) es una palabra rara para el jugador |
| `mejora.tienda.nombre` | Big Stall | Plano, sin el tono de corte del resto |
| `juramento.sincolapso.nombre` · `juramento.limpios.nombre` | Measured Deck · Steady Pulse | No dicen qué piden; comprobar que se entienden sin la descripción |
| `reinado.6.desc` · `reinado.5.desc` · `monarca.escasez.badge` | «You have 1 point of Health less» · «The Attack of Kings rises by…» · «1 card fewer in hand» | Gramática y orden poco naturales («one less point of Health», «Kings' Attack rises by…») |
| `especial.ferretero.nombre` | The Dealer | Coincide con el Tratante de La Taberna. Es a propósito en español; confirmar que en inglés no confunde |
| Marca (`brand.ts`) | «A conspiracy roguelike with a French deck» | «French deck» se entiende como baraja francesa, pero en inglés se dice *standard 52-card deck*: comprobar si se entiende |

Sin gore en ningún nombre. Las voces de los monarcas (apuestas de mesa inglesa: *bet, call, raise*) también conviene que las lea un nativo.
