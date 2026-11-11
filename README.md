# DERRUMBE

Roguelike de construcción de mazo con baraja francesa clásica y estética de linograbado brutalista. Diseño original:
cuatro torres, doce pisos y un búnker que se agrieta con cada sirena.

- **Campaña roguelike** en solitario o en cuadrilla: 8 obras, jefes anunciados en el plano, rutas con contrato, ferretería, hallazgos y cimientos abisales sin final.
- **Fuerza × Resonancia**: cada golpe se resuelve paso a paso, de izquierda a derecha, y se ve en la mesa.
- **Cinturón de herramientas** reordenable (46 herramientas, 4 rarezas, 5 arquetipos), **sellos** y **tratamientos** sobre las cartas.
- **Cooperativo online** para 1–4 jugadores, con salas por código y servidor autoritativo.
- **Obra diaria** con la misma semilla para todo el mundo, y **semilla personalizada**.
- **Partida guiada** que enseña las reglas jugando.

Reglas completas en [REGLAS.md](REGLAS.md) (también dentro del juego, botón **Reglas**).

## Uso

Requiere Node.js 20 o superior.

```bash
npm install
```

Desarrollo (servidor en :3000 + cliente con recarga en http://localhost:5173):

```bash
npm run dev
```

Producción (un solo proceso sirve el cliente y el WebSocket en http://localhost:3000):

```bash
npm run build
```

```bash
npm start
```

| Comando | Qué hace |
|---|---|
| `npm test` | Tests del motor y de la campaña (Vitest) |
| `npm run typecheck` | Comprobación de tipos de todo el proyecto |
| `npm run simulate` | Balance de la partida clásica: el bot juega miles de obras |
| `npm run simulate:run` | Balance de la campaña: el bot juega campañas enteras |
| `npm run docs` | Regenera `REGLAS.md` desde los datos del motor |

## Cómo se juega una campaña

1. **El sobre.** Empiezas con una baraja inicial y tres cartas especiales.
2. **El plano de demolición.** Un plano sobre la mesa de obra enseña las ocho obras y, desde el principio, qué jefe espera en cada una y cuál es su maldición. En las obras sin jefe eliges **ruta** —cada una con un **contrato**: una condición con premio, o un riesgo que endurece la obra y paga siempre— o tomas el **atajo** y te la saltas a cambio de una **etiqueta sindical** (ferretería gratis, una herramienta de capataz al instante, duplicar una carta, oro…).
3. **La obra.** Golpeas con formaciones de póker. El marcador enseña **Fuerza × Resonancia = daño** antes de golpear, con sus avisos (golpe limpio, muro, sirena). Al golpear, cada carta, sello, tratamiento y herramienta se activa en orden, con su número y su campanilla un semitono más aguda.
4. **A cobrar.** Oro con interés, el resultado del contrato y **una de tres opciones a la vista** para el mazo (o pasar por oro). Los jefes dejan una herramienta de botín.
5. **La ferretería.** Herramientas colgadas con su etiqueta de precio, sobres de especiales (los abres y eliges 1 de 3), un sobre clandestino a ciegas, planos, la **mesa de forja** (sellos y tratamientos sobre la carta que elijas), el quemador y «Revolver cajones».
6. **Hallazgos en los cimientos** tras cada jefe intermedio: dilemas con premio y precio.
7. Tras la octava obra, el **acta de demolición** (mayor golpe, pisos, golpes limpios, herramienta más activa, semilla) se puede copiar como tarjeta de texto. Y si quedan ganas, los **cimientos abisales**.

### El gremio

Ganes o pierdas, cada campaña deja renombre. En el gremio no se compra fuerza bruta: se **abren surtidos** (cinco cajas de herramientas, sellos, tratamientos, vales para revolver cajones, una tercera ruta por obra). Los **logros** desbloquean barajas iniciales y cartas legendarias. **Colección** reúne lo descubierto; lo que falta espera boca abajo.

En solitario, la campaña y el gremio se guardan en el navegador (`localStorage`). Los ajustes (velocidad 1× / 2× / 4×, sonido, música y «Reducir movimiento») también.

### Jugar con amigos

1. Uno crea una sala y comparte el código de 4 letras o el enlace (`/?sala=ABCD`).
2. Los demás se unen; el anfitrión elige entre una obra clásica y una campaña, y empieza.
3. Si alguien se desconecta puede volver recargando la página; mientras tanto un bot juega su turno.

En campaña cooperativa el mazo, el oro y el cinturón son compartidos; el anfitrión decide ruta, compras y orden del cinturón, y cada jugador gana su propio renombre y sus logros.

Para jugar por internet hay que publicar el puerto del servidor (un VPS, Fly.io, Render, Railway… o un túnel). Con Docker:

```bash
docker build -t derrumbe .
```

```bash
docker run -p 3000:3000 derrumbe
```

Detrás de un proxy inverso, recuerda permitir la actualización a WebSocket en la ruta `/ws`.

### Atajos de teclado

**1–9** eligen carta · **← →** apuntan a una torre · **Espacio** o **Enter** golpean · **Supr** descarta · **Esc** suelta · **Tab** abre la cantera y la escombrera.

## Balance

Medido por simulación con el bot de referencia, que juega campañas completas (rutas, contratos, selección, ferretería, forja, hallazgos y orden del cinturón).

Campaña (`npm run simulate:run 400 ambos 1 todas`), porcentaje de campañas ganadas:

| Baraja inicial | Gremio vacío | Gremio lleno |
|---|---|---|
| Baraja de obra | 25,5 % | 45,3 % |
| Baraja negra | 29,3 % | 40,3 % |
| Baraja del prestamista | 25,8 % | 43,0 % |
| Baraja de ases | 27,5 % | 44,3 % |
| Baraja corta | 27,0 % | 43,5 % |
| Baraja del caos | 22,5 % | 39,5 % |

| Cuadrilla (baraja de obra) | Gremio vacío | Gremio lleno |
|---|---|---|
| 2 jugadores | 29,3 % | 46,3 % |
| 3 jugadores | 27,0 % | 44,3 % |
| 4 jugadores | 25,7 % | 37,7 % |

Partida clásica (`npm run simulate 1000`): el bot gana el 63 % en OBRA (56 % con 4 jugadores) y el 44 % en BRUTAL (34 % con 4).

Las obras donde más campañas se pierden son las de jefe (3, 5, 7 y 8). Saltar obras por sus etiquetas y aceptar contratos de riesgo (`SKIP=envio,molde,liquidacion RISK=1`) deja al bot en torno al 27 % / 40 %: una forma distinta de jugar, no una mejor.

El objetivo es un progreso **horizontal**: una cuenta nueva ya gana una de cada cuatro campañas, y el gremio completo sube ese número ampliando opciones, no multiplicando estadísticas.

## Arquitectura

```
src/
  rules/        Motor de reglas puro, determinista y sin dependencias
    engine.ts     estado, acciones, golpe (Fuerza × Resonancia), eventos, vista por jugador
    tools.ts      las 46 herramientas del cinturón y su orden recomendado
    specials.ts   cartas especiales
    run.ts        campaña (reductor): plano, contratos, etiquetas, cobro, ferretería, hallazgos, gremio
    achievements.ts  logros, colección y lo que desbloquean
    bot.ts        bot de obra y de campaña (simulación y sustituto de desconectados)
    tutorial.ts   guion y mazo preparado de la partida guiada
  shared/       Protocolo de mensajes cliente ⇄ servidor
  server/       Node + ws: salas, turnos, reconexión, estáticos
  client/       Vite + TypeScript + CSS/SVG
    core.ts       estado del cliente, ajustes, ventanas y globos de ayuda
    net.ts · router.ts
    home.ts · lobby.ts · guild.ts          portada, vestíbulo, gremio y colección
    campaign.ts · runscreens.ts            motor de campaña del cliente y sus pantallas
    table.ts · tutorial-ui.ts              mesa de combate y partida guiada
    widgets.ts · fx.ts                     cinturón, visor de mazos, efectos
    card.ts · art.ts · glyphs.ts           linograbado en SVG
    audio.ts                               efectos y música sintetizados
tests/          Vitest: motor, campaña y tutorial
scripts/        Simuladores de balance y generador del reglamento
```

- **Motor determinista.** Semilla + lista de acciones reproducen cualquier partida y cualquier campaña, decisión a decisión. Los tests lo comprueban.
- **Servidor autoritativo.** El cliente solo envía intenciones; el servidor valida con el motor y difunde el resultado.
- **Información oculta.** Cada jugador recibe únicamente su mano (`viewFor`) y sus propias cartas robadas (`eventsFor`). La cantera viaja como un montón ordenado por palo y número mezclado con las manos ajenas, nunca en su orden real; la campaña de una sala viaja sin el estado del azar ni la semilla (`publicRun`).
- **Motor compartido.** El mismo código valida en el servidor, previsualiza el golpe en el cliente y decide por el bot.
- **Animación por eventos.** Cada golpe produce una lista de eventos (`step` con su origen exacto —carta, sello, tratamiento, especial o hueco del cinturón—, `impact`, `hit`, `floorDown`, `onda`, `state`, `siren`…) que el cliente encola y anima; las reglas no saben nada de lo visual.
- **Cartas.** Ilustradas a mano en SVG (`client/card.ts`) con estética de linograbado: figuras de doble cabeza unidas por una costura, tintas planas por material, bordes irregulares y grano de imprenta. Los sellos son tampones de goma; los tratamientos, tintas y láminas sobre la carta.
- **Sonido.** Sin archivos de audio: efectos y música se sintetizan con WebAudio (`client/audio.ts`). La música cambia de tono, tempo y ritmo con cada obra, y los jefes entran con coro y tambores de guerra.

Todo el stack es open source: TypeScript, Vite, ws, Vitest, esbuild y las tipografías UnifrakturCook, Grenze Gotisch, Archivo, Archivo Black y Space Mono (OFL).

## Licencia

MIT.
