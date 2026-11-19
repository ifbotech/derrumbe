# SANGRE Y PALO · BLOOD & SUITS

*La conjura de los naipes.* Roguelike de construcción de mazo con baraja española, en pixel-art oscuro y tramado. Diseño original:
ustedes son una conjura contra la corte de los naipes, Casa por Casa, con un enemigo a la vez delante, un Bufón que hace de anfitrión y tu Vida en juego en cada Contraataque. Para 1 a 4 jugadores.

**Dos nombres, un juego.** En un navegador en español se llama **SANGRE Y PALO** y lleva, en una cinta de lacre, el sello **BLOOD & SUITS**. En cualquier otro idioma es al revés: **BLOOD & SUITS**, con el sello de origen **SANGRE Y PALO**. Así toda captura enseña los dos nombres. Desde la 10.0 el juego entero se juega en español o en inglés (ver [Idiomas](#idiomas)), y el nombre sigue al idioma que elijas. Hasta la 6.0 se llamó `CORONA ROTA` y, antes, `DERRUMBE`. La 40.0 refundó el tema: la baraja francesa de la 38.0 sigue entera en la rama `legado/baraja-francesa-v38`.

**Jugar en el navegador:** https://ifbotech.github.io/derrumbe/ (se publica sola en cada cambio; ver [Publicar](#publicar)). La dirección y el repositorio (`ifbotech/derrumbe`) conservan el nombre de antes.

- **Campaña roguelike** en solitario o en conjura: **5 asaltos** que se juegan en unos 20 minutos, cada uno una sala del castillo, con 2, 3, 4, 4 y 4 Casas. Al cierre de los asaltos 2, 4 y 5 espera un **Rey jefe**. Entre asalto y asalto se elige camino en el **Mapa**; después del quinto sigue, si quedan ganas, el **Trono infinito**.
- **La baraja española**: del 1 al 9 de cada palo y dos Comodines; los enemigos son la Corte, **10 Sota, 11 Caballo y 12 Rey**. Una sola regla de palos: **cada Casa es Inmune a su propio palo**. Cada carta de palo trae su poder: **Bastos** +2 de Escudo, **Copas** cura 2, **Oros** salpica 2 a las Casas que esperan y **Espadas** perfora.
- **Daño × Multi = Golpe**, con el **Multi siempre entero** (de ×1 a ×4 según la formación): «25 × 4 = 100» se lee de un vistazo. Antes de golpear, la mesa enseña la cuenta en una sola barra y, si la abrís, el recibo de lo que suma cada carta y cada pieza.
- **Golpe exacto**: abatir a un guardia con el Golpe justo anula el Contraataque, paga, roba y deja **Impulso** contra el siguiente. **Dos estados**: un golpe de un solo palo deja **Expuesto** (el siguiente golpe hace ×2 de Daño); uno de tres palos deja **Aturdido** (se salta su próximo Contraataque). La **Furia** sube el Ataque si estirás el asalto.
- **5 Mazos** con reglas propias de naipes rioplatenses: **Escoba** (sumá 15), **Truco** (Envido y los bravos), **Chinchón** (pierna y escalera), **El Mentiroso** (Comodines y un Engaño por asalto) y **Chancho Va** (pasar una carta y el póker que aturde).
- **4 Reyes y sus Bendiciones**: el de Espadas, el de Bastos, el de Oros y el de Copas te ofrecen Bendiciones que **cargan** cada vez que se cumple su condición («Espadas +6»), encienden **niveles [2/4]** y, de a pares, **Bendiciones Duales**. Como jefes, te hablan según a quién elegiste.
- **22 Amuletos** en 4 familias, una por Rey, y **8 Trampas del Bufón** (las cartas especiales). Cada pieza lleva su **sello de nivel S · A · B**, que sale del laboratorio, y una **★** cuando encaja con tu Mazo o con un nivel de su Rey.
- **El Mapa de caminos**: Guardia, **Guardia Bravo**, **Santuario del Bufón**, **Fogón** (Curar o Purgar gratis) y **La Pulpería** (Amuletos, sobres, Mesa de lacre, Pergaminos, **Purgar** y **Curar** con oro). Tras cada combate, el **Botín** se cobra por partes y cada **«Elegí una»** pone tres opciones a la vista.
- **El Bufón**, anfitrión: guía con una frase los tres primeros golpes de la primera campaña (sin ventanas ni pausas; se apaga en Ajustes), se ríe de un Golpe exacto o de una Escoba, se burla de un Contraataque y tienta en los Santuarios.
- **Mesa mínima**: el enemigo activo y la fila de los que esperan, una barra de la cuenta, la mano y dos botones, **Golpear** y **Descartar**. Deshacer, AUTO y Mejor jugada van discretos en la barra de arriba.
- **Pixel-art oscuro y tramado**: naipes de papel hueso con su recuadro tradicional, la Corte de cuerpo entero, el Bufón y los Reyes en claroscuro, y la mesa, el Mapa y La Pulpería sobre una penumbra de vela. Todo texto ≥ 14 px e índices de palo a 7:1.
- **La Manga** (te guardás una carta), **Rebobinar** (una jugada por asalto en solitario) y **reinicio rápido** manteniendo R.
- **8 Reinados**, cada uno con un giro, y **sellos de maestría** en la colección.
- **Lupa**: clic derecho o pulsación larga sobre cualquier carta, Amuleto, guardia o Rey.
- **Causa de la derrota**: al perder, la Crónica dice en dos líneas qué se llevó tu Vida y por qué el Escudo no lo evitó; un aviso de último turno lo anticipa en la mesa.
- **Archivo de crónicas**: las 25 últimas campañas, con su semilla para rejugarlas, y **copia de seguridad** del progreso en un archivo.
- **Cooperativo online** con salas por código, servidor autoritativo y **señas** para proponer sin hablar.
- **Teclado y mando** de principio a fin, con un marco de foco que se ve a distancia y las indicaciones de cada botón en pantalla. En móvil, las acciones de combate van en una barra al alcance del pulgar.
- **Español e inglés**, con el conmutador **ES | EN** en la Portada y en Ajustes: cambia al instante, sin recargar, y se recuerda. **«Alto contraste»** y **«Reducir movimiento»** en Ajustes.
- **«Enviar Crónica / Feedback de Prueba»**: un botón en la Crónica y en Ajustes para mandar tu última campaña a quien te pasó el juego. Nada sale del equipo si no lo pulsás (ver [Datos de prueba y privacidad](#datos-de-prueba-y-privacidad)).

Reglas completas en [REGLAS.md](REGLAS.md) (también dentro del juego, botón **Reglas**). Solo cinco palabras tienen significado propio —Daño, Multi, Golpe exacto, Expuesto y Aturdido—; todo lo demás se dice con palabras de baraja: Vida, Escudo, Mazo, Descarte, Contraataque.

> SANGRE Y PALO comparte género con los cooperativos de naipes contra figuras, y como en ellos una Casa no recibe daño de su propio palo. Lo demás es propio: los poderes de palo por carta, Expuesto y Aturdido, la cuenta Daño × Multi = Golpe, los Mazos, los Reyes, el Bufón y la campaña no vienen de ningún otro juego.

## Uso

Requiere Node.js 20 o superior.

```bash
npm install
```

Desarrollo (servidor en :3000 + cliente con recarga en http://localhost:5173):

```bash
npm run dev
```

Producción con cooperativo (un solo proceso sirve el cliente y el WebSocket en http://localhost:3000):

```bash
npm run build
```

```bash
npm start
```

Versión estática, sin servidor (GitHub Pages, itch.io o una envoltura de escritorio): se juega entera en local y el cooperativo se conecta al servidor que se escriba en Ajustes.

```bash
npm run build:web
```

El resultado queda en `dist/web`, con rutas relativas, `manifest.webmanifest`, icono SVG y tarjeta para compartir.

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas del motor, la campaña, la Furia, los Mazos, los Reyes y sus Bendiciones, el Bufón, las palabras clave, la imprenta, el vocabulario, la marca, la paridad de los dos idiomas y el puente de escritorio (Vitest), con 500 partidas de fuzz con semilla. Va en dos pasadas: todo menos cooperativo y, después, cooperativo aparte (ver [Pruebas en Windows](#pruebas-en-windows)) |
| `npm run typecheck` | Comprobación de tipos de todo el proyecto |
| `npm run analyze:meta` | Laboratorio de balance: ~55.000 campañas con semilla (unos 25 minutos) → consola y `scripts/meta-report.json`. Con `-- foco`, `-- niveles`, `-- barajas` o `-- clasica` mide solo eso |
| `npm run balance:tune` | Afinador: busca, campo a campo y dentro de ±15 %, cambios de los números de `src/rules/balance-config.json` que acerquen el laboratorio a sus objetivos. **Solo propone** (`artifacts/balance-tune/propuesta.json` y `.md`); con `-- --aplicar` escribe en el JSON lo ya confirmado con 1.500 campañas. `-- --minutos=30` fija el presupuesto (por defecto 45); `-- --probar=ruta=valor` mide una hipótesis sin aplicarla |
| `npm run simulate` · `npm run simulate:run` | Simulaciones sueltas del Asalto único y de la campaña |
| `npm run qa:visual` | Capturas sin ventana (Playwright) de 49 estados en 4 tamaños (con ratón, con teclado y con mando), con auditoría del DOM y de la imagen: texto ≥ 14 px, cifras con placa, cero recortes, texto pisado, dianas ≥ 44 px, contraste (y 7:1 con «Alto contraste»), cara limpia de las cartas numeradas, las tres paletas de la baraja, daltonismo, placa Inmune, los dos estados, mesas de 2, 3 y 4 Casas, jerga vieja y animaciones que solo mueven `transform` y `opacity` → `artifacts/visual-qa/` y su `report.json` |
| `npm run qa:visual -- --lang=en` | Lo mismo con el juego en inglés → `artifacts/visual-qa-en/`. Añade la regla «fuga»: ningún resto de español a la vista |
| `npm run qa:smoke` | Juega de verdad en el navegador: teclado, ratón, una campaña de cinco asaltos jugada por el bot con el ratón (mide el tiempo de cada jugada), el cierre de una campaña a medias de la 10.0 y una campaña entera con un **mando virtual** (menú, asalto, reglas, ajustes, Botín, la Pulpería, Mesa de lacre, Mapa y Santuario del Bufón; descartar con L3, pantalla completa, foco, Susurros e insignias), el conmutador ES \| EN y «Alto contraste» con teclado y con mando, una segunda pasada con «Reducir movimiento» y los datos de prueba con la red cortada: cuenta las peticiones al pulsar «Enviar Crónica / Feedback de Prueba» en una compilación normal y en otra con `VITE_TELEMETRY_URL` |
| `npm run qa:smoke -- --lang=en` | La misma prueba de humo con el navegador en inglés |
| `npm run qa:fps` | Mide los fotogramas de cinco efectos (tajo, caída de un trono, lacre, monedas y barrido del foco) en 3 tamaños, con aceleración gráfica real, también la primera vez de cada uno en frío: falla si el renderizador es por software, si el p95 pasa del refresco de la pantalla o si un fotograma pasa de 50 ms → `artifacts/mision/v8/fps.json` |
| `npm run qa:audio` | Escucha sin altavoces: genera unas 3 h de música y efectos con 3 semillas y falla si un tramo de más de 30 s se repite, si un efecto suena igual más de 8 veces seguidas o si una nota sale de re menor |
| `npm run forja` | Banco del pixel-art: renderiza cada pieza suelta (palos, pintas, tramas, naipes, Amuletos, Trampas, Bendiciones, servicios, Reyes y el Bufón) a 24 y 300 px, mide su tinta y su silueta, y comprueba que los cuatro palos se distinguen sin color → `artifacts/svg-forge/` |
| `npm run og` | Regenera las tarjetas para compartir (1200 × 630): `public/og-card-es.png`, `public/og-card-en.png` y `public/og-card.png`, que es la española |
| `npm run docs` | Regenera `REGLAS.md` y las tablas de balance y controles de este archivo |

La primera vez, las órdenes que abren un navegador necesitan el de Playwright:

```bash
npx playwright install chromium
```

### Pruebas en Windows

`npm test` es `node scripts/test.mjs`: corre todo menos `tests/coop-estres.test.ts` y después esa prueba aparte. Con Node 24 en Windows, el proceso que abre las conexiones WebSocket de cliente de esa prueba se cae a veces de forma nativa (código `0xC0000409`, sin mensaje). No es el servidor del juego: con el servidor en su propio proceso no se cayó nunca, y el servidor real no abre conexiones salientes. Si la pasada de cooperativo muere con esa firma exacta, se repite, hasta tres veces. Una aserción fallida o un tiempo agotado no se repiten. En Linux no está comprobado.

Para pasar un archivo suelto, los argumentos van a Vitest tal cual: `npm test -- tests/engine.test.ts`.

### Idiomas

El juego entero está en español y en inglés: reglas, cartas, Amuletos, Reyes, el Bufón, avisos, Susurros y pantallas. El conmutador **ES | EN** está en la Portada, junto al candado, y en Ajustes («Idioma · Language»). Cambia al instante y se guarda en este equipo. La primera vez manda el idioma del navegador: español si empieza por «es», inglés en los demás.

Qué nombre ve quién: en español, **SANGRE Y PALO** con la cinta **BLOOD & SUITS**; en inglés, **BLOOD & SUITS** con la cinta **SANGRE Y PALO**. Una prueba de paridad (`tests/i18n.test.ts`) exige las mismas claves, las mismas variables y las mismas cifras en los dos idiomas. En inglés la coma decimal pasa a punto.

Lo que sigue solo en español: este archivo, [REGLAS.md](REGLAS.md), `index.html` y el manifest. El inglés no lo ha revisado todavía ningún hablante nativo; la 11.0 corrigió los 14 nombres y frases que sonaban raros, y el panel simulado, que ya lee el juego en inglés, lo entiende igual que el español.

### Escritorio y Steam

La carpeta `tauri/` trae la configuración de una envoltura de escritorio con Tauri v2, que empaqueta `dist/web`. El juego trae un puente (`src/client/platform.ts`) con seis comandos de Steam (logros, idioma, capa, presencia y guardado en la nube) que solo se activan dentro de esa envoltura; en la web no hacen nada.

Lo que **no** está hecho: la envoltura no se ha compilado nunca, el lado Rust de los comandos no está escrito y no hay cuenta de Steamworks (ni AppID, ni logros dados de alta, ni depósitos). Cómo construirla, qué falta y los pasos para publicar, en [STEAM_BUILD.md](STEAM_BUILD.md).

### Publicar

El flujo [`.github/workflows/ci-deploy.yml`](.github/workflows/ci-deploy.yml) comprueba tipos y pruebas en cada cambio y, en `main`, publica `dist/web` en GitHub Pages. Solo hay que activarlo una vez en el repositorio: **Settings → Pages → Source: GitHub Actions**. La página queda en https://ifbotech.github.io/derrumbe/.

Al compartir el enlace sale la tarjeta de `public/og-card.png` (la española; la inglesa, `public/og-card-en.png`, queda lista para quien la quiera). Si publicás el juego en otra dirección, cambiá las tres direcciones completas de las etiquetas `og:` de [index.html](index.html).

Variables al construir: `VITE_SERVER` (servidor de salas fijo para el cooperativo), `VITE_COMMUNITY_URL` (a dónde lleva «Comunidad y comentarios» en Ajustes; por defecto, los avisos de este repositorio; si apunta a los avisos de un repositorio de GitHub, aparece también «Abrir aviso») y `VITE_TELEMETRY_URL` (recolector de los datos de prueba; ver la sección siguiente).

## Cómo se juega una campaña

1. **El Mazo.** Elegís uno de los 5 (la Escoba está desde el principio; los demás se ganan con logros). Cada uno trae su Vida, su mano y sus reglas.
2. **La salida.** El Sobre lacrado mete tres Trampas del Bufón en tu Mazo, el **Don del Bufón** te da a elegir uno de tres regalos y dos Reyes te ofrecen tu primera Bendición.
3. **El asalto.** Las Casas se pelean de a una, con el enemigo activo delante. Elegís cartas y la mesa te muestra **Daño × Multi = Golpe** con sus avisos (Golpe exacto, cae el guardia, Inmune, Contraataque). En los asaltos 2, 4 y 5, el último guardia es un **Rey jefe** con su rasgo y su Furia.
4. **El Botín.** Oro, una **«Elegí una»** (Trampas o una carta sellada, una Bendición tras los asaltos de Rey) y, tras un Rey, su **Cofre**. Cada parte se cobra o se salta.
5. **El Mapa.** Antes de cada asalto, un camino de dos nodos entre Guardia, Guardia Bravo, Santuario del Bufón, Fogón y La Pulpería, que siempre queda al alcance; y otra Bendición.
6. Tras el quinto asalto, la **Crónica** se puede copiar como texto o llevarse como Lámina, y queda en el archivo. Y si quedan ganas, el **Trono infinito**.

### El Altar

Ganes o pierdas, cada campaña deja **Esquirlas de Corona**: las que caen a la mesa con cada golpe, las que multiplica la tirada de huesos y el cobro del final. Con ellas se compran nodos del **Altar**, que tiene cuatro ramas. En **El Arsenal** no se compra poder bruto: se **abren arcones**. El surtido base es corto a propósito; cuatro arcones, uno por Rey, abren el resto de los Amuletos de su familia, y la **Faja ancha** da 2 huecos más. **La Bolsa**, **Los Huesos** y **La Corona de hierro** dan más esquirlas, mejores dados y poder en el Trono infinito: no hacen la campaña más fácil. Los **logros** desbloquean los Mazos, y ganar una campaña estampa un **sello de maestría** (bronce, hierro u oro, según el Reinado) en el Mazo y en cada Amuleto que llevabas.

El **Archivo de crónicas** guarda las 25 últimas campañas: resultado, asalto y Rey, turnos, mayor Golpe, Amuletos y semilla, con un botón para **rejugar la semilla** y otro para copiar la Crónica.

En solitario, la campaña y el Altar se guardan en el dispositivo; las claves del guardado siguen siendo `derrumbe:*`, así que el progreso de antes se conserva. Desde **Ajustes** se puede **exportar el progreso** a un archivo .json e **importarlo** en otro navegador u otro equipo. Todo lo que el juego le pide a la máquina (guardar, archivos, pantalla completa, vibración, logros del sistema, enlaces, dirección del servidor) pasa por `PlatformBridge` (`src/client/platform.ts`). Dentro de la envoltura de escritorio, el juego cambia solo al puente de Tauri (ver [Escritorio y Steam](#escritorio-y-steam)).

### Jugar con amigos

1. Uno crea una sala y comparte el código de 4 letras o el enlace (`/?sala=ABCD`).
2. Los demás se unen; el anfitrión elige entre un Asalto único y una campaña, y empieza.
3. Si alguien se desconecta puede volver recargando la página; mientras tanto un bot juega su turno.

En campaña cooperativa el Mazo, el oro y los Amuletos son compartidos y decide el anfitrión; los demás **hacen señas** sobre lo que proponen (un trono, una ruta, una oferta) y sus iniciales aparecen encima para toda la conjura. En sala no hay Rebobinar: toda jugada es definitiva.

Para jugar por internet hay que publicar el puerto del servidor (un VPS, Fly.io, Render, Railway… o un túnel). Con Docker:

```bash
docker build -t sangre-y-palo .
```

```bash
docker run -p 3000:3000 sangre-y-palo
```

Detrás de un proxy inverso, recordá permitir la actualización a WebSocket en la ruta `/ws`.

### Controles

Los botones de la mesa enseñan su atajo: la tecla si jugás con teclado, el botón del mando si lo último que tocaste fue un mando.

<!-- controles:inicio -->
| Acción | Teclado y ratón | Mando |
|---|---|---|
| Mover el foco | Flechas | Cruceta o palanca izquierda |
| Elegir | Enter · 1–9 en la mano · clic | A |
| Golpear al enemigo activo | Espacio · clic en el trono | X |
| Guardar en La Manga | Y | Y |
| Mejor jugada (elige; no golpea) | Q | LT |
| Rebobinar (deshacer) | Z | R3 (pulsar la palanca derecha) |
| Descartar lo elegido | Supr | L3 (pulsar la palanca izquierda) |
| Atrás / soltar la selección | Esc | B |
| Ver el Mazo y el Descarte | Tab | LB |
| Lupa | L · clic derecho · pulsación larga | RB |
| Cambiar la velocidad (1× → 2× → 4× → 8×) | botón de la barra | RT |
| AUTO: encender o apagar | A | Select |
| Saltar la tirada de huesos | Cualquier tecla | Cualquier botón |
| Altar: elegir un nodo y comprarlo | Enter en el nodo · Enter en Comprar | A en el nodo · A en Comprar |
| Altar: alejar / ampliar | − / + | LT / RT |
| Altar: mover la vista | Arrastrar · Mayús + flechas | Palanca derecha |
| Pantalla completa | F | Start → Ajustes → Pantalla completa |
| Reiniciar la campaña | Mantener R | Mantener Select + Start |
| Ajustes | botón de la barra | Start |
<!-- controles:fin -->

## Datos de prueba y privacidad

Para quien prueba el juego con amigos y familia. Lo hace `src/client/telemetry.ts`; lo comprueban `tests/telemetria.test.ts` y la prueba de humo con la red cortada.

**Qué se guarda.** Al jugar, el juego apunta un registro pequeño por campaña (unos 0,7 kB). Se guarda **solo en este equipo**, en la clave `derrumbe:telemetria` del navegador (o de la envoltura de escritorio), y solo las **10 últimas** entradas. Cada registro tiene una lista cerrada de campos, y nada más:

- versión del juego y **día** (`AAAA-MM-DD`, sin hora);
- modo (campaña o sala) y cuántos jugadores había en la mesa;
- baraja, Reinado, semilla, resultado, asalto alcanzado y turnos;
- **picos de duda**: en qué asalto la primera jugada de un turno tardó más de 8 s y más del doble de tu mediana;
- Amuletos ofrecidos, elegidos y saltados (por su `id`);
- veces que usaste La Manga y Rebobinar;
- la causa de la derrota (la misma que enseña la Crónica);
- con qué jugaste (ratón, táctil, teclado o mando) y el tamaño de la ventana, redondeado a 10 px.

**Qué no se guarda nunca**: tu nombre ni el de nadie, el código de la sala, texto escrito por vos, la hora, ni ningún identificador que te reconozca de una partida a otra.

**Cómo verlo y borrarlo.** En **Ajustes → Datos de prueba** se lee cuántas campañas hay y cuánto ocupan. «Ver» enseña el JSON tal cual, sin retocar. «Borrar» elimina la clave entera. Borrar los datos del sitio en el navegador también lo borra.

**Qué sale del equipo.** Nada, salvo que se cumplan **las dos** cosas: la versión se construyó con `VITE_TELEMETRY_URL` **y** pulsás «Enviar Crónica / Feedback de Prueba». No hay envío en segundo plano, ni al cerrar, ni con temporizadores. La línea de Ajustes dice qué hace tu versión:

- **Sin `VITE_TELEMETRY_URL`** (la versión publicada): «Nada sale de este equipo: el botón copia o descarga». Al pulsar, copia al portapapeles un resumen de 6 líneas como mucho (marca y versión, resultado, asalto, causa, La Manga y Rebobinar, y un enlace con la semilla) y descarga `sangre-y-palo-feedback-AAAA-MM-DD.json` con el registro de tu última campaña. En un móvil que lo permita, abre la hoja de compartir y elegís vos a quién. Lo mandás vos, por donde quieras.
- **Con `VITE_TELEMETRY_URL`**: cada pulsación hace **una** petición POST a esa dirección con el registro de tu última campaña, y nada más. Si falla, el botón hace lo mismo que sin la variable. Como en cualquier petición web, el recolector ve la dirección IP de quien la manda: el juego no la añade ni la guarda.
- **«Abrir aviso»** (si `VITE_COMMUNITY_URL` apunta a los avisos de un repositorio de GitHub) abre la página de aviso nuevo con el resumen ya escrito. No se manda nada hasta que lo publicás vos allí.

**Para quien despliega un recolector.** Construí con la variable:

```bash
VITE_TELEMETRY_URL=https://tu-recolector.example/recoger npm run build:web
```

En PowerShell: `$env:VITE_TELEMETRY_URL="https://tu-recolector.example/recoger"; npm run build:web`.

El recolector recibe un POST cuyo cuerpo es el JSON del registro, enviado **como texto** (sin cabecera `Content-Type: application/json`; el navegador pone `text/plain`), así que no hay petición previa de CORS. Tiene que:

- aceptar `POST` y leer el cuerpo como texto (menos de 5 kB);
- responder con un código 2xx y la cabecera `Access-Control-Allow-Origin` con el origen del juego (o `*`). Sin esa cabecera el navegador no deja leer la respuesta: el registro puede llegar, pero el juego cree que falló y además copia y descarga.

Es para pruebas con gente de confianza: no hay cuentas, ni clasificaciones, ni forma de unir dos registros de la misma persona.

## Balance

<!-- balance:inicio -->
Medido con `npm run analyze:meta`: **47.680 campañas** con semilla jugadas por el bot de referencia (camino en el Mapa, Botín y «Elegí una», la Pulpería, Mesa de lacre, Santuarios del Bufón, la Manga y orden de los Amuletos). El informe completo —cada Amuleto, Trampa, Bendición, sello de lacre y acabado— queda en [scripts/meta-report.json](scripts/meta-report.json). Cada porcentaje es una muestra: con 1.500 campañas, el margen es de unos ±2,5 puntos, así que dos medidas que difieran menos que eso no se distinguen.

Campañas ganadas por Reinado (con la Escoba, 1500 campañas por celda). Objetivos: Reinado 1 entre el 28 y el 34 % con el Altar vacío y entre el 42 y el 50 % con el Altar lleno; Reinado 8 entre el 6 y el 10 % con el Altar vacío y entre el 12 y el 18 % con el Altar lleno; y cada Reinado, más difícil que el anterior.

| Reinado | Altar vacío | Altar lleno |
|---|---|---|
| 1 · Reinado de paz | 29,3 % | 48,4 % |
| 2 · Corazas finas | 29 % | 44,4 % |
| 3 · Corte airada | 23,2 % | 40,3 % |
| 4 · Reyes acorazados | 19,6 % | 38,2 % |
| 5 · Rey colérico | 17,4 % | 36,2 % |
| 6 · Heridas viejas | 14,6 % | 31,3 % |
| 7 · Guardia de noche | 11,2 % | 22,8 % |
| 8 · Puertas selladas | 8,5 % | 16,9 % |

Por Mazo (Reinado 1, 1500 campañas por celda). Objetivo: todas entre el 28–34 % con el Altar vacío y entre el 42–50 % con el Altar lleno (el informe avisa fuera de 28–34 y de 40–50).

| Mazo | Altar vacío | Altar lleno | Lo que suma el Altar |
|---|---|---|---|
| Escoba | 29,3 % | 48,4 % | +19,1 |
| Truco | 30,8 % | 46,5 % | +15,7 |
| Chinchón | 30,6 % | 44,7 % | +14,1 |
| El Mentiroso | 30 % | 47 % | +17 |
| Chancho Va | 31,7 % | 48,4 % | +16,7 |

Reyes jefe: de cada vez que una campaña llega a uno, cuántas acaban ahí (media 18,3 %). Objetivo: todos entre 0,8× y 1,25× de la media.

| Rey jefe | Letalidad | Frente a la media |
|---|---|---|
| El Rey de Espadas | 18,1 % | ×0,99 |
| El Rey de Bastos | 20,7 % | ×1,13 |
| El Rey de Oros | 16,9 % | ×0,92 |
| El Rey de Copas | 17,5 % | ×0,96 |

Turnos por asalto. Objetivo: asalto 1 de 3 a 5 turnos de mediana (P95 ≤ 8); asaltos 2 y 3 de 7 a 11 (P95 ≤ 16); asaltos 4 y 5 de 8 a 12 (P95 ≤ 19), con cualquier Mazo (peor P95 ≤ 19).

| Asalto | Mediana | P95 | Jugadas (mediana) |
|---|---|---|---|
| 1 · El Puente levadizo | 5 | 7 | 8 |
| 2 · El Patio de armas | 9 | 13 | 14 |
| 3 · La Cripta | 9 | 13 | 14 |
| 4 · La Galería real | 10 | 14 | 15 |
| 5 · El Salón del Trono | 10 | 15 | 15 |

Un turno es una jugada que recibe el Contraataque; las jugadas cuentan también la que abate y las que no gastan el turno. Duración estimada de la campaña: 19,2 minutos (objetivo 18–22; 12 s por jugada).

Peor percentil 95 de los 5 asaltos, por Mazo: Escoba 14 · Truco 15 · Chinchón 15 · El Mentiroso 14 · Chancho Va 17.

Asalto único (1500 partidas por celda; objetivo 58–65 %): 1 jugador 61,1 % · 2 jugadores 64,2 % · 3 jugadores 62,5 % · 4 jugadores 61,5 %.

El informe no deja ningún aviso: todos los objetivos se cumplen en la muestra.
<!-- balance:fin -->

El objetivo es un progreso **horizontal**: una cuenta nueva ya gana más de una de cada cuatro campañas, y el Altar completo sube ese número ampliando opciones, no multiplicando estadísticas.

## El estudio

Desde la 5.0 el juego se hace con un pequeño estudio de agentes de Claude Code, cada uno dueño de sus archivos:

| Subagente (`.claude/agents/`) | Qué es suyo |
|---|---|
| `director` | `ROADMAP_V5_V10.md`, `ROADMAP_V11.md`, `SPECS/`, `CHANGELOG.md`, `STEAM_BUILD.md`, la prosa de este archivo y la decisión de publicar o apartar una versión |
| `reglas-balance` | `src/rules/`, la marca (`src/shared/brand.ts`), el laboratorio (`scripts/analyze-meta.ts`), el reglamento y `tests/`; vigila la constitución anticomplejidad |
| `arte-ui` | estilos, maquetación, pixel-art en SVG (naipes, pintas, la Corte, Reyes, Amuletos y el Bufón), textos de pantalla, la QA visual y el banco del pixel-art |
| `juice-ux` | mando y teclado, Susurros, el Bufón vivo, la voz de los Reyes, efectos, sonido, la red del cooperativo y la prueba de humo |

Cinco habilidades (`.claude/skills/`) recogen el oficio que se repite: `brutalist-print-ui` (reglas de imprenta), `engraving-svg-forge` (dibujar y comprobar el arte), `playwright-deck-qa` (QA en las cuatro ventanas y con mando virtual), `regicide-synergy-math` (laboratorio e invariantes) y `autonomous-sprint-loop` (el bucle de versiones).

**Constitución anticomplejidad** (desde la 11.0), comprobada por `npm test`: como mucho 5 palabras clave, de 20 a 24 Amuletos en 4 familias y 8 Trampas, ninguna descripción de más de 115 caracteres en español ni en inglés, el Multi siempre entero y ningún asalto con su percentil 95 de turnos por encima de los topes de `scripts/objetivos.ts`.

La hoja de ruta de la 6.1 a la 10.0 está en [ROADMAP_V5_V10.md](ROADMAP_V5_V10.md) y la de la 11.0, con lo que queda después, en [ROADMAP_V11.md](ROADMAP_V11.md); hay una especificación por versión en [SPECS/](SPECS/). Desde la 6.1 cada versión se hace por celdas, de una en una y en el orden que fija su especificación, sobre la rama `release/v{n}`; cada celda deja su señal de fin en `artifacts/mision/v{n}/`. El panel simulado audita con 60 personas la 6.1, la 7.0, la 8.0 y la 9.0, con las 240 la V10, y con las 60 la 11.0, en español y en inglés. Qué cambió de la 4.0 a la 10.0, con las cifras del panel y del laboratorio y una guía para probar el juego con amigos y familia: [EVOLUCION_V4_V10.md](EVOLUCION_V4_V10.md); de la 10.0 a la 11.0: [EVOLUCION_V11.md](EVOLUCION_V11.md). El guion por lotes de la 5.0 sigue disponible; para ver su plan sin tocar nada:

```powershell
.\scripts\estudio-autonomo.ps1 -Ensayo
```

```powershell
.\scripts\estudio-autonomo.ps1
```

Por cada versión abre una rama, lanza una sesión por celda de la especificación, pasa las puertas de CPU (`typecheck`, `test`, `analyze:meta`, `docs`, `qa:visual`, `qa:smoke`), audita el commit candidato con un panel **simulado** de jugadores en `..\panelAgentesGaming` (preset `v6-completo`, 240 personas) y compara aprobación y claridad con la versión anterior: si no empeora, fusiona y etiqueta; si empeora, `main` queda como estaba y la rama se aparta. La línea base del panel es la auditoría de 60 personas de la 6.1: ni la 5.0 ni la 6.0 se midieron. Con `-Publicar`, además, sube cada versión aceptada. El panel ordena prioridades; no sustituye a jugadores de verdad.

## Arquitectura

```
src/
  rules/        Motor de reglas puro, determinista y sin dependencias
    balance-config.json · balance-config.ts   los 244 números que se afinan (asaltos, Reinados, Reyes, Mazos, precios, Amuletos…), con tipos
    engine.ts     estado, acciones, golpe (Daño × Multi), Furia, La Manga, Rebobinar, eventos, vista por jugador
    state-hash.ts resumen determinista de una vista, para que el cooperativo detecte una mesa desincronizada
    tools.ts      los 22 Amuletos
    specials.ts   las 8 Trampas del Bufón (cartas especiales)
    mazos.ts      los 5 Mazos y sus reglas
    reyes.ts      los 4 Reyes, sus Bendiciones, cargas, niveles [2/4] y Duales
    mapa.ts       el Mapa de caminos (Guardia, Bravo, Santuario, Fogón, Pulpería)
    keywords.ts   las cinco palabras clave y cómo se marcan en los textos
    autopsy.ts    causa de la derrota (qué se llevó tu Vida) y aviso de último turno
    run.ts        campaña (reductor): los cinco asaltos, Mapa, Botín y «Elegí una», la Pulpería, el Fogón, Santuarios del Bufón, Reinados, el Altar
    migracion.ts  lo que hereda un guardado de la 10.0: abono de la campaña a medias, récords sobre 5 y actas «de 8»
    achievements.ts  logros, colección y lo que desbloquean
    bot.ts        bot de asalto y de campaña (simulación y sustituto de desconectados)
    bufon.ts      los tres consejos del Bufón y cuándo los dice
  shared/
    brand.ts      la marca dual: el único sitio donde se escriben los dos títulos
    i18n.ts · i18n/   idioma (getLang, setLang, t, numFor) y los diccionarios de español e inglés
    protocol.ts   protocolo de mensajes cliente ⇄ servidor
  server/       Node + ws: salas, turnos, reconexión, señas, estáticos
  client/       Vite + TypeScript + CSS/SVG
    core.ts · platform.ts · net.ts · router.ts   estado, puente con la plataforma, conexión
    home.ts · lobby.ts · guild.ts                portada, vestíbulo, Altar, colección y Archivo de crónicas
    campaign.ts · runscreens.ts                  motor de campaña del cliente y sus pantallas (mapa, Botín, la Pulpería, Mesa de lacre)
    table.ts                                     mesa de combate (el enemigo activo y la fila, placa Inmune, Furia)
    guia.ts · voces.ts                           el Rey jefe y su rasgo en la mesa, y su voz
    cuenta.ts · causa.ts · lamina.ts             cuenta central y su recibo, causa de la derrota, Lámina de la Crónica y enlace con semilla
    whispers.ts                                  Susurros contextuales
    nav.ts · prompts.ts                          foco para teclado y mando, e indicaciones de cada botón
    lupa.ts · flavor.ts · pings.ts               Lupa, epígrafes, señas
    widgets.ts · backup.ts · fx.ts               Amuletos, visor de Mazo y Descarte, ajustes, copia de seguridad, efectos
    card.ts · art.ts · glyphs.ts · engraving.ts  dibujo en SVG (el pixel-art vive en `pixel/`): naipes, retratos, iconos y tramas
    tinta.ts                                     aviso de tinta desvanecida en las cajas con desplazamiento
    audio.ts · audio-frases.ts                   efectos y música sintetizados, con mezcla y máster; el generador de frases con semilla
    telemetry.ts                                 datos de prueba locales y el botón «Enviar Crónica / Feedback de Prueba»
    qa.ts · forja-qa.ts                          estados fijos para las capturas y el banco del pixel-art (solo con ?qa)
tests/          Vitest: motor, campaña, Furia y Escudo, Mazos, Reyes, golpe único, autopsia, el Bufón, palabras clave, invariantes anticomplejidad, imprenta, vocabulario, marca, balance-config, afinador, datos de prueba y cooperativo con WebSocket de verdad
scripts/        Laboratorio de balance y afinador, control de calidad (capturas, humo, mando virtual), el banco del pixel-art, tarjeta social y reglamento
tauri/          Envoltura de escritorio (Tauri v2): configuración, sin compilar (ver STEAM_BUILD.md)
```

- **Motor determinista.** Semilla + lista de acciones reproducen cualquier partida y cualquier campaña, decisión a decisión. Las pruebas lo comprueban con 500 partidas de fuzz.
- **Servidor autoritativo.** El cliente solo envía intenciones; el servidor valida con el motor y difunde el resultado, con un resumen de cada estado: si el del cliente no cuadra, pide la mesa entera. Las señas son solo señales: no deciden nada. Si alguien se corta, un bot juega su turno y, al volver, recupera su mano y su Manga (`tests/coop-estres.test.ts`: 50 partidas con un corte, 0 desincronizaciones).
- **Balance en un archivo.** Los números que se afinan viven en `src/rules/balance-config.json`; las descripciones con cifras se rellenan desde ellos. Sacarlos del código no cambió ni una partida: el laboratorio salió idéntico.
- **Información oculta.** Cada jugador recibe únicamente su mano y su Manga (`viewFor`) y sus propias cartas robadas o guardadas (`eventsFor`). La campaña de una sala viaja sin el estado del azar ni la semilla (`publicRun`).
- **Animación por eventos.** Cada golpe produce una lista de eventos que el cliente encola y anima; las reglas no saben nada de lo visual.
- **Marca en un solo sitio.** Las dos caras de la marca (título, sello y lema de cada idioma) salen de `src/shared/brand.ts`, que elige la cara por el idioma del navegador; `index.html` y el manifest, que son estáticos, lo llevan escrito, y `tests/marca.test.ts` falla si no casan. Los identificadores internos (`id` de datos, clases CSS, protocolo, claves `derrumbe:*`) no cambiaron con el tema.
- **Mando.** `nav.ts` lee el mando estándar del W3C (cruceta, palanca con zona muerta de 0,28, repetición a los 320 ms y cada 110 ms) y lo traduce a las mismas acciones que el teclado. La prueba de humo inyecta un mando virtual y juega una campaña entera con él.
- **Pixel-art.** Todo el arte es SVG a celda entera (`shape-rendering="crispEdges"`, sin degradados ni alfa), con tramado Bayer, punteado y rayado, paleta híper-saturada con sombras al violeta y una sola luz de arriba a la izquierda (`src/client/pixel/`). Los naipes llevan papel hueso, el recuadro tradicional de cada palo y las pintas en su disposición de siempre; la Corte va de cuerpo entero. Lo que se mueve solo cambia `transform` y `opacity`.
- **Sonido.** Sin archivos de audio: efectos y música se sintetizan con WebAudio, con buses separados, compresor y reverberación corta. Un generador puro con semilla (`audio-frases.ts`) escribe la partitura compás a compás, en re menor, con motivos propios en cada asalto y en el Mapa, La Pulpería y la portada; el WebAudio solo la toca. La música gana tambores y metales ante un Rey jefe o cuando tu Vida está en apuros, y la campana del Golpe exacto sube un semitono por cada exacto seguido.

Todo el stack es open source: TypeScript, Vite, ws, Vitest, esbuild, Playwright y las tipografías Cinzel (los títulos), UnifrakturCook, Grenze Gotisch, Archivo, Archivo Black y Space Mono (OFL).

## Licencia

MIT.
