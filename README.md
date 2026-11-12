# DERRUMBE

Roguelike de construcción de mazo con baraja francesa clásica y estética de grabado brutalista. Diseño original:
cuatro torres, doce pisos y un búnker que se agrieta con cada sirena. Para 1 a 4 jugadores.

- **Campaña roguelike** en solitario o en cuadrilla: 8 obras, jefes anunciados en el plano, rutas con contrato, ferretería, hallazgos y cimientos abisales sin final.
- **Fuerza × Resonancia**: cada golpe se resuelve paso a paso, de izquierda a derecha, y se ve en la mesa antes de darlo.
- **La baraja manda**: cartas solas, formaciones de póker y el **As de compañía**, que forma jugada con cualquier carta y cuela el poder de su palo. Los cuatro poderes (perforar, esquirlas, reparar, muro) están siempre a la vista, y cada torre lleva atornillada su **placa de inmunidad**.
- **Golpe limpio**: tirar un piso con el daño exacto calla la sirena, paga, roba y castiga al piso de abajo.
- **Cinturón de herramientas** reordenable (48 herramientas, 4 rarezas, 5 familias), **sellos** y **tratamientos** sobre las cartas.
- **Andamio** (un hueco para guardar una carta), **tiza de replanteo** (deshacer una jugada por obra en solitario) y **reinicio rápido** manteniendo R.
- **8 niveles de obra**, cada uno con un giro, y **sellos de maestría** en la colección.
- **Lupa de grabador**: clic derecho o pulsación larga sobre cualquier carta, herramienta, piso o jefe.
- **Cooperativo online** con salas por código, servidor autoritativo y **marcas de tiza** para señalar sin hablar.
- **Teclado y mando** de principio a fin (también en Steam Deck), y maqueta propia para móvil.
- **Obra diaria** con la misma semilla para todo el mundo, **semilla personalizada** y **partida guiada**.

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

El resultado queda en `dist/web`, con rutas relativas, `manifest.webmanifest` e icono SVG.

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas del motor, la campaña, el tutorial y las palabras clave (Vitest), con 500 partidas de fuzz con semilla |
| `npm run typecheck` | Comprobación de tipos de todo el proyecto |
| `npm run analyze:meta` | Laboratorio de balance: ~10.000 campañas con semilla → consola y `scripts/meta-report.json` |
| `npm run simulate` · `npm run simulate:run` | Simulaciones sueltas de la partida clásica y de la campaña |
| `npm run qa:visual` | Capturas sin ventana (Playwright) de 15 estados en 4 tamaños, con auditoría del DOM → `artifacts/visual-qa/` |
| `npm run qa:smoke` | Juega de verdad en el navegador: golpe, tiza, andamio, lupa, foco, reinicio y una obra a teclado |
| `npm run docs` | Regenera `REGLAS.md` desde los datos del motor |

La primera vez, las dos órdenes de control de calidad necesitan el navegador de Playwright:

```bash
npx playwright install chromium
```

## Cómo se juega una campaña

1. **El sobre.** Empiezas con una baraja inicial y tres cartas especiales.
2. **El plano de demolición.** Enseña las ocho obras y, desde el principio, qué jefe espera en cada una. En las obras sin jefe eliges **ruta** —cada una con un **contrato**— o tomas el **atajo** y te la saltas a cambio de una **etiqueta sindical**.
3. **La obra.** Eliges cartas y la mesa te enseña **Fuerza × Resonancia = daño** contra cada torre, con sus avisos (golpe limpio, muro, sirena, si la jugada se puede deshacer). Al golpear, cada carta, sello, tratamiento y herramienta se activa en orden.
4. **A cobrar.** Oro con interés, el resultado del contrato y **una de tres opciones a la vista** para el mazo. Los jefes dejan una herramienta de botín.
5. **La ferretería.** Herramientas en su chapa (hierro, cobre, latón o carmesí y oro, según la rareza), sobres de especiales, planos, la **mesa de forja**, el quemador y «Revolver cajones».
6. **Hallazgos en los cimientos** tras cada jefe intermedio: dilemas con premio y precio.
7. Tras la octava obra, el **acta de demolición** se puede copiar como tarjeta de texto. Y si quedan ganas, los **cimientos abisales**.

### El gremio

Ganes o pierdas, cada campaña deja renombre. En el gremio no se compra fuerza bruta: se **abren surtidos**. Los **logros** desbloquean barajas iniciales y cartas legendarias, y ganar una campaña estampa un **sello de maestría** (bronce, hierro u oro, según el nivel de obra) en la baraja y en cada herramienta que llevabas.

En solitario, la campaña y el gremio se guardan en el dispositivo. Todo lo que el juego le pide a la máquina (guardar, pantalla completa, vibración, logros del sistema, dirección del servidor) pasa por `PlatformBridge` (`src/client/platform.ts`): una envoltura de escritorio solo tiene que llamar a `setPlatform()` con la suya.

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

| Acción | Teclado y ratón | Mando |
|---|---|---|
| Mover el foco | Flechas | Cruceta o palanca |
| Elegir | Enter · 1–9 en la mano | A |
| Golpear la torre apuntada | Espacio | X |
| Guardar en el andamio | Y | Y |
| Tiza de replanteo | Z | — |
| Lupa de grabador | L · clic derecho · pulsación larga | RB |
| Mazo | Tab | LB |
| Atrás / soltar | Esc | B |
| Reiniciar la campaña | Mantener R | Mantener Select |
| Pantalla completa · Ajustes | F | Start |

## Balance

Medido con `npm run analyze:meta`: **18.160 campañas** con semilla jugadas por el bot de referencia (rutas, contratos, selección, ferretería, forja, hallazgos, andamio y orden del cinturón). El informe completo —cada herramienta, carta especial, sello y tratamiento, con cuánto se elige, cuánto se activa y cuánto mueve el resultado— queda en [scripts/meta-report.json](scripts/meta-report.json).

Campañas ganadas por nivel de obra (baraja de obra). Objetivos: nivel 1 entre el 24 y el 30 % con el gremio vacío y entre el 40 y el 48 % con el gremio lleno; nivel 8 entre el 8 y el 18 %. Los niveles 1 y 8 se miden con 1.500 campañas por celda (±1,3 puntos); los intermedios, con 200 (±3,3):

| Nivel | Gremio vacío | Gremio lleno |
|---|---|---|
| 1 · Obra limpia | 29,9 % | 39,3 % |
| 2 · Hormigón armado | 29 % | 39 % |
| 3 · Vigas maestras | 21,5 % | 33 % |
| 4 · Precios de obra | 18,5 % | 28,5 % |
| 5 · Sirena afinada | 15 % | 23,5 % |
| 6 · Suelo cansado | 9 % | 19 % |
| 7 · Sin relevo | 12,5 % | 17,5 % |
| 8 · Clausura | 7,5 % | 16,7 % |

El nivel 1 con gremio lleno queda en el borde bajo del objetivo en esta muestra. La misma configuración, medida aparte con otras 3.000 campañas por celda de semillas distintas, dio 30,1 % (vacío), 43,5 % (lleno) y 16,3 % (nivel 8); juntando las dos mediciones (4.500 campañas por celda): **30,0 %, 42,1 % y 16,4 %**.

Por baraja inicial (nivel 1; 400 campañas por celda, ±2,4 puntos):

| Baraja | Gremio vacío | Gremio lleno |
|---|---|---|
| Baraja de obra | 29,9 % | 39,3 % |
| Baraja negra | 35,3 % | 35,5 % |
| Baraja del prestamista | 28 % | 39,8 % |
| Baraja de ases | 33,8 % | 44 % |
| Baraja corta | 29,3 % | 37,5 % |
| Baraja del caos | 28,3 % | 45 % |

Jefes: proporción de campañas que acaban ante cada uno, y cuánto se aparta de la media (ninguno pasa de ×2,2).

| Jefe | Letalidad | Frente a la media |
|---|---|---|
| La Sirena | 19,5 % | ×1,09 |
| El Usurero | 19,2 % | ×1,07 |
| El Matasanos | 18,4 % | ×1,03 |
| La Ventisca | 27,1 % | ×1,51 |
| El Coloso | 12,9 % | ×0,72 |
| La Furia | 16,4 % | ×0,92 |
| El Topo | 11,7 % | ×0,65 |

Turnos por obra (mediana y percentil 95). El colapso se encarece con cada vuelta a la cantera, así que ninguna obra se puede estirar sin fin. Las obras de 25 turnos o más son en torno a un 8 % de las tardías y, en la muestra analizada, todas acaban en victoria: mazos de poco daño que ganan por aguante, no atascos.

| Obra | Mediana | P95 |
|---|---|---|
| 1 · Caseta de obra | 6 | 9 |
| 2 · Bloque de pisos | 12 | 16 |
| 3 · Torre del capataz | 12 | 19 |
| 4 · Polígono | 17 | 25 |
| 5 · Ciudadela | 17 | 30 |
| 6 · Rascacielos | 17 | 26 |
| 7 · Fortaleza | 16 | 29 |
| 8 · La Torre Madre | 15 | 31 |

Partida clásica (`npm run simulate 1500`): el bot gana el 62 % de las obras en solitario y el 67 %, 64 % y 53 % con 2, 3 y 4 jugadores.

El objetivo es un progreso **horizontal**: una cuenta nueva ya gana en torno a tres de cada diez campañas, y el gremio completo sube ese número ampliando opciones, no multiplicando estadísticas.

## Arquitectura

```
src/
  rules/        Motor de reglas puro, determinista y sin dependencias
    engine.ts     estado, acciones, golpe (Fuerza × Resonancia), andamio, tiza, eventos, vista por jugador
    tools.ts      las 48 herramientas del cinturón
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
    home.ts · lobby.ts · guild.ts                portada, vestíbulo, gremio y colección
    campaign.ts · runscreens.ts                  motor de campaña del cliente y sus pantallas
    table.ts · tutorial-ui.ts                    mesa de combate y partida guiada
    lupa.ts · flavor.ts · pings.ts · nav.ts      lupa de grabador, epígrafes, marcas de tiza, teclado y mando
    widgets.ts · fx.ts                           cinturón, visor de mazos, ajustes, efectos
    card.ts · art.ts · glyphs.ts · engraving.ts  grabado en SVG: cartas, retratos, iconos, tramas y grano
    audio.ts                                     efectos y música sintetizados, con mezcla y máster
    qa.ts                                        estados fijos para las capturas (solo con ?qa)
tests/          Vitest: motor, campaña, tutorial y palabras clave
scripts/        Laboratorio de balance, control de calidad visual y generador del reglamento
```

- **Motor determinista.** Semilla + lista de acciones reproducen cualquier partida y cualquier campaña, decisión a decisión. Las pruebas lo comprueban con 500 partidas de fuzz.
- **Servidor autoritativo.** El cliente solo envía intenciones; el servidor valida con el motor y difunde el resultado. Las marcas de tiza son solo señales: no deciden nada.
- **Información oculta.** Cada jugador recibe únicamente su mano y su andamio (`viewFor`) y sus propias cartas robadas o guardadas (`eventsFor`). La campaña de una sala viaja sin el estado del azar ni la semilla (`publicRun`).
- **Animación por eventos.** Cada golpe produce una lista de eventos que el cliente encola y anima; las reglas no saben nada de lo visual.
- **Grabado.** Todo el arte es SVG dibujado a mano: figuras de doble cabeza, tintas planas por material, sombras de buril (rayados y semitonos) y cuatro tintas de taller —negro de humo, almagre, ocre y verdín— con opción de las dos clásicas. El grano del papel se hornea una vez en un lienzo; lo que se mueve solo cambia `transform` y `opacity`.
- **Sonido.** Sin archivos de audio: efectos y música se sintetizan con WebAudio. Música y efectos van a buses separados, y el máster pasa por un estante de agudos, un compresor y una reverberación corta de sala de hormigón; la música gana capas con el apuro del búnker y el audio se suspende al cambiar de pestaña.

Todo el stack es open source: TypeScript, Vite, ws, Vitest, esbuild, Playwright y las tipografías UnifrakturCook, Grenze Gotisch, Archivo, Archivo Black y Space Mono (OFL).

## Licencia

MIT.
