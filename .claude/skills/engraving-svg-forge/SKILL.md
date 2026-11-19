---
name: engraving-svg-forge
description: Forja pixel-art de SANGRE Y PALO (desde la V40; antes, de grabado). Bucle de dibujar y medir para el arte SVG (naipes de la baraja española, pintas, Reyes, Amuletos, el Bufón): renderiza cada pieza suelta a 24 px y a 300 px, mide densidad de tinta y claridad de silueta, y garantiza los cuatro palos distinguibles sin color y con contraste ≥ 7:1. Úsala al dibujar o retocar cualquier SVG del juego.
---

# Forja pixel-art

El nombre de la carpeta (`engraving-svg-forge`) es un identificador y no cambia: desde la V40 es la forja **pixel-art**. Todo el arte de SANGRE Y PALO es SVG dibujado en código (`src/client/card.ts`, `art.ts`, `glyphs.ts`, `engraving.ts`, `grabado12.ts`, `arte-rey.ts`): pixel-art geométrico y limpio sobre naipe marfil (`SPECS/V40-REFUNDACION.md`, apartado 8). El grabado oscuro ya no es el estilo dominante. Una pieza está bien cuando funciona en sus dos tamaños extremos: **24 px** (icono en una ficha o en el HUD, miniatura del Mazo) y **300 px** (la Lupa). Esta skill es un bucle: dibujar → renderizar → medir → mirar → corregir. **Las reglas de dibujo del pixel-art «sin línea» (fase 2b) están en la skill `pixel-art-sprites`**: léela antes de tocar `src/client/pixel/`. La forja corre primero su linter (`scripts/pixel-lint.ts`) y cuenta sus fallos como fallos de la forja.

## El bucle

```bash
npm run forja                      # todas las piezas
npm run forja -- palos             # solo los palos y sus tramas
npm run forja -- cartas herramientas
```

`scripts/svg-forge.ts` abre el juego construido con `?qa=1` y usa el banco de `src/client/forja-qa.ts` (`window.__forja`): monta cada pieza suelta sobre papel marfil, la fotografía a 24 y a 300 px y guarda:

- `artifacts/svg-forge/<grupo>/<id>@24.png` y `@300.png`
- `artifacts/svg-forge/informe.json` con las medidas de cada pieza y de cada par de tramas
- `artifacts/svg-forge/hoja.png`, la hoja de contacto (cada pieza a 96 y a 24 px), y `hoja-gris.png`, la misma en escala de grises

Grupos (son identificadores y no cambian de nombre): `palos`, `tramas`, `cartas` (el 1, el 7 y las figuras de cada palo, y el Comodín), `herramientas` (todas las Reliquias; los Amuletos desde el tramo 1d), `especiales` (las Trampas del Bufón desde la 1d), `servicios`, `jefes` (los 4 Reyes jefe de `BOSSES`), `monarcas` (retratos en calma y vencidos; hasta la fase 2, los del monarca viejo de cada palo, `MONARCH_IDS` de `art.ts`) y `piezas`. Una pieza nueva entra sola si está en `TOOLS`, `BOSSES` o `ALL_CARDS`; un grupo nuevo (el Bufón y sus cuadros, por ejemplo) se añade en `lista()` y `nodo()` de `forja-qa.ts`.

Sale con error si hay un **fallo**. Los **avisos** no rompen: piden mirar la pieza. **Después de cada pasada, abre las dos hojas y las piezas que cambiaste**: las medidas detectan lo que está mal, no lo que es feo. Todo en primer plano con tope de 300 s (`node scripts/con-tope.mjs 300 npm run forja -- <grupos>`); si la forja entera no cabe, va por grupos.

## Qué mide

«Tinta» es todo píxel cuya luminancia no pasa de la mitad de la del papel. En pixel-art cuenta igual: el contorno de un píxel de tinta y las masas oscuras de la pieza.

| Medida | Qué es | Falla | Avisa |
|---|---|---|---|
| Densidad de tinta a 300 px | fracción de tinta dentro de la caja de la pieza | iconos (palos, Amuletos, especiales, servicios): < **3 %** (en blanco) o > **93 %** (mancha). Cartas y retratos van a sangre: solo fallan sin tinta. **Grupo `herramientas`: fuera de 22–58 %** | iconos fuera de ese grupo, fuera de **12–62 %** |
| Silueta a 24 px | parte del alto o del ancho que ocupa el mayor cuerpo conexo de tinta | grupo `herramientas`: < **55 %**; cualquier pieza: sin tinta a 24 px | resto de iconos: < **55 %**, se deshace en motas |
| Deriva de densidad | diferencia de densidad entre 300 y 24 px | — | > **18 puntos**: píxeles demasiado finos, a 24 px se empasta o se borra |
| Contraste de la pinta | mediana de la tinta de la pinta contra el papel (WCAG) | < **4,5:1** (`LIMITS.suitContrast`; la constitución pide **≥ 7:1** en índices y siluetas: subir el límite cuando la paleta de la fase 2 lo cumpla) | — |
| Tramas dos a dos | firma de dirección de los trazos (—, \|, \\, /) y fracción de píxeles distintos | un par con forma < **0,12** y píxeles < **25 %**; o una trama casi lisa (< 8 % o > 92 % de tinta) | — |

Los umbrales salen de `LIMITS` en `scripts/svg-forge.ts` (`relicInk: [0.22, 0.58]`, `relicBody: 0.55`, `inkWarn: [0.12, 0.62]`, `suitContrast: 4.5`).

## Los Amuletos

Sustituyen a las 52 Reliquias en el tramo 1d: **20 a 24** en **4 familias** de 5 o 6, una por Rey y palo, emparentadas en color, marco e icono (por ejemplo: mate curado, facón de plata, taba cargada, porrón, naipes marcados, boleadoras, escudo de cuero, moneda falsa). Cada uno tiene que pasar los dos tamaños y la densidad de 22–58 %: ni hilo suelto ni borrón. Hasta que cierre la 1d, las Reliquias siguen en el grupo `herramientas` con sus ids e imágenes de `SPECS/V6-biblia-de-nombres.md`.

## Los cuatro palos sin color

Los palos se distinguen **sin color**: cada uno tiene su silueta y su pinta del marco (cortes en los bordes superior e inferior del naipe, como en la baraja española tradicional). Los códigos internos de palo no cambian.

| Código | Palo | Silueta | Pinta del marco | Color de la constitución (fase 2) | Tinta de hoy (`theme.css`, la de la 38.0) |
|---|---|---|---|---|---|
| `S` | Espadas | espada | 3 cortes | acero azul y empuñadura de oro | `#161514` |
| `C` | Bastos | garrote con brotes | 4 cortes | verde oliva, lacre y oro | `#005442` |
| `D` | Oros | moneda con efigie | 1 corte | oro con efigie roja | `#1B5E9E` |
| `H` | Copas | cáliz | 2 cortes | carmesí, azul y oro | `#C8232C` |

Reglas:

1. Nada va por debajo del índice ni de la pinta de la esquina: ahí va la placa de respaldo.
2. Sin contorno negro (fase 2b): la pinta se separa del papel por sus propios tonos oscuros; al menos el 60 % de su borde llega a 3:1 sobre el marfil (`SILUETA` de `scripts/pixel-lint.ts`) y el índice y su glifo, a 7:1.
3. Prueba de daltonismo: la hoja de contacto en escala de grises (`hoja-gris.png`) tiene que dejar los cuatro palos inconfundibles por la silueta y las pintas del marco.
4. Hasta que la fase 2 las retire, las tramas de palo viven en los patrones `pat-S`, `pat-D`, `pat-H` y `pat-C` (enemigos y poderes) y se miden dos a dos; si cambian de id, cambia también `retal()` en `forja-qa.ts`.

## Los naipes y el Bufón

- **1 a 9**: las pintas repetidas en su disposición tradicional sobre el marfil, con el índice grande en placa; el 1 de cada palo, ornamentado. **Comodines**: 2 de serie.
- **La Corte**, de cuerpo entero: 10 **Sota** de pie, 11 **Caballo** a caballo, 12 **Rey** con corona. Los 4 Reyes jefe llevan además retrato propio.
- **El Bufón**: marotte (cetro de bufón) con máscara pálida, capucha roja de puntas con cascabeles de oro y cintas azules. Cuadros pixel-art de reposo, risa, burla, ojos que brillan y cara sombría; con «Reducir movimiento», un cuadro fijo. Cada cuadro pasa la forja como pieza suelta.
- Todo original, en el lenguaje de las referencias del usuario: nada de nombres, personajes ni arte de otros juegos.

## Cómo se dibuja una pieza nueva

1. **Silueta primero**: una forma cerrada que se reconozca rellena de un solo color. Si la silueta no dice qué es, los detalles no lo arreglan.
2. **Rejilla de píxeles entera**: `<path>` con coordenadas enteras en la rejilla de la pieza (naipe 96 × 140, Bufón 80 × 100, Reyes 64 × 64, iconos 40 × 40) y `shape-rendering="crispEdges"`. Nada de coordenadas medias, antialias, degradados, desenfoque ni filtros.
3. **Sin línea**: nada de contorno de tinta alrededor de cada masa (el linter falla si más del 35 % del borde es tinta oscura neutra).
4. **Rampas de 3 o 4 tonos con corrimiento de matiz** (`RAMPA` de `pixel/paleta.ts`), luz arriba a la izquierda y sombra abajo a la derecha, sin almohada ni bandas. Detalle en `pixel-art-sprites`.
5. `viewBox` cuadrado para iconos y el del naipe para cartas, en múltiplos del lado del píxel.
6. Sin `<text>` en un icono: una letra a 24 px no se lee. En cartas, el texto obedece a `brutalist-print-ui` (≥ 14 px efectivos; en miniatura, versión simplificada).

## Errores que ya se cometieron

- Trama más oscura que el número: el número desaparece. Nunca bajo la cifra.
- Iconos de las reliquias con líneas de 1 px de pantalla: a 24 px eran «basura visual». Menos líneas y más gruesas; en pixel-art, menos celdas y más grandes.
- El rojo claro sobre crema: 3,1:1. Con un carmesí más oscuro en el borde (no un contorno negro), la silueta pasa de 3:1 y el índice, de 7:1.
- La fase 2 de la V40 con rejilla de 20 × 30 y contorno negro de un píxel: «Paint» y figuras de Atari. Se rehízo sin línea en 96 × 140 (fase 2b).
- Un `<filter>` de ruido en un nodo que se anima: tira los fotogramas. El ruido se hornea una vez en el lienzo.
- Un SVG pixel-art sin `crispEdges` o con coordenadas medias se ve borroso al escalar: el píxel deja de ser píxel.
