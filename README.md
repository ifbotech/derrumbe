# DERRUMBE

Juego de cartas con baraja francesa clásica y estética de linograbado brutalista. Diseño original:
cuatro torres, doce pisos y un búnker que se agrieta con cada sirena.

- **Campaña roguelike** en solitario: 8 obras, jefes, ferretería entre obras y progreso permanente.
- **Cooperativo online** para 1–4 jugadores, con salas por código.
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

Otros comandos: `npm test` (reglas), `npm run typecheck`, `npm run simulate` y `npm run simulate:run` (balance por simulación).

### Campaña (roguelike)

**Campaña** abre el gremio. Una campaña son 8 obras cada vez más duras, cuatro de ellas con un jefe que tuerce una regla. Al demoler una obra cobras oro (con interés por lo ahorrado) y pasas por la ferretería: 20 herramientas que cambian las reglas, forja de cartas (+3 de valor permanente), planos que suben de nivel las formaciones, reparaciones y comodines. El búnker no se cura solo entre obras.

Ganes o pierdas, la campaña da **renombre**, que se gasta en mejoras permanentes del gremio. Cada victoria desbloquea un **ascenso** más difícil y mejor pagado. La campaña y el gremio se guardan en el navegador (`localStorage`), así que puedes cerrar y seguir después.

Balance medido con `npm run simulate:run`: el bot de referencia gana cerca del 8 % de las campañas con el gremio vacío y del 70 % con todas las mejoras.

### Aprender a jugar

En la portada, **Partida guiada (tutorial)** abre una obra de prácticas que corre en local: un capataz explica, jugada a jugada, los golpes, los materiales, los poderes, la sirena, el muro, el golpe limpio y la huelga. **Ver la baraja** muestra las 54 cartas.

### Jugar con amigos

1. Uno crea una sala y comparte el código de 4 letras o el enlace (`/?sala=ABCD`).
2. Los demás se unen; el anfitrión elige dificultad y empieza.
3. Si alguien se desconecta puede volver recargando la página; mientras tanto un bot juega su turno.

Para jugar por internet hay que publicar el puerto del servidor (un VPS, Fly.io, Render, Railway… o un túnel).
Con Docker:

```bash
docker build -t derrumbe .
```

```bash
docker run -p 3000:3000 derrumbe
```

Detrás de un proxy inverso, recuerda permitir la actualización a WebSocket en la ruta `/ws`.

## Arquitectura

```
src/
  rules/     Motor de reglas puro y determinista (sin dependencias)
    engine.ts   estado, acciones, eventos, vista por jugador
    bot.ts      bot codicioso (simulación y sustituto de desconectados)
    tutorial.ts guion y mazo preparado de la partida guiada
    run.ts      campaña roguelike: obras, jefes, herramientas, ferretería y gremio
  shared/    Protocolo de mensajes cliente ⇄ servidor
  server/    Node + ws: salas, turnos, reconexión, estáticos
  client/    Vite + TypeScript + CSS/SVG: pantallas, cartas y animaciones
tests/       Tests del motor (vitest)
scripts/     Simulador de balance
```

- **Servidor autoritativo.** El cliente solo envía intenciones; el servidor valida con el motor y difunde el resultado.
- **Información oculta.** Cada jugador recibe únicamente su mano (`viewFor`) y sus propias cartas robadas (`eventsFor`). La cantera nunca viaja al cliente.
- **Motor compartido.** El mismo código valida en el servidor y previsualiza el daño en el cliente.
- **Animación por eventos.** Cada acción produce una lista de eventos (`hit`, `floorDown`, `siren`…) que el cliente encola y anima; las reglas no saben nada de lo visual.
- **Determinismo.** Semilla + lista de acciones reproducen cualquier partida.
- **Cartas.** Ilustradas a mano en SVG (`client/card.ts`) con estética de linograbado: figuras de doble cabeza unidas por una costura, tintas planas por material, bordes irregulares y grano de imprenta. Los ojos siguen al puntero, las armas se mueven, las pintas se estampan al repartir y los pisos se rasgan por la costura al caer.

- **Sonido.** Sin archivos de audio: efectos y música se sintetizan con WebAudio (`client/audio.ts`). La música es una marcha fúnebre en re menor armónico con bordón grave, tambores, laúd, coro, cuernos y campana; los tambores redoblan cuando el búnker está en peligro.
- **Interfaz.** Los rótulos, botones y marcos comparten el borde de gubia y el grano de la baraja; `client/art.ts` contiene las ilustraciones (torres, escombros, búnker).

Todo el stack es open source: TypeScript, Vite, ws, Vitest, esbuild y las tipografías UnifrakturCook, Grenze Gotisch, Archivo, Archivo Black y Space Mono (OFL).

## Licencia

MIT.
