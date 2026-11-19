// V40 · fase 2 · Los 4 Reyes jefe (constitución, apartado 4), de busto en pixel-art para la mesa, la oferta de
// Bendiciones y la carta del jefe. Cada uno con su corona, su barba, sus colores y su pinta en la mano, según su tema:
// Espadas (filo: corona de hojas de acero, barba negra en punta y cicatriz), Bastos (aguante: corona de roble, barba
// tupida y hombros anchos), Oros (fortuna: corona de monedas, bigote rizado y mejillas encendidas) y Copas (brindis:
// corona de flores de lis, barba blanca y sonrisa de sobremesa). Calma o vencido.
import type { Suit } from '../../rules/engine';
import { ROPA } from './figuras';
import { tintas } from './paleta';
import { pintaMapa } from './pintas';
import { contorno, lienzo, medida, pegar, rects, simetrico, type Mapa } from './rejilla';

export type ReyPx = 'espadas' | 'bastos' | 'oros' | 'copas';
export const REYES_PX: ReyPx[] = ['espadas', 'bastos', 'oros', 'copas'];
export type Animo = 'calma' | 'vencido';
const PALO: Record<ReyPx, Suit> = { espadas: 'S', bastos: 'C', oros: 'D', copas: 'H' };

/** Lado del retrato, en celdas. */
const L = 40;
const T = tintas();

// el busto común (36 de ancho): cabeza, cuello de armiño y manto. H es el pelo y la barba de cada Rey.
const BUSTO = simetrico([
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '..................',
  '...........HHppppp',
  '...........Hpppppp',
  '...........Hpppppp',
  '...........HpHHHpp',
  '...........Hpwkppp',
  '...........Hpppppp',
  '...........Hpppppp',
  '...........Hppppps',
  '...........Hpppppp',
  '...........Hpppkkk',
  '............pppppp',
  '............sppppp',
  '.............sssss',
  '..............ssss',
  '.......QQQQQAwwwww',
  '.....QQQQQQQwkwwkw',
  '...QQQQQQQQQwwwwww',
  '..QQQQQQQQPPPPPPPA',
  '.QQQQQQQQPPPPPPPPA',
  '.QQQQQQQQPPPPPPPPA',
  'QQQQQQQQPPPPPPPPPA',
  'QQQQQQQQPPPPPPPPPA',
  'QQQQQQQQPPPPPPPPPA',
  'QQQQQQQQPPPPPPPPPA',
  'QQQQQQQQPPPPPPPPPA',
  'QQQQQQQQPPPPPPPPPA',
]);

interface Rasgo {
  /** El pelo y la barba. */
  pelo: string;
  corona: Mapa;
  barba: Mapa;
  /** Detalles de la cara sobre el busto (cicatriz, mejillas, bigote), en celdas del busto. */
  cara: { m: Mapa; x: number; y: number }[];
  /** Dónde empuña su pinta (esquina del mapa de la pinta). */
  mano: [number, number];
}

const RASGO: Record<ReyPx, Rasgo> = {
  // filo: corona de cinco hojas de acero altas, barba negra en punta y una cicatriz en la mejilla
  espadas: {
    pelo: 'k',
    corona: simetrico(['.....c...c', '....cCc.cC', '....cCc.cC', '....cCcccC', '....yyyyyy', '....yRyyyR', '....yyyyyy']),
    barba: simetrico(['..........', '..........', '.........k', '....k....k', '....kk..kk', '.....kkkkk', '......kkkk', '.......kkk', '........kk']),
    cara: [{ m: ['R.', '.R', 'R.', '.R'], x: 21, y: 13 }],
    mano: [26, 11],
  },
  // aguante: corona de hojas de roble, barba castaña tupida, hombros de leñador
  bastos: {
    pelo: 'n',
    corona: simetrico(['...g.g..g.', '..gggggggg', '..gGggGggg', '...yyyyyyy', '...yeyyyey', '...yyyyyyy', '..........']),
    barba: simetrico(['..........', '..........', '...n......', '...nn....n', '...nnnnnnn', '...nnnnnnn', '....nnnnnn', '.....nnnnn', '......nnnn']),
    cara: [],
    mano: [25, 9],
  },
  // fortuna: corona de monedas, bigote rizado de oro y mejillas encendidas
  oros: {
    pelo: 'o',
    corona: simetrico(['...YY..YY.', '..YyyYYyyY', '..yyyyyyyy', '...yyyyyyy', '...yRyyRyy', '...yyyyyyy', '..........']),
    barba: simetrico(['..........', '..........', '..........', '..........', '.....oo...', '......oooo', '..........', '..........', '..........']),
    cara: [
      { m: ['ee'], x: 13, y: 15 },
      { m: ['ee'], x: 21, y: 15 },
    ],
    mano: [24, 15],
  },
  // brindis: corona de flores de lis, barba blanca de sobremesa y sonrisa
  copas: {
    pelo: 'w',
    corona: simetrico(['....y...y.', '...yyy.yyy', '....y...y.', '...yyyyyyy', '...yRyyyRy', '...yyyyyyy', '..........']),
    barba: simetrico(['..........', '..........', '..........', '....w....w', '....ww.www', '.....wwwww', '......wwww', '.......www', '..........']),
    cara: [
      { m: ['ee'], x: 13, y: 15 },
      { m: ['ee'], x: 21, y: 15 },
      { m: ['k....k', '.kkkk.'], x: 15, y: 17 },
    ],
    mano: [25, 10],
  },
};

/** El busto de un Rey en un mapa de L × L celdas, sin el fondo. */
export function reyMapa(id: ReyPx, animo: Animo = 'calma'): string[] {
  const r = RASGO[id];
  const ropa = ROPA[PALO[id]];
  const caido = animo === 'vencido';
  let busto = BUSTO.map((f) => f.replace(/H/g, r.pelo));
  busto = pegar(busto, r.barba, 8, 14);
  for (const c of r.cara) busto = pegar(busto, c.m, c.x, c.y);
  // vencido: ojos en aspa y boca abierta
  if (caido) busto = pegar(pegar(busto, ['k.k', '.k.', 'k.k'], 12, 11), ['k.k', '.k.', 'k.k'], 21, 11);
  if (caido) busto = pegar(busto, ['kk', 'kk'], 17, 17);
  busto = contorno(busto.map((f) => [...f].map((c) => (c === 'P' ? ropa.P : c === 'Q' ? ropa.Q : c === 'A' ? ropa.A : c)).join('')));
  const corona = contorno(r.corona);
  let m = pegar(lienzo(L, L), busto, 1, 3);
  // la corona: en su sitio, o caída y torcida a un lado
  m = caido ? pegar(m, corona, 15, 6) : pegar(m, corona, 9, 5);
  if (!caido) m = pegar(m, pintaMapa(PALO[id]), r.mano[0], r.mano[1]);
  return m;
}

/** El papel de cada retrato: acero claro, hueso, oro claro o marfil (se distinguen también en gris). */
const PAPEL: Record<ReyPx, string> = { espadas: 'C', bastos: 'h', oros: 'Y', copas: 'm' };
/** Fondo del retrato por Rey: su papel con el filete del palo y un hilo de oro. */
function fondo(id: ReyPx): string {
  const c = PALO[id];
  const tinta = { S: '1', C: '2', D: '3', H: '4' }[c];
  const papel = PAPEL[id];
  return rects(
    Array.from({ length: L }, (_, y) =>
      Array.from({ length: L }, (_, x) => (x === 0 || y === 0 || x === L - 1 || y === L - 1 ? tinta : x === 1 || y === 1 || x === L - 2 || y === L - 2 ? 'y' : papel)).join(''),
    ),
    T,
  );
}

/**
 * El retrato de un Rey jefe: SVG cuadrado (40 × 40 celdas) con su fondo de marfil. Clases: `.monarca`, `.m-<id>`,
 * `.calma` o `.vencido`, como el busto viejo (las hojas de estilo de la mesa ya las usan).
 */
export function reySvg(id: ReyPx, animo: Animo = 'calma', cls = ''): string {
  return `<svg class="art px monarca m-${id} ${animo}${cls ? ` ${cls}` : ''}" viewBox="0 0 ${L} ${L}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${fondo(id)}<g class="m-bust">${rects(reyMapa(id, animo), T)}</g></svg>`;
}

/** El busto sin fondo, para incrustarlo en otro dibujo (la carta del jefe) a `k` unidades por celda. */
export const reyRects = (id: ReyPx, ox: number, oy: number, k: number, animo: Animo = 'calma') => rects(reyMapa(id, animo), T, ox, oy, k);
export const esReyPx = (id: string): id is ReyPx => (REYES_PX as string[]).includes(id);
export const reyLado = (): [number, number] => medida(lienzo(L, L));
