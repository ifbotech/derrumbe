# SANGRE Y PALO · BLOOD & SUITS

*La conjura de los naipes.* Roguelike de construcción de mazo con baraja francesa clásica y estética de grabado brutalista. Diseño original:
sois una conjura contra una corte de naipes, con cuatro tronos que derribar, doce guardias que abatir y tu Vida en juego en cada Contraataque. Para 1 a 4 jugadores.

**Dos nombres, un juego.** En un navegador en español se llama **SANGRE Y PALO** y lleva, en una cinta de lacre, el sello **BLOOD & SUITS**. En cualquier otro idioma es al revés: **BLOOD & SUITS**, con el sello de origen **SANGRE Y PALO**. Así toda captura enseña los dos nombres. El resto de la interfaz sigue en español hasta la 10.0. Hasta la 6.0 se llamó `CORONA ROTA` y, antes, `DERRUMBE`.

**Jugar en el navegador:** https://ifbotech.github.io/derrumbe/ (se publica sola en cada cambio; ver [Publicar](#publicar)). La dirección y el repositorio (`ifbotech/derrumbe`) conservan el nombre de antes.

- **Campaña roguelike** en solitario o en conjura: 8 asaltos cortos y tensos (de 6 a 12 turnos), cada uno una sala del castillo, con los monarcas anunciados en el **Mapa del castillo**, rutas con **Juramento**, **La Taberna**, **Secretos de la cripta** y un **Trono infinito** sin final.
- **Daño × Multi = Golpe**: cada golpe se resuelve paso a paso, de izquierda a derecha. Antes de darlo, la mesa enseña el **Golpe en grande** con sus avisos (¡Exacto!, cae el guardia, ventaja, Inmune) y, si lo pides, el **recibo**: Base + Cartas + Reliquias × Multi = Golpe.
- **La baraja manda**: cartas solas, formaciones de póker y el **As cómplice**. Los cuatro palos —**Picas, Diamantes, Corazones y Tréboles**— tienen su poder (Perfora, Salpica, Cura, Escudo), la **rueda de palos** (♠ → ♦ → ♥ → ♣ → ♠) está siempre a la vista y cada trono lleva su **escudo de armas** de inmunidad.
- **Golpe exacto**: abatir a un guardia con el Golpe justo anula el Contraataque, paga, roba y deja **Impulso** contra el guardia siguiente.
- **Asedio final**: ningún asalto se eterniza. A partir del turno 9, tus golpes llevan más Multi y los Contraataques pegan más: todo acaba en un crescendo.
- **Reliquias** reordenables (52, en 4 rarezas —Común, Rara, Noble y Regia— y 7 familias). La familia **Escudo y réplica** cobra la defensa en Golpe: el Escudo se vuelve Daño, lo que frena se devuelve y lo que sobra, cura.
- **La Manga** (te guardas una carta), **Rebobinar** (deshacer una jugada por asalto en solitario) y **reinicio rápido** manteniendo R.
- **8 Reinados**, cada uno con un giro, y **sellos de maestría** en la colección.
- **Lupa**: clic derecho o pulsación larga sobre cualquier carta, reliquia, guardia o monarca.
- **Causa de la derrota**: al perder, la Crónica dice en dos líneas qué se llevó tu Vida y por qué el Escudo no lo evitó; un aviso de último turno lo anticipa en la mesa.
- **Archivo de crónicas**: las 25 últimas campañas, con su semilla para rejugarlas. Cada Crónica se descarga o se copia como **Lámina** de grabado, con un enlace (`?seed=…`) que carga esa misma campaña. Y **copia de seguridad** del progreso en un archivo.
- **Cooperativo online** con salas por código, servidor autoritativo y **señas** para proponer sin hablar.
- **Teclado y mando** de principio a fin, sin acciones huérfanas (descartar, reordenar las reliquias y pantalla completa también con mando), con un marco de foco que se ve a distancia y las indicaciones de cada botón en pantalla. En móvil, las acciones de combate van en una **barra al alcance del pulgar**.
- **Imprenta legible**: ningún texto por debajo de 13 px, ninguna cifra en letra de título y cada palo con su **trama de grabado** (rayado diagonal de lanzas, punteado de gemas, hiladas de cáliz, rayado cruzado heráldico), para distinguirlos sin el color.
- **Asalto diario** con la misma semilla para todo el mundo, **semilla personalizada** y **partida guiada** con la Maestra. Ocho **Susurros** saltan la primera vez que te encuentras cada cosa (trono Inmune, La Manga, Golpe exacto, Mesa de lacre, Atajo, monarca, Asedio final, Mazo bajo), con «No mostrar más» a un clic.

Reglas completas en [REGLAS.md](REGLAS.md) (también dentro del juego, botón **Reglas**). Solo seis palabras tienen significado propio —Daño, Multi, Golpe exacto, Brecha, En guardia y Desarmado—; todo lo demás se dice con palabras de baraja: Vida, Escudo, Mazo, Descarte, Contraataque.

> SANGRE Y PALO comparte género con los cooperativos de baraja francesa, pero sus reglas son propias: los poderes de palo, la rueda de palos (♠ corta ♦ · ♦ compra ♥ · ♥ doblega ♣ · ♣ quiebra ♠), la cuenta Daño × Multi = Golpe, las Reliquias y la campaña no vienen de ningún otro juego.

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
| `npm test` | Pruebas del motor, la campaña, el Asedio final, la partida guiada, las palabras clave, la imprenta, el vocabulario y la marca (Vitest), con 500 partidas de fuzz con semilla |
| `npm run typecheck` | Comprobación de tipos de todo el proyecto |
| `npm run analyze:meta` | Laboratorio de balance: ~55.000 campañas con semilla (unos 25 minutos) → consola y `scripts/meta-report.json`. Con `-- foco`, `-- niveles`, `-- barajas` o `-- clasica` mide solo eso |
| `npm run simulate` · `npm run simulate:run` | Simulaciones sueltas del Asalto único y de la campaña |
| `npm run qa:visual` | Capturas sin ventana (Playwright) de 28 estados en 4 tamaños (con ratón, con teclado y con mando), con auditoría del DOM: texto ≥ 13 px, cifras con placa, cero recortes, texto pisado, dianas ≥ 44 px, contraste, tramas de palo y jerga vieja → `artifacts/visual-qa/` y su `report.json` |
| `npm run qa:smoke` | Juega de verdad en el navegador: teclado, ratón y una campaña entera con un **mando virtual** (menú, asalto, reglas, ajustes, Botín, la Taberna, Mesa de lacre y Secreto de la cripta; descartar con L3, reordenar las reliquias con LB/RB también en combate, pantalla completa con R3, foco, Susurros e insignias) |
| `npm run forja` | Banco de grabado: renderiza cada pieza del arte suelta (palos, tramas, cartas, reliquias, especiales, servicios, monarcas) a 24 y 300 px, mide su tinta y su silueta, y comprueba que los cuatro palos se distinguen sin color → `artifacts/svg-forge/` |
| `npm run og` | Regenera la tarjeta para compartir (`public/og-card.png`, 1200 × 630) |
| `npm run docs` | Regenera `REGLAS.md` y las tablas de balance y controles de este archivo |

La primera vez, las órdenes que abren un navegador necesitan el de Playwright:

```bash
npx playwright install chromium
```

### Publicar

El flujo [`.github/workflows/ci-deploy.yml`](.github/workflows/ci-deploy.yml) comprueba tipos y pruebas en cada cambio y, en `main`, publica `dist/web` en GitHub Pages. Solo hay que activarlo una vez en el repositorio: **Settings → Pages → Source: GitHub Actions**. La página queda en https://ifbotech.github.io/derrumbe/.

Al compartir el enlace sale la tarjeta de `public/og-card.png`. Si publicas el juego en otra dirección, cambia las tres direcciones completas de las etiquetas `og:` de [index.html](index.html).

Variables al construir: `VITE_SERVER` (servidor de salas fijo para el cooperativo) y `VITE_COMMUNITY_URL` (a dónde lleva «Comunidad y comentarios» en Ajustes; por defecto, los avisos de este repositorio).

## Cómo se juega una campaña

1. **El Sobre lacrado.** Empiezas con una baraja inicial y tres cartas especiales.
2. **El Mapa del castillo.** Enseña los ocho asaltos y, desde el principio, qué monarca espera en cada uno. En los asaltos sin monarca eliges **ruta** —cada una con un **Juramento**— o tomas el **Atajo** y te lo saltas a cambio de un **Atajo de conspirador**.
3. **El asalto.** Eliges cartas y la mesa te enseña **Daño × Multi = Golpe** contra cada trono, con sus avisos (Golpe exacto, Escudo, Contraataque, si la jugada se puede rebobinar). Al golpear, cada carta, sello de lacre, acabado y reliquia se activa en orden. Si el asalto se alarga, el **Asedio final** sube las apuestas para los dos lados.
4. **El Botín.** Oro con interés, el resultado del Juramento y **una de tres opciones a la vista** para el Mazo. Los monarcas dejan una reliquia.
5. **La Taberna.** El Tratante vende reliquias en su placa (según la rareza), Sobres lacrados, Pergaminos, la **Mesa de lacre**, **La hoguera** y «Renovar mesa».
6. **Secretos de la cripta** tras cada monarca intermedio: dilemas con premio y precio.
7. Tras el octavo asalto, la **Crónica** se puede copiar como texto o llevarse como Lámina, y queda en el archivo. Y si quedan ganas, el **Trono infinito**.

### La Orden

Ganes o pierdas, cada campaña deja **Coronas**. En La Orden no se compra poder bruto: se **abren arcones**. El surtido base es corto a propósito; seis Arcones de la Orden abren el resto de las reliquias, cada uno con su manera de jugar (precisión, eco, alquimia, filo, cenizas y escudo). Los **logros** desbloquean barajas iniciales y cartas legendarias, y ganar una campaña estampa un **sello de maestría** (bronce, hierro u oro, según el Reinado) en la baraja y en cada reliquia que llevabas.

El **Archivo de crónicas** guarda las 25 últimas campañas: resultado, asalto y monarca, turnos, mayor Golpe, reliquias y semilla, con un botón para **rejugar la semilla** y otro para copiar la Crónica.

En solitario, la campaña y La Orden se guardan en el dispositivo; las claves del guardado siguen siendo `derrumbe:*`, así que el progreso de antes se conserva. Desde **Ajustes** se puede **exportar el progreso** a un archivo .json e **importarlo** en otro navegador, otro equipo o la versión de escritorio. Todo lo que el juego le pide a la máquina (guardar, archivos, pantalla completa, vibración, logros del sistema, enlaces, dirección del servidor) pasa por `PlatformBridge` (`src/client/platform.ts`): una envoltura de escritorio solo tiene que llamar a `setPlatform()` con la suya.

### Jugar con amigos

1. Uno crea una sala y comparte el código de 4 letras o el enlace (`/?sala=ABCD`).
2. Los demás se unen; el anfitrión elige entre un Asalto único y una campaña, y empieza.
3. Si alguien se desconecta puede volver recargando la página; mientras tanto un bot juega su turno.

En campaña cooperativa el Mazo, el oro y las reliquias son compartidos y decide el anfitrión; los demás **hacen señas** sobre lo que proponen (un trono, una ruta, una oferta) y sus iniciales aparecen encima para toda la conjura. En sala no hay Rebobinar: toda jugada es definitiva.

Para jugar por internet hay que publicar el puerto del servidor (un VPS, Fly.io, Render, Railway… o un túnel). Con Docker:

```bash
docker build -t sangre-y-palo .
```

```bash
docker run -p 3000:3000 sangre-y-palo
```

Detrás de un proxy inverso, recuerda permitir la actualización a WebSocket en la ruta `/ws`.

### Controles

Los botones de la mesa enseñan su atajo: la tecla si juegas con teclado, el botón del mando si lo último que tocaste fue un mando.

<!-- controles:inicio -->
| Acción | Teclado y ratón | Mando |
|---|---|---|
| Mover el foco | Flechas | Cruceta o palanca izquierda |
| Elegir | Enter · 1–9 en la mano · clic | A |
| Golpear el trono apuntado | Espacio · clic en el trono | X |
| Guardar en La Manga | Y | Y |
| Rebobinar (deshacer) | Z | LT |
| Descartar lo elegido | Supr | L3 (pulsar la palanca izquierda) |
| Atrás / soltar la selección | Esc | B |
| Saltar la partida guiada (sin nada elegido) | Esc | B |
| Ver el Mazo y el Descarte | Tab | LB |
| Lupa | L · clic derecho · pulsación larga | RB |
| Reordenar las reliquias | Arrastrar · Mayús + flechas | LB / RB con el foco en la reliquia |
| Cambiar la velocidad (1× → 2× → 4×) | botón de la barra | RT |
| Pantalla completa | F | R3 (pulsar la palanca derecha) |
| Reiniciar la campaña | Mantener R | Mantener Select |
| Ajustes | botón de la barra | Start |
<!-- controles:fin -->

## Balance

<!-- balance:inicio -->
Medido con `npm run analyze:meta`: **55.640 campañas** con semilla jugadas por el bot de referencia (rutas, Juramentos, selección, la Taberna, Mesa de lacre, Secretos de la cripta, la Manga y orden de las reliquias). El informe completo —cada reliquia, carta especial, sello de lacre y acabado— queda en [scripts/meta-report.json](scripts/meta-report.json). Cada porcentaje es una muestra: con 1.500 campañas, el margen es de unos ±2,5 puntos, así que dos medidas que difieran menos que eso no se distinguen.

Campañas ganadas por Reinado (baraja de la conjura, 1500 campañas por celda). Objetivos: Reinado 1 entre el 24 y el 30 % con la Orden vacía y entre el 40 y el 48 % con la Orden llena; Reinado 8 entre el 6 y el 9 % con la Orden vacía y entre el 12 y el 17 % con la Orden llena; y cada Reinado, más difícil que el anterior.

| Reinado | Orden vacía | Orden llena |
|---|---|---|
| 1 · Reinado de paz | 29,7 % | 45,1 % |
| 2 · Corazas finas | 25,6 % | 41,5 % |
| 3 · Impuesto real | 23,5 % | 35,9 % |
| 4 · Reyes en guardia | 18,3 % | 34,3 % |
| 5 · Rey colérico | 14,1 % | 29,1 % |
| 6 · Heridas viejas | 12,3 % | 24,9 % |
| 7 · Guardia de noche | 7,9 % | 16,9 % |
| 8 · Puertas selladas | 6,8 % | 15,3 % |

Por baraja inicial (Reinado 1, 1500 campañas por celda). Objetivo: todas entre el 24 y el 31 % sin la Orden y entre el 40 y el 45 % con ella.

| Baraja | Orden vacía | Orden llena | Lo que suma la Orden |
|---|---|---|---|
| Baraja de la conjura | 29,7 % | 45,1 % | +15,4 |
| Baraja negra | 29,3 % | 45,1 % | +15,8 |
| Baraja del prestamista | 28,7 % | 43,3 % | +14,6 |
| Baraja de ases | 26,3 % | 41,6 % | +15,3 |
| Baraja corta | 29,6 % | 42,5 % | +12,9 |
| Baraja del caos | 28 % | 44 % | +16 |

Monarcas: de cada vez que una campaña llega a uno, cuántas acaban ahí (media 14,9 %). Objetivo: todos entre 0,8× y 1,3× de la media.

| Monarca | Letalidad | Frente a la media |
|---|---|---|
| El Rey de Dos Caras | 15 % | ×1,01 |
| El Usurero | 16,4 % | ×1,1 |
| La Dama del Cáliz | 13,6 % | ×0,91 |
| La Reina Helada | 14 % | ×0,94 |
| El Inquisidor | 15,9 % | ×1,07 |
| El Verdugo | 15 % | ×1,01 |
| El Relojero | 14,4 % | ×0,97 |

Turnos por asalto. Objetivo: asalto 1 de 5 a 7 turnos de mediana (P95 ≤ 10); asaltos 2 y 3 de 8 a 10 (P95 ≤ 15); asaltos 4 a 8 de 9 a 13 (P95 ≤ 19), con cualquier baraja.

| Asalto | Mediana | P95 |
|---|---|---|
| 1 · El Puente levadizo | 6 | 9 |
| 2 · El Patio de armas | 8 | 11 |
| 3 · La Armería | 9 | 12 |
| 4 · Las Cocinas | 11 | 15 |
| 5 · La Capilla | 11 | 17 |
| 6 · La Biblioteca | 11 | 16 |
| 7 · La Galería de espejos | 11 | 17 |
| 8 · El Salón del Trono | 11 | 17 |

Peor percentil 95 de los asaltos 4 a 8, por baraja: de la conjura 18 · negra 18 · del prestamista 18 · de ases 17 · corta 16 · del caos 17.

Asalto único (1500 partidas por celda; objetivo 58–65 %): 1 jugador 59,3 % · 2 jugadores 58,5 % · 3 jugadores 64,5 % · 4 jugadores 63,1 %.

El informe no deja ningún aviso: todos los objetivos se cumplen en la muestra.
<!-- balance:fin -->

El objetivo es un progreso **horizontal**: una cuenta nueva ya gana más de una de cada cuatro campañas, y La Orden completa sube ese número ampliando opciones, no multiplicando estadísticas.

## El estudio

Desde la 5.0 el juego se hace con un pequeño estudio de agentes de Claude Code, cada uno dueño de sus archivos:

| Subagente (`.claude/agents/`) | Qué es suyo |
|---|---|
| `director` | `ROADMAP_V5_V10.md`, `SPECS/`, `CHANGELOG.md`, la prosa de este archivo y la decisión de publicar o apartar una versión |
| `reglas-balance` | `src/rules/`, la marca (`src/shared/brand.ts`), el laboratorio (`scripts/analyze-meta.ts`), el reglamento y `tests/`; vigila la constitución anticomplejidad |
| `arte-ui` | estilos, maquetación, grabado SVG (tronos, reliquias, monarcas, naipes), textos de pantalla, la QA visual y el banco de grabado |
| `juice-ux` | mando y teclado, Susurros, la partida guiada con la Maestra, efectos, sonido, la red del cooperativo y la prueba de humo |

Cinco habilidades (`.claude/skills/`) recogen el oficio que se repite: `brutalist-print-ui` (reglas de imprenta), `engraving-svg-forge` (dibujar y comprobar el arte), `playwright-deck-qa` (QA en las cuatro ventanas y con mando virtual), `regicide-synergy-math` (laboratorio e invariantes) y `autonomous-sprint-loop` (el bucle de versiones).

**Constitución anticomplejidad**, comprobada por `npm test`: como mucho 6 palabras clave y 56 reliquias, ninguna descripción de más de 115 caracteres y ningún asalto del 4 al 8 con un percentil 95 por encima de 19 turnos.

La hoja de ruta de la 6.1 a la 10.0 está en [ROADMAP_V5_V10.md](ROADMAP_V5_V10.md), con una especificación por versión en [SPECS/](SPECS/). Desde la 6.1 cada versión se hace por celdas, de una en una y en el orden que fija su especificación, sobre la rama `release/v{n}`; cada celda deja su señal de fin en `artifacts/mision/v{n}/`. El panel simulado audita con 60 personas la 6.1, la V7 y la V9, y con las 240 la V10. El guion por lotes de la 5.0 sigue disponible; para ver su plan sin tocar nada:

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
    engine.ts     estado, acciones, golpe (Daño × Multi), Asedio final, La Manga, Rebobinar, eventos, vista por jugador
    tools.ts      las 52 reliquias
    specials.ts   cartas especiales y legendarias
    keywords.ts   las seis palabras clave y cómo se marcan en los textos
    autopsy.ts    causa de la derrota (qué se llevó tu Vida) y aviso de último turno
    run.ts        campaña (reductor): Mapa del castillo, Juramentos, Botín, la Taberna, Secretos de la cripta, Reinados, La Orden
    achievements.ts  logros, colección y lo que desbloquean
    bot.ts        bot de asalto y de campaña (simulación y sustituto de desconectados)
    tutorial.ts   guion de la Maestra y mazo preparado de la partida guiada
  shared/
    brand.ts      la marca dual: el único sitio donde se escriben los dos títulos
    protocol.ts   protocolo de mensajes cliente ⇄ servidor
  server/       Node + ws: salas, turnos, reconexión, señas, estáticos
  client/       Vite + TypeScript + CSS/SVG
    core.ts · platform.ts · net.ts · router.ts   estado, puente con la plataforma, conexión
    home.ts · lobby.ts · guild.ts                portada, vestíbulo, La Orden, colección y Archivo de crónicas
    campaign.ts · runscreens.ts                  motor de campaña del cliente y sus pantallas (mapa, Botín, la Taberna, Mesa de lacre)
    table.ts · tutorial-ui.ts                    mesa de combate (los cuatro tronos, rueda de palos, Asedio final) y partida guiada
    cuenta.ts · causa.ts · lamina.ts             cuenta central y su recibo, causa de la derrota, Lámina de la Crónica y enlace con semilla
    whispers.ts                                  Susurros contextuales
    nav.ts · prompts.ts                          foco para teclado y mando, e indicaciones de cada botón
    lupa.ts · flavor.ts · pings.ts               Lupa, epígrafes, señas
    widgets.ts · backup.ts · fx.ts               reliquias, visor de Mazo y Descarte, ajustes, copia de seguridad, efectos
    card.ts · art.ts · glyphs.ts · engraving.ts  grabado en SVG: naipes, tronos, retratos, iconos, tramas de palo y grano
    tinta.ts                                     aviso de tinta desvanecida en las cajas con desplazamiento
    audio.ts                                     efectos y música sintetizados, con mezcla y máster
    qa.ts · forja-qa.ts                          estados fijos para las capturas y banco de grabado (solo con ?qa)
tests/          Vitest: motor, campaña, Asedio final y Escudo, autopsia, partida guiada, palabras clave, invariantes anticomplejidad, imprenta, vocabulario y marca
scripts/        Laboratorio de balance, control de calidad (capturas, humo, mando virtual), banco de grabado, tarjeta social y reglamento
```

- **Motor determinista.** Semilla + lista de acciones reproducen cualquier partida y cualquier campaña, decisión a decisión. Las pruebas lo comprueban con 500 partidas de fuzz.
- **Servidor autoritativo.** El cliente solo envía intenciones; el servidor valida con el motor y difunde el resultado. Las señas son solo señales: no deciden nada.
- **Información oculta.** Cada jugador recibe únicamente su mano y su Manga (`viewFor`) y sus propias cartas robadas o guardadas (`eventsFor`). La campaña de una sala viaja sin el estado del azar ni la semilla (`publicRun`).
- **Animación por eventos.** Cada golpe produce una lista de eventos que el cliente encola y anima; las reglas no saben nada de lo visual.
- **Marca en un solo sitio.** Las dos caras de la marca (título, sello y lema de cada idioma) salen de `src/shared/brand.ts`, que elige la cara por el idioma del navegador; `index.html` y el manifest, que son estáticos, lo llevan escrito, y `tests/marca.test.ts` falla si no casan. Los identificadores internos (`id` de datos, clases CSS, protocolo, claves `derrumbe:*`) no cambiaron con el tema.
- **Mando.** `nav.ts` lee el mando estándar del W3C (cruceta, palanca con zona muerta de 0,28, repetición a los 320 ms y cada 110 ms) y lo traduce a las mismas acciones que el teclado. La prueba de humo inyecta un mando virtual y juega una campaña entera con él.
- **Grabado.** Todo el arte es SVG dibujado a mano: naipes de corte de doble cabeza, tronos con su estandarte, monarcas reconocibles por su objeto, sombras de buril y cuatro tintas de taller —hierro oscuro, oro bruñido, carmesí real y verdín profundo— con opción de las dos clásicas. El grano del papel se hornea una vez en un lienzo; lo que se mueve solo cambia `transform` y `opacity`.
- **Sonido.** Sin archivos de audio: efectos y música se sintetizan con WebAudio, con buses separados, compresor y reverberación corta; la música gana capas cuando tu Vida está en apuros.

Todo el stack es open source: TypeScript, Vite, ws, Vitest, esbuild, Playwright y las tipografías Cinzel (los títulos), UnifrakturCook, Grenze Gotisch, Archivo, Archivo Black y Space Mono (OFL).

## Licencia

MIT.
