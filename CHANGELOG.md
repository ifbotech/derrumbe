# Registro de cambios

Todas las versiones notables de SANGRE Y PALO · BLOOD & SUITS (la 6.0 se llamó CORONA ROTA; hasta la 5.0, DERRUMBE). Las cifras de balance salen del laboratorio (`npm run analyze:meta`). Las del panel salen de una simulación: con n = 240 tienen unos ±6 puntos de ruido; con la auditoría rápida de 60 personas, unos ±12.

## 9.0.0 — 2026-11-13

El balance vive en un archivo, una herramienta propone ajustes acotados, amigos y familia mandan su partida en un toque y la conjura de cuatro aguanta un corte de red. Ningún número de juego cambió: el laboratorio sale idéntico al de la 8.0. Motivo: el paso 4 del encargo y lo que la 8.0 dejó abierto en las capturas de Steam Deck. Candidata `76f628c`; puertas en `artifacts/mision/v9/puertas.md`.

### Balance en un archivo
- **`src/rules/balance-config.json`: 244 números**, tipados en `src/rules/balance-config.ts` (`BalanceConfig`, `BALANCE`). Salen de `STAGES`, `ASCENSIONS`, `FATIGUE`, `CLAUSURA`, `TIMBRE`, los decretos de los siete monarcas, los precios de La Taberna, las mejoras de La Orden, las barajas, las formaciones, la mesa, el golpe, los acabados, el Asalto único, 39 reliquias (44 cifras) y 25 especiales (23 cifras).
- Las descripciones con cifras son plantillas `{campo}` que se rellenan con esos mismos números: texto y valor no se pueden separar.
- `tests/balance-config.test.ts` (17 pruebas): tipos y rangos de cada sección, constitución con los textos ya rellenos y, con todos los números +1, que el motor y los textos leen los nuevos.
- **Laboratorio idéntico al de la 8.0**, número a número: 55.640 campañas en 1.565 s, 0 avisos, peor P95 de los asaltos 4–8 por baraja 18 · 18 · 18 · 17 · 16 · 17 (tope 19). Solo cambia la huella de las reglas (`e04abd9ae124f715` → `aed6a8feb2f230d1`), porque desde la 9.0 también suma los valores del JSON.

### Autoajuste
- **`npm run balance:tune`** (`scripts/auto-balance.ts`): un campo cada vez, de 23 afinables, dentro de ±15 %; sondeos con n = 200 y confirmación con n = 1.500. Lee los objetivos de la misma lista que los avisos del laboratorio (`scripts/objetivos.ts`). Por defecto **solo propone** (`artifacts/balance-tune/propuesta.json` y `.md`) y comprueba que la suma SHA-256 de `balance-config.json` no cambia; escribe solo con `--aplicar`.
- **Ejecución real (`--minutos=30`): 1 s, propuesta vacía.** Todos los objetivos se cumplen en el punto de partida (n = 1.500). Márgenes más justos: Reinado 1 con la Orden vacía 29,7 % (0,3 hasta 30), Reinado 8 vacía 6,8 % (0,8), ritmo del asalto 2 en el borde (mediana 8), Asalto único con 2 y 3 jugadores a 0,5 puntos. **No se aplicó nada.**
- Coste medido: una confirmación con n = 1.500, 17,6 min; un sondeo, unos 2,5 min.
- **Hipótesis del panel descartada** (`STAGES[0].hp` 3,93 → 3,0 y `FATIGUE.start` 8 → 10, fuera de ±15 %, medida con `--probar` y n = 1.500): saca 5 objetivos de su rango (Reinado 1 vacía 34,5 %, mediana del asalto 1 de 6 a 4 turnos, baraja negra 33,1 y 48,4 %, baraja corta 33,5 %) y no arregla ninguno.
- `tests/auto-balance.test.ts` (10 pruebas, sin laboratorio): nunca pasa de ±15 %, sin `--aplicar` no escribe y con `--aplicar` solo escribe lo confirmado.

### Telemetría de prueba
- **`src/client/telemetry.ts`**: un registro por campaña, guardado **solo en este equipo** (`derrumbe:telemetria`, las 10 últimas). Lista cerrada de 21 campos: versión, día (sin hora), modo, jugadores, baraja, Reinado, semilla, resultado, asalto, turnos, partida guiada y sus segundos, picos de duda por asalto, reliquias ofrecidas, elegidas y saltadas, La Manga, Rebobinar, causa de la derrota, tipo de entrada y tamaño de ventana (redondeado a 10 px). Ni nombres, ni código de sala, ni identificadores, ni texto libre.
- Medido: un registro de una campaña entera, **657 bytes** (tope 5 KB); el módulo minificado, 4.988 bytes.
- **Botón «Enviar Crónica / Feedback de Prueba»** en la Crónica (victoria y derrota) y en Ajustes, con ratón, teclado y mando. Fila **«Datos de prueba»** en Ajustes: cuántas campañas y cuántos kB, «Ver» (el JSON tal cual, de solo lectura) y «Borrar». Sin interruptor de envío: el único envío es el botón.
- **Red**: 0 peticiones sin pulsar, en cualquier compilación. Con la compilación normal, 0 también al pulsar: copia un resumen de ≤ 6 líneas y descarga `sangre-y-palo-feedback-AAAA-MM-DD.json` (en móvil, la hoja de compartir). Con `VITE_TELEMETRY_URL`, exactamente 1 POST por pulsación, con el registro y nada más. Lo comprueban `tests/telemetria.test.ts` (9 pruebas) y la prueba de humo con la red cortada, pulsando los botones de verdad.

### Cooperativo
- `startServer({ port, botDelayMs, seed })`: importar el servidor ya no abre ningún puerto; `npm start` y `npm run dev:server` siguen igual.
- Cada estado viaja con su resumen (`stateHash`, `src/rules/state-hash.ts`). Si el del cliente no cuadra, pide el estado entero (`resync`) y avisa «Mesa puesta al día con el servidor».
- **`tests/coop-estres.test.ts`, 8 pruebas con WebSocket de verdad, 6,6 s**: partidas de 2, 3 y 4 hasta el final; señas en el Mapa y en La Taberna para todos los asientos; corte a mitad de turno → bot → vuelta con su mano y su Manga; **50 partidas con un corte sembrado: 50 reconexiones, 0 desincronizaciones**; misma semilla, misma partida. Verde dos veces seguidas.
- Quien entra sin nombre se llama **CONJURADO** (antes «OBRERO», del tema viejo).

### Abierto de la 8.0
- La placa «−n CAE» ya no pisa la placa de ventaja de los tronos (regla «placas»).
- En «Tu Vida», cada rótulo va encima de su barra (regla «bunker»).
- Estado nuevo `ferreteria-mando`: La Taberna con el foco del mando. Regla «foco» ampliada a él. Existe en las cuatro ventanas.
- Retirado lo que quedaba de la partida guiada vieja: `TUTORIAL_INTRO`, `say`, `after`, el modo `'intro'` y «la Maestra».
- Las cifras de La Taberna que la interfaz escribía a mano («+6 de Vida», «cada vez cuesta 1 más») salen de `BALANCE`.

### Puertas
- `typecheck` limpio. **254 pruebas** en 16 archivos, 22 s (antes 205 en 11). `build` y `build:web` compilan, con el JSON empaquetado.
- Forja: 169 piezas × 2 tamaños, limpia, 9 avisos ya conocidos. `npm run docs`: sin cambios.
- QA visual: **160 capturas** (40 estados × 4 ventanas), 0 fallos, 0 recortes. Estados nuevos: `acta-feedback`, `ajustes-prueba` y `ferreteria-mando`. Reglas nuevas: «placas», «bunker» y «feedback».
- Prueba de humo: **272 comprobaciones**, «Todo en orden» (ratón, teclado, mando virtual, «Reducir movimiento» y telemetría con la red cortada). Partida guiada: 29,1 s con teclado y ratón, 33,0 s con mando.
- `qa:fps`: «60 fps: todo en orden». `qa:audio`: «La música no cansa: todo en orden».

### Panel simulado contra la 8.0
Corrida `rapido-60-20261113-222433` (commit `76f628c`) contra `rapido-60-20261113-164104` (8.0): mismas 60 personas y mismo reparto de escenas. 286 evaluaciones, 0 fallidas, 31,9 min.
- **Cambios del instrumento.** El lector del juego se rehízo: la 9.0 sacó los números a `balance-config.json` y el panel ahora le pide al juego sus datos ya resueltos (comprobado clave por clave contra la 8.0: 0 defectos). Audita 3 pantallas nuevas (`acta-feedback`, `ajustes-prueba`, `ferreteria-mando`). El duelo de enviar la Crónica ya no se vota, porque el juego lo trae.
- **Aprobación: 25,0 % → 26,7 %** (15 → 16 de 60; IC95 17,1–39,0; el de la 8.0, 15,8–37,2).
- **Claridad media: 5,20 → 5,30** (IC95 calculado de las 60 reseñas: 4,91–5,49 en la 8.0 y 4,93–5,67 en la 9.0).
- **Veredicto: sin regresión.** Las dos suben dentro del ruido de n = 60: no es una mejora probada. La 9.0 es de infraestructura y no prometía mover estas cifras.
- Por dispositivo (claridad · aprobación): PC (n 21) 5,33 → 5,48 · 33,3 → 28,6 %. Portátil (n 15) 5,20 → 5,07 · 13,3 → 13,3 %. Móvil (n 15) 5,47 → 5,27 · 40,0 → 53,3 %. Con n ≤ 21, nada de esto es una diferencia probada.
- **Steam Deck, aparte (n 9): 0 de 9 por cuarta corrida seguida.** Su claridad pasa de 4,44 a 5,33 (IC95 4,07–6,60), pero **no es comparable**: desde la 9.0 su escena enseña solo capturas con mando (`mesa-mando`, `ferreteria-mando`, `ajustes`), y en la 8.0 enseñaba `mesa` y La Taberna con ratón. La subida no se atribuye al juego.
- Quejas por cubeta: **texto chico 75 → 87** · contraste 68 → 59 · fatiga visual 53 → 46 · reglas confusas 38 → 43 · palo Inmune 38 → 40 · La Manga 14 → 23 · mando / foco 10 → 17 · objetivos táctiles 18 → 16 · Reliquias 9 → 13. La de texto chico es la que más sube y sigue siendo la primera.
- Precio justo (mediana): 8,0 → 8,0 USD. Van Westendorp: óptimo 6,0 → 6,25 USD; indiferencia 8,22 → 8,82 USD. En deseados: 58,3 → 61,7 %.
- Duelos A/B (los dos miran a la V10): «Jugar en inglés», 86,7 % por la propuesta (IC95 78,3–93,3); «Modo de alto contraste», 100 %. Sesgo de posición: 13,3 % de los pares.
- La propuesta de balance del panel (Ariete 4 → 3, peso de las Comunes 50 → 40) pasa de ±15 % y no arregla ningún objetivo roto: descartada.

### Estudio
- Orden de celdas: director → reglas-balance → juice-ux → arte-ui. Bitácoras en `artifacts/mision/v9/`. La prueba de humo de `juice-ux` llamaba a la telemetría por un enganche de QA, y `arte-ui` añadió después la pasada que pulsa los botones de verdad.
- La primera sesión de `arte-ui` se cortó por un fallo de autenticación. Se retomó desde el árbol guardado y terminó con todas sus puertas en verde.
- Corrección del Director: en el cierre de la 8.0 se dio por «sin base» la «fila de Tréboles cortada». Las capturas `forja` de 1366×768 y 1280×800 la enseñan: la Mesa de lacre no cabe sin desplazar. Pasa a la V10 (`SPECS/V10.md`, SD1).
- Pendiente para la V10 (`SPECS/V10.md`, apartado 1.2): Steam Deck no aprueba y la queja de texto chico sube. Arreglos concretos, con su captura y su regla de QA.

## 8.0.0 — 2026-11-13

Golpes con tajo, esquirlas y lacre a 60 FPS, música por generador y foco del mando de papel y tinta. Sin cambios de reglas: `src/rules/` no se tocó y el laboratorio sigue idéntico al de la 6.1 y la 7.0. Motivo: el paso 3 del encargo (sensación de golpe y tres horas de música sin fatiga) y lo que dejó abierto la 7.0 (foco del mando en Steam Deck, bocadillo del monarca sobre los tronos, barra del pulgar en móvil).

### Coreografía del golpe
- **Guardia abatido**: el naipe se parte en diagonal en dos mitades grabadas y tres astillas de papel (760 ms a 1×). Sustituye al clon con `clip-path` y a los cuadrados de color. Pausa de impacto de 60–80 ms (antes 45–65), sin filtro. En un Golpe exacto, temblor contenido (0,5).
- **Trono caído**: la corona se parte en dos y estalla en 10 esquirlas con la trama de su palo. Medido en la prueba de humo: **1.142 ms a 1×, 595 ms a 2× y 311 ms a 4×** (tope 1,2 s a 1×; a 2× y 4×, proporcional ± 15 %).
- **Reserva de piezas**: tras el primer golpe, diez golpes más crean 0 nodos nuevos y no dejan ninguna pieza suelta.
- **Cadena de Golpes exactos** contada en el cliente: sube de uno en uno sin el tope 4 del motor y vuelve a 0 con un golpe no exacto.

### Lacre y lámina
- **Sello de lacre caliente** en la cuenta: cae sobre la carta con rebote corto y se enfría por opacidad. Uno por sello: de pólvora, de eco, de oro real y de la manga.
- **Lámina** en las cuatro cartas con acabado (Filo de plata, Templado, Lacre policromo y Cristal maldito; antes solo dos tenían brillo): una banda pintada una vez que cruza la carta con `transform`. Sustituye a `.ly.sheen`, que animaba `background-position` con `mix-blend-mode`.
- **Monedas grabadas** con canto y cara: vuelan en combate y, por primera vez, en La Taberna al comprar y al vender. Sustituyen a los cuadrados `.coin`.
- Con «Reducir movimiento», nada vuela ni tiembla, la lámina no pasa y el foco no rebota: solo fundidos y sonido (pasada propia dentro de `npm run qa:smoke`).

### Banda sonora
- Generador puro con semilla (`src/client/audio-frases.ts`): da la partitura compás a compás y el WebAudio solo la toca. Re menor eólico; el do♯ solo en las cadencias.
- Un juego de motivos por asalto (antes, la misma melodía transportada en los 8). Escena nueva para el **Mapa del castillo** (antes sonaba como la portada); laúd y bajo en el Mapa y en La Taberna; tambores de guerra y metales ante un monarca o con presión > 0,6.
- Foley nuevo: tajo, carta a La Manga y de vuelta, sello de lacre y lámina. La campana del Golpe exacto **sube un semitono por exacto seguido, hasta +7**.
- `npm run qa:audio` (nuevo, solo CPU, 0,5 s): guion de unas 3 h × 3 semillas (1, 2 y 3). **Tramo repetido más largo: 3,3 s** (un compás; tope 30 s, comparación invariante al transporte). **Secuencia idéntica de efectos más larga: 1** (tope 8). Todas las notas en re menor. Motivos distintos en cada asalto.

### Rendimiento
- `npm run qa:fps` (nuevo): Chromium con aceleración real (ANGLE, RTX 3090, D3D11); falla si el renderizador es por software. Refresco en reposo 6,1 ms; umbral p95 ≤ 17,2 ms y ningún fotograma > 50 ms. 52,6 s. Sustituye al umbral de `GPU=1` de la prueba de humo.
- Media / p95 / máximo en ms (`artifacts/mision/v8/fps.json`). **0 fotogramas > 50 ms** en las 15 medidas que puntúan:

| Escenario | 1920×1080 | 1280×800 | 390×844 |
|---|---|---|---|
| Golpe con tajo | 6,73 / 12,1 / 24,3 | 6,62 / 6,2 / 42,5 | 6,58 / 6,2 / 42,6 |
| Caída de un trono | 6,93 / 12,2 / 12,3 | 7,01 / 12,2 / 18,2 | 6,26 / 6,2 / 12,2 |
| Sello y lámina en la cuenta | 6,07 / 6,2 / 6,3 | 6,1 / 6,2 / 12,0 | 6,07 / 6,2 / 6,2 |
| Monedas en La Taberna | 6,07 / 6,2 / 6,3 | 6,07 / 6,2 / 6,3 | 6,07 / 6,1 / 6,2 |
| Barrido del foco con el mando | 6,1 / 6,2 / 12,1 | 6,07 / 6,2 / 6,3 | 6,07 / 6,2 / 6,3 |

- En frío (primera pasada en un perfil nuevo, no puntúa): un fotograma de 60,8 ms en 1920×1080, sello y lámina, al compilar los sombreadores. `warmUp()` lo reduce; no lo quita.
- Regla nueva «anima» en la QA visual: ninguna animación toca algo distinto de `transform` u `opacity` y ningún nodo animado lleva `filter` ni `mix-blend-mode`. Se limpiaron `styles.css`, `campaign.css` y `juice.css`; la lista de pendientes quedó vacía.

### Abierto de la V7
- **A1 · foco del mando.** El marco de latón de 3 px pasa a papel de 4 px con filete de tinta (8 px en total). La carta enfocada se eleva. Prueba de humo: el foco llega en 1 fotograma en cada pulsación de la cruceta y `data-foco` está solo en la carta nueva. Regla «foco» de la QA visual en verde.
- **A2 · bocadillo del monarca.** En escritorio va en la columna lateral, junto a la placa del monarca; en 390×844, bajo la fila del monarca. Regla «voz»: no pisa ningún trono en `mesa-monarca` ni en sus siete variantes, en las cuatro ventanas.
- **A3 · 390×844.** Botones a ≥ 12 px del borde inferior y ≥ 8 px entre sí; las filas Q y K de los guardias se ven enteras. Reglas «pulgar» y «guardias» en verde.

### Puertas
- `typecheck` limpio; **205 pruebas** en verde; `build` y `build:web` compilan.
- Laboratorio: no se repitió, porque las reglas no cambiaron. `tests/invariantes.test.ts` da la misma huella y el informe sigue idéntico al de la 6.1 (0 avisos, peor P95 de los asaltos 4–8: 18).
- Forja: 169 piezas × 2 tamaños (grupo nuevo `piezas`), limpia, 9 avisos (1 nuevo: `piezas/tajo` a 24 px, un tamaño al que nunca se ve).
- QA visual: **148 capturas** (37 estados × 4 ventanas), 0 fallos, 0 recortes. Estados nuevos: `mesa-esquirlas`, `cartas-lamina`, `taberna-monedas` y `mesa-lacre`. Reglas nuevas: «anima», «foco», «pulgar», «guardias» y «piezas»; «voz», ampliada.
- Prueba de humo: **213 comprobaciones**, «Todo en orden» con ratón, teclado, mando virtual y la pasada con «Reducir movimiento». Partida guiada con los efectos nuevos: 29,1 s con teclado, 29,2 s con ratón y 33,1 s con mando (tope 60 s).

### Panel simulado contra la 7.0
Corrida `rapido-60-20261113-164104` (commit `c12191c`) contra la base `rapido-60-20261113-141123` (7.0): mismas 60 personas y mismo reparto de escenas. 274 evaluaciones, 0 fallidas.
- **Límite de la comparación.** El panel no oye ni ve movimiento: juzga capturas quietas. Nada de lo que diga se puede atribuir a la música, al tajo o a las esquirlas. Desde la 8.0 audita además la captura `mesa-mando`, que es donde se ve A1. Así, las personas de Steam Deck reciben una auditoría más que en la 7.0: en ese estrato las dos corridas no se miden con la misma vara.
- **Aprobación: 25,0 % → 25,0 %** (15 de 60 las dos veces; IC95 15,8–37,2).
- **Claridad media: 4,93 → 5,20** (IC95 calculado de las 60 reseñas: 4,62–5,25 en la 7.0 y 4,91–5,49 en la 8.0).
- **Veredicto: sin regresión y sin mejora medible.** La aprobación no se mueve. La claridad sube 0,27 pero se queda dentro del intervalo de la 7.0.
- Por dispositivo (claridad media con su IC95 · aprobación):
  - Móvil (n 15): 4,60 → **5,47** (IC95 de la 8.0: 4,78–6,15) · 33,3 → 40,0 %. Es donde se trabajó A3. Con n = 15, la mejora no está probada.
  - Steam Deck (n 9): 5,00 → **4,44** (IC95 de la 8.0: 3,71–5,18) · **0 de 9 por tercera corrida** (6.1, 7.0 y 8.0). La bajada cae dentro del ruido y tiene el límite de arriba.
  - PC (n 21): 5,10 → 5,33 · 38,1 → 33,3 %. Portátil (n 15): 5,00 → 5,20 · 13,3 → 13,3 %.
- Quejas por cubeta: mando / foco 19 → 10 · texto chico 84 → 75 · contraste 67 → 68 · fatiga visual 46 → 53 · reglas confusas 38 → 38 · palo Inmune 33 → 38 · La Manga 17 → 14.
- Steam Deck, leído reseña a reseña: 8 de 9 siguen diciendo que no se ve el foco. Pero la auditoría de `mesa-mando` a 1280×800 no lo marca. Lo marcan las de `mesa` y La Taberna, que son capturas con ratón y no tienen foco que ver. Lo que sí tiene base en la captura pasa a la V9 (`SPECS/V9.md`, apartado 1.2).
- Precio justo (mediana): 8,0 → 8,0 USD. En deseados: 55,0 → 58,3 %.
- Duelos A/B: miran a la V9 y la V10 y no se comparan con la 7.0. Gana la propuesta en los tres: «Mandar la Crónica en un toque» (85 %, IC95 75–95; 30 % de pares con sesgo de posición), «Jugar en inglés» (87,5 %, IC95 77,5–97,5; sesgo 25 %) y «Modo de alto contraste» (100 %; sin sesgo). Sesgo de posición global: 18,3 %.

### Estudio
- Orden de celdas: director → arte-ui → juice-ux. Bitácoras en `artifacts/mision/v8/`. Arte-UI pintó las piezas (`engraving.ts`) y el reposo; Juice-UX, la coreografía, el sonido y los medidores. Juice-UX solo puso enganches de una línea en los archivos de Arte-UI, todos listados en su bitácora.
- Lo que no convive: `.ly.sheen` sale y entra `.ly.foil`; `.coin` y `.debris` salen y entran las piezas grabadas; el anillo de latón sale y entra el de papel y tinta.
- Abierto para la V9 y la V10: la pasada de lámina con el foco solo en pantallas anchas (en 390 px la capa daba un parón de GPU); un `filter: drop-shadow` quieto en `.stage .card`; el fotograma en frío de los sombreadores.

## 7.0.0 — 2026-11-13

Partida guiada que se juega y Mesa brava. Sin cambios de reglas. Motivo: la queja «reglas confusas / tutorial» y la claridad del casual (3,50 sobre 10 en la línea base de la 6.1), y unos monarcas que solo eran un decreto de una línea.

### Partida guiada
- Cinco pasos de una línea (≤ 60 caracteres), haciendo y sin ventanas de texto: poder del palo, trono Inmune, La Manga, Daño × Multi = Golpe y Golpe exacto. Cada paso atenúa la mesa, enciende un foco sobre lo que hay que mirar y escribe su línea con el botón del dispositivo en uso.
- Cinco jugadas, una por paso (el tope era 7). La última gana el asalto con un Golpe exacto. 400 partidas de jugadas legales al azar, con semilla fija: ninguna derrota.
- Medido a 1×, pensando 1,5 s cada jugada: **29,1 s con teclado, 29,1 s con ratón, 32,5 s con mando** (la prueba de humo falla por encima de 60 s). Ninguna animación se acortó.
- «Saltar» siempre a mano (Esc / B), con su fila en la tabla de controles. La Manga se abre en la partida guiada (`reserveSize` 1).
- Se retiran las tres ventanas de texto (`TUTORIAL_INTRO` queda vacío) y el cuadro de la Maestra.

### Monarcas
- Siete retratos de grabado, cada uno con dos caras (calma y vencido), distintos por silueta y objeto: naipe partido, balanza, cáliz, corona de carámbanos, llave, hacha y reloj de arena. La forja los separa a 24 px (diferencia mínima 0,114; el tope es 0,1).
- Maldición a la vista: placa con el decreto junto al retrato y la parte de la mesa que castiga marcada con la misma tinta (doble ⚔, hueco en la mano, cáliz tachado sobre las ♥, tope del Escudo, guardias En guardia, +2 de Ataque, Asedio final adelantado).
- Voz de mesa brava: 21 frases (entrada, primer Contraataque y uno de cada tres después, caída), de ≤ 70 caracteres, sin cifras ni palabras de mecánica. Bocadillo de 2,5 s a 1× (1,77 s a 2×, 1,25 s a 4×), solo fundido con «Reducir movimiento».
- Un motivo sonoro de ≤ 2 s por monarca al entrar y al caer.
- Letalidad por monarca, igual que en la 6.1 (52.158 asaltos con monarca): de 13,6 % (La Dama del Cáliz, ×0,91) a 16,4 % (El Usurero, ×1,10); media 14,9 %; objetivo 0,8×–1,3×.

### Secretos de la cripta
- Las 12 opciones se leen como cartas: icono, «Da» en verdín y «Cuesta» en carmesí (o «Nada»), cifras de 15 a 20 px, la descripción larga detrás. Se dan vuelta de una en una con su sonido; con teclado y mando el foco cae en la primera opción.

### Fricciones de la 6.1
- **F1 · palo Inmune.** Con un trono apuntado, cada carta de la mano y de La Manga lleva el sello de su factor contra él: hierro «×0» o latón «×2»/«×3». Nada si es ×1 o es un comodín. Con mando, el sello cambia al cambiar de trono.
- **F2 · texto chico.** La cuenta en dos renglones: arriba el Golpe y contra qué trono; abajo Daño × Multi, cifras de 16 a 20 px y etiquetas de 14 a 16 px, con las palabras enteras también en móvil.
- **F3 · contraste.** La Vida del trono sale de las rayas: placa propia de papel con borde de tinta de 2 px, 14 a 18 px, contraste ≥ 7:1.
- Reglas nuevas de la QA visual: «sello», «cuenta», «vida», «guia», «voz» y «secreto».

### Puertas
- Laboratorio completo (55.640 campañas, 1.543 s): sin avisos, **idéntico** número a número al de la 6.1; peor P95 de los asaltos 4–8 por baraja: 18 (tope 19).
- 205 pruebas en verde (nuevas: `tests/monarcas.test.ts`; `tests/tutorial.test.ts`, reescrita). Forja limpia: 159 piezas, 14 bustos nuevos, 8 avisos (2 nuevos, de deriva de tinta).
- QA visual: 33 estados × 4 ventanas = 132 capturas, cero fallos y cero recortes (estados nuevos: `guia-palo`, `guia-manga`, `guia-exacto`, `mesa-monarca`, `monarcas`).
- Prueba de humo: 193 comprobaciones, «Todo en orden» con ratón, teclado y mando virtual (dos pasadas seguidas en la celda y una en la puerta).

### Panel simulado contra la 6.1
Corrida `rapido-60-20261113-141123` contra la base `rapido-60-20261113-112234`: mismas 60 personas y mismo reparto de escenas.
- **Aprobación: 23,3 % → 25,0 %** (IC95 de la 6.1: 14,4–35,4; de la 7.0: 15,8–37,2).
- **Claridad media: 4,93 → 4,93.** El panel no publica su IC95. Calculado a partir de las 60 reseñas: 4,63–5,24 en la 6.1 y 4,62–5,25 en la 7.0.
- **Veredicto: sin regresión, y tampoco hay mejora medible.** Las dos diferencias caen dentro del ruido de n = 60.
- Lo que no se movió:
  - Quejas de texto chico: 82 → 84. De contraste: 61 → 67. Las tres fricciones están arregladas en el código y pasan sus reglas de QA, pero el panel no lo nota.
  - Claridad en móvil: 4,93 → 4,60 (n = 15; IC95 de 4,10 a 5,10, dentro del ruido). PC: 4,81 → 5,10 (n = 21). Laptop: 5,07 → 5,00 (n = 15). Steam Deck: 5,00 → 5,00 (n = 9).
  - Aprobación en Steam Deck: **0 de 9**, igual que en la 6.1.
- Lo que más repiten las reseñas:
  - En Steam Deck, que con el mando no se ve qué carta tiene el foco.
  - En móvil, que la barra de acciones va pegada al borde inferior y los botones están muy juntos.
  - En `mesa-monarca`, que el bocadillo tapa parte de los tronos.
- Esos tres puntos pasan a la V8 (`SPECS/V8.md`, apartado 1.2), cada uno con su dueño y una comprobación.
- Precio justo (mediana): 8,0 → 8,0 USD. En deseados: 61,7 → 55,0 %.
- Los duelos A/B no se comparan con la 6.1, porque cada corrida votó las hipótesis de su versión. Aun así, la de la 7.0 da una señal para la V8: «La racha de Golpes exactos se oye» gana con el 95 %, y los otros dos duelos empatan. Ojo: el 41,7 % de los pares tienen sesgo de posición.

### Estudio
- Orden de celdas: director → reglas-balance → arte-ui → juice-ux. Cada una dejó su bitácora en `artifacts/mision/v7/`.
- El clasificador de quejas del panel convertía «×0» en «0», así que contaba como «palo Inmune» cualquier queja que llevara un cero. Esa cubeta tenía 87 menciones y las reales eran 32. Arreglado en el panel. La base se reclasificó con el clasificador nuevo, así que las dos corridas se comparan con la misma vara.
- Pendiente para la V9: retirar `TUTORIAL_INTRO`, `say`, `after` y los modos `intro` y `explain` del cliente. Ya no los usa nadie.

## 6.1.0 — 2026-11-13

Marca dual y La Taberna. Sin cambios de reglas. Motivo: el usuario no quería «CORONA ROTA» como título, y un nombre en cada idioma sirve a la vez a la mesa rioplatense y a la búsqueda en Steam.

### Marca
- Dos caras, una marca: en español, **SANGRE Y PALO** con el sello «BLOOD & SUITS»; en cualquier otro idioma, **BLOOD & SUITS** con el sello de origen «SANGRE Y PALO». Lemas: «La conjura de los naipes» y «A card conspiracy against the court».
- Todo sale de `src/shared/brand.ts` (`BRAND`, `brandLocale`, `LOCALE`, `TITLE`, `SEAL`, `SLUG`). La cara se elige por el idioma del navegador; fuera del navegador (pruebas, scripts, servidor), la española.
- Portada: candado de grabado con el título en grande y, cosida debajo, una cinta de lacre con el otro nombre y su sello. Estado de QA nuevo `portada-en` para la cara inglesa.
- `index.html` (`SANGRE Y PALO · Blood & Suits`), descripción y etiquetas `og:`/`twitter:` con los dos títulos; manifest (`Sangre y Palo`); `package.json` (`sangre-y-palo`); tarjeta para compartir regenerada con el candado.
- Lámina y Crónica con título y sello. Los archivos que se descargan se llaman `sangre-y-palo-…`.

### Vocabulario
- La tienda pasa de «Mercado clandestino» a **La Taberna** (y la Llave del mercado, a Llave de la Taberna).
- El final de victoria pasa a llamarse **«Corte vencida»**. La derrota sigue siendo «Conjura deshecha».
- «corona rota» y «mercado clandestino» entran en la lista prohibida de `tests/vocabulario.test.ts` y de la regla «jerga» de la QA visual.
- No cambian, a propósito: claves `derrumbe:*`, la semilla de la diaria, el marcador `app: 'derrumbe'` de la copia de seguridad, la dirección `/derrumbe/` y los `id` de datos.

### Pruebas
- `tests/marca.test.ts`: las dos caras de `BRAND`, `brandLocale` (`es-AR` → es; `en-US` y `pt-BR` → en; sin idioma → es), `index.html`, manifest, `package.json` y la primera línea del README.
- QA visual, regla nueva «marca»: en `portada` y `portada-en` la cinta dice el otro nombre, mide ≥ 13 px (14 en móvil), va cosida al título y cabe en la ventana.
- Las pruebas con navegador fijan `locale: 'es-ES'`: el Chromium de Playwright puede venir en inglés.
- La prueba de humo comprueba la marca dual en la portada y la copia `sangre-y-palo-progreso-AAAA-MM-DD.json`.

Medidas de la 6.1: informe completo del laboratorio sin avisos e **idéntico** al de la 6.0 (`node artifacts/v6/comparar-meta.mjs`); 188 pruebas en verde; QA visual con 28 estados × 4 ventanas = 112 capturas y cero fallos; prueba de humo con 164 comprobaciones, «Todo en orden» en dos pasadas seguidas. Panel: la auditoría `rapido-60-20261113-112234` de la 6.1 es la línea base de la V7 (aprobación 23,3 %, IC95 14,4–35,4; claridad media 4,93).

## 6.0.0 — 2026-11-12

Cambio de tema 360° y claridad universal, sin tocar una cuenta. Motivo: en la auditoría V4 del panel simulado, «reglas confusas / tutorial» sumó 187 menciones y el casual dio 3,58/10 de claridad; la jerga de obra (35 términos) no era de baraja.

### Tema y vocabulario
- El juego pasa a llamarse CORONA ROTA («La conjura de los naipes»). El título vive solo en `src/shared/brand.ts`.
- No se adoptó «Regicidio» como título: es el nombre de un juego comercial que ya existe. Tampoco sus nombres propios: la tienda es «Mercado clandestino».
- Vocabulario universal en todo lo que lee el jugador (glosario en `SPECS/V6-normas-y-glosario.md`): palos por su nombre, tronos y guardias, Vida, Escudo, Mazo, Descarte, Contraataque ⚔, Daño × Multi = Golpe, Golpe exacto, Impulso, Motín, Asedio final, La Manga, Rebobinar, Reliquias, Sellos de lacre, Acabados, monarcas y decretos, Mercado clandestino, Mesa de lacre, Mapa del castillo, Juramentos, La Orden, Coronas, Reinado, Trono infinito, Asalto diario, Crónica.
- 226 piezas renombradas en las reglas (185 nombres y 171 descripciones): 52 reliquias, 25 especiales, 7 monarcas, 8 asaltos, 8 Reinados, juramentos, atajos, secretos, logros… Biblia en `SPECS/V6-biblia-de-nombres.md`.
- Las seis palabras clave: Daño, Multi, Golpe exacto, Brecha, En guardia, Desarmado.
- Tres redes contra la jerga vieja: `tests/vocabulario.test.ts`, la regla «jerga» de la QA visual y `tests/marca.test.ts`.
- No cambian, a propósito: identificadores de datos, clases CSS, protocolo de red, claves de guardado `derrumbe:*`, la semilla del Asalto diario y la dirección de la página.

### Grabado
- Portada: sala del trono con la corona de piedra partida, dagas cruzadas, cuatro estandartes con la trama de cada palo, antorchas y sello de lacre. Tarjeta para compartir e icono nuevos.
- Los cuatro tronos: cabecera de cada casa, escudo de inmunidad, insignia de Ataque «⚔ n» sobre placa, paños de guardia con su tocado (Sota, Reina, Rey).
- 52 reliquias, 17 especiales y 17 iconos de servicio grabados de nuevo. 8 retratos (los siete monarcas y el Tratante), reconocibles por su objeto y su silueta. 6 dorsos de baraja.
- Títulos en Cinzel (romana de inscripción, en versales) en vez de la gótica.
- Animaciones: estandarte rasgado al caer un guardia y corona que se parte al caer un trono.
- Forja: en las reliquias, tinta fuera de 22–58 % o silueta por debajo del 55 % a 24 px ya es fallo. Quedan entre 23,6 % y 56,9 %. Grupos nuevos `especiales` y `servicios`.

### Mesa y pantallas
- Todas las pantallas con el vocabulario nuevo. Píldoras `+D`, `+M`, `×M`; cuenta `Daño × Multi = Golpe`.
- Insignias «¡Exacto!», «Cae el guardia», «Cae el trono», «Ventaja», «Inmune», «Habrá Contraataque ⚔ n».
- La preparación de campaña cabe entera sin desplazar en 1366×768 y 1280×800: «Semilla» al pie del panel (era una nota de la 5.0), título más corto y barajas con alto mínimo en vez de fijo (una descripción larga se montaba sobre la fila de abajo).
- En el Mercado clandestino, a 1280 y 1366 de ancho, el nombre de cada oferta va en la letra de rótulos y cabe entero («ESTANDARTE» ya no se parte con guion).
- Aviso de último turno en móvil en un renglón de 28 px (era una nota de la 5.0). Antes restaba 60 px a los tronos; ahora unos 33.
- QA visual: reglas nuevas «jerga» y «texto pisado». Cazó títulos partidos y textos fuera de su botón en el Mercado a 1280.

Certificación final: QA visual con 27 estados × 4 ventanas = 108 capturas y cero fallos; prueba de humo con 162 comprobaciones, «Todo en orden» en tres pasadas seguidas; con aceleración gráfica, 7,1 ms de media por fotograma durante un golpe (p95 12,1 ms); banco de grabado con 145 piezas sin fallos; 186 pruebas en verde; barrido de jerga con cero palabras del tema viejo en lo que lee el jugador.

### Mando y sonido
- LB/RB sobre las reliquias, comprobado también en combate dentro de la prueba de humo (era una nota de la 5.0).
- La prueba encontró un fallo real: al reordenar en combate, la cuenta del golpe no se repintaba. Arreglado.
- Prueba de humo: de 143 a 162 comprobaciones.
- Sonido del tema nuevo, todo sintetizado: tambor de guardia y acero en el Contraataque, espada contra escudo si lo frena el Escudo, campana en el Golpe exacto, estandarte que cae, corona que se parte, redoble en el Motín.
- Los ocho Susurros y la partida guiada (ahora habla la Maestra), reescritos.

### Reglas (sin cambios de balance)
- Ni una cuenta cambió: el informe del laboratorio (55.640 campañas, sin avisos) es idéntico número a número al de la 5.0 (`artifacts/v6/comparar-meta.mjs`).
- `omen()` expone sus cifras en campos propios para el aviso corto.

### Panel y estudio
- `..\panelAgentesGaming` habla el vocabulario nuevo: preset `v6-completo` (`v4-completo` queda de alias).
- 11 duelos A/B ya resueltos, retirados; 3 propuestos para la V7, como hipótesis.
- `pytest` de 62 a 73 pruebas, en verde. Copia de respaldo en `archivo_v5/`.
- Circuito en seco limpio. No se lanzó ninguna corrida real.
- Hoja de ruta renumerada: V6 es este cambio de tema; V7, enseñanza de 60 segundos y personalidad de los monarcas; V8, jugo y audio de corte; V9, cooperativo, `balance-config.json` y telemetría con la privacidad primero; V10, candidata a lanzamiento.
- El bucle `scripts/estudio-autonomo.ps1` arranca en la V7.
- Reglamentos de los subagentes y skills, al día.

### Sin hacer o por comprobar
- El panel no se ha corrido sobre la 5.0 ni sobre la 6.0: no hay medida de aprobación ni de claridad de ninguna de las dos. El bucle audita `main` como línea base antes de la V7.
- `scripts/estudio-autonomo.ps1` solo se ha probado en modo ensayo.
- En móvil, el aviso de último turno aún resta unos 33 px a los tronos.
- `index.html` y el manifest llevan el título escrito a mano (son estáticos). `tests/marca.test.ts` falla si alguien cambia la marca y se los deja.
- La página sigue en `/derrumbe/` y el repositorio se sigue llamando así.

## 5.0.0 — 2026-11-12

Claridad de cristal, ergonomía y balance con datos. Motivo: la auditoría V4 del panel simulado dio 28,8 % de aprobación (IC95 23,4–34,8) con 5–7/10 de diversión, y señaló la interfaz como causa.

### Legibilidad
- Ningún texto por debajo de 13 px, en CSS ni en SVG (tamaño efectivo en pantalla). En móvil, cifras y descripciones a 14 px. 126 tamaños subidos en las hojas de estilo.
- Ninguna cifra en gótica. Fuente «Derrumbe Cifras» (solo los dígitos de Archivo Black) puesta la primera en la familia de títulos: un número dentro de un título gótico sale en palo seco. Variable `--num` para toda cifra, con cifras tabulares y placa opaca.
- En las cartas en miniatura (rejilla de la forja, visor del mazo) el texto del grabado se retira; rango y palo quedan grandes.
- Cuenta central: daño final entero en grande sobre placa, torre de destino, Fuerza y Resonancia en pequeño (Resonancia con un decimal) e insignias por orden de peso: golpe limpio, cae el piso, ventaja ×n, inmune ×0, búnker −n, sirena, muro, repara, oro, robas, tiza.
- Recibo bajo demanda (ratón encima, foco con teclado o mando, o toque): cinco fichas `Base + Cartas + Cinturón × Resonancia = Daño`, con una línea por cada paso. No tapa la mano ni las torres. En móvil es una hoja con botón de cerrar de 48 px.
- El título «Sepultados» pasa a una gótica más abierta y sin filtro rugoso. La auditoría lo había leído «SEPUETADOS»; el texto del código siempre fue correcto.
- Corrector de erratas sobre todos los textos: tres encontradas y corregidas («Enconfra» → «Encofra», «el daño que sobre pasa» → «el daño que sobra pasa», una tilde en un documento).

### Palos y contraste
- Cuatro tramas de grabado: ♠ rayado diagonal, ♦ punteado, ♥ aparejo de ladrillo, ♣ rayado cruzado. Van en el marco de las cartas, en el rótulo de cada torre y en la rueda de materiales.
- Contraste del glifo de cada palo sobre el papel crema ≥ 7:1 (antes: ♦ 3,22:1, ♥ 5,02:1, ♣ 6,63:1). Glifos con contorno de tinta e índice de carta sobre placa de papel.
- La forja (`npm run forja`) lo mide: 92 piezas a 24 y 300 px, sin fallos. Las seis parejas de tramas se distinguen en luminancia. Quedan 13 avisos de densidad de tinta en iconos de herramienta (no son fallos).
- Lo atenuado o desactivado baja de tono, no de opacidad. «Copiar acta», «Pasar», «Cerrar», barras del búnker, índices de la mano y píldoras del cinturón llevan placa y más contraste. El botón «No mostrar más» de los susurros pasó de 1,2:1 a unos 12,9:1.

### Maquetación y ergonomía
- Mano con huecos de al menos 12 px entre cartas. Todo lo pulsable mide al menos 44 × 44 px, con 8 px de aire.
- Botones de acción «Golpear», «Andamio», «Tiza», «Descartar» y «Soltar» (y «Pasar»), cada uno con su insignia de tecla o de mando. El número de cartas a descartar va en un sello aparte sobre el botón.
- Móvil 390×844: barra del pulgar de cuatro botones de 48 px (Golpear, Andamio, Descartar, Tiza), mano encima, torres y búnker arriba.
- Cero recortes: gremio, colección y archivo se desplazan dentro de su panel en móvil. Aviso de tinta desvanecida (`tinta.ts`) en toda caja con desplazamiento mientras quede contenido.
- Las tarjetas de opción (cobro, hallazgo, ferretería, colección) ya no cortan la última línea de una descripción larga: llevan alto mínimo en vez de alto fijo, y sus botones quedan en línea. La QA comprueba también el texto cortado por su propia caja, que antes se le escapaba.
- El registro lateral de la mesa solo se enseña si caben dos renglones enteros (en 1366×768 y 1280×800 se oculta).
- QA visual: 25 estados × 4 ventanas = 100 capturas, cero fallos (la línea base con la QA nueva, antes de tocar estilos, eran 2.719). Doce reglas: texto, gótica, recorte, tinta, diana, aire, mano, pulgar, trama, contraste, placa y maqueta. Prueba estática `tests/imprenta.test.ts` (23 comprobaciones).

### Mando
- Descartar en L3, reordenar el cinturón con LB/RB con el foco en la herramienta (fuera del cinturón siguen abriendo mazo y lupa), pantalla completa en R3. Ninguna fila de la tabla de controles queda sin mando.
- Marco de foco de 3 px, latón entre filetes de marfil, con salto de escala. Sigue al elemento y sobrevive a los redibujados. Respeta «reducir movimiento».
- Con teclado o mando, el globo de ayuda ya no sale al enfocar cartas de la mano (tapaba la cuenta). La lupa (L / RB) sigue ahí.
- La tabla de controles sale de un solo sitio (`CONTROL_ROWS` en `prompts.ts`): Ajustes, README y REGLAS.md.
- Navegación con cruceta fila a fila. En la certificación la prueba de humo fallaba a ratos: desde la derecha de la mesa, «arriba» saltaba a la barra superior en vez de a las torres. Ahora manda la fila más cercana (huecos entre bordes, no entre centros), y un barrido comprueba que desde cualquier elemento de la mesa se llega a cada torre en 6 pulsaciones o menos.
- Prueba de humo: 143 comprobaciones con teclado, ratón y mando virtual; «Todo en orden» en cinco pasadas seguidas tras el arreglo. La latencia del foco se mide con la mediana de cinco pulsaciones (12–27 ms; límite 50).

### Enseñanza y derrota
- «Causa del derrumbe» en dos líneas con una barra (lo que venía, lo que frenó el muro, lo que entró, lo que quedaba). Sale en la mesa al caer el golpe final, en el acta de campaña, en el final de la partida clásica, en «Copiar acta» y en el archivo de actas. Cuatro causas: sirena, colapso de cantera, herida propia y sin cartas.
- Aviso de último turno cuando una sola sirena o el colapso siguiente pueden tirar el búnker.
- Ocho susurros de tiza de una línea (palo inmune, andamio, golpe limpio, forja, atajo, jefe, fatiga, cantera baja), de uno en uno y una vez por perfil, con «No mostrar más» y una fila en Ajustes para volver a encenderlos. Los tres básicos de la mesa solo salen en la primera campaña; los otros cinco, la primera vez que se ven.
- Insignias flotantes cuando disparan Ariete, Contragolpe y Rebosadero, con sonido propio. Sonidos distintos para golpe limpio, piso que cae sin limpio, jugada inválida, sirena frenada y sirena que entra.

### Compartir
- Lámina del acta de 1200 × 630 (PNG) para descargar o copiar: resultado, obra y jefe, mayor golpe, turnos, cinturón, causa, semilla, baraja y nivel.
- Enlace `?seed=<semilla>&baraja=<id>&nivel=<1..8>`: abre la preparación de campaña con todo cargado y un aviso. No arranca solo ni pisa una campaña en curso.
- Arreglo: una campaña con semilla al azar ahora se puede repetir. La semilla al azar se enseña como `#` + base 36 y se lee tal cual; antes «Rejugar semilla» no reproducía esas campañas. Las semillas escritas con palabra no cambian.

### Balance
Laboratorio: 55.640 campañas, informe sin avisos, 1.500 por celda. Victorias en %, gremio vacío / lleno.

| Celda | 4.0 | 5.0 |
|---|---|---|
| Nivel 1 | 29,1 / 44,1 | 29,7 / 45,1 |
| Nivel 5 | 14,3 / 27,7 | 14,1 / 29,1 |
| Nivel 6 | 12,0 / 24,5 | 12,3 / 24,9 |
| Nivel 7 | 7,3 / 16,9 | 7,9 / 16,9 |
| Nivel 8 «Clausura» | 4,1 / 10,9 | 6,8 / 15,3 |
| La Ventisca (letalidad) | 17,6 %, ×1,14 | 14,0 %, ×0,94 |
| Los siete jefes | ×0,90 a ×1,14 | ×0,91 a ×1,10 |
| Peor P95 de turnos, obras 4–8, por baraja | 18/18/18/17/16/17 | 18/18/18/17/16/17 |
| Timbre del gremio dado de salida | 30,0 % | 49,4 % (49,1 % con 800 campañas) |
| Partida clásica 1/2/3/4 jugadores | — | 59,3 / 58,5 / 64,5 / 63,1 |

- Timbre del gremio rediseñado (era una trampa: 56,5 % de elección y 30,0 % de victorias dado de salida): «Al empezar cada obra, sella 1 carta de tu mazo al azar. Los sellos se activan dos veces.» Se midió con 1, 2 y 3 sellos (49,1 %, 62,9 %, 67,3 %): se queda en 1.
- Clausura: «Solo en la obra 8, la amenaza de todas las torres sube 1.»
- La Ventisca: «El muro no puede pasar de 4.» (antes 3). La variante «tope 4 y amenaza +1» se descartó: con las seis barajas subía a ×1,27.
- Ariete 3 → 4 de Fuerza por punto de muro. Horno 2 → 3 de oro (no 4: ya ganaba 54,4 % dado; su problema era de claridad). Con 800 campañas dadas de salida: Ariete 47,4 %, Horno 45,0 %, Contragolpe 47,5 %, Rebosadero 44,9 % (referencia 41,4 %).
- Textos nuevos. Contragolpe: «Si el muro frena entera una sirena, su torre recibe 3 × lo frenado. Ej.: frena 4 → la torre recibe 12.» Rebosadero: «Muro que no cabe: cada 2 reparan 1. Reparación que no cabe: +3 de Fuerza por punto para tu próximo golpe.» Cinco textos más reescritos para decir su cifra (Último turno, Bastión, Martillo neumático, Gemelo, Sello de eco), sin cambiar números.
- `FATIGUE.every` se queda en 2: el panel prefirió 3, pero no estaba en el encargo y arriesga el P95 ≤ 19.
- Márgenes justos: nivel 1 con gremio vacío a 0,3 del techo de 30; Paleta de albañil 38,1 % con solo 160 campañas.
- El laboratorio avisa ahora de nivel 8 fuera de 6–9 / 12–17 y de cualquier herramienta dada de salida por debajo del 35 % o por encima del 68 % (con segunda vuelta de 800). `meta-report.json` guarda una huella de las reglas y `npm test` falla si el informe publicado no es de las reglas actuales.

### Estudio
- Cuatro subagentes en `.claude/agents/` (`director`, `reglas-balance`, `arte-ui`, `juice-ux`).
- Cinco skills en `.claude/skills/`: `brutalist-print-ui`, `engraving-svg-forge`, `playwright-deck-qa`, `regicide-synergy-math`, `autonomous-sprint-loop`.
- `scripts/estudio-autonomo.ps1`: bucle V6→V10 con puertas de CPU y de GPU. Probado solo con `-Ensayo`.
- `npm run forja`, `tests/invariantes.test.ts`, `tests/imprenta.test.ts` y `tests/autopsy.test.ts`. 177 pruebas en verde.
- `QA_DIR` y `LAB_HILOS`, para que varias celdas construyan y midan a la vez sin pisarse.
- Hoja de ruta de la V5 a la V10 (`ROADMAP_V5_V10.md`) y especificaciones en `SPECS/`.

### Sin hacer o por comprobar
- La puerta de GPU no se ha corrido sobre la 5.0: no hay medida de aprobación ni de claridad del panel para esta versión. El orquestador la corre como línea base al lanzar la V6 (unos 90–105 minutos de la 3090).
- `scripts/estudio-autonomo.ps1` solo se ha probado en modo ensayo: ninguna versión ha pasado aún por el bucle real.
- Con un susurro de tiza a la vista, ir de «Soltar» a la torre de acero cuesta 7 pulsaciones de cruceta en vez de 6 (el susurro es una parada más del camino).
- En 1366×768 la sección «Semilla» de la preparación queda bajo el pliegue: se llega desplazando el panel, que avisa con la tinta desvanecida.
- LB/RB sobre el cinturón en la mesa no lo cubre la prueba de humo (la obra 1 no llega a tener dos herramientas). Sí se cubre en la ferretería y, con teclado, en la mesa.
- En 390×844 el aviso de último turno resta unos 60 px de alto a las torres.
- El final de la partida clásica pinta la causa del derrumbe pero no tiene estado de QA propio.
- 13 avisos de densidad de tinta en iconos de herramienta (forja).

## 4.0.0

Según el historial (`DERRUMBE 4.0`): fatiga de cimientos, aguante, mando completo, archivo de actas y despliegue. Después, una corrección de CI: acciones al día (checkout y setup-node v7, Pages v5).

## 3.0.0

Según el historial (`DERRUMBE 3.0`): taller de grabado, andamio, tiza, niveles de obra y balance con datos.

## 2.0.0

Según el historial (`DERRUMBE 2.0`): Fuerza × Resonancia, cinturón, sellos, plano y gremio horizontal.
