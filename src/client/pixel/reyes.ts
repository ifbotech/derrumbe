// V40 · fase 2b · Los 4 Reyes jefe (constitución, apartado 4), de busto en pixel-art «sin línea» para la mesa, la oferta
// de Bendiciones y la carta del jefe. Cada uno con su corona, su barba, su manto y su pinta en la mano, según su tema:
// Espadas (filo: corona de hojas de acero, barba negra en punta y cicatriz), Bastos (aguante: corona de roble, barba
// castaña tupida y hombros anchos), Oros (fortuna: corona de monedas, bigote rizado y mejillas encendidas) y Copas
// (brindis: corona de flores de lis, barba blanca y sonrisa de sobremesa). En calma o vencido (ojos en aspa y la corona
// caída). Retrato de 64 × 64 celdas.
import type { Suit } from '../../rules/engine';
import { RAMPA, tintas, type Material } from './paleta';
import { Lienzo } from './pincel';
import { pintaNaipe } from './pintas';
import { rects } from './rejilla';

export type ReyPx = 'espadas' | 'bastos' | 'oros' | 'copas';
export const REYES_PX: ReyPx[] = ['espadas', 'bastos', 'oros', 'copas'];
export type Animo = 'calma' | 'vencido';
const PALO: Record<ReyPx, Suit> = { espadas: 'S', bastos: 'C', oros: 'D', copas: 'H' };

/** Lado del retrato, en celdas. */
const L = 64;
const T = tintas();

interface Rasgo {
  manto: Material;
  /** Pelo y barba: base y sombra. */
  pelo: [string, string];
  /** Fondo del retrato (letra) y su tono de abajo. */
  fondo: [string, string];
  corona: (l: Lienzo, x: number, y: number) => void;
  barba: (l: Lienzo, cx: number, cy: number) => void;
  cara?: (l: Lienzo, cx: number, cy: number) => void;
  /** Hombros más anchos (Bastos). */
  ancho?: number;
}

const CX = 30;
const CY = 26;

const RASGO: Record<ReyPx, Rasgo> = {
  espadas: {
    manto: 'acero',
    pelo: ['k', 'N'],
    fondo: ['b', 'B'],
    corona: (l, x, y) => {
      l.rect(x - 9, y, 19, 4, 'y').rect(x - 9, y + 3, 19, 1, 'o');
      for (const dx of [-8, -4, 0, 4, 8]) l.poli([[x + dx - 1.5, y], [x + dx + 0.5, y - (dx === 0 ? 9 : 6)], [x + dx + 2.5, y]], 'c');
      l.sombra('c', 'b', 1, 0, 1).sombra('c', 'C', -1, 0, 1, 'cb');
      l.rect(x, y + 1, 2, 2, 'r');
    },
    barba: (l, cx, cy) => {
      l.poli([[cx - 7, cy + 3], [cx + 8, cy + 3], [cx + 6, cy + 11], [cx + 1, cy + 18], [cx - 5, cy + 11]], 'k');
      l.rect(cx - 5, cy + 2, 11, 2, 'k');
      l.rect(cx - 2, cy + 5, 5, 1, 'R');
    },
    cara: (l, cx, cy) => {
      l.linea(cx + 4, cy - 3, cx + 6, cy + 2, 'R');
    },
  },
  bastos: {
    manto: 'oliva',
    pelo: ['d', 'n'],
    fondo: ['L', 'l'],
    ancho: 3,
    corona: (l, x, y) => {
      l.rect(x - 9, y, 19, 4, 'y').rect(x - 9, y + 3, 19, 1, 'o');
      for (const dx of [-8, -3, 2, 7]) l.elipse(x + dx + 1, y - 2, 2.6, 3, 'l');
      l.sombra('l', 'g', 1, 1, 1).sombra('l', 'L', -1, -1, 1, 'lg');
      for (const dx of [-6, 0, 6]) l.rect(x + dx, y + 1, 2, 2, 'e');
    },
    barba: (l, cx, cy) => {
      l.elipse(cx + 0.5, cy + 8, 10, 9, 'd');
      l.elipse(cx + 0.5, cy + 1, 6, 3, 'p', 'd');
      l.sombra('d', 'n', 1, 1, 2);
      l.rect(cx - 3, cy + 5, 7, 1, 'R');
    },
  },
  oros: {
    manto: 'rojo',
    pelo: ['x', 'd'],
    fondo: ['Y', 'y'],
    corona: (l, x, y) => {
      l.rect(x - 9, y, 19, 4, 'y').rect(x - 9, y + 3, 19, 1, 'o');
      for (const dx of [-7, 0, 7]) {
        l.elipse(x + dx + 0.5, y - 3, 3, 3, 'o');
        l.elipse(x + dx + 0.5, y - 3, 2, 2, 'Y');
      }
      l.rect(x - 4, y + 1, 2, 2, 't').rect(x + 3, y + 1, 2, 2, 't');
    },
    barba: (l, cx, cy) => {
      // bigote rizado de oro y perilla
      l.poli([[cx - 1, cy + 3], [cx - 8, cy + 3], [cx - 10, cy], [cx - 8, cy + 1]], 'y');
      l.poli([[cx + 2, cy + 3], [cx + 9, cy + 3], [cx + 11, cy], [cx + 9, cy + 1]], 'y');
      l.rect(cx - 3, cy + 2, 7, 2, 'y');
      l.rect(cx - 1, cy + 7, 3, 4, 'y');
      l.sombra('y', 'o', 1, 1, 1, 'y');
      l.rect(cx - 2, cy + 5, 5, 1, 'R');
    },
    cara: (l, cx, cy) => {
      l.rect(cx - 7, cy + 1, 3, 2, 'e').rect(cx + 5, cy + 1, 3, 2, 'e');
    },
  },
  copas: {
    manto: 'rojo',
    pelo: ['w', 'h'],
    fondo: ['R', 'v'],
    corona: (l, x, y) => {
      l.rect(x - 9, y, 19, 4, 'y').rect(x - 9, y + 3, 19, 1, 'o');
      for (const dx of [-7, 0, 7]) {
        l.rect(x + dx, y - 6, 2, 6, 'y');
        l.rect(x + dx - 2, y - 3, 6, 2, 'y');
        l.set(x + dx - 2, y - 4, 'y').set(x + dx + 3, y - 4, 'y');
      }
      l.rect(x - 4, y + 1, 2, 2, 'r').rect(x + 3, y + 1, 2, 2, 't');
      l.sombra('y', 'o', 1, 0, 1, 'yo');
    },
    barba: (l, cx, cy) => {
      l.poli([[cx - 8, cy + 1], [cx + 9, cy + 1], [cx + 8, cy + 10], [cx + 1, cy + 15], [cx - 7, cy + 10]], 'w');
      l.sombra('w', 'h', 1, 1, 2);
      // la sonrisa
      l.rect(cx - 3, cy + 4, 7, 1, 'R').set(cx - 4, cy + 3, 'R').set(cx + 4, cy + 3, 'R');
    },
    cara: (l, cx, cy) => {
      l.rect(cx - 7, cy + 1, 3, 2, 'e').rect(cx + 5, cy + 1, 3, 2, 'e');
    },
  },
};

/** El busto de un Rey en un mapa de L × L celdas, sin el fondo. */
export function reyMapa(id: ReyPx, animo: Animo = 'calma'): string[] {
  const r = RASGO[id];
  const m = RAMPA[r.manto];
  const l = new Lienzo(L, L);
  const caido = animo === 'vencido';
  const ancho = r.ancho ?? 0;
  // manto: hombros anchos con armiño, en el color del palo
  l.poli([[CX - 20 - ancho, L], [CX - 16 - ancho, 46], [CX - 6, 40], [CX + 7, 40], [CX + 17 + ancho, 46], [CX + 21 + ancho, L]], m[2]);
  l.sombra(m[2], m[1], 1, 0, 6);
  l.sombra(m[2], m[3], -1, -1, 1, m);
  // cuello de armiño con motas
  l.poli([[CX - 13, 46], [CX - 6, 40], [CX + 7, 40], [CX + 14, 46], [CX + 8, 50], [CX - 7, 50]], 'w');
  l.sombra('w', 'h', 1, 1, 1);
  for (const [dx, dy] of [[-8, 45], [-2, 47], [4, 45], [9, 47], [-11, 47]]) l.set(CX + dx, dy, 'k');
  // pechera y cadena de oro
  l.rect(CX - 4, 50, 9, L - 50, 'y');
  l.sombra('y', 'o', 1, 0, 2);
  l.rect(CX - 1, 55, 3, 3, 'r');
  // cuello y cabeza
  l.rect(CX - 3, CY + 8, 7, 7, 's');
  l.elipse(CX + 0.5, CY, 9, 11, 'p');
  l.sombra('p', 's', 1, 0, 3);
  // pelo a los lados y atrás
  l.elipse(CX + 0.5, CY - 5, 10, 7, r.pelo[0], '.');
  l.rect(CX + 7, CY - 4, 3, 12, r.pelo[1]).rect(CX - 9, CY - 4, 3, 10, r.pelo[0]);
  // ojos, cejas y nariz
  if (caido) {
    for (const x of [CX - 5, CX + 3]) l.set(x, CY - 2, 'k').set(x + 2, CY - 2, 'k').set(x + 1, CY - 1, 'k').set(x, CY, 'k').set(x + 2, CY, 'k');
  } else {
    l.rect(CX - 5, CY - 2, 2, 3, 'k').rect(CX + 3, CY - 2, 2, 3, 'k');
    l.set(CX - 5, CY - 2, 'w').set(CX + 3, CY - 2, 'w');
  }
  l.rect(CX - 6, CY - 4, 4, 1, r.pelo[1]).rect(CX + 3, CY - 4, 4, 1, r.pelo[1]);
  l.rect(CX - 1, CY - 1, 2, 5, 's');
  r.cara?.(l, CX, CY);
  r.barba(l, CX, CY);
  if (caido) l.rect(CX - 1, CY + 5, 3, 3, 'v');
  // corona: en su sitio, o caída y torcida a un lado
  if (caido) {
    const c = new Lienzo(L, L);
    r.corona(c, CX, 14);
    l.pegar(c, 18, 34);
  } else r.corona(l, CX, 14);
  // la pinta en la mano, a la derecha
  if (!caido) {
    const p = pintaNaipe(PALO[id], 'chica', 1);
    l.pegar(p, Math.round(53 - p[0].length / 2), Math.round(44 - p.length / 2));
    l.elipse(53, 58, 3, 2.6, 'p');
    l.sombra('p', 's', 1, 1, 1, 'ps');
  }
  return l.mapa();
}

/** Fondo del retrato por Rey: su papel, con una banda más honda abajo y un filete de oro. */
function fondo(id: ReyPx): string {
  const [a, b] = RASGO[id].fondo;
  const l = new Lienzo(L, L);
  l.rect(0, 0, L, L, a);
  l.rect(0, 40, L, L - 40, b);
  l.rect(0, 0, L, 1, 'y').rect(0, L - 1, L, 1, 'o').rect(0, 0, 1, L, 'y').rect(L - 1, 0, 1, L, 'o');
  return rects(l.mapa(), T);
}

/**
 * El retrato de un Rey jefe: SVG cuadrado (64 × 64 celdas) con su fondo. Clases: `.monarca`, `.m-<id>`, `.calma` o
 * `.vencido`, como el busto viejo (las hojas de estilo de la mesa ya las usan).
 */
export function reySvg(id: ReyPx, animo: Animo = 'calma', cls = ''): string {
  return `<svg class="art px monarca m-${id} ${animo}${cls ? ` ${cls}` : ''}" viewBox="0 0 ${L} ${L}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${fondo(id)}<g class="m-bust">${rects(reyMapa(id, animo), T)}</g></svg>`;
}

/** El busto sin fondo, para incrustarlo en otro dibujo (la carta del jefe) a `k` unidades por celda. */
export const reyRects = (id: ReyPx, ox: number, oy: number, k: number, animo: Animo = 'calma') => rects(reyMapa(id, animo), T, ox, oy, k);
export const esReyPx = (id: string): id is ReyPx => (REYES_PX as string[]).includes(id);
export const reyLado = (): [number, number] => [L, L];
