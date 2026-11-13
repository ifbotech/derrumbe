# Registro de cambios

Todas las versiones notables de SANGRE Y PALO · BLOOD & SUITS (la 6.0 se llamó CORONA ROTA; hasta la 5.0, DERRUMBE). Las cifras de balance salen del laboratorio (`npm run analyze:meta`). Las del panel salen de una simulación: con n = 240 tienen unos ±6 puntos de ruido; con la auditoría rápida de 60 personas, unos ±12.

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
