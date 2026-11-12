---
name: engraving-svg-forge
description: Bucle de dibujar y comprobar para el arte SVG de DERRUMBE (cartas, herramientas, palos, jefes). Renderiza cada pieza suelta a 24 px y a 300 px, mide densidad de tinta y claridad de silueta, y garantiza las cuatro tramas de palo aptas para daltonismo. Úsala al dibujar o retocar cualquier SVG del juego.
---

# Forja de grabado SVG

Todo el arte de DERRUMBE es SVG dibujado en código (`src/client/card.ts`, `art.ts`, `glyphs.ts`, `engraving.ts`). Una pieza está bien cuando funciona en sus dos tamaños extremos: **24 px** (icono en una ficha, miniatura del mazo) y **300 px** (lupa de grabador). Esta skill es un bucle: dibujar → renderizar → medir → mirar → corregir.

## El bucle

```bash
npm run forja                      # todas las piezas
npm run forja -- palos             # solo los palos y sus tramas
npm run forja -- cartas herramientas
```

`scripts/svg-forge.ts` abre el juego construido con `?qa=1` y usa el banco de `src/client/forja-qa.ts` (`window.__forja`): monta cada pieza suelta sobre papel crema, la fotografía a 24 y a 300 px y guarda:

- `artifacts/svg-forge/<grupo>/<id>@24.png` y `@300.png`
- `artifacts/svg-forge/informe.json` con las medidas de cada pieza y de cada par de tramas
- `artifacts/svg-forge/hoja.png`, la hoja de contacto (cada pieza a 96 y a 24 px), y `hoja-gris.png`, la misma en escala de grises

Grupos: `palos`, `tramas`, `cartas` (as, 7, 10 y figuras de cada palo, y el comodín), `herramientas` (todas) y `jefes`. Una pieza nueva entra sola si está en `TOOLS`, `BOSSES` o `ALL_CARDS`; un grupo nuevo se añade en `lista()` y `nodo()` de `forja-qa.ts`.

Sale con error si hay un **fallo**. Los **avisos** no rompen: piden mirar la pieza. **Después de cada pasada, abre las dos hojas y las piezas que cambiaste**: las medidas detectan lo que está mal, no lo que es feo.

## Qué mide

«Tinta» es todo píxel cuya luminancia no pasa de la mitad de la del papel. Por eso una trama solo existe para la forja si alterna tinta oscura con claros de papel: justo lo que la hace visible sin color.

| Medida | Qué es | Falla | Avisa |
|---|---|---|---|
| Densidad de tinta a 300 px | fracción de tinta dentro de la caja de la pieza | iconos (palos, herramientas): < **3 %** (en blanco) o > **93 %** (mancha). Cartas y retratos van a sangre: solo fallan sin tinta | iconos fuera de **12–62 %** |
| Silueta a 24 px | parte del alto o del ancho que ocupa el mayor cuerpo conexo de tinta | sin tinta a 24 px | < **55 %**: se deshace en motas |
| Deriva de densidad | diferencia de densidad entre 300 y 24 px | — | > **18 puntos**: trazos demasiado finos, a 24 px se empasta o se borra |
| Contraste del glifo de palo | mediana de la tinta del glifo contra el papel (WCAG) | < **7:1** | — |
| Tramas dos a dos | firma de dirección de los trazos (—, \|, \\, /) y fracción de píxeles distintos | un par con forma < **0,12** y píxeles < **25 %**; o una trama casi lisa (< 8 % o > 92 % de tinta) | — |

Línea base de la V4, para saber de dónde se venía: glifos ♦ 3,22:1, ♥ 5,02:1 y ♣ 6,63:1 sobre el papel, y la trama de ♣ lisa en luminancia (99 % de tinta: en gris se confundía con la de ♠).

## Las cuatro tramas de palo

Los palos se distinguen **sin color**. Cada uno tiene su trama, definida una sola vez como `<pattern>` en `engraving.ts` y reutilizada en el fondo de la carta, en la etiqueta de la torre y en la rueda de materiales:

| Palo | Material | Trama | Cómo reconocerla a 24 px |
|---|---|---|---|
| ♠ | ACERO | rayado diagonal a 45° | líneas paralelas inclinadas |
| ♦ | VIDRIO | punteado | puntos sueltos, sin líneas |
| ♥ | LADRILLO | aparejo de ladrillo | hiladas horizontales con juntas alternas |
| ♣ | HORMIGÓN | rayado cruzado estructural | retícula de dos direcciones |

Reglas:

1. La trama es fondo: no pasa por debajo del rango ni del glifo (ahí va la placa de respaldo).
2. Periodo de la trama ≥ 6 px a tamaño de mano; por debajo, vibra y cansa la vista.
3. El glifo lleva contorno de tinta: separa la figura del papel aunque el relleno sea claro.
4. Prueba de daltonismo: la hoja de contacto en escala de grises (`hoja-gris.png`) tiene que dejar los cuatro palos inconfundibles. Las tramas viven en los patrones `pat-S`, `pat-D`, `pat-H` y `pat-C`; si cambian de id, cambia también `retal()` en `forja-qa.ts`.

## Cómo se dibuja una pieza nueva

1. **Silueta primero**: una forma cerrada que se reconozca rellena de negro. Si la silueta no dice qué es, los detalles no lo arreglan.
2. **Tres grosores**: contorno (3), forma (2), buril (1,5). Nada más fino.
3. **Tinta plana**: una tinta por material, sin degradados ni filtros. El grano del papel lo pone el lienzo, no la pieza.
4. **Sombra de buril**: rayado paralelo en el lado de sombra, siempre en la misma dirección dentro de una pieza.
5. `viewBox` cuadrado para iconos (`0 0 48 48`) y `0 0 100 140` para cartas. Coordenadas enteras o medias.
6. Sin `<text>` en un icono: una letra a 24 px no se lee. En cartas, el texto obedece a `brutalist-print-ui` (≥ 13 px efectivos; en miniatura, versión simplificada).

## Errores que ya se cometieron

- Trama más oscura que el número: el número desaparece. La trama va al 35–45 % de la tinta, y nunca bajo la cifra.
- Iconos del cinturón con líneas de 1 px: a 24 px eran «basura visual». Menos líneas y más gruesas.
- ♥ en almagre claro sobre crema: 3,1:1. Con contorno de tinta y almagre más oscuro, pasa de 7:1.
- Un `<filter>` de ruido en un nodo que se anima: tira los fotogramas. El ruido se hornea una vez en el lienzo.
