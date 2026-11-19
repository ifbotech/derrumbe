---
name: brutalist-print-ui
description: Reglas de imprenta de SANGRE Y PALO para cualquier cambio de interfaz. Tipografía mínima de 14 px, títulos en romana de inscripción y nunca cifras en la fuente de títulos, contraste WCAG (7:1 en cifras críticas, índices y pintas), dianas de 44 px (48 en la barra del pulgar del móvil), cero recortes en las cuatro ventanas y mínimo texto en la mesa, el HUD, el mapa, el botín y La Pulpería. Úsala al tocar CSS, SVG o el HTML de una pantalla, y al revisar una captura.
---

# Imprenta brutalista

SANGRE Y PALO es pixel-art geométrico y limpio sobre naipe marfil (desde la V40; antes, linograbado): paleta plana, píxeles nítidos (`shape-rendering="crispEdges"`), baraja española de cuatro colores. La estética no excusa la lectura. La regla que manda sobre todas: **el número y el palo de una carta se leen en menos de 0,3 segundos**.

## Las nueve reglas

| # | Regla | Cómo se mide |
|---|---|---|
| 1 | Texto **≥ 14 px** en todas partes (CSS y `<text>` de SVG, tamaño efectivo en pantalla; constitución V40, apartado 7). La QA aún mide 13 en escritorio y 14 en móvil: la fase 3 sube su umbral. | `npm run qa:visual` · `tests/imprenta.test.ts` |
| 2 | **Ninguna cifra en la fuente de títulos si no se lee.** Los títulos de pantalla van en una romana de inscripción (Cinzel) en versales, y nada más. | `npm run qa:visual` (nodos de texto con dígitos) |
| 3 | Cifras en sans o mono de peso alto, `font-variant-numeric: tabular-nums`, sobre **placa opaca**. | a ojo, en la captura |
| 4 | Contraste: texto ≥ **4,5:1**; cifras críticas, índices y siluetas de palo ≥ **7:1** (V40; la QA y la forja aún aceptan 4,5:1 en el emblema fuera de «Alto contraste»). | cuenta WCAG (abajo) · reglas «paleta» y «daltonismo» |
| 5 | Dianas ≥ **44 × 44 px** en escritorio y trackpad; barra del pulgar de **48 px** en móvil; ≥ 8 px entre dianas vecinas. | `npm run qa:visual` |
| 6 | **Cero recortes** en `1920×1080`, `1366×768`, `1280×800`, `390×844`. | `npm run qa:visual` (cajas del DOM) |
| 7 | Nada de blanco ni negro puros; lo que se anima solo cambia `transform` y `opacity`. | `npm run qa:smoke` (sonda de filtros) |
| 8 | **Ninguna palabra del tema viejo ni de la baraja francesa** (signos de palo franceses, Picas, Corazones, Diamantes, Tréboles, Reina, J, Q, K) en lo que lee el jugador, y el título del juego solo se escribe en `src/shared/brand.ts`. El palo se dice con su nombre (Espadas, Bastos, Oros, Copas) o con su pinta. | `tests/vocabulario.test.ts` · regla «jerga» de `npm run qa:visual` |
| 9 | **Mínimo texto**: iconos pixel-art grandes, cifras rotundas, una línea por efecto; sin párrafos ni subtítulos. Un HUD superior único y persistente (Vida · Oro · Mazo · tira de Amuletos y Bendiciones con cargas); el detalle, al pasar el ratón o el foco. | a ojo, en la captura · `npm run qa:visual` |

## 1 · Tipografía

- Variables del tema (`src/client/theme.css`): la romana de títulos en versales (`--title`, `--display`), la de etiquetas (`--cap`), la mono (`--mono`) y la de cifras (`--num`). Una cifra usa siempre `--num`.
- Qué cuenta como cifra: rango de carta (1 a 9; 10, 11 y 12 en la Corte), índice de la mano, Vida, Ataque y Furia del enemigo activo y de la fila, placas de Inmune, oro, Reinados, contadores, píldoras de Amuletos y Bendiciones (`+D`, `+M`, `×M`, cargas «Espadas +6», niveles «Espadas 2/4»), precios de La Pulpería, sellos S · A · B, insignias de tecla y de botón, deslizadores, la cuenta central (`Daño × Multi = Golpe`) y los números de Golpe que flotan.
- `clamp()` y `max()`: el mínimo es lo que se ve en 1366×768 y en móvil. `clamp(12px, …)` incumple aunque en 1080p se vea a 16.
- En SVG, el tamaño que cuenta es `font-size × (ancho en pantalla / ancho del viewBox)`. Una carta en miniatura (rejilla de la Mesa de lacre, visor del Mazo) no lleva letra menuda: versión simplificada con rango y palo grandes.
- Un título en versales tiene que leerse letra a letra: si un lector de pantalla visual confunde una letra (pasó una vez con un título de la 5.0), sube el tamaño o abre el espaciado.

## 2 · Placas de respaldo

Una cifra nunca va directamente sobre el dibujo pixel-art, una trama ni un retrato. Va sobre una placa: fondo opaco de la tinta contraria, borde de 2 px y sin transparencia. El dibujo se interrumpe debajo de la placa.

## 3 · Contraste (cuenta WCAG)

```js
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
```

Mide el color real de la captura con una muestra de píxeles, no el del CSS: la trama y el grano bajan el contraste efectivo. La baraja de serie es de cuatro colores. Hoy `src/client/theme.css` conserva las tintas de la 38.0 sobre marfil `#EFE6D5`: Espadas (`--suit-S`) `#161514`, Copas (`--suit-H`) `#C8232C` (4,5:1), Oros (`--suit-D`) `#1B5E9E` y Bastos (`--suit-C`) `#005442` (7,2:1); la Clásica y Dos tintas, en Ajustes. La fase 2 las rehace en pixel-art con la paleta de la constitución (acero azul, oro, carmesí, verde oliva, azul de cinta), y cada una se mide otra vez contra el 7:1. Casos que ya fallaron una vez (en la 5.0, con la baraja y las tintas de entonces): el rojo sobre crema, botón negro sobre gris («Copiar» la crónica), botón naranja sobre fondo naranja («Pasar»), las barras de Vida sobre fondo oscuro, índices de la mano sobre cartas rojas.

## 4 · Dianas y aire

- Botón «Cerrar» de toda ventana: sello tallado de 44 × 44 como mínimo, lejos de la esquina (≥ 8 px del borde).
- Cartas de la mano: cada una deja a la vista una franja pulsable ≥ 44 px; con trackpad no se puede acertar a menos.
- Mesa mínima (V40): dos botones, **Golpear** y **Descartar**, en la barra del pulgar, abajo, con 48 px en móvil; la mano de naipes grandes justo encima; la cuenta y las píldoras de Bendiciones al medio; el Bufón, el enemigo activo y su fila arriba, bajo el HUD único. Deshacer y AUTO, discretos en la barra de arriba.
- «ELEGÍ UNA» / «CHOOSE ONE» y las bandejas de La Pulpería: tres opciones (o una fila) grandes, cada una con su sello S · A · B o ★ Sinergia y su precio, y «Saltar» o «Volver al Mapa» siempre a la vista.
- Steam Deck (1280×800): nada pulsable a menos de 8 px del borde físico.

## 5 · Recortes

Una pantalla tiene dos salidas cuando el contenido no cabe:

1. **Reorganizar la rejilla** (menos columnas, tarjetas más compactas).
2. **Desplazamiento interno** en una caja con la clase de desplazamiento del tema, con **aviso de tinta desvanecida** en el borde por el que queda contenido, que desaparece al llegar al final.

Nunca: `overflow: hidden` sobre texto, puntos suspensivos en una descripción, ni un botón a medias bajo el borde. La mesa y la portada no se desplazan jamás; el mapa ramificado sí (es su forma), con el HUD fijo arriba.

## 6 · Lista antes de dar por buena una pantalla

- [ ] `QA_DIR=dist/qa-arte npm run qa:visual -- <estado>` sin fallos en las cuatro ventanas (la regla «jerga» incluida), y en inglés (`-- --lang=en`, regla «fuga»).
- [ ] Captura abierta y mirada en las cuatro ventanas (la auditoría del DOM no ve una cifra ilegible sobre una trama).
- [ ] Cifras: fuera de la fuente de títulos, tabulares, con placa.
- [ ] Contraste medido donde haya tinta sobre tinta.
- [ ] Probado con foco de teclado: todo lo pulsable es enfocable y el marco se ve.
- [ ] Sin blanco ni negro puros; sin filtros en nodos animados.
- [ ] Arte nuevo o retocado: `npm run forja` sin fallos (pixel-art nítido a 24 y a 300 px).
- [ ] Textos revisados contra el glosario de `SPECS/V6-normas-y-glosario.md` y `SPECS/V40-REFUNDACION.md`: ni una palabra del tema viejo ni de la baraja francesa, voseo, una línea por efecto.
