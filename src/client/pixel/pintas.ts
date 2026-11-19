// V40 · fase 2b · Las cuatro pintas de la baraja española en pixel-art «sin línea»: espada, basto, oro y copa. Sin
// contorno negro: cada masa lleva su tono propio y su lado de sombra abajo a la derecha (luz de arriba a la izquierda).
//
// Tres tamaños por palo, todos de la misma rejilla del naipe (96 × 140 celdas):
//   · chica (4 a 9): espada 13 × 37, basto 14 × 36, oro 26 × 26, copa 26 × 27. El 8 y el 9 usan la misma que el 4.
//   · grande (2 y 3): espada 17 × 114, basto 24 × 110, oro 38 × 38, copa 34 × 40.
//   · el glifo de la interfaz (índice, poderes, la cuenta): compacto, en las tintas hondas del palo (≥ 7:1) y con un
//     halo de marfil de una celda para leerse también sobre la mesa oscura.
import type { Suit } from '../../rules/engine';
import { tintas, trocar, type Material } from './paleta';
import { Lienzo } from './pincel';
import { contorno, medida, rects, type Mapa } from './rejilla';

const T = tintas();

// ───────────── espada ─────────────

/** Espada de punta arriba. `w` ancho total (impar), `hoja` filas de hoja, `puño` filas de empuñadura. */
function espada(w: number, hoja: number, puño: number, ancho: number, ornada: boolean): string[] {
  const pomo = ornada ? 9 : 3;
  const guarda = ornada ? 4 : 2;
  const h = hoja + guarda + puño + pomo;
  const l = new Lienzo(w, h);
  const cx = (w - 1) / 2;
  const x0 = cx - (ancho - 1) / 2;
  const punta = Math.max(2, ancho);
  // hoja: canto de acero, vaceo claro y filo en sombra a la derecha
  for (let y = 0; y < hoja; y++) {
    const t = y < punta ? Math.floor(((punta - y) * ancho) / (2 * punta)) : 0;
    for (let x = x0 + t; x <= x0 + ancho - 1 - t; x++) l.set(x, y, 'c');
  }
  l.sombra('c', 'b', 1, 0, ancho >= 5 ? 2 : 1);
  if (ancho >= 3) l.rect(x0 + 1, punta, ornada ? 2 : 1, hoja - punta - 1, 'C');
  if (ornada) l.rect(cx, punta + 2, 1, hoja - punta - 6, 'b');
  // guarda: gavilanes de oro con las puntas vueltas hacia arriba
  const gy = hoja;
  l.rect(1, gy, w - 2, guarda - 1, 'y');
  l.rect(1, gy + guarda - 1, w - 2, 1, 'o');
  l.set(0, gy - 1, 'y').set(0, gy, 'o').set(w - 1, gy - 1, 'y').set(w - 1, gy, 'o');
  if (ornada) {
    l.rect(2, gy, w - 4, 1, 'Y');
    l.rect(cx - 2, gy - 2, 5, 2, 'y').set(cx - 2, gy - 2, 'Y');
    l.set(1, gy - 2, 'y').set(w - 2, gy - 2, 'y');
    // el guardamano en D, de la guarda al pomo, a la derecha
    const py = gy + guarda + puño;
    l.rect(w - 3, gy + guarda, 2, puño, 'o').rect(w - 3, gy + guarda, 1, puño, 'y');
    l.rect(cx + 2, py, w - 3 - cx - 2 + 2, 2, 'o');
  }
  // empuñadura trenzada de carmesí y oro
  const py0 = gy + guarda;
  const pw = ornada ? 5 : 3;
  const px0 = cx - (pw - 1) / 2;
  for (let y = py0; y < py0 + puño; y++)
    for (let x = px0; x < px0 + pw; x++) l.set(x, y, (x - px0 + y) % 3 === 0 ? 'y' : x === px0 + pw - 1 ? 'R' : 'r');
  // pomo de oro con su brillo
  const qy = py0 + puño;
  if (ornada) {
    l.elipse(cx + 0.5, qy + 4.5, 4.6, 4.6, 'y');
    l.sombra('y', 'o', 1, 1, 2);
    l.set(cx - 2, qy + 2, 'Y').set(cx - 1, qy + 2, 'Y').set(cx - 2, qy + 3, 'Y');
  } else {
    l.rect(cx - 1, qy, 3, 1, 'y').rect(cx - 2, qy + 1, 5, 1, 'y').rect(cx - 1, qy + 2, 3, 1, 'o');
    l.set(cx + 2, qy + 1, 'o').set(cx - 1, qy, 'Y');
  }
  return l.mapa();
}

// ───────────── basto ─────────────

/**
 * Basto: garrote nudoso, ancho arriba y afinado hacia el puño, con nudos de rama cortada, un brote y una guía que lo
 * envuelve. `mat` es su madera pintada (oliva, carmesí u oro, alternando como en la baraja).
 */
function basto(w: number, h: number, mat: Material, grande: boolean): string[] {
  const l = new Lienzo(w, h);
  const cx = w / 2;
  const top = grande ? 6 : 4;
  const rTop = (w - 2) / 2;
  const rBot = grande ? 4.2 : 2.6;
  // cuerpo: círculos que se afinan de arriba abajo, con un leve vaivén
  for (let y = top; y < h - 1; y++) {
    const t = (y - top) / (h - 1 - top);
    const r = rTop + (rBot - rTop) * t ** 0.8;
    const ox = Math.sin(t * Math.PI * 1.6) * (grande ? 1.2 : 0.6);
    l.elipse(cx + ox, y + 0.5, r, 1.2, 'r');
  }
  l.elipse(cx, top + 1, rTop, top + 0.5, 'r');
  // nudos: muñones de rama a los lados, con la cara del corte clara
  const nudos: [number, number][] = grande
    ? [[0, 0.24], [1, 0.42], [0, 0.6], [1, 0.76]]
    : [[0, 0.32], [1, 0.62]];
  for (const [lado, t] of nudos) {
    const y = Math.round(top + t * (h - top));
    const r = rTop + (rBot - rTop) * t ** 0.8;
    const x = lado ? Math.round(cx + r) : Math.round(cx - r) - (grande ? 2 : 1);
    l.rect(x, y, grande ? 3 : 2, grande ? 3 : 2, 'r');
  }
  // volumen: sombra a la derecha, brillo fino a la izquierda arriba
  l.sombra('r', 'R', 1, 0, grande ? (mat === 'oro' ? 7 : 4) : 3);
  l.sombra('r', 'e', -1, 0, 1, 'rR');
  l.cambiar('e', 'r', [0, Math.round(h * 0.55), w, h]);
  // el oro se lee poco sobre el marfil: su lado de sombra baja también por el canto de abajo a la izquierda
  if (mat === 'oro') {
    l.sombra('r', 'R', 1, 1, 2, 'rRe');
    l.sombra('r', 'R', -1, 0, 1, 'rRe');
    l.cambiar('R', 'r', [0, 0, Math.round(w / 2), Math.round(h * 0.4)]);
    l.sombra('r', 'R', 1, 0, 7, 'rRe');
  }
  // cara del corte de los nudos y del pie
  for (const [lado, t] of nudos) {
    const y = Math.round(top + t * (h - top));
    const r = rTop + (rBot - rTop) * t ** 0.8;
    const x = lado ? Math.round(cx + r) + (grande ? 2 : 1) : Math.round(cx - r) - (grande ? 2 : 1);
    l.rect(x, y, 1, grande ? 2 : 1, 'Y');
  }
  // la guía que lo envuelve en espiral (oro sobre oliva y carmesí; oliva sobre oro)
  const paso = grande ? 14 : 10;
  for (let y0 = top + 4; y0 < h - 4; y0 += paso)
    for (let x = 0; x < w; x++) {
      const y = y0 + Math.round((x - cx) * 0.45);
      if (l.lleno(x, y, 'rRe')) l.set(x, y, l.get(x, y) === 'R' ? 'o' : 'y');
      if (grande && l.lleno(x, y + 1, 'rRe')) l.set(x, y + 1, l.get(x, y + 1) === 'R' ? 'o' : 'y');
    }
  // brote de dos hojas arriba
  const b = Math.round(cx - rTop * 0.4);
  l.set(b, 1, 'l').set(b - 1, 0, 'l').set(b, 0, 'L').set(b + 1, 2, 'g').set(b + 2, 1, 'l').set(b + 3, 0, 'L').set(b, 2, 'g').set(b, 3, 'g');
  if (grande) l.set(b - 2, 0, 'l').set(b + 3, 1, 'l').set(b + 4, 0, 'l');
  // el pie: corte claro
  let m = l.mapa();
  if (mat === 'oro') m = trocar(trocar(m, 'oro', 'oliva'), 'rojo', 'oro');
  else if (mat === 'oliva') m = trocar(m, 'rojo', 'oliva');
  return m;
}

// ───────────── oro ─────────────

/** Oro: moneda de borde festoneado, cerco de bronce y la efigie de perfil en relieve, con su busto rojo. */
function oro(d: number): string[] {
  const l = new Lienzo(d, d);
  const c = d / 2;
  const R = d / 2;
  // festón: el disco y doce lóbulos en el canto
  l.elipse(c, c, R - 1, R - 1, 'o');
  const lobulos = d >= 30 ? 16 : 12;
  for (let i = 0; i < lobulos; i++) {
    const a = (i / lobulos) * Math.PI * 2;
    l.elipse(c + Math.cos(a) * (R - 1.6), c + Math.sin(a) * (R - 1.6), d >= 30 ? 2.2 : 1.6, d >= 30 ? 2.2 : 1.6, 'o');
  }
  // campo de oro con luz arriba a la izquierda y el canto en bronce abajo a la derecha
  l.elipse(c, c, R - (d >= 30 ? 3.2 : 2.4), R - (d >= 30 ? 3.2 : 2.4), 'y');
  l.sombra('o', 'z', 1, 1, 1, 'oyYz');
  l.sombra('y', 'Y', -1, -1, 1, 'y');
  // la efigie: cabeza de perfil mirando a la izquierda, en relieve de oro hondo, con cinta roja y busto rojo
  const k = d / 24;
  const ex = c + 0.6 * k;
  const ey = c - 1.6 * k;
  l.elipse(ex, ey, 3.6 * k, 4 * k, 'o', 'yY');
  l.elipse(ex - 3.1 * k, ey + 0.6 * k, 1.1 * k, 1.3 * k, 'o', 'yY'); // nariz
  l.rect(Math.round(ex - 1.5 * k), Math.round(ey + 3 * k), Math.max(2, Math.round(3 * k)), Math.max(2, Math.round(2 * k)), 'o'); // cuello
  l.poli([[ex - 5 * k, c + 5.6 * k], [ex + 5.4 * k, c + 5.6 * k], [ex + 3.4 * k, c + 2.8 * k], [ex - 2.6 * k, c + 2.8 * k]], 'r'); // busto
  l.sombra('r', 'R', 1, 0, Math.max(1, Math.round(k)));
  l.trazo(ex + 0.8 * k, ey - 3.6 * k, ex + 2 * k, ey + 2.4 * k, Math.max(0.5, 0.55 * k), 'r', 'oyY'); // cinta del pelo
  l.set(Math.round(ex - 1.6 * k), Math.round(ey - 0.6 * k), 'z'); // el ojo
  return l.mapa();
}

// ───────────── copa ─────────────

/** Copa: cáliz de carmesí con tapa azul de botón de oro, cerco de oro, cuentas de oro, nudo y pie de oro. */
function copa(w: number, h: number): string[] {
  const l = new Lienzo(w, h);
  const cx = w / 2;
  const k = Math.min(w / 22, h / 26);
  const yTapa = Math.round(4.5 * k);
  const yBorde = Math.round(8.5 * k);
  const yCopa = 17 * k; // cuenco más corto y tallo largo: cáliz, no sopera
  // tapa: cúpula azul con el botón
  l.elipse(cx, yBorde, w / 2 - 4 * k, yBorde - yTapa + 0.5, 'c');
  l.rect(0, yBorde, w, h, '.');
  l.elipse(cx, yTapa - 1.4 * k, 1.6 * k, 1.6 * k, 'y');
  l.sombra('c', 'b', 1, 0, Math.max(2, Math.round(2.5 * k)));
  l.sombra('c', 'C', -1, -1, 1, 'cb');
  l.sombra('y', 'o', 1, 1, 1);
  // cerco de oro
  l.rect(Math.round(2.5 * k), yBorde, w - 2 * Math.round(2.5 * k), Math.max(2, Math.round(2 * k)), 'y');
  l.rect(Math.round(2.5 * k), yBorde + Math.max(2, Math.round(2 * k)) - 1, w - 2 * Math.round(2.5 * k), 1, 'o');
  // cuenco
  const y0 = yBorde + Math.max(2, Math.round(2 * k));
  l.pintar((x, y) => {
    if (y < y0 || y > yCopa) return false;
    const t = (y - y0) / (yCopa - y0);
    const r = (w / 2 - 3 * k) * Math.sqrt(1 - t * t * 0.93);
    return Math.abs(x - cx) <= r;
  }, 'r');
  l.sombra('r', 'R', 1, 0, Math.max(2, Math.round(3 * k)));
  l.sombra('r', 'e', -1, 0, 1, 'rR');
  // tallo, nudo y pie
  const ys = Math.floor(yCopa - 0.5) + 1;
  const tallo = Math.max(1, Math.round(1.2 * k));
  l.rect(Math.round(cx - tallo), ys, 2 * tallo, h - ys - Math.round(3 * k), 'y');
  l.elipse(cx, ys + 3.2 * k, 2.8 * k, 1.4 * k, 'y');
  l.poli([[cx - 2.2 * k, h - 3.2 * k], [cx + 2.2 * k, h - 3.2 * k], [cx + 7 * k, h - 0.6], [cx - 7 * k, h - 0.6]], 'y');
  l.rect(Math.round(cx - 7.5 * k), h - 2, Math.round(15 * k), 2, 'o');
  l.sombra('y', 'o', 1, 0, Math.max(1, Math.round(1.2 * k)), 'yoY');
  l.sombra('y', 'Y', -1, 0, 1, 'yoY');
  // una fila de cuentas de oro en el cuenco
  const yc = Math.round(y0 + (yCopa - y0) * 0.38);
  for (let x = Math.round(cx - 7 * k); x <= cx + 7 * k; x += Math.max(3, Math.round(3 * k))) if (l.lleno(x, yc, 'rRe')) l.set(x, yc, 'y').set(x + 1, yc, l.get(x + 1, yc) === 'R' ? 'o' : 'y');
  return l.mapa();
}

// ───────────── tamaños ─────────────

export type Talla = 'chica' | 'grande';
/** Los bastos alternan su madera: oliva, carmesí y oro (el oro solo en los grandes, que lo sostienen con su sombra). */
export const MADERAS: Material[] = ['oliva', 'rojo', 'oro'];

const CHICA: Record<Suit, (v: number) => string[]> = {
  S: () => espada(13, 25, 7, 5, false),
  C: (v) => basto(14, 36, MADERAS[v % 2], false),
  D: () => oro(26),
  H: () => copa(26, 27),
};
const GRANDE: Record<Suit, (v: number) => string[]> = {
  S: () => espada(17, 80, 17, 5, true),
  C: (v) => basto(24, 110, MADERAS[v % 3], true),
  D: () => oro(38),
  H: () => copa(34, 40),
};
const cache = new Map<string, string[]>();
/** El mapa de una pinta del naipe: `talla` y, para los bastos, la variante de madera (0, 1, 2). */
export function pintaNaipe(s: Suit, talla: Talla, v = 0): string[] {
  const clave = `${s}${talla}${s === 'C' ? v % (talla === 'chica' ? 2 : 3) : 0}`;
  let m = cache.get(clave);
  if (!m) cache.set(clave, (m = (talla === 'chica' ? CHICA : GRANDE)[s](v)));
  return m;
}
/** Medida de una pinta (ancho, alto), igual para todas las variantes de su palo y talla. */
export const tallaDe = (s: Suit, talla: Talla): [number, number] => medida(pintaNaipe(s, talla));

// ───────────── el glifo de la interfaz ─────────────

/** Glifos compactos en las tintas hondas del palo (≥ 7:1 sobre el papel): espada, garrote, moneda y cáliz. */
const GLIFO: Record<Suit, Mapa> = {
  S: [
    '....B....',
    '...BCB...',
    '...BbB...',
    '...BbB...',
    '...BbB...',
    '...BbB...',
    '...BbB...',
    '...BbB...',
    '...BbB...',
    '...BbB...',
    'zz.BbB.zz',
    'zzzzzzzzz',
    '...vRv...',
    '...vRv...',
    '...vRv...',
    '..zzzzz..',
    '...zzz...',
  ],
  C: [
    '..GGGGG..',
    '.GGlGGGG.',
    'GGlGGGGGG',
    'GGlGGGGGG',
    '.GlGGGGGG',
    '.GlGGGGG.',
    'GGGGGGGG.',
    '..GGGGGGG',
    '..GlGGGG.',
    '..GlGGG..',
    '..GGGGGG.',
    '...GGGG..',
    '...GGGG..',
    '...GGGG..',
    '...GGGG..',
    '...vvvv..',
    '...zzzz..',
  ],
  D: [
    '...zzzz...',
    '.zzzzzzzz.',
    '.zzyyyyzz.',
    'zzyyzzyyzz',
    'zzyzzzyyzz',
    'zzyyzzyyzz',
    'zzyzzzzyzz',
    'zzyzzzzyzz',
    '.zzyyyyzz.',
    '.zzzzzzzz.',
    '...zzzz...',
  ],
  H: [
    '....zz....',
    '..BBBBBB..',
    '.BBBBBBBB.',
    'zzzzzzzzzz',
    'vRRRRRRRRv',
    'vRRyRRyRRv',
    '.vRRRRRRv.',
    '..vRRRRv..',
    '...vvvv...',
    '....zz....',
    '....zz....',
    '...zzzz...',
    '.zzzzzzzz.',
  ],
};

/** El glifo de la interfaz de un palo, sin halo. */
export const pintaMapa = (s: Suit): Mapa => GLIFO[s];

/** La pinta suelta (el glifo): un SVG con el `viewBox` justo de su silueta. */
export function pintaSvg(s: Suit, cls = ''): string {
  const [w, h] = medida(GLIFO[s]);
  return `<svg class="glyph px-pinta s-${s} ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(GLIFO[s], T)}</svg>`;
}

const HALO: Record<Suit, Mapa> = { S: contorno(GLIFO.S, 'w'), C: contorno(GLIFO.C, 'w'), D: contorno(GLIFO.D, 'w'), H: contorno(GLIFO.H, 'w') };
/**
 * La pinta del palo para la interfaz (índice del naipe, poderes, cabeceras, la cuenta): el glifo con un halo de marfil
 * de una celda, para que se lea igual sobre el papel que sobre la mesa oscura.
 */
export function pintaHalo(s: Suit, cls = ''): string {
  const [w, h] = medida(HALO[s]);
  return `<svg class="glyph px-pinta s-${s} ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(HALO[s], T)}</svg>`;
}

/** Compatibilidad: el naipe ya no usa símbolos `<use>`; queda vacío para las defs viejas de card.ts. */
export const pintaSimbolos = (): string => '';

/** La pinta de un palo suelta y grande (la del 2 y el 3), para la forja y las láminas. */
export function pintaNaipeSvg(s: Suit, talla: Talla = 'chica', v = 0, cls = ''): string {
  const m = pintaNaipe(s, talla, v);
  const [w, h] = medida(m);
  return `<svg class="px px-pinta-naipe s-${s} ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(m, T)}</svg>`;
}
