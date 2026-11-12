---
name: brutalist-print-ui
description: Reglas de imprenta de CORONA ROTA para cualquier cambio de interfaz. Tipografía mínima de 13 px, títulos en romana de inscripción y nunca cifras en la fuente de títulos, contraste WCAG, dianas de 44 px (48 en la barra del pulgar del móvil) y cero recortes en las cuatro ventanas. Úsala al tocar CSS, SVG o el HTML de una pantalla, y al revisar una captura.
---

# Imprenta brutalista

CORONA ROTA es linograbado: tinta plana, papel crema, cuatro tintas de taller. La estética no excusa la lectura. La regla que manda sobre todas: **el número y el palo de una carta se leen en menos de 0,3 segundos**.

## Las ocho reglas

| # | Regla | Cómo se mide |
|---|---|---|
| 1 | Texto **≥ 13 px** en todas partes (CSS y `<text>` de SVG, tamaño efectivo en pantalla). En móvil, cifras críticas y descripciones **≥ 14 px**. | `npm run qa:visual` · `tests/imprenta.test.ts` |
| 2 | **Ninguna cifra en la fuente de títulos si no se lee.** Los títulos de pantalla van en una romana de inscripción (Cinzel) en versales, y nada más. | `npm run qa:visual` (nodos de texto con dígitos) |
| 3 | Cifras en sans o mono de peso alto, `font-variant-numeric: tabular-nums`, sobre **placa opaca**. | a ojo, en la captura |
| 4 | Contraste: texto ≥ **4,5:1**; cifras críticas y palos sobre crema ≥ **7:1**. | cuenta WCAG (abajo) |
| 5 | Dianas ≥ **44 × 44 px** en escritorio y trackpad; barra del pulgar de **48 px** en móvil; ≥ 8 px entre dianas vecinas. | `npm run qa:visual` |
| 6 | **Cero recortes** en `1920×1080`, `1366×768`, `1280×800`, `390×844`. | `npm run qa:visual` (cajas del DOM) |
| 7 | Nada de blanco ni negro puros; lo que se anima solo cambia `transform` y `opacity`. | `npm run qa:smoke` (sonda de filtros) |
| 8 | **Ninguna palabra del tema viejo** en lo que lee el jugador, y el título del juego solo se escribe en `src/shared/brand.ts`. | `tests/vocabulario.test.ts` · regla «jerga» de `npm run qa:visual` |

## 1 · Tipografía

- Variables del tema (`src/client/theme.css`): la romana de títulos en versales (`--title`, `--display`), la de etiquetas (`--cap`), la mono (`--mono`) y la de cifras (`--num`). Una cifra usa siempre `--num`.
- Qué cuenta como cifra: rango de carta, índice de la mano (1–9), Vida y Ataque de un trono o de un guardia, placas de Inmune, guardias, oro, Reinados, contadores, píldoras de las reliquias (`+D`, `+M`, `×M`), insignias de tecla y de botón, deslizadores, la cuenta central (`Daño × Multi = Golpe`) y los números de Golpe que flotan.
- `clamp()` y `max()`: el mínimo es lo que se ve en 1366×768 y en móvil. `clamp(12px, …)` incumple aunque en 1080p se vea a 16.
- En SVG, el tamaño que cuenta es `font-size × (ancho en pantalla / ancho del viewBox)`. Una carta en miniatura (rejilla de la Mesa de lacre, visor del Mazo) no lleva letra menuda: versión simplificada con rango y palo grandes.
- Un título en versales tiene que leerse letra a letra: si un lector de pantalla visual confunde una letra (pasó una vez con un título de la 5.0), sube el tamaño o abre el espaciado.

## 2 · Placas de respaldo

Una cifra nunca va directamente sobre la trama del grabado ni sobre un retrato. Va sobre una placa: fondo opaco de la tinta contraria, borde de 2 px y sin transparencia. La trama del palo se interrumpe debajo de la placa.

## 3 · Contraste (cuenta WCAG)

```js
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
```

Mide el color real de la captura con una muestra de píxeles, no el del CSS: la trama y el grano bajan el contraste efectivo. Los cuatro palos son Picas (hierro oscuro), Diamantes (oro bruñido), Corazones (carmesí real) y Tréboles (verdín profundo), con las mismas cuatro tramas de siempre. Casos que ya fallaron una vez (en la 5.0, con las tintas de entonces): ♥ sobre crema, botón negro sobre gris («Copiar» la crónica), botón naranja sobre fondo naranja («Pasar»), las barras de Vida sobre fondo oscuro, índices de la mano sobre cartas de corazones.

## 4 · Dianas y aire

- Botón «Cerrar» de toda ventana: sello tallado de 44 × 44 como mínimo, lejos de la esquina (≥ 8 px del borde).
- Cartas de la mano: cada una deja a la vista una franja pulsable ≥ 44 px; con trackpad no se puede acertar a menos.
- Móvil: las acciones de combate (Golpear, La Manga, Descartar, Rebobinar) viven en la barra del pulgar, abajo, con 48 px; la mano va justo encima; tronos y tu Vida, arriba.
- Steam Deck (1280×800): nada pulsable a menos de 8 px del borde físico.

## 5 · Recortes

Una pantalla tiene dos salidas cuando el contenido no cabe:

1. **Reorganizar la rejilla** (menos columnas, tarjetas más compactas).
2. **Desplazamiento interno** en una caja con la clase de desplazamiento del tema, con **aviso de tinta desvanecida** en el borde por el que queda contenido, que desaparece al llegar al final.

Nunca: `overflow: hidden` sobre texto, puntos suspensivos en una descripción, ni un botón a medias bajo el borde. La mesa y la portada no se desplazan jamás.

## 6 · Lista antes de dar por buena una pantalla

- [ ] `QA_DIR=dist/qa-arte npm run qa:visual -- <estado>` sin fallos en las cuatro ventanas (la regla «jerga» incluida).
- [ ] Captura abierta y mirada en las cuatro ventanas (la auditoría del DOM no ve una cifra ilegible sobre una trama).
- [ ] Cifras: fuera de la fuente de títulos, tabulares, con placa.
- [ ] Contraste medido donde haya tinta sobre tinta.
- [ ] Probado con foco de teclado: todo lo pulsable es enfocable y el marco se ve.
- [ ] Sin blanco ni negro puros; sin filtros en nodos animados.
- [ ] Textos revisados contra el glosario de `SPECS/V6-normas-y-glosario.md`: ni una palabra del tema viejo.
