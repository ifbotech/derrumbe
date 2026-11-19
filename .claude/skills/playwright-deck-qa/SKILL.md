---
name: playwright-deck-qa
description: Control de calidad de SANGRE Y PALO con Playwright. Auditoría del DOM (cajas, desplazamiento, recortes, tipografía, dianas, jerga del tema viejo) en todos los estados fijos y en las cuatro ventanas, incluida la de Steam Deck, más una campaña entera jugada con un mando virtual W3C. Úsala antes de dar por buena cualquier pantalla o cambio de entrada, y para añadir un estado o una comprobación.
---

# QA de mesa y de Steam Deck

Dos órdenes, las dos sobre el juego **construido** (`dist/web`) y en Chromium sin ventana:

| Orden | Qué hace | Cuándo falla |
|---|---|---|
| `npm run qa:visual` | Monta cada estado fijo (`src/client/qa.ts`) en `1920×1080`, `1366×768`, `1280×800` y `390×844`, audita el DOM y guarda una captura | un texto pequeño o una cifra en la fuente de títulos, un recorte, una diana corta, dos zonas que se pisan, una palabra del tema viejo, un error de consola |
| `npm run qa:smoke` | Juega de verdad: golpe, Rebobinar, Lupa, reinicio, las frases del Bufón, un asalto a teclado, la oferta de Bendiciones y una **campaña entera con mando virtual** | una acción que no responde, un foco atrapado, un error de página |

```bash
npm run qa:visual                      # todo: estados × 4 ventanas
npm run qa:visual -- mesa forja        # solo esos estados
VIEW=1280x800 npm run qa:visual        # solo la ventana de Steam Deck
NO_BUILD=1 npm run qa:visual -- mesa   # sin reconstruir
QA_DIR=dist/qa-arte npm run qa:visual  # construcción propia (varias celdas a la vez)
npm run qa:visual -- --lang=en         # el juego en inglés → artifacts/visual-qa-en/ (regla «fuga»)
npm run qa:smoke -- --fast             # humo rápido (< 60 s): la puerta de cada vuelta
npm run qa:smoke -- --solo=bufon       # una sección (bufon, mesa, mando…; ≤ 170 s); --secciones las lista
npm run qa:smoke:todo                  # todas las secciones, cada una con su tope: la puerta de publicar
npm run qa:smoke:todo -- --lang=en     # la prueba de humo en inglés
NO_PAD=1 npm run qa:smoke              # sin la parte del mando
npm run qa:fps                         # la fluidez (60 fps), con aceleración y la máquina en reposo
```

`npm run qa:smoke` de un tirón tarda unos 16 minutos: pasa del tope de **300 s** por orden. Se usa `--fast`, `--solo` o `qa:smoke:todo`, siempre en primer plano.

Capturas en `artifacts/visual-qa/<ventana>/<estado>.png`; resumen en `artifacts/visual-qa/report.json`. `?qa=1` monta estados sin guardar nada: el progreso del usuario no se toca.

## Las ventanas

| Ventana | Dispositivo | Entrada | Lo que más falla |
|---|---|---|---|
| `1920×1080` | PC | ratón | texto que no escala, contraste |
| `1366×768` | portátil | trackpad | alto escaso, dianas pegadas, descripciones cortadas |
| `1280×800` | Steam Deck | mando | foco invisible, bordes sin margen de seguridad |
| `390×844` | móvil | dedo | barra del pulgar, recortes verticales |

## Los estados

Viven en `src/client/qa.ts` y en la lista `ALL` de `scripts/visual-qa.ts`. **Los nombres de los estados son identificadores y no cambian con el tema**; entre paréntesis, qué pantalla es cada uno hoy:

- Base: `portada` (Jugar · Altar · Colección · Ajustes), `preparacion` (elección del Mazo), `mesa`, `lupa`, `lupa-herramienta` (Lupa sobre una Reliquia o un Amuleto), `lupa-piso` (Lupa sobre un guardia), `lupa-especial`, `mazo`, `plano` (el Mapa), `cobro` (Botín), `ferreteria` (La Pulpería), `forja` (Mesa de lacre), `hallazgo` (Secreto de la cripta), `gremio` (el Altar), `coleccion`, `archivo` (Archivo de crónicas), `acta` (Crónica), `ajustes`, `reglas`, `mesa-mando`, `mesa-susurro` (un Susurro sobre la mesa), `mesa-fatiga` (la Furia).
- Desde la 5.0: `mesa-cuenta` (recibo desplegado), `mesa-peligro` (aviso de último turno) y `acta-derrota` (causa de la derrota).
- Desde la 10.0: `portada-idioma`, `mesa-contraste` y `mesa-2tintas`. Desde la 11.0: `mesa-2tronos`, `mesa-3tronos`, `mesa-estados`, `mesa-inmune`, `mesa-clasica` y `ajustes-paleta`. Desde la 12.0: `arbol-zoom` y `arbol-aviso` (el Altar).
- Desde la V40: `bufon-palo`, `bufon-cuenta` y `bufon-exacto` (las tres frases del Bufón en el Asalto 1), `bendicion` (oferta de Bendiciones antes del asalto 3), `mesa-rey` y `mesa-rey-<rey>` (el Rey jefe solo al frente, con su Furia y su frase), `mesa-monarca` (el Rey de Copas) y `monarcas` (la galería de los 4 Reyes). La fase 3 añade los suyos: HUD único, mapa ramificado, botín, «ELEGÍ UNA» y las bandejas de La Pulpería.

Para añadir uno: una entrada en `qa.ts` que monte el estado **de forma determinista** (semilla fija, sin `Date`, sin azar) y su nombre en `ALL`. Si tiene que caber sin desplazamiento, también en `NO_SCROLL`.

## Lo que afirma la auditoría del DOM

Todo se comprueba con cajas (`getBoundingClientRect`, `Range.getClientRects`) y estilos calculados, no con capturas:

1. **Sin desbordamiento horizontal** del documento ni de ningún elemento.
2. **Pantallas de una pieza** (`NO_SCROLL`): nada por debajo del borde.
3. **La mesa**: mano, enemigo activo y su fila, Amuletos y Bendiciones, cuenta, botones y poderes no se pisan; el Bufón y su bocadillo no tapan la mano, el enemigo ni los botones. Con 2 y 3 Casas la fila se reparte y las ausentes no se pintan (regla «tronos»).
4. **Tipografía**: hoy ≥ 13 px en todo nodo de texto visible, incluidos los `<text>` de SVG y de las cartas (tamaño efectivo), y ≥ 14 px en móvil para lo crítico. La constitución V40 pide **≥ 14 px en todo**: la fase 3 sube el umbral de `scripts/visual-qa.ts`.
5. **Ninguna cifra en la fuente de títulos**: un nodo de texto con dígitos cuya `font-family` calculada sea la de títulos falla.
6. **Cero recortes**: ningún nodo de texto ni botón visible queda cortado por un antepasado con `overflow: hidden | clip` ni por el borde inferior de la ventana. Dentro de una caja con desplazamiento vale si se llega desplazando y la caja enseña su aviso de tinta. `scrollWidth > clientWidth` en un texto delata puntos suspensivos.
7. **Dianas**: ≥ 44 px en todas las ventanas para botones, cartas de la mano, huecos de Amuletos y Bendiciones y controles; 48 px en la barra del pulgar del móvil; separación mínima entre vecinas.
8. **Con mando** (`mesa-mando`): insignias de botón a la vista y ninguna de teclado.
9. **Jerga**: ningún texto visible, `data-tip`, `aria-label`, `title`, `placeholder` ni `alt` contiene una palabra del tema viejo (la lista está en el apartado 5 de `SPECS/V6-normas-y-glosario.md`) ni de la baraja francesa o de lo retirado en la V40 (la lista completa vive en `tests/vocabulario.test.ts`). Una palabra que sea identificador interno no cuenta mientras no la lea el jugador.
10. **Cero errores** de página o de consola.
11. **Reglas de la 11.0**: «cara-limpia», «paleta», «daltonismo», «inmune», «estados», «ataque», «apuntado» y «tronos». Mueren «sello» y «ventaja».

La auditoría es necesaria y no suficiente: **abre las capturas**. Una cifra ilegible sobre una trama pasa todas las cajas.

## El mando virtual

`scripts/gamepad-qa.ts` inyecta un mando estándar del W3C (17 botones, 4 ejes) que sustituye a `navigator.getGamepads()`. El juego lo lee por su camino normal (`nav.ts`). La campaña de humo va de la portada al Secreto de la cripta sin teclado ni ratón: el bot de referencia decide cada jugada (`window.__qa.bot()`) y el mando la ejecuta, también la oferta de Bendiciones (cruceta y A).

Índices: `A 0 · B 1 · X 2 · Y 3 · LB 4 · RB 5 · LT 6 · RT 7 · Select 8 · Start 9 · L3 10 · R3 11 · cruceta 12–15`.

Toda acción del mando tiene su comprobación en la campaña de humo. Las de la 5.0 (siguen vigentes):

- **L3** descarta lo elegido (la mano cambia y suena el Contraataque).
- **LB / RB** con el foco en las reliquias (los Amuletos desde la 1d) las mueven a izquierda y derecha; fuera de ellas siguen abriendo Mazo y Lupa. La prueba de humo lo comprueba **en La Pulpería y también en combate**, sobre la mesa, con seis piezas: RB mueve la enfocada un hueco a la derecha, LB a la izquierda, y ninguna de las dos abre la Lupa.
- **R3** pide pantalla completa (se comprueba la llamada; sin ventana no hay modo real).

Al añadir una acción: botón en `BUTTONS` de `nav.ts`, fila en `CONTROLS` de `prompts.ts`, comprobación en `gamepad-qa.ts` y `npm run docs` para la tabla del README.

## Trampas conocidas

- Con el panel oculto o sin ventana las animaciones se congelan: la QA llama a `document.getAnimations().forEach((a) => a.finish())` antes de medir. Las infinitas no se terminan.
- `tsx` envuelve las funciones que se evalúan en la página con un ayudante `__name` que la página no conoce: se inyecta `NAME_SHIM`.
- El laboratorio (`npm run analyze:meta`) ocupa casi todos los núcleos: con él en marcha, Playwright agota tiempos de espera y los fotogramas no significan nada. Usa `LAB_HILOS=6` o espera.
- Dos celdas construyendo en `dist/web` a la vez se borran la construcción: cada una, su `QA_DIR`.
- Fuentes: la auditoría espera a `document.fonts.ready`; una fuente que no carga cambia todas las medidas.
- El panel hace su snapshot con las capturas de `artifacts/visual-qa`: si usaste `QA_OUT`, rehaz `npm run qa:visual` en español antes del snapshot.
- Nunca `git worktree` ni enlaces (junctions) a `node_modules` para construir aparte: en la 1b un `worktree remove --force` vació el `node_modules` del proyecto (se restauró con `npm ci`). Para construir aparte, `QA_DIR`.
- Todo en primer plano, con tope de 300 s por orden (`node scripts/con-tope.mjs 300 <orden…>`); si la QA visual entera no cabe, por ventanas (`VIEW=`) o por listas de estados.
