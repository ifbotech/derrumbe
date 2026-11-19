---
name: pixel-art-sprites
description: Reglas de dibujo del pixel-art «Dark Dithered & Textured» de SANGRE Y PALO (V40, fase 2c; antes «sin línea» de la 2b) — tramado Bayer, punteado y rayado a celda entera, paleta híper-saturada con sombras al violeta, naipes de la baraja española, pintas, la Corte, el Bufón, los Reyes, Amuletos, Trampas y Bendiciones. Luz de arriba a la izquierda, rampas con corrimiento de matiz, nada de contorno negro ni almohada, rejilla entera, tope de colores, silueta a 3:1 e índices a 7:1, y el linter `scripts/pixel-lint.ts`. Úsala antes de dibujar o retocar cualquier pieza de `src/client/pixel/`; la forja (`engraving-svg-forge`) mide lo que esta skill pide.
---

# Pixel-art de SANGRE Y PALO

Adaptada de dos fuentes leídas, no copiadas: la skill `pixel-art-sprites` (omer-metin/skills-for-antigravity) y el
linter de `uilianks/pxl` (licencia MIT; la nota de crédito está en `scripts/pixel-lint.ts` y `src/client/pixel/pincel.ts`).
Nunca se instala ni se ejecuta código de esos repos: se toman las reglas y se reescriben aquí.

## El estilo (fase 2c: «Dark Dithered & Textured»)

El usuario rechazó la 2b por «cutie» (limpia, infantil, colores planos suaves). El estilo vigente es pixel-art **oscuro,
tramado y saturado**, en el lenguaje de la baraja española: claroscuro de una luz de arriba a la izquierda, sombras que
caen al violeta e índigo hasta el abismo (`#0B0711` / `#120A24`, letras `0` y `9`), paleta híper-saturada (cobalto →
cian, esmeralda → lima, ámbar → oro solar, vino → carmesí → magenta, púrpura, turquesa) y **tramado** a celda entera en
vez de degradados. Naipe de papel hueso (`--naipe-papel: #f4efe2`) con su canto tramado `#D9CEB4` solo en la orilla y
el **recuadro** de tinta cortado por palo. **Sin contorno negro del lado de la luz**: la forma la separan del papel sus
propios tonos; el canto de sombra (abajo a la derecha) sí puede caer al abismo. Referencias de técnica y tono:
`artifacts/mision/v40/referencias-oscuras/` (y las de `referencias/`). Dibujos originales: se toma técnica, paleta y tono,
nunca figuras, composiciones ni píxeles.

### El tramado (`src/client/pixel/dither.ts`)

- `sombrear(l, claves, rampa, luz)`: pinta una masa entre los tonos de `rampa` (de lo hondo a la luz, p. ej.
  `'9vRre'`) según la luz de arriba a la izquierda, con canto de sombra (`borde`, `fuerzaBorde`), filo de luz (`brillo`)
  y `foco` opcional; el paso entre tonos se trama con Bayer 4 × 4 (`ancho` = cuánto dura la transición). `caja` limita.
- `hueco` (cuencas, bocas, el hueco de una copa), `franja`, `punteado` (stipple direccional) y `rayado` (grabado
  horizontal, vertical o diagonal a celda entera); `tonoTramado` y `umbral` para casos a mano.
- **Letras temporales** (`¤`, `§`): dibujá la masa con una letra que no use nadie y sombreala sola; así el tramado no
  invade lo vecino del mismo color.
- `l.canto(claros, k)`: pasa a `k` las celdas de la orilla con tonos claros, para que la silueta llegue a 3:1 sobre el
  papel (un oro claro, un cian, un turquesa necesitan su orilla en el tono medio).
- **Zona de trama declarada**: cada celda que pone el tramado queda marcada (`Lienzo.marcar`; la máscara viaja con el
  mapa por espejo, giro, recorte, pegado y recoloreo: `rejilla.ts`, `tramaDe`, `heredar`). El linter no cuenta esas
  celdas ni sus vecinas como huérfanos ni jaggies. Un píxel suelto puesto a mano sigue siendo ruido.
- `fondoTramado('mesa' | 'mapa' | 'pulperia')`: la penumbra de luz de vela de la interfaz, como SVG de patrones Bayer
  (`.svg`), `url("data:…")` (`.url`) y fondo CSS completo (`.css`).
- Dosis: **pesado** en Bufón, Reyes, Corte, dorsos y ases; **contenido** en las pintas del 2 al 9 (volumen dentro de la
  silueta, papel limpio alrededor) y en los iconos (bisel tramado, penumbra en el campo, filo y sombra del motivo).

## Reglas (las mide `npm run forja`, que corre el linter)

1. **Rejilla entera.** Naipe de 96 × 140 celdas (viewBox `-2 0 100 140`, el naipe es 5:7), Bufón 80 × 100, Reyes
   64 × 64, iconos 40 × 40 (Bendiciones 40 × 46). Escala entera, `shape-rendering="crispEdges"`, `image-rendering:
   pixelated`. Ni medias celdas, ni degradados, ni filtros.
2. **Primitivas, no rejillas a mano.** Se dibuja con `Lienzo` de `pixel/pincel.ts` (rect, elipse, polígono, trazo
   grueso, línea, `sombra`, espejo, `Escala`, `cintaOndulada`). Lo simétrico: la mitad y espejo. Un mapa de caracteres
   a mano solo para motivos chicos (iconos).
3. **Luz de un solo lado**: arriba a la izquierda. La sombra cae abajo y a la derecha de cada masa (`sombrear`, o
   `l.sombra(base, oscuro, 1, 0, n)` en lo chico), el brillo, una celda arriba a la izquierda. **Nada de almohada** (sombra en
   todo el borde) ni de **bandas** (anillos concéntricos de un píxel que copian la silueta).
4. **Rampas con corrimiento de matiz** (`RAMPA` de `pixel/paleta.ts`): la sombra se va al frío y la luz al cálido. Oro
   `zoyY`, carmesí `vRre`, acero `BbcC`, oliva `GglL`, cinta `TtcC`, madera `Nndx`, gris `ijJu`, piel `spPw`.
5. **Sin contorno negro pesado.** El linter falla si más del 35 % del borde **del lado de la luz** (arriba y a la
   izquierda) es tinta casi negra, neutra o abismal violácea. El canto de sombra puede hundirse en el abismo; las piezas a
   sangre (dorsos, fondos de retrato) no se miden.
6. **Tope de colores por pieza** (`TOPE_PALETA`): glifos 12, pintas 14, naipes 18, figuras 26, dorsos 22, Bufón 24,
   Reyes 26, iconos 20–22. Falla si se pasa en más de 6. Dos tonos casi iguales son un tono de más.
7. **Limpieza**: sin huérfanos (celdas sueltas de casi el mismo brillo que su entorno) ni jaggies (escalones
   irregulares en una diagonal). Más del 1 % de las celdas pintadas es fallo.
8. **Silueta**: en pintas y caras del naipe, al menos el **60 % del borde a 3:1** sobre el papel (WCAG 1.4.11). Un oro
   claro necesita su borde en `o` o `z`, no en `y`.
9. **Índices y glifos a 7:1**: las tintas de palo (`--suit-*`) y los tonos oscuros del glifo del índice, con halo marfil.
10. **Zonas del índice libres**: del 1 al 9, `ZONA_INDICE` de `pixel/naipes.ts` (arriba a la izquierda 0–15 × 0–32,
    abajo a la derecha 80–95 × 107–139); en la Corte, x ≤ 27, y ≤ 32 y x ≥ 69, y ≥ 107.
11. **Pintas del mismo tamaño** dentro de un naipe; del 4 al 9 no se encogen (la del 8 y el 9 es la misma que la del 4
    al 7, y la tirada ocupa ~78 % del área útil en 2 o 3 columnas); ninguna se pisa.
12. **Sin color**: los cuatro palos se distinguen en gris por la silueta (espada, garrote, moneda, cáliz) y por el
    recuadro tradicional cortado arriba y abajo: **Oros corrido, Copas 1 corte, Espadas 2, Bastos 3** (`CORTES` y
    `recuadroTramos` de `pixel/naipes.ts`). Los Reyes, a 24 px en gris, por la luz del fondo y del manto (`luzManto`).
13. **Tramado declarado, nunca a mano.** Todo dithering sale de `dither.ts` (queda en la máscara de trama). Nada de
    alfa, `opacity`, degradados ni filtros, tampoco en el CSS del arte (el vencido se apaga en el dibujo).

## El bucle

```bash
node scripts/con-tope.mjs 200 npx tsx scripts/lamina-pixel.ts [contact-sheet|pintas|figuras|numeros|bufon|reyes|iconos]
node scripts/con-tope.mjs 120 npx tsx scripts/pixel-lint.ts          # el linter solo, por grupo
node scripts/con-tope.mjs 200 npx vitest run tests/pixel.test.ts
```

La lámina sale en `artifacts/forja/<nombre>.png` y `-gris.png`. **Mirarla junto a las referencias**
(`artifacts/mision/v40/referencias/`) en cada pasada, también a tamaño de mesa (110–140 px) y de móvil (~70 px). La
crítica se escribe: ¿es indie comercial o «arte de programador»? Palitos, cabezas chicas, cintas en zigzag, manchas
sin forma y papel vacío son las señales de lo segundo.

## Errores que ya se cometieron

- (2c) Arte «cutie»: chanchito rosado, Bufón cachetón, Reyes de cara redonda y amable, fondos lisos pastel. Caras
  largas, cuencas hondas, cejas que bajan, coronas afiladas y la penumbra tramada detrás.
- (2c) La copa con tapa de cúpula a rayas parecía un trompo: cáliz abierto con boca de oro y el vino en sombra.
- (2c) Un fondo de retrato con el mismo brillo en los cuatro Reyes: a 24 px en gris se confunden (la forja pide 0,1).

- Rejilla de 20 × 30 con contorno negro de un píxel: «Paint», figuras de Atari. La densidad la da la rejilla grande.
- Pintas del 4 al 9 achicadas para que entren: se dejan del tamaño de la del 4 y se ajusta la tirada.
- Cintas dibujadas como polilínea de tramos alternos: zigzag de alambre. Usar `cintaOndulada` con pocas ondas.
- Sombrear un motivo a doble celda celda por celda: huérfanos. Sombrear solo donde la vecina de la luz es del mismo color.
- Rayos o bordes en `y` sobre el marfil: la silueta no llega a 3:1.
- La figura que alza la pinta delante de la cara: la tapa. La pinta va del lado libre, lejos del índice.
