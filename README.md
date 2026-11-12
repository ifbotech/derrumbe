# DERRUMBE

Roguelike de construcción de mazo con baraja francesa clásica y estética de grabado brutalista. Diseño original:
cuatro torres, doce pisos y un búnker que se agrieta con cada sirena. Para 1 a 4 jugadores.

**Jugar en el navegador:** https://ifbotech.github.io/derrumbe/ (se publica sola en cada cambio; ver [Publicar](#publicar)).

- **Campaña roguelike** en solitario o en cuadrilla: 8 obras cortas y tensas (de 6 a 12 turnos), jefes anunciados en el plano, rutas con contrato, ferretería, hallazgos y cimientos abisales sin final.
- **Fuerza × Resonancia**: cada golpe se resuelve paso a paso, de izquierda a derecha, y se ve en la mesa antes de darlo.
- **La baraja manda**: cartas solas, formaciones de póker y el **As de compañía**. Los cuatro poderes de palo y la **rueda de materiales** (♠ → ♦ → ♥ → ♣ → ♠) están siempre a la vista, y cada torre lleva atornillada su **placa de inmunidad**.
- **Golpe limpio**: tirar un piso con el daño exacto calla la sirena, paga, roba y castiga al piso de abajo.
- **Fatiga de cimientos**: ninguna obra se eterniza. A partir del turno 9, tus golpes resuenan más y la sirena también: todo acaba en un crescendo.
- **Cinturón de herramientas** reordenable (52 herramientas, 4 rarezas, 6 familias). La familia de **aguante** cobra la defensa en daño: el muro se vuelve Fuerza, lo que frena se devuelve y lo que sobra, repara.
- **Andamio**, **tiza de replanteo** (deshacer una jugada por obra en solitario) y **reinicio rápido** manteniendo R.
- **8 niveles de obra**, cada uno con un giro, y **sellos de maestría** en la colección.
- **Lupa de grabador**: clic derecho o pulsación larga sobre cualquier carta, herramienta, piso o jefe.
- **Archivo de actas**: las 25 últimas campañas, con su semilla para rejugarlas, y **copia de seguridad** del progreso en un archivo.
- **Cooperativo online** con salas por código, servidor autoritativo y **marcas de tiza** para señalar sin hablar.
- **Teclado y mando** de principio a fin, con las indicaciones de cada botón en pantalla; maqueta propia para móvil.
- **Obra diaria** con la misma semilla para todo el mundo, **semilla personalizada** y **partida guiada** con consejos de tiza la primera vez.

Reglas completas en [REGLAS.md](REGLAS.md) (también dentro del juego, botón **Reglas**). Solo seis palabras tienen significado propio —Fuerza, Resonancia, golpe limpio, fractura, apuntalado y desarmada—; todo lo demás se dice con palabras llanas.

> DERRUMBE comparte género con los cooperativos de baraja francesa, pero sus reglas son propias: los poderes de palo, el ciclo de materiales (♠ rompe ♦, ♦ corta ♥, ♥ agrieta ♣, ♣ sepulta ♠) y la cuenta Fuerza × Resonancia no vienen de ningún otro juego.

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
| `npm test` | Pruebas del motor, la campaña, la fatiga, el tutorial y las palabras clave (Vitest), con 500 partidas de fuzz con semilla |
| `npm run typecheck` | Comprobación de tipos de todo el proyecto |
| `npm run analyze:meta` | Laboratorio de balance: ~52.000 campañas con semilla (unos 25 minutos) → consola y `scripts/meta-report.json`. Con `-- foco`, `-- niveles`, `-- barajas` o `-- clasica` mide solo eso |
| `npm run simulate` · `npm run simulate:run` | Simulaciones sueltas de la partida clásica y de la campaña |
| `npm run qa:visual` | Capturas sin ventana (Playwright) de 19 estados en 4 tamaños (con ratón, con teclado y con mando), con auditoría del DOM → `artifacts/visual-qa/` |
| `npm run qa:smoke` | Juega de verdad en el navegador: teclado, ratón y una campaña entera con un **mando virtual** (menú, obra, reglas, ajustes, cobro, ferretería y hallazgo) |
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

1. **El sobre.** Empiezas con una baraja inicial y tres cartas especiales.
2. **El plano de demolición.** Enseña las ocho obras y, desde el principio, qué jefe espera en cada una. En las obras sin jefe eliges **ruta** —cada una con un **contrato**— o tomas el **atajo** y te la saltas a cambio de una **etiqueta sindical**.
3. **La obra.** Eliges cartas y la mesa te enseña **Fuerza × Resonancia = daño** contra cada torre, con sus avisos (golpe limpio, muro, sirena, si la jugada se puede deshacer). Al golpear, cada carta, sello, tratamiento y herramienta se activa en orden. Si la obra se alarga, la **fatiga de cimientos** sube las apuestas para los dos lados.
4. **A cobrar.** Oro con interés, el resultado del contrato y **una de tres opciones a la vista** para el mazo. Los jefes dejan una herramienta de botín.
5. **La ferretería.** Herramientas en su chapa (hierro, cobre, latón o carmesí y oro, según la rareza), sobres de especiales, planos, la **mesa de forja**, el quemador y «Revolver cajones».
6. **Hallazgos en los cimientos** tras cada jefe intermedio: dilemas con premio y precio.
7. Tras la octava obra, el **acta de demolición** se puede copiar como tarjeta de texto y queda en el archivo. Y si quedan ganas, los **cimientos abisales**.

### El gremio

Ganes o pierdas, cada campaña deja renombre. En el gremio no se compra fuerza bruta: se **abren surtidos**. El surtido base es corto a propósito; seis cajas abren el resto de las herramientas, cada una con su manera de jugar (precisión, sismo, alquimia, riesgo, chatarra y aguante). Los **logros** desbloquean barajas iniciales y cartas legendarias, y ganar una campaña estampa un **sello de maestría** (bronce, hierro u oro, según el nivel de obra) en la baraja y en cada herramienta que llevabas.

El **archivo de actas** guarda las 25 últimas campañas: resultado, obra y jefe, turnos, mayor golpe, herramientas y semilla, con un botón para **rejugar la semilla** y otro para copiar el acta.

En solitario, la campaña y el gremio se guardan en el dispositivo. Desde **Ajustes** se puede **exportar el progreso** a un archivo .json e **importarlo** en otro navegador, otro equipo o la versión de escritorio. Todo lo que el juego le pide a la máquina (guardar, archivos, pantalla completa, vibración, logros del sistema, enlaces, dirección del servidor) pasa por `PlatformBridge` (`src/client/platform.ts`): una envoltura de escritorio solo tiene que llamar a `setPlatform()` con la suya.

### Jugar con amigos

1. Uno crea una sala y comparte el código de 4 letras o el enlace (`/?sala=ABCD`).
2. Los demás se unen; el anfitrión elige entre una obra clásica y una campaña, y empieza.
3. Si alguien se desconecta puede volver recargando la página; mientras tanto un bot juega su turno.

En campaña cooperativa el mazo, el oro y el cinturón son compartidos y decide el anfitrión; los demás **marcan con tiza** lo que proponen (una torre, una ruta, una oferta) y sus iniciales aparecen encima para toda la cuadrilla. En sala no hay tiza de replanteo: toda jugada es definitiva.

Para jugar por internet hay que publicar el puerto del servidor (un VPS, Fly.io, Render, Railway… o un túnel). Con Docker:

```bash
docker build -t derrumbe .
```

```bash
docker run -p 3000:3000 derrumbe
```

Detrás de un proxy inverso, recuerda permitir la actualización a WebSocket en la ruta `/ws`.

### Controles

Los botones de la mesa enseñan su atajo: la tecla si juegas con teclado, el botón del mando si lo último que tocaste fue un mando.

<!-- controles:inicio -->
| Acción | Teclado y ratón | Mando |
|---|---|---|
| Mover el foco | Flechas | Cruceta o palanca |
| Elegir | Enter · 1–9 en la mano | A |
| Golpear la torre apuntada | Espacio | X |
| Guardar en el andamio | Y | Y |
| Tiza de replanteo (deshacer) | Z | LT |
| Cambiar la velocidad (1× → 2× → 4×) | botón de la barra | RT |
| Lupa de grabador | L · clic derecho · pulsación larga | RB |
| Mazo (cantera y escombrera) | Tab | LB |
| Descartar lo elegido | Supr | — |
| Atrás / soltar la selección | Esc | B |
| Reordenar el cinturón | Arrastrar · Mayús + flechas | — |
| Reiniciar la campaña | Mantener R | Mantener Select |
| Pantalla completa | F | — |
| Ajustes | — | Start |
<!-- controles:fin -->

## Balance

<!-- balance:inicio -->
Medido con `npm run analyze:meta`: **54.840 campañas** con semilla jugadas por el bot de referencia (rutas, contratos, selección, ferretería, forja, hallazgos, andamio y orden del cinturón). El informe completo —cada herramienta, carta especial, sello y tratamiento— queda en [scripts/meta-report.json](scripts/meta-report.json). Cada porcentaje es una muestra: con 1.500 campañas, el margen es de unos ±2,5 puntos, así que dos medidas que difieran menos que eso no se distinguen.

Campañas ganadas por nivel de obra (baraja de obra, 1500 campañas por celda). Objetivos: nivel 1 entre el 24 y el 30 % con el gremio vacío y entre el 40 y el 48 % con el gremio lleno; nivel 8 entre el 8 y el 18 %; y cada nivel, más difícil que el anterior.

| Nivel | Gremio vacío | Gremio lleno |
|---|---|---|
| 1 · Obra limpia | 29,1 % | 44,1 % |
| 2 · Hormigón armado | 25 % | 40,6 % |
| 3 · Precios de obra | 23 % | 35,1 % |
| 4 · Vigas maestras | 17,6 % | 32,2 % |
| 5 · Sirena afinada | 14,3 % | 27,7 % |
| 6 · Búnker viejo | 12 % | 24,5 % |
| 7 · Turno de noche | 7,3 % | 16,9 % |
| 8 · Clausura | 4,1 % | 10,9 % |

Por baraja inicial (nivel 1, 1500 campañas por celda). Objetivo: todas entre el 24 y el 31 % sin gremio y entre el 40 y el 45 % con él.

| Baraja | Gremio vacío | Gremio lleno | Lo que suma el gremio |
|---|---|---|---|
| Baraja de obra | 29,1 % | 44,1 % | +15 |
| Baraja negra | 27,3 % | 43,3 % | +16 |
| Baraja del prestamista | 27,7 % | 41,5 % | +13,8 |
| Baraja de ases | 25,6 % | 40,1 % | +14,5 |
| Baraja corta | 28,7 % | 40,7 % | +12 |
| Baraja del caos | 26,3 % | 43,3 % | +17 |

Jefes: de cada vez que una campaña llega a uno, cuántas acaba ahí (media 15,4 %). Objetivo: todos entre 0,8× y 1,3× de la media.

| Jefe | Letalidad | Frente a la media |
|---|---|---|
| La Sirena | 15,1 % | ×0,98 |
| El Usurero | 16,5 % | ×1,07 |
| El Matasanos | 13,8 % | ×0,9 |
| La Ventisca | 17,6 % | ×1,14 |
| El Coloso | 15,8 % | ×1,03 |
| La Furia | 14,9 % | ×0,97 |
| El Topo | 14,4 % | ×0,94 |

Turnos por obra. Objetivo: obra 1 de 5 a 7 turnos de mediana (P95 ≤ 10); obras 2 y 3 de 8 a 10 (P95 ≤ 15); obras 4 a 8 de 9 a 13 (P95 ≤ 19), con cualquier baraja.

| Obra | Mediana | P95 |
|---|---|---|
| 1 · Caseta de obra | 6 | 9 |
| 2 · Bloque de pisos | 8 | 11 |
| 3 · Torre del capataz | 9 | 12 |
| 4 · Polígono | 11 | 15 |
| 5 · Ciudadela | 11 | 16 |
| 6 · Rascacielos | 11 | 16 |
| 7 · Fortaleza | 11 | 17 |
| 8 · La Torre Madre | 11 | 17 |

Peor percentil 95 de las obras 4 a 8, por baraja: de obra 18 · negra 18 · del prestamista 18 · de ases 17 · corta 16 · del caos 17.

Partida clásica (una obra, 1500 partidas por celda; objetivo 58–65 %): 1 jugador 59,3 % · 2 jugadores 58,5 % · 3 jugadores 64,5 % · 4 jugadores 63,1 %.

El informe no deja ningún aviso: todos los objetivos se cumplen en la muestra.
<!-- balance:fin -->

El objetivo es un progreso **horizontal**: una cuenta nueva ya gana más de una de cada cuatro campañas, y el gremio completo sube ese número ampliando opciones, no multiplicando estadísticas.

## Arquitectura

```
src/
  rules/        Motor de reglas puro, determinista y sin dependencias
    engine.ts     estado, acciones, golpe (Fuerza × Resonancia), fatiga, andamio, tiza, eventos, vista por jugador
    tools.ts      las 52 herramientas del cinturón
    specials.ts   cartas especiales
    keywords.ts   las seis palabras clave y cómo se marcan en los textos
    run.ts        campaña (reductor): plano, contratos, cobro, ferretería, hallazgos, niveles de obra, gremio
    achievements.ts  logros, colección y lo que desbloquean
    bot.ts        bot de obra y de campaña (simulación y sustituto de desconectados)
    tutorial.ts   guion y mazo preparado de la partida guiada
  shared/       Protocolo de mensajes cliente ⇄ servidor
  server/       Node + ws: salas, turnos, reconexión, marcas de tiza, estáticos
  client/       Vite + TypeScript + CSS/SVG
    core.ts · platform.ts · net.ts · router.ts   estado, puente con la plataforma, conexión
    home.ts · lobby.ts · guild.ts                portada, vestíbulo, gremio, colección y archivo de actas
    campaign.ts · runscreens.ts                  motor de campaña del cliente y sus pantallas
    table.ts · tutorial-ui.ts                    mesa de combate (rueda de materiales, fatiga, susurros) y partida guiada
    nav.ts · prompts.ts                          foco para teclado y mando, e indicaciones de cada botón
    lupa.ts · flavor.ts · pings.ts               lupa de grabador, epígrafes, marcas de tiza
    widgets.ts · backup.ts · fx.ts               cinturón, visor de mazos, ajustes, copia de seguridad, efectos
    card.ts · art.ts · glyphs.ts · engraving.ts  grabado en SVG: cartas, retratos, iconos, tramas y grano
    audio.ts                                     efectos y música sintetizados, con mezcla y máster
    qa.ts                                        estados fijos para las capturas (solo con ?qa)
tests/          Vitest: motor, campaña, fatiga y aguante, tutorial y palabras clave
scripts/        Laboratorio de balance, control de calidad (capturas, humo, mando virtual), tarjeta social y reglamento
```

- **Motor determinista.** Semilla + lista de acciones reproducen cualquier partida y cualquier campaña, decisión a decisión. Las pruebas lo comprueban con 500 partidas de fuzz.
- **Servidor autoritativo.** El cliente solo envía intenciones; el servidor valida con el motor y difunde el resultado. Las marcas de tiza son solo señales: no deciden nada.
- **Información oculta.** Cada jugador recibe únicamente su mano y su andamio (`viewFor`) y sus propias cartas robadas o guardadas (`eventsFor`). La campaña de una sala viaja sin el estado del azar ni la semilla (`publicRun`).
- **Animación por eventos.** Cada golpe produce una lista de eventos que el cliente encola y anima; las reglas no saben nada de lo visual.
- **Mando.** `nav.ts` lee el mando estándar del W3C (cruceta, palanca con zona muerta de 0,28, repetición a los 320 ms y cada 110 ms) y lo traduce a las mismas acciones que el teclado. La prueba de humo inyecta un mando virtual y juega una campaña entera con él.
- **Grabado.** Todo el arte es SVG dibujado a mano: figuras de doble cabeza, tintas planas por material, sombras de buril y cuatro tintas de taller —negro de humo, almagre, ocre y verdín— con opción de las dos clásicas. El grano del papel se hornea una vez en un lienzo; lo que se mueve solo cambia `transform` y `opacity`.
- **Sonido.** Sin archivos de audio: efectos y música se sintetizan con WebAudio, con buses separados, compresor y reverberación corta; la música gana capas con el apuro del búnker.

Todo el stack es open source: TypeScript, Vite, ws, Vitest, esbuild, Playwright y las tipografías UnifrakturCook, Grenze Gotisch, Archivo, Archivo Black y Space Mono (OFL).

## Licencia

MIT.
