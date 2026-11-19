// V40 · fase 2 · Las cuatro pintas de la baraja española en pixel-art: espada, basto, oro y copa. Cada una con su
// silueta propia (se distinguen en gris y a 24 px) y su contorno de un píxel en la tinta oscura del palo (≥ 7:1 sobre
// el marfil). Los rellenos son claros (acero, oliva claro, oro) o tan oscuros como el contorno: ningún tono medio
// rebaja el contraste de la silueta.
import type { Suit } from '../../rules/engine';
import { LETRA_PALO, tintas } from './paleta';
import { contorno, medida, pegar, lienzo, rects, type Mapa } from './rejilla';

/** Espada de punta arriba: hoja de acero con su vaceo, guarnición de oro con gavilanes y pomo. */
const ESPADA = contorno(
  [
    '....C....',
    '...CCc...',
    '...C1c...',
    '...C1c...',
    '...C1c...',
    '...C1c...',
    '...C1c...',
    '...C1c...',
    '...C1c...',
    '...C1c...',
    '...C1c...',
    '...C1c...',
    '..yyyyy..',
    'YyyyyyyyY',
    'y...1...y',
    '....1....',
    '....1....',
    '...yyy...',
    '...yYy...',
    '...yyy...',
  ],
  '1',
);

/**
 * Basto: garrote de madera nudosa, grueso arriba y afinado hacia el puño. Madera castaña oscura (d, ≥ 7:1 sobre el
 * marfil) con su veta clara (x) a la izquierda; los muñones de rama cortados asoman a los lados con la cara del corte
 * clara, y los nudos son puntos claros. Arriba, un brote de dos hojas; abajo, el puño envuelto en lacre y la virola de
 * oro.
 */
const BASTO = contorno(
  [
    '.ll......ll.',
    '.lGl....lGl.',
    '..llG..Gll..',
    '....dddd....',
    '...dxdddd...',
    '..ddxddddd..',
    '..dxdddddddx',
    '..dxddxdddd.',
    'xddxdddddd..',
    '..dxddddxd..',
    '...dxddddd..',
    '...dxdddddx.',
    '...dxdddd...',
    '...dxdxdd...',
    '...dxdddd...',
    '...rrrrrr...',
    '...dxdddd...',
    '...rrrrrr...',
    '...yyyyyy...',
    '....yYyy....',
  ],
  '2',
);

/** Oro: moneda de borde oscuro, cerco interior y la efigie roja de perfil en el campo. */
const ORO = (() => {
  const n = 15;
  const c = (n - 1) / 2;
  const efigie = [
    '...RRR.',
    '..RRRRR',
    '.RRRRRR',
    'RRRRRR.',
    '.RRRRR.',
    '..RRR..',
    '.RRRRR.',
  ];
  let m = Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => {
      const d = Math.hypot(x - c, y - c);
      if (d > 7.2) return '.';
      if (d > 5.6) return x + y < 2 * c - 3 ? 'Y' : 'y';
      if (d > 4.6) return '3';
      return 'Y';
    }).join(''),
  );
  m = pegar(m, efigie, 4, 4);
  return contorno(m, '3');
})();

/** Copa: cáliz de carmesí con su cinta azul, borde, nudo y pie de oro. */
const COPA = contorno(
  [
    'yyyyyyyyyyyy',
    'RwRRRRRRRRRR',
    'RwRRRRRRRRRR',
    'TTTTTTTTTTTT',
    'RwRRRRRRRRRR',
    '.RRRRRRRRRR.',
    '..RRRRRRRR..',
    '...RRRRRR...',
    '.....yy.....',
    '....yyyy....',
    '.....yy.....',
    '.....yy.....',
    '...yyyyyy...',
    '.yyyyyyyyyy.',
  ],
  '4',
);

const CRUDA: Record<Suit, Mapa> = { S: ESPADA, C: BASTO, D: ORO, H: COPA };

/** La caja común de las pintas del naipe (18 × 22 celdas): todas a la misma escala de píxel. */
export const CAJA: [number, number] = [18, 22];
const enCaja = (m: Mapa): string[] => {
  const [w, h] = medida(m);
  return pegar(lienzo(CAJA[0], CAJA[1]), m, Math.floor((CAJA[0] - w) / 2), Math.floor((CAJA[1] - h) / 2));
};

/** El mapa de la pinta de un palo, recortado a su silueta. */
export const pintaMapa = (s: Suit): Mapa => CRUDA[s];
/** El mapa de la pinta centrado en la caja común del naipe. */
export const pintaEnCaja = (s: Suit): Mapa => enCaja(CRUDA[s]);

const T = tintas();
/** Los rectángulos de la pinta de un palo (en celdas de su mapa). */
export const pintaRects = (s: Suit, ox = 0, oy = 0, k = 1): string => rects(CRUDA[s], T, ox, oy, k);

/** La pinta suelta: un SVG con el `viewBox` justo de su silueta. */
export function pintaSvg(s: Suit, cls = ''): string {
  const [w, h] = medida(CRUDA[s]);
  return `<svg class="glyph px-pinta s-${s} ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${pintaRects(s)}</svg>`;
}

const HALO: Record<Suit, Mapa> = { S: contorno(ESPADA, 'w'), C: contorno(BASTO, 'w'), D: contorno(ORO, 'w'), H: contorno(COPA, 'w') };
/**
 * La pinta del palo para la interfaz (índice del naipe, poderes, cabeceras, la cuenta): con un halo de marfil de una
 * celda alrededor del contorno, para que se lea igual sobre el papel que sobre la mesa oscura.
 */
export function pintaHalo(s: Suit, cls = ''): string {
  const [w, h] = medida(HALO[s]);
  return `<svg class="glyph px-pinta s-${s} ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(HALO[s], T)}</svg>`;
}

/** Los símbolos de las cuatro pintas en su caja común, para usarlos con `<use href="#px-pinta-S">`. */
export function pintaSimbolos(): string {
  return (['S', 'C', 'D', 'H'] as Suit[])
    .map((s) => `<symbol id="px-pinta-${s}" viewBox="0 0 ${CAJA[0]} ${CAJA[1]}" shape-rendering="crispEdges">${rects(enCaja(CRUDA[s]), T)}</symbol>`)
    .join('');
}

/** La letra de la tinta oscura del palo en los mapas (para pintas del marco y adornos). */
export const letraDe = (s: Suit) => LETRA_PALO[s];
