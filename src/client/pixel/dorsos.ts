// V40 · fase 2b · Los dorsos de los cinco Mazos: un campo de color con su trama menuda de rombos (tono sobre tono), un
// filete de oro y, al centro, un medallón de marfil con un motivo grande que dice el Mazo de un vistazo:
//   Escoba: la escoba de paja · Truco: el ancho de espadas y el de bastos cruzados · Chinchón: el sol ·
//   Mentiroso: el antifaz · Chancho: la cabeza del chancho.
// Rejilla de 100 × 140 celdas (a sangre en la carta).
import { tintas } from './paleta';
import { Lienzo } from './pincel';
import { rects } from './rejilla';

const W = 100;
const H = 140;
const T = tintas();

/** Campo, trama y medallón de cada Mazo (letras de la paleta). */
const CAMPO: Record<string, { campo: string; trama: string; motivo: (l: Lienzo) => void }> = {
  escoba: { campo: 'r', trama: 'R', motivo: escoba },
  truco: { campo: 'b', trama: 'B', motivo: truco },
  chinchon: { campo: 'g', trama: 'G', motivo: sol },
  mentiroso: { campo: 'v', trama: 'R', motivo: antifaz },
  chancho: { campo: 'o', trama: 'z', motivo: chancho },
};

const CX = 50;
const CY = 70;

function escoba(l: Lienzo): void {
  // el palo en diagonal
  l.trazo(66, 32, 40, 84, 2.2, 'd');
  l.sombra('d', 'n', 1, 1, 1);
  l.trazo(66, 32, 40, 84, 0.6, 'x', 'd');
  // la paja: abanico de oro, atado con su lazo rojo
  l.poli([[36, 80], [46, 88], [36, 114], [16, 108]], 'y');
  for (let i = 0; i < 6; i++) l.linea(41 - i * 1.5 + 2, 86 + i, 18 + i * 3.2, 108 + i * 0.6, 'o');
  l.sombra('y', 'o', 1, 1, 1, 'yo');
  l.sombra('y', 'Y', -1, -1, 1, 'yo');
  l.trazo(35, 80, 46, 88, 2, 'r');
  l.trazo(35, 80, 46, 88, 0.6, 'R', 'r');
}

function truco(l: Lienzo): void {
  // el basto de abajo a la izquierda hacia arriba a la derecha
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    l.elipse(70 - 40 * t, 34 + 70 * t, 7 - 3.5 * t, 7 - 3.5 * t, 'l');
  }
  l.sombra('l', 'g', 1, 1, 2);
  l.sombra('l', 'L', -1, -1, 1, 'lg');
  for (const t of [0.25, 0.55]) l.trazo(70 - 40 * t - 6, 34 + 70 * t - 2, 70 - 40 * t + 6, 34 + 70 * t + 2, 0.9, 'y', 'lgL');
  // la espada encima, al revés
  l.trazo(30, 34, 68, 100, 2.2, 'c');
  l.sombra('c', 'b', 1, -1, 1);
  l.trazo(30, 34, 68, 100, 0.5, 'C', 'cb');
  l.trazo(60, 104, 76, 92, 1.6, 'y');
  l.trazo(70, 102, 78, 114, 1.8, 'r');
  l.elipse(79.5, 116.5, 3, 3, 'y');
  l.sombra('y', 'o', 1, 1, 1);
}

function sol(l: Lienzo): void {
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 32 : 26;
    l.poli([[CX + Math.cos(a - 0.12) * 14, CY + Math.sin(a - 0.12) * 14], [CX + Math.cos(a) * r, CY + Math.sin(a) * r], [CX + Math.cos(a + 0.12) * 14, CY + Math.sin(a + 0.12) * 14]], i % 2 ? 'o' : 'y');
  }
  l.elipse(CX, CY, 17, 17, 'y');
  l.sombra('y', 'o', 1, 1, 2, 'y');
  l.sombra('y', 'Y', -1, -1, 2, 'yo');
  // la cara: ojos, nariz y una sonrisa
  l.rect(CX - 7, CY - 4, 3, 2, 'z').rect(CX + 4, CY - 4, 3, 2, 'z');
  l.rect(CX - 1, CY - 2, 2, 5, 'o');
  l.linea(CX - 6, CY + 6, CX - 3, CY + 8, 'z').linea(CX - 3, CY + 8, CX + 3, CY + 8, 'z').linea(CX + 3, CY + 8, CX + 6, CY + 6, 'z');
  l.elipse(CX - 9, CY + 3, 2, 1.5, 'e').elipse(CX + 9, CY + 3, 2, 1.5, 'e');
}

function antifaz(l: Lienzo): void {
  // la máscara de baile, con sus cintas y la pluma
  l.trazo(14, 68, 26, 72, 1.6, 't').trazo(86, 68, 74, 72, 1.6, 't');
  l.trazo(14, 68, 10, 84, 1.4, 'T').trazo(86, 68, 92, 84, 1.4, 'T');
  l.poli([[22, 62], [38, 58], [50, 64], [62, 58], [78, 62], [76, 78], [62, 84], [50, 76], [38, 84], [24, 78]], 'w');
  l.sombra('w', 'h', 1, 1, 2);
  l.elipse(36.5, 70, 6, 4, 'v').elipse(63.5, 70, 6, 4, 'v');
  l.poli([[22, 62], [38, 58], [50, 64], [62, 58], [78, 62], [77, 65], [62, 61], [50, 67], [38, 61], [23, 65]], 'y');
  l.sombra('y', 'o', 1, 1, 1);
  for (const x of [30, 44, 56, 70]) l.rect(x, 79, 2, 2, 'r');
  // la pluma
  l.trazo(70, 58, 80, 30, 1, 'o');
  for (let i = 0; i < 8; i++) l.trazo(72 + i * 1.2, 52 - i * 3, 66 + i * 1.6, 46 - i * 3, 1, i % 2 ? 'R' : 'r');
}

function chancho(l: Lienzo): void {
  // orejas, cabeza, hocico y ojos
  l.poli([[28, 52], [36, 40], [44, 56]], 'e').poli([[72, 52], [64, 40], [56, 56]], 'e');
  l.elipse(CX, CY + 4, 26, 22, 'p');
  l.sombra('p', 's', 1, 1, 4);
  l.sombra('p', 'P', -1, -1, 2, 'ps');
  l.elipse(CX, CY + 12, 11, 7.5, 'e');
  l.sombra('e', 'r', 1, 1, 2);
  l.elipse(CX - 4, CY + 12, 2, 2.6, 'R').elipse(CX + 4, CY + 12, 2, 2.6, 'R');
  l.rect(CX - 13, CY - 2, 4, 4, 'k').rect(CX + 9, CY - 2, 4, 4, 'k');
  l.set(CX - 13, CY - 2, 'w').set(CX + 9, CY - 2, 'w');
  l.elipse(CX - 17, CY + 8, 3, 2, 'e').elipse(CX + 17, CY + 8, 3, 2, 'e');
}

/** Los cinco Mazos, en el orden del menú. */
export const MAZOS = ['escoba', 'truco', 'chinchon', 'mentiroso', 'chancho'];

const mapas = new Map<string, string[]>();
/** El dorso de un Mazo como mapa de 100 × 140 celdas. */
export function dorsoMapa(mazo: string): string[] {
  const id = CAMPO[mazo] ? mazo : 'escoba';
  let m = mapas.get(id);
  if (m) return m;
  const d = CAMPO[id];
  const l = new Lienzo(W, H);
  // campo con una trama menuda de rombos, tono sobre tono
  l.rect(0, 0, W, H, d.campo);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (Math.abs((x % 8) - 4) + Math.abs((y % 8) - 4) <= 1) l.set(x, y, d.trama);
  // filete de oro con esquinas cortadas
  for (const [i, k] of [[5, 'y'], [6, 'o']] as [number, string][]) {
    l.rect(i + 3, i, W - 2 * i - 6, 1, k).rect(i + 3, H - 1 - i, W - 2 * i - 6, 1, k);
    l.rect(i, i + 3, 1, H - 2 * i - 6, k).rect(W - 1 - i, i + 3, 1, H - 2 * i - 6, k);
  }
  // medallón de marfil con su cerco de oro
  l.elipse(CX, CY, 40, 50, 'y');
  l.elipse(CX, CY, 38, 48, 'm');
  l.sombra('y', 'o', 1, 1, 1, 'y');
  d.motivo(l);
  m = l.mapa();
  mapas.set(id, m);
  return m;
}

/** El dorso del naipe de un Mazo (SVG a sangre). */
export function dorsoSvg(mazo: string): string {
  const id = CAMPO[mazo] ? mazo : 'escoba';
  return `<svg class="art px-dorso d-${id}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(dorsoMapa(id), T)}</svg>`;
}
