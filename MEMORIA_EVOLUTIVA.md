# Memoria evolutiva · SANGRE Y PALO, de la V12 a la V26

Registro acumulado de la misión: cada versión con sus cifras, su hipótesis, lo que funcionó y lo que se revirtió. Lo lleva el orquestador; el Director añade la lectura de cada cierre. Encargo: `artifacts/mision/MISION-V12-V26.md`.

Todas las cifras de jugadores salen de un **panel simulado** (`..\panelAgentesGaming`, modelos locales en una RTX 3090). Ordena prioridades; no sustituye a personas.

## Los seis objetivos norte

| # | Objetivo | Umbral |
|---|---|---|
| 1 | Aprobación global, en español y en inglés (cada una) | ≥ 75,0 % |
| 2 | Aprobación de los críticos duros (`acido_exigente`) | ≥ 45,0 % |
| 3 | Claridad media (1–10) | ≥ 7,60 |
| 4 | Diversión media (1–10) | ≥ 8,00 |
| 5 | Aprobación de los impulsivos (`cero_tutorial_impulsivo`) | ≥ 65,0 % |
| 6 | Aprobación en Steam Deck y en móvil (cada una) | ≥ 70,0 % |

`F = Aprobación % + 0,4 × Críticos % + 6 × Claridad + 5 × Diversión + 0,5 × min(Impulsivos %, Deck %, Móvil %)`. Con los seis umbrales justos, F ≈ 211.

## Cómo se mide y se decide

- **`pulso-24`**: 24 personas fijas (subconjunto de las 60 de `rapido-60`): 8 PC, 6 portátil, 4 Steam Deck, 6 móvil; 8 críticos duros; 8 impulsivos. Una escena por persona, siempre la misma. Sin foro ni duelos.
- **Ruido medido** (2026-11-15, misma versión, solo cambia la semilla): F se mueve **10–14 puntos** entre dos réplicas; un estrato de 4 personas (Steam Deck) solo puede dar 0, 25, 50, 75 o 100 %. Claridad y diversión son estables (< 0,3).
- **Protocolo**: cada versión se mide con **cuatro corridas** (español e inglés, dos semillas cada una) y se decide con la orden `fitness`, agrupada y pareada contra las cuatro del Campeón.
- **Aceptar**: F agrupado mejora al del Campeón, o el piso mínimo (el menor de impulsivos, Deck y móvil) sube ≥ 8 puntos sin que baje la aprobación global. **Revertir**: F empeora; la rama no se fusiona y la lección se anota aquí.
- **Victoria en dos etapas**: si `pulso-24` pasa los seis, `rapido-60` en los dos idiomas (36 personas nunca vistas, bloque `retencion_36`); si confirma, censo de 240.
- **Parada**: `v26.0.0`, o cinco hipótesis de arquitectura distintas seguidas que no baten al Campeón.

## Trayectoria

| Versión | Estado | Aprob. ES | Aprob. EN | Críticos | Claridad | Diversión | Impulsivos | Deck | Móvil | F | Corridas |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 11.0 (`rapido-60`, 60 personas) | publicada | 36,7 | 40,0 | 15,0 / 20,0 | 5,40 / 5,28 | 6,57 / 6,63 | 38,1 / 38,1 | 44,4 / 0,0 | 33,3 / 53,3 | 124,6 / 112,8 | `rapido-60-20261115-135642`, `rapido-60-en-20261115-142907` |
| **11.0 (`pulso-24`, 4 corridas)** | **Campeón de partida** | 35,4 | 31,2 | 9,4 | 5,28 | 6,43 | 31,2 | 12,5 | 54,2 | **107,14** | `pulso-24-20261115-185857`, `pulso-24-en-20261115-191625`, `pulso-24-20261115-193259`, `pulso-24-en-20261115-193914` |

| 11.0 (`pulso-24` rápido, 4 corridas) | Campeón hasta la 12.0 | 41,7 | 35,4 | 15,6 | 5,70 | 6,75 | 31,2 | 12,5 | 50,0 | **118,94** | `pulso-24-20261116-131719`, `pulso-24-en-20261116-132456`, `pulso-24-20261116-132816`, `pulso-24-en-20261116-133154` |
| 12.0 (`pulso-24` rápido, 4 corridas) | Campeón hasta la 16.0 (`v12.0.0`) | 47,9 | 33,3 | 18,8 | 5,81 | 6,80 | 37,5 | 12,5 | 54,2 | **123,23** | `pulso-24-20261116-140420`, `pulso-24-en-20261116-140817`, `pulso-24-20261116-141154`, `pulso-24-en-20261116-141616` |
| 12.0 (solo su corrida española de referencia) | listón de las candidatas 13.0 a 16.0 | 50,0 | — | 37,5 | 6,33 | 7,04 | 37,5 | 0,0 | 50,0 | 138,18 | `pulso-24-20261116-140420` |
| 16.0 (`pulso-24` rápido, 1 corrida española) | Campeón hasta la 19.0 (`v16.0.0`) | 54,2 | — | 25,0 | 5,88 | 6,92 | 37,5 | 25,0 | 50,0 | 146,58 | `pulso-24-20261116-171331` |
| 19.0 (`pulso-24` rápido, 1 corrida española) | Campeón hasta la 20.0 (`v19.0.0`) | 54,2 | — | 25,0 | 6,50 | 7,17 | 37,5 | 25,0 | 66,7 | 151,55 | `pulso-24-20261116-180908` |
| **20.0 (`pulso-24` rápido, 1 corrida española)** | **Campeón** (`v20.0.0`) | 54,2 | — | 37,5 | 6,38 | 7,21 | 37,5 | 50,0 | 66,7 | **162,28** | `pulso-24-20261116-182218` |
| **20.0 remedida con el instrumento i2** (Steam Deck fotografiado con mando; escenas de Reliquias completas) | **Campeón y listón vigente** (`v20.0.1`) | 45,8 | — | 25,0 | 6,21 | 6,96 | 37,5 | 25,0 | 50,0 | **140,36** | `pulso-24-20261116-184809` |

(En la fila de `rapido-60`, donde hay dos cifras son español / inglés. Las filas de `pulso-24` agrupan cuatro corridas. **Las dos primeras filas de `pulso-24` no se comparan con las del instrumento rápido**: desde el 2026-11-16 las reseñas van con respuesta corta, `num_predict` 550, y la línea base se rehízo.)

## Bitácora de hipótesis

### Fase A · el instrumento (2026-11-15)

- Hecho: `pulso-24`, caché de auditorías visuales por SHA-256, clasificador de quejas bilingüe con cubeta «aburrimiento / ritmo», `DESCUBRIMIENTO.json`, orden `fitness`, guardia de honestidad (ninguna palabra de venta ni instrucción de voto en lo que el panel narra: ninguna escena de la 11.0 la tenía). 146 tests del panel.
- Hallazgo: las capturas de `npm run qa:visual` no son idénticas byte a byte entre dos corridas sin cambios (8 de 16). La caché solo acierta si la QA es determinista: requisito de la V12.
- Hallazgo: el ruido por semilla es del tamaño de las diferencias que se querían leer (la del inglés frente al español, +11,85 de F, cae dentro). De ahí las cuatro corridas por versión.

### El instrumento rápido (2026-11-16, orden del usuario)

- `pulso-24` pasa de 16 minutos en frío y 6 en caliente a **3–4 minutos por corrida**: reseñas con respuesta corta (los mismos 18 campos, menos caracteres; `num_predict` 550) y la ola visual siempre desde la caché (`calentar-cache` audita antes las capturas nuevas, en pasadas de menos de 900 s). Toda orden lleva tope duro y salida explícita.
- Como cambia el instrumento, **se rehízo la línea base de la 11.0**: F 118,94 (con el instrumento anterior, 107,14). La claridad media sube unas 0,4 con la respuesta corta en las dos versiones: es del instrumento, no del juego.
- Ruido entre corridas de la misma versión con el instrumento nuevo: F de 110 a 127 en la 11.0 y de 98 a 139 en la 12.0. Una diferencia de F agrupado menor que unos 7 puntos no se distingue del azar.

### V12 · cimiento incremental medieval y cero fricción — **publicada, Campeón por la regla, mejora dentro del ruido**

- **Hipótesis**: jugar sin fricción (Mejor jugada, AUTO) y que cada partida deje algo (lo que cae, tirada de huesos, Árbol de la Conjura) sube diversión y aprobación; saldar la deuda visual de la 11.0 sube claridad.
- **Resultado** (4 corridas contra las 4 de la 11.0, 96 pares): **F 123,23 frente a 118,94 (+4,29)**. Aprobación ES 41,7 → 47,9; EN 35,4 → 33,3; críticos 15,6 → 18,8; claridad 5,70 → 5,81 (t = 0,73, p = 0,47); diversión 6,75 → 6,80 (t = 0,40); impulsivos 31,2 → 37,5; Steam Deck 12,5 → 12,5; móvil 50,0 → 54,2. McNemar: 7 suben, 5 bajan (p = 0,77). 0 de 6 objetivos.
- **Lectura honesta**: F sube, así que por la regla de la misión la 12.0 es el Campeón; ninguna cifra se distingue del azar. La capa incremental entera casi no movió al panel. El panel no ve movimiento ni oye: lo que más cambia para una persona (piezas que vuelan, sonido, AUTO jugando) le llega como una frase y una captura quieta.
- **Lo que sí enseñó la autopsia** (57 votos en contra de 96 reseñas, leídos uno por uno):
  - La mitad de las reseñas son la escena de ergonomía de cada dispositivo. PC aprueba 8 de 12 (claridad 7,3). **Portátil 2 de 12, Steam Deck 2 de 12, móvil 4 de 12** (claridad 4,5). Ahí está casi todo el hueco.
  - **«¿1K es el total o el multiplicador?»**: la notación compacta dentro de la cuenta («Daño 148 × Multi ×7 = 1K») rompe la cuenta que cuadra. Es la queja número uno en móvil. La cuenta tiene que enseñar el Golpe exacto.
  - **Botones de acción amontonados**: Golpear, Mejor, Manga, Deshacer y Descartar juntos; clics y toques equivocados en portátil y móvil; Deshacer pegado al borde.
  - **Steam Deck**: «no sé qué carta tengo seleccionada con la cruceta»; precios de La Taberna chicos; panel de daño amontonado.
  - **Inmune sigue sin entenderse**: «¿por qué el 9♥ cura si el trono es Inmune?», «¿Inmune aplica también al poder del palo?». La regla tiene una excepción que nadie espera.
  - **La primera derrota (0 de 8)**: perder Vida al agotarse el Mazo sin que el Escudo lo frene se vive como castigo arbitrario; los sellos del Árbol, chicos para trackpad y cruceta.
  - Rótulo de la formación («Grupo» / «Group») opaco; la ventana de «La cuenta» tapa la mano; «Mejor» pesa igual que «Golpear».
  - En inglés, la cinta «SANGRE Y PALO» sigue leyéndose como texto sin traducir (es la marca que eligió el usuario).
- **Lo que quedó fuera o a medias**: «Buen ojo» y «Manga honda» solo en el Trono infinito (dentro de la campaña llevaban el Árbol lleno al 70 %); 14 nodos de cinco rangos de 30.
- **Candidatos para la V13** (escalera de la misión, aprobación < 55 %: cirugía de interfaz y de bucle): cuenta con el Golpe exacto; mesa de bolsillo (portátil, Deck, móvil) con menos cosas y dianas grandes y separadas; foco del mando inconfundible; Inmune sin excepciones a la vista; Mazo agotado avisado o podado; Buen ojo como regla base con rebalanceo.

### V14 · Bolsillo primero (Steam Deck y móvil) — **rechazada** (hipótesis fallida n.º 2)

- **Hipótesis**: el hueco está en las ventanas chicas (en la 12.0, PC aprueba 8 de 12 y portátil, Steam Deck y móvil 2, 2 y 4 de 12). Sin tocar ninguna regla: la cuenta con el Golpe exacto en latón sobre tinta, Golpear grande y solo, fila del pulgar del móvil con Deshacer como botón de icono y 12 px entre botones, foco del mando con marco de latón, cuña y etiqueta «A Elegir», y la placa «Inmune a ♥». Predicción: algún aprobado en Steam Deck y móvil ≥ 3 de 6.
- **Construida y certificada en rápido** (rama `rechazado/v14-20261116`): 365 + 9 pruebas, laboratorio saltado (reglas de combate sin cambios), QA visual 236 capturas sin fallos, humo rápido 30 de 30.
- **Medida** (`pulso-24-20261116-161923`, 23 pares: una reseña salió cortada tres veces y quedó fallida): aprobación 39,1 (9 de 23; el Campeón, 50,0) · críticos 25,0 · claridad 6,09 (6,33; t = −0,84) · diversión 6,78 (7,04) · impulsivos 25,0 · Steam Deck 0 de 4 · móvil 2 de 5 → **F 119,54 frente a 138,18 (−18,6)**. McNemar: 0 suben, 2 bajan (p = 0,5). Contando la reseña perdida como aprobado, F no pasaría de 123. La predicción no se cumplió.
- **Por qué, leído en los motivos**: el auditor visual volvió a auditar las 50 capturas que cambiaron y devolvió otra lista de problemas graves: ahora «el resaltado amarillo de la carta enfocada no se distingue de las cartas de marfil», «Golpear y Mejor muy juntos» y «el panel de daño, gigante, tapa los tronos». Las personas de Steam Deck repiten esa lista. Las dos de la escena de los primeros minutos volvieron a bajar (tres medidas seguidas: es estable, no azar), citando botones «diminutos» y barras finas del informe visual de su ventana.
- **Lecciones**: (1) cada captura que cambia vuelve a pasar por el auditor, que siempre devuelve problemas graves y no los mismos: tocar la mesa entera es volver a tirar 50 dados, y la 12.0 es en parte una tirada buena; (2) con una sola corrida de 24 personas eso domina sobre la mejora real; (3) un marco de latón sobre cartas de marfil no contrasta para el auditor: si se retoma el foco del mando, tiene que ser por forma y por tinta oscura, no por un tono cercano al del papel; (4) el tope de 550 tokens deja alguna reseña sin validar: una reseña perdida de 24 mueve la aprobación 4 puntos.
- **Consecuencia para la V15**: probar una hipótesis que no toque las capturas de la mesa (así se reutilizan las auditorías de la 12.0 y lo que se mide es la hipótesis): la diversión por reglas.

### V15 · El Golpe exacto perdona pasarse por 1 — **rechazada** (hipótesis fallida n.º 3)

- **Hipótesis** (diversión por reglas, sin tocar la interfaz): si un Golpe también es exacto cuando se pasa por 1, salen más Golpes exactos (la jugada mejor valorada) y sube la diversión. El laboratorio de la 12.0 había medido que el margen de 2 casi los dobla (0,84 → 1,51 por asalto). Predicción: diversión +0,3 en las escenas que hablan del exacto.
- **Construida y certificada en rápido** (rama `rechazado/v15-20261116`): `mesa.cleanOver = 1` en toda mesa; contrapeso, +1 de Ataque en el último asalto (laboratorio rápido: Reinado 1 29,2 % / 48,2 %; con el margen solo, 35,8 % / 54,7 %; rebajar el Impulso bajaba el Árbol vacío y no el lleno); la partida guiada ajustada para que su primer exacto siga siendo el del paso 5; 360 + 9 pruebas; QA visual 236 sin fallos; humo rápido 30 de 30.
- **Medida** (`pulso-24-20261116-164819`, 24 pares; solo 7 capturas nuevas, el resto con las auditorías de la 12.0): aprobación 41,7 (50,0) · críticos 25,0 (37,5) · claridad 6,46 (6,33; t = 0,34) · **diversión 6,75 (7,04; t = −1,50, p = 0,15)** · impulsivos 25,0 · Steam Deck 0 · móvil 50,0 → **F 124,21 frente a 138,18 (−14,0)**. McNemar: 0 suben, 2 bajan.
- **Lectura**: la diversión no subió donde se cuenta la regla (7,25 → 7,00 en esas seis escenas) ni en el resto (6,94 → 6,63). Una persona lo dice con todas las letras: «la regla del Golpe exacto con tolerancia de +1 es confusa». Coincide con el duelo del panel de la 11.0 (el 60 % prefería el exacto estricto). El exacto vale porque es exacto.
- **Sobre el listón**: en las cuatro medidas hechas desde la 12.0, la misma persona de la escena de los primeros minutos (crítica dura, PC) vota en contra; en la corrida del Campeón votó a favor con claridad 9. La corrida española del Campeón (F 138,2; su réplica, 139,1) es un listón alto: una persona de un estrato de 8 mueve F cinco puntos.
- **Lecciones**: (1) no ablandar el Golpe exacto; (2) el contrapeso de un cambio de reglas que sube el Árbol lleno más que el vacío no es el Impulso; (3) una medida con las auditorías visuales de la versión anterior (pocas capturas nuevas) es más limpia: conviene que cada hipótesis toque pocas capturas.

### V16 · En Steam Deck, el foco del mando se ve por luz — **aceptada** (`v16.0.0`, Campeón)

- **Autopsia previa**: las cuatro personas de Steam Deck leen la misma escena («jugar solo con el mando»), que enseña dos capturas (`mesa-mando` y `ferreteria-mando` a 1280×800). Las cuatro votaban en contra desde la 12.0 con la misma queja («no sé qué carta tengo enfocada con la cruceta») y el auditor visual ponía como P0 de `mesa-mando` la falta de un indicador de foco; en `ferreteria-mando`, precios y botones chicos.
- **Hipótesis** (estrecha: solo cambia lo que se ve con mando): si el foco se marca con más superficie y luz (marco de 6 px, halo, carta 20 px más alta, etiqueta «A Elegir / A Soltar») y La Taberna con mando sube sus tamaños, la escena de Steam Deck deja de tener ese P0 y el piso (0 %) sube. Predicción: Steam Deck de 0 a 25–50 %.
- **Construida y certificada en rápido**: 365 + 9 pruebas, i18n, laboratorio sin cambios (misma huella), QA visual 236 capturas sin fallos (y las de mando en inglés), humo rápido 32 de 32 (cazó un fallo propio: la etiqueta no pasaba a «Soltar» tras pulsar A), 60 fps.
- **Medida** (`pulso-24-20261116-171331`, 24 pares; 15 auditorías visuales nuevas): aprobación **54,2** (50,0) · críticos 25,0 (37,5) · claridad 5,88 (6,33; t = −1,56, p = 0,13) · diversión 6,92 (7,04; t = −0,55) · impulsivos 37,5 (37,5) · **Steam Deck 25,0 (0,0)** · móvil 50,0 → **F 146,58 frente a 138,18 (+8,4)**; el piso sube 25 puntos sin bajar la aprobación. McNemar: 2 suben, 1 baja (p = 1,0).
- **Lectura honesta**: la ganancia sale del piso (1 de 4 en Steam Deck pasa a favor) y de una aprobación más; claridad y críticos bajan dentro del ruido de una corrida. Con 24 personas la diferencia no es significativa: se acepta por la regla de la misión (F sube y el piso sube ≥ 8 sin bajar la aprobación), no porque esté probada.
- **Lo que sigue en contra en Steam Deck** (3 de 4): el auditor todavía escribe «la carta seleccionada tiene un borde blanco muy fino que se pierde» (el marco claro sobre cartas de marfil sigue sin leerse como foco), «×7 y 148 con el mismo peso» en la cuenta e «iconos de oro y lacre chicos» en la barra de arriba.
- **Efecto lateral medido**: envolver la cifra del precio en una etiqueta propia cambió por un subpíxel la captura `ferreteria` con ratón en las cuatro ventanas (4 auditorías re-sorteadas fuera del objetivo).
- **Lecciones**: (1) leer primero qué capturas enseña la escena del estrato que hace de piso: aquí eran dos, y tocarlas a ellas basta; (2) lo que solo cambia con `data-input=pad` deja intactas las capturas de los demás estratos; (3) un marco del color del papel no se lee como foco sobre cartas de marfil ni engordándolo: hace falta escala o una forma oscura.

### V17 · Con mando, la carta enfocada es la más grande de la fila — **rechazada** (primera fallida desde el Campeón 16.0)

- **Hipótesis** (continuación de la 16.0, igual de estrecha): el auditor seguía poniendo como P0 de `mesa-mando` que el marco claro «se pierde»; si la carta enfocada además crece (1,3×, anclada abajo a la derecha para no tapar el índice de la siguiente), el foco se lee por escala y ese P0 desaparece. Predicción: Steam Deck de 25 a 50 %.
- **Construida y certificada en rápido** (rama `rechazado/v17-20261116`): 365 + 9 pruebas, QA visual 236 sin fallos (y las de mando en inglés), humo 32 de 32, 60 fps. Por el camino se descartó agrandar el monedero de la barra con mando: en inglés pisa la ficha del turno a 1280 px, y con más tamaño la barra esconde el rótulo de AUTO.
- **Medida** (`pulso-24-20261116-173117`, 24 pares; 4 auditorías visuales nuevas): aprobación 41,7 (54,2) · críticos 25,0 (25,0) · claridad 5,92 (5,88) · diversión 6,79 (6,92) · impulsivos 25,0 (37,5) · **Steam Deck 0,0 (25,0)** · móvil 33,3 (50,0) → **F 121,17 frente a 146,58 (−25,4)**. McNemar: 0 suben, 3 bajan (p = 0,25).
- **Lectura**: el P0 del auditor no desapareció, cambió de forma: de «el borde blanco se pierde» a «la etiqueta “A Elegir” tapa parte del 9 de tréboles» (la etiqueta va encima de la carta, no sobre ella; al crecer la carta queda pegada). Dos de las tres personas de Steam Deck en contra repiten esa frase. De los tres votos que bajan, dos son de móvil e impulsivos, que leyeron las mismas capturas y el mismo texto que en la 16.0: eso es ruido del instrumento (±1 persona por estrato entre corridas idénticas).
- **Lecciones**: (1) en `mesa-mando` el auditor escribe siempre un P0 sobre el foco, se dibuje como se dibuje (invisible, fino, tapa la carta): perseguir esa frase captura a captura no converge; (2) la etiqueta del botón A pegada a la carta se lee como «tapa la carta»: si se conserva, lejos de la carta o en la barra de acciones; (3) con 4 personas, el estrato de Steam Deck se mueve de 25 en 25 puntos y arrastra 12,5 de F: una sola corrida no distingue una mejora real de un voto suelto.

### V18 · La cuenta con todas sus cifras («1.036», no «1K») — **rechazada** (segunda fallida desde el Campeón 16.0)

- **Autopsia previa** (los 11 votos en contra de la corrida del Campeón 16.0): la queja que cruza estratos es la cuenta («no sé qué es el 1K» en móvil, «×7 y 148 con el mismo peso» en Steam Deck, «texto chico en el panel de cálculo» en PC). Además, un patrón fijo del auditor: en portátil, las 11 auditorías de mesa llevan el mismo P0 («botones de acción chicos y pegados para trackpad») en todas las versiones medidas, también en la 13.0 y la 14.0, que rehicieron esa zona; en PC, 0 de 11 con la misma maqueta a escala. Ese P0 sale del dispositivo, no de los píxeles.
- **Hipótesis**: en un juego donde el Golpe exacto es la jugada estrella, abreviar 1.036 a «1K» esconde el dato que hace falta. Si el Golpe, el Daño, el aviso del trono y la pólvora van con todas sus cifras por debajo de 100.000, sube la claridad. Predicción: claridad +0,3.
- **Construida y certificada en rápido** (rama `rechazado/v18-20261116`; el cambio de `cifra.ts` venía de la 13.0): 365 + 9 pruebas, QA visual 236 sin fallos (regla «compacto» al día: la cuenta, entera; lo demás, compacto) y 24 capturas de mesa en inglés, humo 32 de 32.
- **Medida** (`pulso-24-20261116-175207`, 24 pares; 26 auditorías visuales nuevas): aprobación 50,0 (54,2) · críticos 25,0 (25,0) · **claridad 6,46 (5,88; t = 1,83, p = 0,08)** · **diversión 7,12 (6,92)** · impulsivos 37,5 (37,5) · Steam Deck 0,0 (25,0) · **móvil 66,7 (50,0)** → **F 134,36 frente a 146,58 (−12,2)**. McNemar: 2 suben, 3 bajan.
- **Lectura**: la predicción se cumple (la claridad sube 0,58, lo más cerca de significativo de toda la misión; también suben diversión y móvil), pero F baja porque Steam Deck vuelve a 0 de 4: eso solo son 12,5 puntos de piso y 4,2 de aprobación. Con Steam Deck en 1 de 4, esta misma corrida daría F ≈ 151. En Steam Deck, dos de las tres personas de la escena del mando piden ahora «la fórmula completa» («×7 y 148 separados») y la tercera repite que la etiqueta del botón A «se superpone» a la carta.
- **Lecciones**: (1) la cuenta entera es un ingrediente bueno aunque esta corrida no gane: se conserva para la candidata siguiente; (2) F cuelga del voto de una persona de Steam Deck: una candidata necesita la cuenta entera **y** no perder ese voto; (3) no tocar la zona de botones para contentar al auditor de portátil: su P0 no depende de la maqueta.

### V19 · La cuenta es una fórmula entera y el foco del mando crece sin etiqueta — **aceptada** (`v19.0.0`, Campeón)

- **Hipótesis** (recombinación con causa): la 18.0 subió claridad, diversión y móvil con la cuenta entera y solo perdió por el voto de Steam Deck; allí el auditor marcaba como P0 que la etiqueta «A Elegir» «se superpone» a la carta y pedía «la fórmula completa». Si se conserva la cuenta entera, se le pone el signo igual («1.036 = Daño 148 × Multi ×7») y, con mando, la carta enfocada crece (la escala de la 17.0) **sin** etiqueta encima, se quedan las ganancias de la 18.0 y vuelve el voto de Steam Deck. Predicción: F ≈ 151 (la 18.0 con Steam Deck en 1 de 4).
- **Construida y certificada en rápido**: 365 + 9 pruebas, i18n, QA visual 236 sin fallos y 24 capturas de mesa en inglés, humo 32 de 32 (el foco por escala y A sobre la carta), 60 fps; laboratorio sin cambios (misma huella).
- **Medida** (`pulso-24-20261116-180908`, 24 pares; 26 auditorías visuales nuevas): aprobación 54,2 (54,2) · críticos 25,0 (25,0) · **claridad 6,50 (5,88; t = 2,04, p = 0,053)** · **diversión 7,17 (6,92)** · impulsivos 37,5 (37,5) · Steam Deck 25,0 (25,0) · **móvil 66,7 (50,0)** → **F 151,55 frente a 146,58 (+5,0)**; la predicción era 151. McNemar: 2 suben, 2 bajan.
- **Lectura honesta**: sube por claridad (+3,7 de F) y diversión (+1,3), no por más votos a favor (13 de 24, igual). La claridad repite la subida de la 18.0 (6,46 y 6,50 en dos corridas con la cuenta entera, frente a 5,88–6,33 sin ella): es el efecto más consistente de la misión, y aun así queda en el borde de lo significativo con 24 personas. En `mesa-mando` de Steam Deck el P0 ya no habla del foco; ahora dice que «“contra Corazones” y la fórmula están demasiado cerca del número principal».
- **Lo que sigue en contra** (11 de 24): portátil (3: arrastrar Reliquias con trackpad, contraste de un 4 de tréboles), Steam Deck (3: la cuenta apretada, el Árbol con la cruceta), móvil (2: La Taberna cortada sin desplazamiento, «Descartar»), PC (2: el aviso amarillo de la guía, leer el desglose), y la primera derrota en portátil.
- **Lecciones**: (1) recombinar lo que subió en candidatas rechazadas funciona mejor que abrir un frente nuevo cada vez; (2) predecir F antes de medir (151 predicho, 151,55 medido) es la mejor defensa contra leer ruido; (3) lo que el auditor repite en dos re-sorteos seguidos (aquí, la etiqueta pegada a la carta) sí es señal.

### V20 · La guía se escribe a tiza — **aceptada por la regla** (`v20.0.0`, Campeón), con la ganancia sin atribuir

- **Hipótesis** (estrecha: solo cambian las capturas de la guía): la placa amarilla del paso guiado es el único P0 del auditor en PC («compite violentamente con la paleta») y la misma persona de la escena de los primeros minutos (crítica dura, PC) vota en contra citándola en tres corridas seguidas. Si la placa pasa a pizarra con tiza, ese P0 desaparece y ese voto vuelve. Predicción: +1 voto de crítico (F ≈ +9).
- **Construida y certificada en rápido**: solo CSS (`guia.css`); 365 + 9 pruebas, QA visual 236 sin fallos y la guía en inglés, humo 32 de 32.
- **Medida** (`pulso-24-20261116-182218`, 24 pares; 4 auditorías visuales nuevas): aprobación 54,2 (54,2) · críticos 37,5 (25,0) · claridad 6,38 (6,50) · diversión 7,21 (7,17) · impulsivos 37,5 (37,5) · Steam Deck 50,0 (25,0) · móvil 66,7 (66,7) → **F 162,28 frente a 151,55 (+10,7)**; el piso sube de 25 a 37,5 sin bajar la aprobación. McNemar: 1 sube, 1 baja.
- **Lectura honesta**: la mitad de la predicción se cumple y la otra no. El P0 de la placa desaparece de la auditoría de PC (queda un P1: «texto chico»), pero la persona a la que apuntaba sigue votando en contra (ahora, «la instrucción es chica»). Los dos votos que cambian son ajenos al cambio: una crítica de Steam Deck pasa a favor con las mismas capturas y el mismo texto que en la 19.0, y una persona de portátil pasa a en contra. La subida de F (piso +12,5 y críticos +5) es el voto de Steam Deck: **ruido del instrumento, no efecto de la tiza**. Se acepta porque la regla de la misión lo manda y el cambio no hace daño (quita un P0 y une la guía con los Susurros), no porque haya demostrado nada.
- **Consecuencia**: el listón queda en 162,28 con Steam Deck en 2 de 4 por azar. Una candidata posterior necesita repetir ese azar o traer una mejora mayor que el ruido (±10–15 de F).
- **Lecciones**: (1) mirar quién cambia de voto antes de leer F: aquí F dice «+10,7» y la lista de votos dice «nada que ver con el cambio»; (2) quitar un P0 de la auditoría no devuelve el voto si la persona encuentra otra frase que citar; (3) la regla «F de una corrida > F del Campeón» hace de trinquete con el ruido: el listón sube con cada golpe de suerte.

### Instrumento i2 · Steam Deck se fotografía con mando y las Reliquias se describen enteras — remedida del Campeón (no es una versión)

- **Qué se corrigió**: (1) la QA visual toma la ventana de 1280×800 jugando con mando (modo mando y el foco donde lo pone la primera pulsación de la cruceta); antes, 24 de las 26 pantallas que ve el panel para Steam Deck estaban tomadas con ratón y el auditor escribía «no hay foco» donde el juego, con mando, sí lo enseña. (2) Las escenas c05 y c15 decían que las Reliquias «se reordenan arrastrando»; ahora dicen también lo que el juego ya hacía: dos clics o Mayús + flechas. Ninguna de las dos cosas cambia el juego. Al fotografiar así apareció un fallo real (en inglés, con mando y monarca, la barra se pisaba 5 px), arreglado en la 20.0.1.
- **Regla escrita antes de medir**: tras una corrección del instrumento, el listón es la remedida del Campeón con el instrumento nuevo, salga más alta o más baja.
- **Remedida** (`pulso-24-20261116-184809`; 26 auditorías nuevas, todas de Steam Deck): aprobación 45,8 · críticos 25,0 · claridad 6,21 · diversión 6,96 · impulsivos 37,5 · Steam Deck 25,0 · móvil 50,0 → **F 140,36** (la corrida original de la 20.0 dio 162,28). Votos que cambian: 1 sube, 3 bajan; uno de los que bajan es de móvil, que vio exactamente lo mismo.
- **Lectura**: las correcciones no subieron la nota (Steam Deck sigue en 1 de 4; en portátil, uno sube y otro baja). Lo que esta remedida mide de verdad es el ruido: **el mismo juego da 162 y 140 en dos corridas**. El 162,28 fue una corrida afortunada; el nivel real del Campeón está más cerca de 140–150.
- **Consecuencia para las decisiones anteriores**: con una diferencia de 22 puntos entre dos corridas del mismo juego, ninguna aceptación ni rechazo de la 13.0 a la 20.0 queda demostrado por F (los deltas fueron de −25 a +11). Lo único que se sostiene con datos repetidos es la claridad de la cuenta entera (6,46 · 6,50 · 6,38 · 6,21 en cuatro corridas con ella, frente a 5,88–6,33 en las cuatro sin ella).
- **Listón vigente**: F 140,36 (`pulso-24-20261116-184809`).
