// V40 · fase 2 · Las caras de la baraja española en pixel-art, sobre el lienzo del naipe (250 × 350 unidades; el
// marfil lo pone `.ly.paper`). Del 1 al 9, las pintas en su disposición tradicional; el 1 de cada palo, ornamentado;
// la Corte de cuerpo entero (figuras.ts); el Comodín es el Bufón. Las «pintas del marco» son los cortes del filete en
// los bordes de arriba y de abajo (1 Oros, 2 Copas, 3 Espadas, 4 Bastos): el palo se lee aunque no se vea el color.
//
// Dos zonas quedan siempre libres: la del índice de arriba a la izquierda y la de abajo a la derecha (allí va la placa
// del índice; nada se dibuja debajo).
import type { Suit } from '../../rules/engine';
import { bufonMapa } from './bufon';
import { figuraMapa } from './figuras';
import { OSC, tintas } from './paleta';
import { CAJA, pintaMapa } from './pintas';
import { contorno, medida, pegar, lienzo, rects, type Mapa } from './rejilla';

export const NAIPE_W = 250;
export const NAIPE_H = 350;
/** Lado de la celda del filete (50 × 70 celdas en el naipe). */
const U = 5;
const T = tintas();

/** Cortes del filete por palo: las pintas del marco. */
export const CORTES: Record<Suit, number> = { D: 1, H: 2, S: 3, C: 4 };

/** Zonas reservadas al índice, en unidades del naipe: [x0, y0, x1, y1]. */
export const ZONA_INDICE: [number, number, number, number][] = [
  [0, 0, 62, 122],
  [188, 228, 250, 350],
];

/**
 * El filete del naipe en la tinta de su palo, abierto en las esquinas del índice, con los cortes de su palo arriba y
 * abajo (giro de 180°: el naipe se lee igual del revés).
 */
export function filete(s: Suit): string {
  const c = OSC[s];
  const n = CORTES[s];
  // en celdas: arriba de x=13 a x=47 (y=2); derecha de y=2 a y=45 (x=47); y lo mismo girado
  const tramos = (y: number, x0: number, x1: number) => {
    // cortes centrados en x=25: n huecos de 2 celdas separados por 2
    const ancho = n * 2 + (n - 1) * 2;
    const ini = 25 - Math.floor(ancho / 2);
    const huecos = Array.from({ length: n }, (_, i) => ini + i * 4);
    let d = '';
    let x = x0;
    for (const h of huecos) {
      if (h > x) d += `M${x * U},${y * U}h${(h - x) * U}v${U}h${-(h - x) * U}z`;
      x = h + 2;
    }
    if (x1 > x) d += `M${x * U},${y * U}h${(x1 - x) * U}v${U}h${-(x1 - x) * U}z`;
    return d;
  };
  const arriba = tramos(2, 13, 48);
  const abajo = tramos(67, 2, 37);
  const der = `M${47 * U},${2 * U}h${U}v${(46 - 2) * U}h${-U}z`;
  const izq = `M${2 * U},${24 * U}h${U}v${(68 - 24) * U}h${-U}z`;
  // los remates del filete junto al índice: un dado de oro en cada punta abierta
  const remate = (x: number, y: number) => `M${x * U},${y * U}h${U}v${U}h${-U}z`;
  return `<path fill="${c}" d="${arriba}${abajo}${der}${izq}"/><path fill="${T.y}" d="${remate(12, 2)}${remate(2, 23)}${remate(37, 67)}${remate(47, 46)}"/>`;
}

/**
 * Las pintas del 2 al 9 en la disposición tradicional de la baraja española: todas del mismo tamaño dentro de un naipe,
 * a celda entera (`k` unidades por píxel de la pinta) y sin pisarse, con aire entre ellas y hasta el filete. Las
 * columnas van en x = 91 y 159 (la central en 125): a la izquierda del índice de arriba y a la derecha del de abajo
 * queda libre la zona de la placa (ZONA_INDICE). Filas: 2 → 2; 3 → 3 en vertical; 4 → 2 × 2; 5 → cuatro esquinas y
 * el centro; 6 → 3 × 2; 7 → 2-1-2-2; 8 → 4 × 2; 9 → 2-2-1-2-2 (más chicas, para que la del medio tenga su fila).
 */
const IZQ = 91;
const DER = 159;
const MED = 125;
const par = (y: number): [number, number][] => [[IZQ, y], [DER, y]];
const DISPOSICION: Record<number, { k: number; at: [number, number][] }> = {
  2: { k: 5, at: [[MED, 92], [MED, 262]] },
  3: { k: 4, at: [[MED, 70], [MED, 175], [MED, 280]] },
  4: { k: 3, at: [...par(90), ...par(260)] },
  5: { k: 3, at: [...par(80), [MED, 175], ...par(270)] },
  6: { k: 3, at: [...par(70), ...par(175), ...par(280)] },
  7: { k: 3, at: [...par(60), [MED, 136], ...par(212), ...par(288)] },
  8: { k: 3, at: [...par(60), ...par(136), ...par(212), ...par(288)] },
  9: { k: 2, at: [...par(58), ...par(117), [MED, 175], ...par(233), ...par(292)] },
};

/** Una pinta de la caja común centrada en (cx, cy) con celdas de `k` unidades (todo entero). */
const pintaEn = (s: Suit, cx: number, cy: number, k: number) => {
  const w = CAJA[0] * k;
  const h = CAJA[1] * k;
  return `<use href="#px-pinta-${s}" x="${Math.round(cx - w / 2)}" y="${Math.round(cy - h / 2)}" width="${w}" height="${h}"/>`;
};

/** Un mapa centrado en (cx, cy) con celdas de `k` unidades. */
const mapaEn = (m: Mapa, cx: number, cy: number, k: number) => {
  const [w, h] = medida(m);
  return rects(m, T, Math.round(cx - (w * k) / 2), Math.round(cy - (h * k) / 2), k);
};

/** La cinta azul del 1: banda con su brillo y colas de golondrina, que cruza por detrás de la pinta grande. */
const CINTA = contorno([
  'tt..........................tt',
  'tTtttttttttttttttttttttttttTt.',
  '.tCCCCCCCCCCCCCCCCCCCCCCCCCCt.',
  '.tttttttttttttttttttttttttttt.',
  'tTT........................TTt',
  'T..........................T.T',
]);

/** Los rayos de oro del 1: cuatro destellos en cruz alrededor de la pinta. */
const DESTELLO = contorno(['..y..', '.yYy.', 'yYYYy', '.yYy.', '..y..']);

/** El 1 de cada palo: la pinta grande, la cinta azul y cuatro destellos de oro. */
function as(s: Suit): string {
  const [pw, ph] = medida(pintaMapa(s));
  const k = Math.floor(Math.min(170 / pw, 230 / ph, 11));
  return `${mapaEn(CINTA, 125, 175 + Math.round(ph * k * 0.22), 7)}${mapaEn(pintaMapa(s), 125, 175, k)}${mapaEn(DESTELLO, 72, 150, 5)}${mapaEn(DESTELLO, 178, 150, 5)}${mapaEn(DESTELLO, 125, 46, 4)}`;
}

/** La cara de un naipe del 1 al 9. */
export function numeroCara(s: Suit, rango: number): string {
  if (rango === 1) return as(s);
  const d = DISPOSICION[rango];
  if (!d) return '';
  // dos tiradas: las pintas en su disposición y, para la carta diminuta del móvil (pixel.css), una sola pinta grande
  // en la mitad libre de abajo, bajo el índice
  return `<g class="px-pintas">${d.at.map(([x, y]) => pintaEn(s, x, y, d.k)).join('')}</g><g class="px-solo" display="none">${pintaEn(s, 125, 236, 7)}</g>`;
}

/** La cara de una figura (10, 11 o 12): de cuerpo entero, apoyada en el filete de abajo. */
export function figuraCara(s: Suit, rango: 10 | 11 | 12): string {
  const m = figuraMapa(s, rango);
  const [w, h] = medida(m);
  // celda entera: el píxel de la figura cae en la rejilla del naipe
  const kk = Math.max(1, Math.floor(Math.min(196 / w, 290 / h)));
  const x = Math.round(125 - (w * kk) / 2);
  const y = Math.round(332 - h * kk);
  return rects(m, T, x, y, kk);
}

/** El Comodín: el Bufón de cuerpo entero con dos estrellas de oro. */
export function comodinCara(): string {
  const m = bufonMapa('risa');
  return `${mapaEn(m, 125, 186, 5)}${mapaEn(DESTELLO, 196, 60, 6)}${mapaEn(DESTELLO, 54, 300, 6)}`;
}

/** Envuelve una cara en el SVG del naipe (capa `.ly.art`). */
export function naipeSvg(cuerpo: string, cls = ''): string {
  return `<svg class="ly art px-cara ${cls}" viewBox="0 0 ${NAIPE_W} ${NAIPE_H}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${cuerpo}</svg>`;
}

/** La cara completa de un naipe de palo: filete con sus cortes y lo de dentro. */
export function caraPalo(s: Suit, rango: number): string {
  const dentro = rango >= 10 ? figuraCara(s, rango as 10 | 11 | 12) : numeroCara(s, rango);
  return naipeSvg(filete(s) + dentro, rango >= 10 ? 'px-figura' : rango === 1 ? 'px-as' : 'px-numero');
}

/** La cara del Comodín (sin palo: filete de tinta, sin cortes). */
export function caraComodin(): string {
  const marco = `<path fill="${T.k}" d="M${13 * U},${2 * U}h${35 * U}v${U}h${-35 * U}z M${2 * U},${67 * U}h${35 * U}v${U}h${-35 * U}z M${47 * U},${2 * U}h${U}v${44 * U}h${-U}z M${2 * U},${24 * U}h${U}v${44 * U}h${-U}z"/>`;
  return naipeSvg(marco + comodinCara(), 'px-comodin');
}

// ── dorsos: un rombo de dos tintas por Mazo, con las cuatro pintas al centro ──

const DORSO: Record<string, [string, string]> = {
  escoba: ['R', 'r'],
  truco: ['B', 'b'],
  chinchon: ['G', 'g'],
  mentiroso: ['v', 'R'],
  chancho: ['z', 'o'],
};

/** El dorso del naipe: rombos pixelados en las dos tintas de su Mazo, un marco de oro y las cuatro pintas. */
export function dorsoSvg(mazo: string): string {
  const [a, b] = DORSO[mazo] ?? DORSO.escoba;
  // un rombo de 10 × 10 celdas repetido: la celda (x, y) es clara si |x-5| + |y-5| < 4
  let tile = '';
  for (let y = 0; y < 10; y++) tile += `${Array.from({ length: 10 }, (_, x) => (Math.abs(x - 4.5) + Math.abs(y - 4.5) < 4 ? b : a)).join('')}\n`;
  const fila = tile.trim().split('\n');
  const campo: string[] = [];
  for (let y = 0; y < 66; y++) campo.push(Array.from({ length: 46 }, (_, x) => fila[y % 10][x % 10]).join(''));
  const marco = pegar(lienzo(50, 70), campo, 2, 2);
  const conBorde = marco.map((r, y) => [...r].map((c, x) => (x === 1 || x === 48 || y === 1 || y === 68 ? 'y' : x === 0 || x === 49 || y === 0 || y === 69 ? 'k' : c)).join(''));
  const placa = contorno(pegar(lienzo(22, 26), Array.from({ length: 26 }, () => 'm'.repeat(22)), 0, 0), 'y');
  let cuerpo = rects(conBorde, T, 0, 0, U) + rects(contorno(placa, 'k'), T, 125 - 13 * U, 175 - 15 * U, U);
  cuerpo += pintaEn('D', 100, 145, 2.2) + pintaEn('H', 150, 145, 2.2) + pintaEn('S', 100, 205, 2.2) + pintaEn('C', 150, 205, 2.2);
  return `<svg class="art px-dorso" viewBox="0 0 ${NAIPE_W} ${NAIPE_H}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${cuerpo}</svg>`;
}
