// V40 · fase 2b · Las caras de la baraja española en pixel-art «sin línea», sobre una rejilla de 96 × 140 celdas (el
// lienzo del naipe es 1:1,4, como la carta del juego: el `viewBox` es -2 0 100 140 y las dos columnas de los lados son
// papel). Del 1 al 9, las pintas grandes en su disposición tradicional, todas del mismo tamaño dentro de un naipe y sin
// pisarse; el 1 de cada palo, ornamentado (ases.ts); la Corte de cuerpo entero (figuras.ts); el Comodín es el Bufón.
//
// V40 · fase 2c · El recuadro tradicional: una línea fina de tinta que corre por dentro del canto, abierta en las dos
// esquinas del índice (como en la baraja española antigua, el número queda fuera del recuadro) y cortada en el filete
// de arriba y en el de abajo según el palo: Oros, línea continua; Copas, un corte; Espadas, dos; Bastos, tres. Por fuera
// del recuadro, el canto del papel hueso lleva su sombra tramada de hueso (más densa abajo y a la derecha). El índice
// (número y glifo) lo pone card.ts en HTML arriba a la izquierda y abajo a la derecha (girado 180°): las dos zonas de
// ZONA_INDICE quedan siempre libres de dibujo.
import type { Suit } from '../../rules/engine';
import { asMapa } from './ases';
import { bufonMapa } from './bufon';
import { figuraLienzo } from './figuras';
import { umbral } from './dither';
import { PX, tintas } from './paleta';
import { girar } from './pincel';
import { pintaNaipe, tallaDe, type Talla } from './pintas';
import { medida, rects, type Mapa } from './rejilla';

/** La rejilla del naipe, en celdas. */
export const NAIPE_W = 96;
export const NAIPE_H = 140;
const T = tintas();

/** Cortes del recuadro por palo (en el filete de arriba y en el de abajo): Oros 0, Copas 1, Espadas 2, Bastos 3. */
export const CORTES: Record<Suit, number> = { D: 0, H: 1, S: 2, C: 3 };

/** Zonas reservadas al índice, en celdas de la rejilla: [x0, y0, x1, y1] (inclusivas). */
export const ZONA_INDICE: [number, number, number, number][] = [
  [0, 0, 15, 32],
  [80, 107, 95, 139],
];

/** Tramo del recuadro: [x0, y0, x1, y1] inclusivo, en celdas de la rejilla (líneas de una celda). */
export type Tramo = [number, number, number, number];
/** Ancho de cada corte del recuadro, en celdas. */
const CORTE = 4;

/**
 * Los tramos del recuadro de un naipe: el filete de arriba (de después del índice hasta la esquina de arriba a la
 * derecha), el de la derecha (de esa esquina hasta antes del índice de abajo) y sus giros de 180° (abajo e izquierda).
 * Los filetes de arriba y de abajo llevan los cortes del palo, repartidos a partes iguales.
 */
export function recuadroTramos(s: Suit, rango: number): { arriba: Tramo[]; abajo: Tramo[]; lados: Tramo[] } {
  const x0 = rango >= 10 ? 31 : 19;
  const n = CORTES[s];
  const arriba: Tramo[] = [];
  let x = x0;
  for (let i = 1; i <= n; i++) {
    const g = Math.round(x0 + ((95 - x0) * i) / (n + 1) - CORTE / 2);
    arriba.push([x, 1, g - 1, 1]);
    x = g + CORTE;
  }
  arriba.push([x, 1, 95, 1]);
  const gira = ([a, b, c, d]: Tramo): Tramo => [95 - c, 139 - d, 95 - a, 139 - b];
  return { arriba, abajo: arriba.map(gira), lados: [[95, 1, 95, 104], gira([95, 1, 95, 104])] };
}

/** El recuadro de tinta del naipe (un `<path>` de clase `px-marco`). */
export function recuadro(s: Suit, rango: number): string {
  const { arriba, abajo, lados } = recuadroTramos(s, rango);
  const d = [...arriba, ...abajo, ...lados].map(([a, b, c, e]) => `M${a},${b}h${c - a + 1}v${e - b + 1}h${a - c - 1}z`).join('');
  return `<path class="px-marco" fill="${PX.tinta}" d="${d}"/>`;
}

/**
 * El canto del papel: una sombra tramada de hueso (Bayer) en las celdas de fuera del recuadro, más densa abajo y a la
 * derecha (la luz viene de arriba a la izquierda). Las esquinas redondeadas del naipe quedan libres.
 */
function cantoPapel(): string {
  let d = '';
  const celda = (x: number, y: number, p: number) => {
    const esquina = (x < 4 || x > 91) && (y < 5 || y > 134);
    if (!esquina && p > umbral(x, y)) d += `M${x},${y}h1v1h-1z`;
  };
  for (let y = 0; y < 140; y++) {
    celda(-2, y, 0.3);
    celda(-1, y, 0.12);
    celda(96, y, 0.3);
    celda(97, y, 0.55);
  }
  for (let x = -2; x < 98; x++) {
    celda(x, 0, 0.3);
    celda(x, 139, 0.55);
  }
  return `<path class="px-canto" fill="${PX.hueso}" d="${d}"/>`;
}
const CANTO = cantoPapel();

/** Un mapa con su centro en (cx, cy), en celdas enteras. */
function en(m: Mapa, cx: number, cy: number): string {
  const [w, h] = medida(m);
  return rects(m, T, Math.round(cx - w / 2), Math.round(cy - h / 2));
}

// ───────────── disposiciones ─────────────

/** Una pinta en la disposición: centro, si va acostada (las del medio del 5 y el 7 de Espadas y Bastos) o del revés. */
type Lugar = [number, number, ('h' | 'v')?];
const fila = (y: number, xs: number[]): Lugar[] => xs.map((x) => [x, y]);

/**
 * Espadas y Bastos (pintas altas y estrechas): de 2 o de 3 columnas (x = 24, 48, 72 o 32, 63), con la del medio
 * acostada en el 5 y el 7, como en la baraja española.
 */
const ALTAS: Record<number, Lugar[]> = {
  4: [...fila(38, [32, 63]), ...fila(102, [32, 63])],
  5: [...fila(30, [32, 63]), [48, 70, 'h'], ...fila(110, [32, 63])],
  6: [...fila(38, [24, 48, 72]), ...fila(102, [24, 48, 72])],
  7: [...fila(30, [24, 48, 72]), [48, 70, 'h'], ...fila(110, [24, 48, 72])],
  8: [...fila(25, [24, 48, 72]), ...fila(70, [36, 60]), ...fila(115, [24, 48, 72])],
  9: [...fila(25, [24, 48, 72]), ...fila(70, [24, 48, 72]), ...fila(115, [24, 48, 72])],
};
/** Oros y Copas (pintas redondas): dos columnas (x = 30 y 66) y la del medio en x = 48. */
const REDONDAS: Record<number, Lugar[]> = {
  4: [...fila(38, [30, 66]), ...fila(102, [30, 66])],
  5: [...fila(30, [30, 66]), [48, 70], ...fila(110, [30, 66])],
  6: [...fila(26, [30, 66]), ...fila(70, [30, 66]), ...fila(114, [30, 66])],
  7: [...fila(22, [30, 66]), [48, 52], ...fila(82, [30, 66]), ...fila(114, [30, 66])],
  8: [...fila(19, [30, 66]), ...fila(53, [30, 66]), ...fila(87, [30, 66]), ...fila(121, [30, 66])],
  9: [...fila(16, [30, 66]), ...fila(43, [30, 66]), [48, 70], ...fila(97, [30, 66]), ...fila(124, [30, 66])],
};
/** El 2 y el 3, con la pinta grande: Espadas y Bastos en columnas; Oros y Copas, una sobre otra o en diagonal. */
const GRANDES: Record<Suit, Record<number, Lugar[]>> = {
  S: { 2: [[34, 70], [62, 70, 'v']], 3: [[25, 70], [48, 70, 'v'], [71, 70]] },
  C: { 2: [[35, 72], [61, 72]], 3: [[27, 72], [49, 72], [71, 72]] },
  D: { 2: [[48, 38], [48, 102]], 3: [[36, 28], [60, 70], [36, 112]] },
  H: { 2: [[48, 36], [48, 104]], 3: [[36, 27], [60, 70], [36, 113]] },
};

/** La lista de lugares de un naipe del 2 al 9 y la talla de su pinta. */
export function disposicion(s: Suit, rango: number): { talla: Talla; at: Lugar[] } {
  if (rango <= 3) return { talla: 'grande', at: GRANDES[s][rango] ?? [] };
  return { talla: 'chica', at: (s === 'S' || s === 'C' ? ALTAS : REDONDAS)[rango] ?? [] };
}

/** Las pintas de un naipe del 2 al 9, como mapas colocados (para la cara y para las pruebas de solape). */
export function pintasColocadas(s: Suit, rango: number): { m: string[]; x: number; y: number }[] {
  const { talla, at } = disposicion(s, rango);
  return at.map(([cx, cy, giro], i) => {
    let m = pintaNaipe(s, talla, i);
    if (giro === 'h') m = girar(m);
    if (giro === 'v') m = girar(girar(m));
    const [w, h] = medida(m);
    return { m, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) };
  });
}

/** La cara de un naipe del 1 al 9 (sin los puntitos del marco). */
export function numeroCara(s: Suit, rango: number): string {
  if (rango === 1) return rects(asMapa(s), T);
  const [w, h] = tallaDe(s, 'chica');
  // dos tiradas: las pintas en su disposición y, para la carta diminuta del móvil (pixel.css), una sola pinta grande en
  // la mitad libre de abajo, bajo el índice
  const solo = pintaNaipe(s, 'chica');
  const k = Math.max(1, Math.floor(Math.min(56 / w, 64 / h)));
  const [sw, sh] = medida(solo);
  return `<g class="px-pintas">${pintasColocadas(s, rango).map((p) => rects(p.m, T, p.x, p.y)).join('')}</g><g class="px-solo" display="none">${rects(solo, T, Math.round(48 - (sw * k) / 2), Math.round(98 - (sh * k) / 2), k)}</g>`;
}

/** La cara de una figura (10, 11 o 12): de cuerpo entero, apoyada abajo. */
export function figuraCara(s: Suit, rango: 10 | 11 | 12): string {
  return rects(figuraLienzo(s, rango), T);
}

/** El Comodín: el Bufón entero (la marotte) en diagonal. */
export function comodinCara(): string {
  return en(bufonMapa('risa'), 48, 72);
}

/** Envuelve una cara en el SVG del naipe (capa `.ly.art`). */
export function naipeSvg(cuerpo: string, cls = ''): string {
  return `<svg class="ly art px-cara ${cls}" viewBox="-2 0 100 140" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${cuerpo}</svg>`;
}

/** La cara completa de un naipe de palo: el canto tramado, el recuadro con sus cortes y lo de dentro. */
export function caraPalo(s: Suit, rango: number): string {
  const dentro = rango >= 10 ? figuraCara(s, rango as 10 | 11 | 12) : numeroCara(s, rango);
  return naipeSvg(CANTO + recuadro(s, rango) + dentro, rango >= 10 ? 'px-figura' : rango === 1 ? 'px-as' : 'px-numero');
}

/** La cara del Comodín (sin palo ni recuadro: solo el canto tramado). */
export function caraComodin(): string {
  return naipeSvg(CANTO + comodinCara(), 'px-comodin');
}

// ── dorsos: un motivo grande por Mazo sobre su campo de color ──
export { dorsoSvg } from './dorsos';
