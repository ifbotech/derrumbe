// V40 · fase 2c · Las cuatro pintas de la baraja española en pixel-art «Dark Dithered & Textured»: espada, basto, oro y
// copa. Sin contorno negro: cada masa lleva su rampa saturada con su lado de sombra abajo a la derecha (luz de arriba a
// la izquierda), y el paso entre tonos es una trama de Bayer contenida dentro del metal, la corteza o el oro. El canto de
// cada masa queda en un tono que llega a 3:1 sobre el papel hueso (la silueta se lee a 70 px sin contorno).
//
// Tres tamaños por palo, todos de la misma rejilla del naipe (96 × 140 celdas):
//   · chica (4 a 9): espada 13 × 37, basto 14 × 36, oro 26 × 26, copa 26 × 27. El 8 y el 9 usan la misma que el 4.
//   · grande (2 y 3): espada 17 × 114, basto 24 × 110, oro 38 × 38, copa 34 × 40.
//   · el glifo de la interfaz (índice, poderes, la cuenta): compacto, en las tintas hondas del palo (≥ 7:1) y con un
//     halo de marfil de una celda para leerse también sobre la mesa oscura.
import type { Suit } from '../../rules/engine';
import { rayado, sombrear } from './dither';
import { tintas, type Material } from './paleta';
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
  // hoja: de cobalto a cian filo, con la trama de luz a lo ancho (luz de la izquierda)
  for (let y = 0; y < hoja; y++) {
    const t = y < punta ? Math.floor(((punta - y) * ancho) / (2 * punta)) : 0;
    for (let x = x0 + t; x <= x0 + ancho - 1 - t; x++) l.set(x, y, '¤');
  }
  sombrear(l, '¤', 'BbcCA', { luz: [-1, 0], base: 0.5, pendiente: 1.15, borde: 0, brillo: 0, ancho: 0.8 });
  // el filo que corre hasta la punta y, en la ornada, el vaceo central
  if (ornada) l.rect(cx, punta + 1, 1, hoja - punta - 4, 'A');
  l.canto('CA', 'c');
  // guarda: gavilanes de oro con las puntas vueltas hacia arriba
  const gy = hoja;
  l.rect(1, gy, w - 2, guarda, '¤');
  l.set(0, gy - 1, '¤').set(0, gy, '¤').set(w - 1, gy - 1, '¤').set(w - 1, gy, '¤');
  if (ornada) {
    l.rect(cx - 2, gy - 2, 5, 2, '¤');
    l.set(1, gy - 2, '¤').set(w - 2, gy - 2, '¤');
    // el guardamano en D, de la guarda al pomo, a la derecha
    const py = gy + guarda + puño;
    l.rect(w - 3, gy + guarda, 2, puño, '¤');
    l.rect(cx + 2, py, w - 3 - cx - 2 + 2, 2, '¤');
  }
  sombrear(l, '¤', '9zoOyY', { base: 0.62, pendiente: 1, borde: 1, fuerzaBorde: 0.35, brillo: 1, fuerzaBrillo: 0.3 });
  l.canto('yYO', 'o');
  if (!ornada) l.set(1, gy, 'O');
  else l.set(2, gy, 'Y').set(cx - 1, gy - 1, 'Y');
  // empuñadura trenzada de carmesí sangre y oro
  const py0 = gy + guarda;
  const pw = ornada ? 5 : 3;
  const px0 = cx - (pw - 1) / 2;
  for (let y = py0; y < py0 + puño; y++)
    for (let x = px0; x < px0 + pw; x++) l.set(x, y, (x - px0 + y) % 3 === 0 ? 'O' : x === px0 + pw - 1 ? 'v' : x === px0 ? 'r' : 'R');
  // pomo de oro con su brillo
  const qy = py0 + puño;
  if (ornada) {
    l.elipse(cx + 0.5, qy + 4.5, 4.6, 4.6, '¤');
    sombrear(l, '¤', '9zoOyY', { base: 0.62, pendiente: 1, borde: 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.35 });
    l.canto('yYO', 'o');
    l.set(cx - 2, qy + 2, 'Y').set(cx - 1, qy + 2, 'Y');
  } else {
    l.rect(cx - 1, qy, 3, 1, 'o').rect(cx - 2, qy + 1, 5, 1, 'o').rect(cx - 1, qy + 2, 3, 1, 'z');
    l.set(cx - 1, qy + 1, 'Y').set(cx, qy + 1, 'y').set(cx + 2, qy + 1, 'z');
  }
  return l.mapa();
}

// ───────────── basto ─────────────

/** El color de la guía que envuelve cada variante de basto: ámbar, sangre u oro (la corteza es siempre esmeralda). */
const GUIA: Record<Material, [string, string]> = { oliva: ['O', 'o'], rojo: ['r', 'R'], oro: ['y', 'o'], acero: ['c', 'b'], cinta: ['t', 'T'], madera: ['d', 'n'], gris: ['J', 'j'], piel: ['p', 's'], purpura: ['q', 'F'] };

/**
 * Basto: garrote de corteza esmeralda, nudoso, ancho arriba y afinado hacia el puño, con muñones de rama cortada (la
 * cara del corte, rojo sangre con su corazón de ámbar), estrías de corteza del lado de la sombra, un brote de lima y una
 * guía que lo envuelve. `mat` elige el color de la guía (ámbar, sangre u oro), alternando como en la baraja.
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
    l.elipse(cx + ox, y + 0.5, r, 1.2, '¤');
  }
  l.elipse(cx, top + 1, rTop, top + 0.5, '¤');
  // nudos: muñones de rama a los lados
  const nudos: [number, number][] = grande
    ? [[0, 0.24], [1, 0.42], [0, 0.6], [1, 0.76]]
    : [[0, 0.32], [1, 0.62]];
  for (const [lado, t] of nudos) {
    const y = Math.round(top + t * (h - top));
    const r = rTop + (rBot - rTop) * t ** 0.8;
    const x = lado ? Math.round(cx + r) : Math.round(cx - r) - (grande ? 2 : 1);
    l.rect(x, y, grande ? 3 : 2, grande ? 3 : 2, '¤');
  }
  // volumen tramado de esmeralda a lima, y el canto en el verde que llega a 3:1
  sombrear(l, '¤', '9GglL', { base: 0.42, pendiente: 1.1, borde: grande ? 4 : 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.18, ancho: 0.8 });
  l.canto('LK', 'l');
  // estrías de la corteza, del lado de la sombra
  rayado(l, 'gl', 'G', { angulo: '|', paso: grande ? 3 : 4, hasta: 0.45, caja: [0, top + 2, w - 1, h - 2] });
  // la guía que lo envuelve en espiral
  const [g1, g2] = GUIA[mat];
  const paso = grande ? 14 : 10;
  for (let y0 = top + 4; y0 < h - 4; y0 += paso)
    for (let x = 0; x < w; x++) {
      const y = y0 + Math.round((x - cx) * 0.45);
      if (l.lleno(x, y, 'GglLK9')) l.set(x, y, x > cx + rTop * 0.3 ? g2 : g1);
      if (grande && l.lleno(x, y + 1, 'GglLK9')) l.set(x, y + 1, g2);
    }
  // la cara del corte de los nudos: rojo sangre con su corazón de ámbar
  for (const [lado, t] of nudos) {
    const y = Math.round(top + t * (h - top));
    const r = rTop + (rBot - rTop) * t ** 0.8;
    const x = lado ? Math.round(cx + r) + (grande ? 2 : 1) : Math.round(cx - r) - (grande ? 2 : 1);
    l.rect(x, y, 1, grande ? 3 : 2, 'r');
    if (grande) l.set(x, y + 1, 'O');
  }
  // el pie cortado
  for (let x = 0; x < w; x++) if (l.lleno(x, h - 2)) l.set(x, h - 2, x < cx ? 'r' : 'R');
  // brote de lima arriba
  const b = Math.round(cx - rTop * 0.4);
  l.set(b, 1, 'l').set(b - 1, 0, 'l').set(b, 0, 'K').set(b + 1, 2, 'g').set(b + 2, 1, 'l').set(b + 3, 0, 'L').set(b, 2, 'g').set(b, 3, 'g');
  if (grande) l.set(b - 2, 0, 'l').set(b + 3, 1, 'l').set(b + 4, 0, 'l');
  return l.mapa();
}

// ───────────── oro ─────────────

/** Oro: moneda de borde festoneado en ámbar fuego, campo de oro solar tramado y la efigie de perfil grabada en carmesí. */
function oro(d: number): string[] {
  const l = new Lienzo(d, d);
  const c = d / 2;
  const R = d / 2;
  // festón: el disco y los lóbulos del canto
  l.elipse(c, c, R - 1, R - 1, '¤');
  const lobulos = d >= 30 ? 16 : 12;
  for (let i = 0; i < lobulos; i++) {
    const a = (i / lobulos) * Math.PI * 2;
    l.elipse(c + Math.cos(a) * (R - 1.6), c + Math.sin(a) * (R - 1.6), d >= 30 ? 2.2 : 1.6, d >= 30 ? 2.2 : 1.6, '¤');
  }
  sombrear(l, '¤', 'zoO', { base: 0.62, pendiente: 1, borde: 2, fuerzaBorde: 0.45, brillo: 0 });
  l.canto('O', 'o');
  // campo de oro: luz arriba a la izquierda, trama de sol a fuego
  const rc = R - (d >= 30 ? 3.2 : 2.4);
  l.elipse(c, c, rc, rc, '§');
  sombrear(l, '§', 'oOyY', { base: 0.66, pendiente: 1.1, borde: 2, fuerzaBorde: 0.35, brillo: 1, fuerzaBrillo: 0.2, ancho: 0.8 });
  // la efigie: cabeza de perfil mirando a la izquierda, grabada en carmesí: la cara iluminada, la nuca y el pelo en
  // sombra, la corona de laurel en tinta honda
  const k = d / 24;
  const ex = c + 0.8 * k;
  const ey = c - 1.8 * k;
  const F = 'oOyY';
  l.elipse(ex, ey, 3.4 * k, 3.9 * k, 'R', F);
  l.poli([[ex - 3 * k, ey - 1 * k], [ex - 5 * k, ey + 1.4 * k], [ex - 3 * k, ey + 1.8 * k]], 'R', F); // nariz
  l.poli([[ex - 3 * k, ey + 1.8 * k], [ex - 3.4 * k, ey + 3.4 * k], [ex - 1 * k, ey + 4.2 * k]], 'R', F); // mentón
  l.rect(Math.round(ex - 1.2 * k), Math.round(ey + 3 * k), Math.max(2, Math.round(3 * k)), Math.max(2, Math.round(2.2 * k)), 'R'); // cuello
  l.poli([[ex - 6 * k, c + 6 * k], [ex + 5.8 * k, c + 6 * k], [ex + 4 * k, c + 3 * k], [ex + 1 * k, c + 2.4 * k], [ex - 3 * k, c + 3 * k]], 'R'); // busto
  // la cara, de frente a la luz: el perfil en carmesí vivo
  l.pintar((x, y) => x < ex - 0.4 * k && y < ey + 3.8 * k, 'r', 'R');
  // pelo y nuca en sombra, con la corona de laurel
  l.elipse(ex + 1.2 * k, ey - 1.2 * k, 2.8 * k, 3 * k, 'v', 'Rr');
  l.trazo(ex - 2.6 * k, ey - 2.6 * k, ex + 3 * k, ey - 1.2 * k, Math.max(0.5, 0.6 * k), 'z', 'Rrv');
  l.sombra('R', 'v', 1, 0, Math.max(1, Math.round(k)));
  if (d >= 30) rayado(l, 'R', 'v', { angulo: '/', paso: 2, hasta: 0.6 });
  l.set(Math.round(ex - 2 * k), Math.round(ey - 0.4 * k), 'k'); // el ojo
  return l.mapa();
}

// ───────────── copa ─────────────

/**
 * Copa: cáliz abierto de carmesí —boca de oro con el vino en sombra adentro, cuenco que se angosta al tallo, una piedra
 * turquesa al frente—, nudo de oro con su piedra y pie de oro. Sin tapa: la tapa de cúpula la volvía trompo de juguete.
 */
function copa(w: number, h: number): string[] {
  const l = new Lienzo(w, h);
  const cx = w / 2;
  const k = Math.min(w / 22, h / 26);
  const R = w / 2 - 1.5 * k; // radio de la boca
  const yBoca = Math.round(3.2 * k);
  const yCopa = 15.5 * k; // fondo del cuenco
  // cuenco: ancho arriba, se cierra en curva hacia el tallo
  l.pintar((x, y) => {
    if (y < yBoca || y > yCopa) return false;
    const t = (y - yBoca) / (yCopa - yBoca);
    const r = R * Math.sqrt(1 - t * t * 0.9) * (1 - 0.12 * t);
    return Math.abs(x - cx) <= r;
  }, '¤');
  sombrear(l, '¤', '9vRre', { base: 0.5, pendiente: 1.15, borde: Math.max(2, Math.round(3 * k)), fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.15, ancho: 0.8 });
  l.canto('e', 'r');
  // la boca: aro de oro con el vino en sombra adentro
  const ry = Math.max(1.6, 2 * k);
  l.elipse(cx, yBoca, R + 0.4, ry + 0.4, '§');
  sombrear(l, '§', 'zoyY', { base: 0.6, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
  l.canto('yY', 'o');
  l.elipse(cx, yBoca, R - 1.6 * k, Math.max(0.6, ry - 1.1 * k), '9');
  l.elipse(cx + 0.6 * k, yBoca, R - 3.4 * k, Math.max(0.5, ry - 1.4 * k), 'v');
  // una banda de oro bajo la boca y la piedra turquesa al frente
  const yb = Math.round(yBoca + ry + 1.2 * k);
  l.pintar((_x, y) => Math.floor(y) === yb, 'o', '9vRre');
  const yg = Math.round((yBoca + yCopa) / 2 + 0.5 * k);
  const g = Math.max(1, Math.round(1.6 * k));
  l.poli([[cx, yg - g - 0.5], [cx + g + 0.5, yg], [cx, yg + g + 0.5], [cx - g - 0.5, yg]], 'T');
  l.set(Math.round(cx - 1), yg - 1, 'C');
  // tallo, nudo con su piedra y pie de oro
  const ys = Math.floor(yCopa - 0.5) + 1;
  const tallo = Math.max(1, Math.round(1.2 * k));
  l.rect(Math.round(cx - tallo), ys, 2 * tallo, h - ys - Math.round(3 * k), '¤');
  l.elipse(cx, ys + 3.4 * k, 3 * k, 1.6 * k, '¤');
  l.poli([[cx - 2.2 * k, h - 3.2 * k], [cx + 2.2 * k, h - 3.2 * k], [cx + 7.5 * k, h - 0.6], [cx - 7.5 * k, h - 0.6]], '¤');
  l.rect(Math.round(cx - 8 * k), h - 2, Math.round(16 * k), 2, '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.62, pendiente: 1, borde: 1, fuerzaBorde: 0.35, brillo: 1, fuerzaBrillo: 0.3 });
  l.canto('yYO', 'o');
  if (k >= 1.2) l.set(Math.round(cx - 0.5), Math.round(ys + 3.4 * k), 'T');
  return l.mapa();
}

// ───────────── tamaños ─────────────

export type Talla = 'chica' | 'grande';
/** Las variantes de basto alternan el color de su guía (ámbar, sangre, oro) sobre la misma corteza esmeralda. */
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
