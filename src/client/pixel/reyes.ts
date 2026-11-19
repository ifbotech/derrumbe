// V40 · fase 2c · Los 4 Reyes jefe (constitución, apartado 4), de busto en claroscuro tramado para la mesa, la oferta de
// Bendiciones y la carta del jefe. Rostros severos de mejillas hundidas, cuencas hondas con un punto de luz, cejas que
// bajan hacia la nariz, barbas y coronas afiladas, manto con sus pliegues rayados y la penumbra de su palo detrás:
//   Espadas (filo): corona de hojas de acero, barba negra en punta y la cicatriz que le cruza el ojo; penumbra de cobalto.
//   Bastos (aguante): corona de ramas con espinas y brotes, barba castaña tupida y hombros anchos; penumbra esmeralda.
//   Oros (fortuna): corona de rayos de sol, bigote retorcido y barba partida de oro; manto púrpura sobre una hoguera.
//   Copas (brindis): corona de flores de lis, barba blanca larga y la boca torcida del que bebe de más; penumbra de vino.
// Vencido: quebrado y destronado, no cómico. La piel se vuelve gris de espectro, las cuencas quedan vacías, una grieta
// le parte la cara, la boca se abre y la corona, partida, cae a un lado; la penumbra se apaga. Retrato de 64 × 64 celdas.
import type { Suit } from '../../rules/engine';
import { hueco, rayado, sombrear, tonoTramado } from './dither';
import { RAMPA, RAMPA5, tintas, type Material } from './paleta';
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
  /** Pelo y barba: base, sombra y luz. */
  pelo: [string, string, string];
  /** La rampa del pelo (de la sombra abismal a la luz). */
  peloRampa: string;
  /** La penumbra del fondo, de los bordes (abismo) a la luz que tiene detrás la cabeza; y cuánta luz llega. */
  fondo: [string, number];
  /** El brillo de la pupila en calma. */
  ojo: string;
  corona: (l: Lienzo, x: number, y: number) => void;
  barba: (l: Lienzo, cx: number, cy: number, vencido: boolean) => void;
  cara?: (l: Lienzo, cx: number, cy: number, vencido: boolean) => void;
  /** Hombros más anchos (Bastos). */
  ancho?: number;
  /** La luz del manto (0,52 de serie): los cuatro se distinguen en gris a 24 px también por lo oscuro del manto. */
  luzManto?: number;
}

const CX = 30;
const CY = 26;

/** Aro de la corona: banda de oro con sus piedras, tramada de luz a sombra. */
function aro(l: Lienzo, x: number, y: number, piedras: string): void {
  l.rect(x - 10, y, 21, 4, 'y');
  sombrear(l, 'y', '9zoOyY', { caja: [x - 10, y, x + 10, y + 3], base: 0.62, pendiente: 1, borde: 1, fuerzaBorde: 0.35, brillo: 1, fuerzaBrillo: 0.3 });
  [...piedras].forEach((k, i) => {
    const px = x - 7 + i * 7;
    l.rect(px, y + 1, 2, 2, k).set(px, y + 1, k === 'r' ? 'e' : k === 't' ? 'C' : 'A');
  });
}

const RASGO: Record<ReyPx, Rasgo> = {
  espadas: {
    manto: 'acero',
    luzManto: 0.4,
    pelo: ['k', '0', 'B'],
    peloRampa: '90kB',
    fondo: ['09fBb', 0.28],
    ojo: 'C',
    corona: (l, x, y) => {
      // cinco hojas de acero, la del medio más alta, afiladas como puñales
      for (const [dx, alto] of [[-8, 9], [-4, 11], [0, 14], [4, 11], [8, 9]] as [number, number][]) l.poli([[x + dx - 1.6, y], [x + dx + 0.5, y - alto], [x + dx + 2.6, y]], 'c');
      sombrear(l, 'c', '9BbcCA', { caja: [x - 10, y - 14, x + 11, y], base: 0.6, pendiente: 0.9, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.35 });
      aro(l, x, y, 'trt');
    },
    barba: (l, cx, cy) => {
      // barba negra en punta y bigote afilado
      l.poli([[cx - 7, cy + 4], [cx + 8, cy + 4], [cx + 6, cy + 11], [cx + 1, cy + 21], [cx - 4, cy + 11]], '¤');
      l.poli([[cx - 9, cy + 5], [cx - 1, cy + 4], [cx + 2, cy + 4], [cx + 10, cy + 5], [cx + 2, cy + 6], [cx - 1, cy + 6]], '¤');
      sombrear(l, '¤', '90kB', { base: 0.45, pendiente: 0.9, borde: 2, fuerzaBorde: 0.3, brillo: 1, fuerzaBrillo: 0.3 });
      l.rect(cx - 2, cy + 7, 5, 1, 'v');
    },
    cara: (l, cx, cy, vencido) => {
      // la cicatriz que le cruza el ojo derecho
      l.linea(cx + 3, cy - 6, cx + 7, cy + 3, vencido ? 'i' : 'R');
    },
  },
  bastos: {
    manto: 'oliva',
    pelo: ['d', 'n', 'x'],
    peloRampa: '9Nndx',
    fondo: ['9GglK', 0.74],
    ojo: 'K',
    ancho: 3,
    luzManto: 0.76,
    corona: (l, x, y) => {
      // ramas nudosas con espinas y brotes
      for (const [dx, alto, lado] of [[-8, 8, -1], [-3, 11, 1], [3, 12, -1], [8, 8, 1]] as [number, number, number][]) {
        l.trazo(x + dx, y, x + dx + lado * 2, y - alto, 1, 'n');
        l.set(x + dx + lado * 2 + lado, y - alto + 3, 'n').set(x + dx - lado, y - alto + 5, 'n');
        l.elipse(x + dx + lado * 2 + 0.5, y - alto, 1.6, 1.3, 'l');
      }
      sombrear(l, 'n', '9Nnd', { caja: [x - 11, y - 13, x + 12, y], base: 0.5, borde: 1, fuerzaBorde: 0.3 });
      sombrear(l, 'l', 'glL', { caja: [x - 11, y - 14, x + 12, y], base: 0.55, borde: 1, fuerzaBorde: 0.3 });
      aro(l, x, y, 'rlr');
    },
    barba: (l, cx, cy) => {
      l.elipse(cx + 0.5, cy + 9, 10.5, 10, '¤');
      l.poli([[cx - 6, cy + 4], [cx + 7, cy + 4], [cx + 5, cy + 6], [cx - 4, cy + 6]], 'p', '¤');
      sombrear(l, '¤', '9Nndx', { base: 0.5, pendiente: 1, borde: 3, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3, ancho: 0.8 });
      rayado(l, 'Nndx', 'N', { angulo: '|', paso: 3, caja: [cx - 9, cy + 9, cx + 11, cy + 19], hasta: 0.6 });
      l.rect(cx - 3, cy + 6, 7, 1, 'v');
    },
  },
  oros: {
    manto: 'purpura',
    pelo: ['n', 'N', 'd'],
    peloRampa: '9Nnd',
    fondo: ['9zoOy', 0.72],
    ojo: 'Y',
    corona: (l, x, y) => {
      // rayos de sol, largos y cortos alternados
      for (let i = 0; i < 7; i++) {
        const dx = -9 + i * 3;
        const alto = i % 2 ? 7 : 11;
        l.poli([[x + dx - 1.2, y], [x + dx + 0.5, y - alto], [x + dx + 2.2, y]], 'y');
      }
      sombrear(l, 'y', '9zoOyY', { caja: [x - 10, y - 11, x + 11, y], base: 0.62, pendiente: 0.9, borde: 1, fuerzaBorde: 0.35, brillo: 1, fuerzaBrillo: 0.3 });
      aro(l, x, y, 'trt');
    },
    barba: (l, cx, cy) => {
      // bigote retorcido hacia arriba y barba partida en dos puntas
      l.poli([[cx - 1, cy + 4], [cx - 8, cy + 4], [cx - 11, cy], [cx - 9, cy + 2]], '¤');
      l.poli([[cx + 2, cy + 4], [cx + 9, cy + 4], [cx + 12, cy], [cx + 10, cy + 2]], '¤');
      l.rect(cx - 3, cy + 3, 7, 2, '¤');
      l.poli([[cx - 4, cy + 7], [cx + 5, cy + 7], [cx + 4, cy + 14], [cx + 2, cy + 11], [cx, cy + 15], [cx - 2, cy + 11]], '¤');
      sombrear(l, '¤', '9Nndx', { base: 0.5, pendiente: 1, borde: 1, fuerzaBorde: 0.35, brillo: 1, fuerzaBrillo: 0.3 });
      l.rect(cx - 2, cy + 6, 5, 1, 'v');
    },
  },
  copas: {
    manto: 'rojo',
    luzManto: 0.7,
    pelo: ['w', 'h', 'w'],
    peloRampa: '9shw',
    fondo: ['9vRre', 0.84],
    ojo: 'e',
    corona: (l, x, y) => {
      // flores de lis: el pétalo del medio alto y los dos que se abren
      for (const dx of [-7, 0, 7]) {
        l.poli([[x + dx - 1, y], [x + dx + 0.5, y - 9], [x + dx + 2, y]], 'y');
        l.poli([[x + dx, y - 3], [x + dx - 3, y - 6], [x + dx - 3.5, y - 3]], 'y');
        l.poli([[x + dx + 1, y - 3], [x + dx + 4, y - 6], [x + dx + 4.5, y - 3]], 'y');
      }
      sombrear(l, 'y', '9zoOyY', { caja: [x - 11, y - 9, x + 12, y], base: 0.62, pendiente: 0.9, borde: 1, fuerzaBorde: 0.35, brillo: 1, fuerzaBrillo: 0.3 });
      aro(l, x, y, 'rtr');
    },
    barba: (l, cx, cy) => {
      // barba blanca larga, que baja en mechones sobre el pecho
      l.poli([[cx - 8, cy + 2], [cx + 9, cy + 2], [cx + 9, cy + 12], [cx + 4, cy + 23], [cx + 1, cy + 19], [cx - 2, cy + 23], [cx - 7, cy + 12]], '¤');
      sombrear(l, '¤', '9shw', { base: 0.62, pendiente: 1, borde: 3, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.2, ancho: 0.8 });
      rayado(l, 'shw', 's', { angulo: '|', paso: 3, caja: [cx - 7, cy + 9, cx + 9, cy + 22], hasta: 0.55 });
      // la boca torcida del que brinda
      l.linea(cx - 3, cy + 5, cx + 1, cy + 5, 'v').linea(cx + 1, cy + 5, cx + 4, cy + 3, 'v');
    },
  },
};

/** El busto de un Rey en un mapa de L × L celdas, sin el fondo. */
export function reyMapa(id: ReyPx, animo: Animo = 'calma'): string[] {
  const r = RASGO[id];
  const vencido = animo === 'vencido';
  const manto = RAMPA5[r.manto];
  const m = RAMPA[r.manto];
  const piel = vencido ? '9ijJu' : '9spP';
  const l = new Lienzo(L, L);
  const ancho = r.ancho ?? 0;
  // manto: hombros anchos, en claroscuro tramado y con sus pliegues rayados del lado de la sombra
  l.poli([[CX - 21 - ancho, L], [CX - 17 - ancho, 46], [CX - 6, 40], [CX + 7, 40], [CX + 18 + ancho, 46], [CX + 22 + ancho, L]], m[2]);
  sombrear(l, m[2], manto, { base: vencido ? 0.3 : (r.luzManto ?? 0.52), pendiente: 1.1, borde: 5, fuerzaBorde: 0.45, brillo: vencido ? 2 : 1, fuerzaBrillo: vencido ? 0.4 : 0.25, ancho: 0.85 });
  rayado(l, manto, manto[0], { angulo: '/', paso: 4, caja: [CX + 4, 46, L - 1, L - 1], hasta: 0.35 });
  // cuello de armiño con sus motas
  l.poli([[CX - 13, 46], [CX - 6, 40], [CX + 7, 40], [CX + 14, 46], [CX + 8, 50], [CX - 7, 50]], 'w');
  sombrear(l, 'w', vencido ? '9ju' : '9hw', { base: 0.6, pendiente: 1, borde: 2, fuerzaBorde: 0.4 });
  for (const [dx, dy] of [[-8, 45], [-2, 47], [4, 45], [9, 47], [-11, 47]]) l.set(CX + dx, dy, 'k');
  // la cadena de oro en el pecho
  for (let x = CX - 12; x <= CX + 12; x += 3) l.rect(x, 52 + Math.round((12 - Math.abs(x - CX)) * 0.35), 2, 2, vencido ? 'J' : x > CX + 3 ? 'o' : 'y');
  l.rect(CX - 1, 57, 3, 4, vencido ? 'j' : 'r').set(CX - 1, 57, vencido ? 'u' : 'e');
  // la melena detrás de la cabeza
  l.elipse(CX + 0.5, CY - 1, 11, 11.5, '¤');
  l.rect(CX - 10, CY, 22, 8, '¤');
  sombrear(l, '¤', r.peloRampa, { base: 0.42, pendiente: 1, borde: 3, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.25 });
  // cuello y cabeza: cara larga y angulosa, sienes estrechas y mejillas hundidas
  l.rect(CX - 3, CY + 8, 7, 7, 's');
  l.poli([[CX - 6, CY - 10], [CX + 7, CY - 10], [CX + 9, CY - 5], [CX + 9.5, CY + 1], [CX + 7, CY + 8], [CX + 2, CY + 12], [CX - 1, CY + 12], [CX - 6, CY + 8], [CX - 8.5, CY + 1], [CX - 8, CY - 5]], 'p');
  sombrear(l, 'ps', piel, { base: vencido ? 0.5 : 0.58, pendiente: 1.15, borde: 3, fuerzaBorde: 0.5, brillo: 1, fuerzaBrillo: 0.2, ancho: 0.8 });
  // cuencas hondas, cejas que bajan hacia la nariz
  const cuenca = vencido ? '09' + piel[1] : '09' + piel[1] + piel[2];
  hueco(l, CX - 4, CY - 0.5, 3.4, 2.4, cuenca, { curva: vencido ? 0.8 : 1.3 });
  hueco(l, CX + 4.5, CY - 0.5, 3.4, 2.4, cuenca, { curva: vencido ? 0.8 : 1.3 });
  if (!vencido) l.set(CX - 4, CY - 1, r.ojo).set(CX + 4, CY - 1, r.ojo);
  const ceja = vencido ? 'i' : r.pelo[1] === 'h' ? 'h' : r.pelo[1];
  if (vencido) {
    // cejas alzadas en el medio: el espanto del vencido
    l.poli([[CX - 8, CY - 3], [CX - 1, CY - 5], [CX - 1, CY - 4], [CX - 8, CY - 2]], ceja);
    l.poli([[CX + 1, CY - 5], [CX + 9, CY - 3], [CX + 9, CY - 2], [CX + 1, CY - 4]], ceja);
  } else {
    l.poli([[CX - 8, CY - 5], [CX - 1, CY - 3], [CX - 1, CY - 2], [CX - 8, CY - 4]], ceja);
    l.poli([[CX + 1, CY - 3], [CX + 9, CY - 5], [CX + 9, CY - 4], [CX + 1, CY - 2]], ceja);
  }
  // nariz larga con su sombra
  l.linea(CX, CY - 2, CX + 1, CY + 3, piel[1]);
  l.set(CX - 1, CY + 4, piel[1]).set(CX + 2, CY + 4, '9');
  r.cara?.(l, CX, CY, vencido);
  r.barba(l, CX, CY, vencido);
  if (vencido) {
    // la barba y el pelo también se apagan; la grieta parte la cara y la boca queda abierta
    l.cambiar('k', 'i').cambiar('B', 'j', [CX - 11, CY - 14, CX + 11, CY + 21]).cambiar('dxyOYw', 'J').cambiar('nohe', 'j').cambiar('Nz', 'i');
    l.linea(CX - 6, CY - 9, CX - 2, CY - 3, '9').linea(CX - 2, CY - 3, CX - 3, CY + 2, '9').linea(CX - 3, CY + 2, CX + 1, CY + 6, '9');
    l.elipse(CX + 0.5, CY + 7.5, 2, 1.6, '0');
    l.set(CX - 4, CY + 1, 'j').set(CX - 4, CY + 2, 'i').set(CX + 5, CY + 1, 'j').set(CX + 5, CY + 2, 'i');
  }
  // corona: en su sitio, o partida y caída a un lado
  if (vencido) {
    const c = new Lienzo(L, L);
    r.corona(c, CX, 14);
    c.cambiar('Y', 'y');
    // la grieta: una cuña vacía que la parte
    c.poli([[CX - 1, 0], [CX + 2, 0], [CX + 1, 15], [CX, 18]], '.');
    l.pegar(c, 18, 36);
  } else r.corona(l, CX, 14);
  // la pinta en la mano, a la derecha
  if (!vencido) {
    const p = pintaNaipe(PALO[id], 'chica', 1);
    // la pinta entera dentro del cuadro: si es ancha (oro, copa) se corre hacia el centro
    const px = Math.min(L - p[0].length, Math.round(54 - p[0].length / 2));
    l.pegar(p, px, Math.round(44 - p.length / 2));
    l.elipse(px + p[0].length / 2, 58, 3, 2.6, '¤');
    sombrear(l, '¤', '9spP', { base: 0.55, borde: 1, fuerzaBorde: 0.4 });
  }
  return l.mapa();
}

/** Fondo del retrato: la penumbra de su palo, tramada desde la luz que tiene detrás la cabeza hasta el abismo. */
function fondoMapa(id: ReyPx, animo: Animo): string[] {
  const [rampa, luz] = RASGO[id].fondo;
  const l = new Lienzo(L, L);
  const fuerza = animo === 'vencido' ? luz * 0.55 : luz;
  for (let y = 0; y < L; y++)
    for (let x = 0; x < L; x++) {
      const d = Math.hypot((x + 0.5 - CX) / 34, (y + 0.5 - (CY - 4)) / 38);
      const [k, t] = tonoTramado(rampa, Math.max(0, 1 - d) ** 1.1 * fuerza * 1.25, x, y, { ancho: 0.9 });
      l.set(x, y, k);
      if (t) l.marcar(x, y);
    }
  // filete de oro viejo
  l.rect(0, 0, L, 1, 'o').rect(0, 0, 1, L, 'o').rect(0, L - 1, L, 1, 'z').rect(L - 1, 0, 1, L, 'z');
  return l.mapa();
}

/**
 * El retrato de un Rey jefe: SVG cuadrado (64 × 64 celdas) con su fondo. Clases: `.monarca`, `.m-<id>`, `.calma` o
 * `.vencido`, como el busto viejo (las hojas de estilo de la mesa ya las usan).
 */
export function reySvg(id: ReyPx, animo: Animo = 'calma', cls = ''): string {
  return `<svg class="art px monarca m-${id} ${animo}${cls ? ` ${cls}` : ''}" viewBox="0 0 ${L} ${L}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(fondoMapa(id, animo), T)}<g class="m-bust">${rects(reyMapa(id, animo), T)}</g></svg>`;
}

/** El busto sin fondo, para incrustarlo en otro dibujo (la carta del jefe) a `k` unidades por celda. */
export const reyRects = (id: ReyPx, ox: number, oy: number, k: number, animo: Animo = 'calma') => rects(reyMapa(id, animo), T, ox, oy, k);
export const esReyPx = (id: string): id is ReyPx => (REYES_PX as string[]).includes(id);
export const reyLado = (): [number, number] => [L, L];
