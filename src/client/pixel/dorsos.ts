// V40 · fase 2c · Los dorsos de los cinco Mazos, como naipes de colección grabados: un campo hondo con su celosía de
// rombos y sus clavos de oro, una penumbra tramada hacia los cantos, doble filete de oro con flores en las esquinas y,
// al centro, un medallón oscuro con un motivo grande en claroscuro que dice el Mazo de un vistazo:
//   Escoba: la escoba de paja, erguida · Truco: el ancho de espadas y el de bastos cruzados · Chinchón: el sol severo ·
//   Mentiroso: el antifaz de terciopelo con sus plumas · Chancho Va: la cabeza del jabalí, de frente, con sus colmillos.
// Todo simétrico de izquierda a derecha salvo el cruce del Truco. Rejilla de 100 × 140 celdas (a sangre en la carta).
import { hueco, rayado, sombrear, tonoTramado } from './dither';
import { tintas } from './paleta';
import { Lienzo } from './pincel';
import { rects } from './rejilla';

const W = 100;
const H = 140;
const T = tintas();

/** Campo (hondo, celosía) y motivo de cada Mazo (letras de la paleta). */
const CAMPO: Record<string, { hondo: string; celosia: string; motivo: (l: Lienzo) => void }> = {
  escoba: { hondo: 'v', celosia: 'R', motivo: escoba },
  truco: { hondo: 'B', celosia: 'b', motivo: truco },
  chinchon: { hondo: 'G', celosia: 'g', motivo: sol },
  mentiroso: { hondo: 'f', celosia: 'F', motivo: antifaz },
  chancho: { hondo: 'N', celosia: 'n', motivo: jabali },
};

const CX = 50;
const CY = 70;

function escoba(l: Lienzo): void {
  // el palo erguido, de madera, con su pomo de oro
  l.trazo(CX, 30, CX, 88, 3, '¤');
  sombrear(l, '¤', '9Nndx', { base: 0.66, pendiente: 0.9, borde: 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
  l.elipse(CX, 28.5, 3.2, 3.2, '¤');
  sombrear(l, '¤', '9zoyY', { base: 0.6, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
  // la paja en abanico, con sus briznas grabadas
  l.poli([[CX - 6, 90], [CX + 6, 90], [CX + 17, 113], [CX + 11, 117], [CX, 119], [CX - 11, 117], [CX - 17, 113]], '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.6, pendiente: 1, borde: 3, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.3 });
  for (let i = -5; i <= 5; i++) l.linea(CX + i * 0.6, 92, CX + i * 2.9, 116, i > 1 ? 'z' : 'o');
  // el atado de carmesí
  l.rect(CX - 7, 87, 15, 4, '¤');
  sombrear(l, '¤', '9vRre', { base: 0.6, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
  // la cinta de carmesí que sube enroscada por el palo
  for (let y = 40; y <= 80; y += 8) l.linea(CX - 2, y + 2, CX + 2, y - 1, 'R').linea(CX - 2, y + 3, CX + 2, y, 'v');
}

function truco(l: Lienzo): void {
  // el basto, de arriba a la derecha a abajo a la izquierda: nudoso, con sus cortes rojos
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    l.elipse(70 - 40 * t, 34 + 70 * t, 6.5 - 3 * t, 6.5 - 3 * t, '¤');
  }
  for (const t of [0.3, 0.6]) l.trazo(70 - 40 * t, 34 + 70 * t, 70 - 40 * t + 7, 34 + 70 * t + 1, 1.6, '¤');
  sombrear(l, '¤', '9GglLK', { base: 0.55, pendiente: 1, borde: 3, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.3, ancho: 0.8 });
  for (const t of [0.3, 0.6]) l.elipse(70 - 40 * t + 7.5, 34 + 70 * t + 1, 1.3, 1.3, 'r');
  l.elipse(70.5, 32, 5, 3, 'r');
  l.elipse(71, 32, 2.5, 1.5, 'O');
  // la espada encima, al revés: hoja de cobalto con su filo cian, guarda y pomo de oro
  l.trazo(32, 36, 64, 98, 2.4, '¤');
  sombrear(l, '¤', '9BbcCA', { base: 0.6, pendiente: 0.9, borde: 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.35 });
  l.linea(32, 36, 63, 96, 'A');
  l.trazo(56, 104, 74, 94, 1.8, '¤');
  l.trazo(64, 99, 72, 113, 1.9, 'r');
  l.elipse(73.5, 116, 3.4, 3.4, '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.62, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
}

function sol(l: Lienzo): void {
  // rayos rectos y flameantes, alternados
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 31 : 25;
    const ab = i % 2 ? 0.1 : 0.16;
    l.poli([[CX + Math.cos(a - ab) * 15, CY + Math.sin(a - ab) * 15], [CX + Math.cos(a) * r, CY + Math.sin(a) * r], [CX + Math.cos(a + ab) * 15, CY + Math.sin(a + ab) * 15]], '¤');
  }
  sombrear(l, '¤', '9zoOy', { base: 0.55, pendiente: 1, borde: 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
  l.elipse(CX, CY, 17, 17, '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.6, pendiente: 1.1, borde: 4, fuerzaBorde: 0.5, brillo: 2, fuerzaBrillo: 0.3, ancho: 0.8 });
  // la cara severa: cejas que bajan, cuencas hondas, nariz larga y la boca recta
  l.poli([[CX - 11, CY - 7], [CX - 2, CY - 4], [CX - 2, CY - 3], [CX - 11, CY - 6]], 'z');
  l.poli([[CX + 2, CY - 4], [CX + 11, CY - 7], [CX + 11, CY - 6], [CX + 2, CY - 3]], 'z');
  hueco(l, CX - 6, CY - 1, 3.4, 2.2, '9zo', { curva: 1.2 });
  hueco(l, CX + 6, CY - 1, 3.4, 2.2, '9zo', { curva: 1.2 });
  l.set(CX - 6, CY - 1, 'Y').set(CX + 6, CY - 1, 'Y');
  l.rect(CX - 1, CY - 3, 2, 8, 'o').rect(CX, CY - 2, 1, 7, 'z');
  l.rect(CX - 5, CY + 8, 11, 1, 'z');
  l.linea(CX - 9, CY + 4, CX - 6, CY + 10, 'o').linea(CX + 9, CY + 4, CX + 6, CY + 10, 'o');
}

function antifaz(l: Lienzo): void {
  // las plumas que se abren detrás, de carmesí
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const x1 = CX + s * (10 + i * 9);
      l.trazo(CX + s * 6, 64, x1, 34 + i * 6, 2.6 - i * 0.4, '¤');
    }
  sombrear(l, '¤', '9vRre', { base: 0.6, pendiente: 1, borde: 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.25 });
  // el antifaz de terciopelo púrpura
  l.poli([[CX - 30, 62], [CX - 14, 56], [CX, 63], [CX + 14, 56], [CX + 30, 62], [CX + 28, 78], [CX + 14, 85], [CX, 77], [CX - 14, 85], [CX - 28, 78]], '¤');
  sombrear(l, '¤', '9fFqQ', { base: 0.52, pendiente: 1.1, borde: 3, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.3, ancho: 0.8 });
  // el ribete de oro de arriba
  l.poli([[CX - 30, 62], [CX - 14, 56], [CX, 63], [CX + 14, 56], [CX + 30, 62], [CX + 30, 64], [CX + 14, 58], [CX, 65], [CX - 14, 58], [CX - 30, 64]], 'y');
  l.cambiar('y', 'o', [CX, 0, W, H]);
  // los ojos: vacíos, hondos, con un brillo de oro en el fondo
  hueco(l, CX - 14, 70, 7, 4.5, '09f', { curva: 1.1 });
  hueco(l, CX + 14, 70, 7, 4.5, '09f', { curva: 1.1 });
  l.set(CX - 13, 71, 'Y').set(CX + 15, 71, 'Y');
  // las cintas que cuelgan y una lágrima de rubí
  for (const s of [-1, 1]) l.trazo(CX + s * 29, 70, CX + s * 33, 100, 1.2, s < 0 ? 'R' : 'v');
  l.poli([[CX, 82], [CX + 2, 86], [CX, 90], [CX - 2, 86]], 'r');
}

function jabali(l: Lienzo): void {
  // las orejas puntiagudas
  for (const s of [-1, 1]) l.poli([[CX + s * 23, 52], [CX + s * 30, 32], [CX + s * 14, 46]], '¤');
  // la cabeza de frente: frente ancha que se afina hacia el hocico, con la cresta de cerdas
  l.poli([[CX - 20, 46], [CX - 6, 40], [CX, 34], [CX + 6, 40], [CX + 20, 46], [CX + 25, 60], [CX + 17, 82], [CX + 11, 96], [CX - 11, 96], [CX - 17, 82], [CX - 25, 60]], '¤');
  sombrear(l, '¤', '9vRre', { base: 0.6, pendiente: 1, borde: 3, fuerzaBorde: 0.45, brillo: 2, fuerzaBrillo: 0.3, ancho: 0.85 });
  // el grabado de oro sobre las cerdas: fuego del lado de la luz, ámbar del de la sombra
  rayado(l, '9vRre', 'y', { angulo: '/', paso: 3, caja: [CX - 25, 36, CX - 3, 84], hasta: 1 });
  rayado(l, '9vRre', 'o', { angulo: '\\', paso: 3, caja: [CX + 3, 36, CX + 25, 84], hasta: 1 });
  for (let y = 36; y < 48; y += 2) l.set(CX, y, 'y').set(CX - 1, y + 1, 'o').set(CX + 1, y + 1, 'z');
  // los ojos chicos y feroces, encendidos
  hueco(l, CX - 9, 60, 3.6, 2.4, '09v', { curva: 1 });
  hueco(l, CX + 9, 60, 3.6, 2.4, '09v', { curva: 1 });
  l.rect(CX - 10, 60, 2, 1, 'Y').rect(CX + 8, 60, 2, 1, 'Y');
  l.poli([[CX - 15, 55], [CX - 4, 58], [CX - 4, 59], [CX - 15, 57]], 'z');
  l.poli([[CX + 4, 58], [CX + 15, 55], [CX + 15, 57], [CX + 4, 59]], 'z');
  // el hocico y los colmillos que suben curvos
  l.elipse(CX, 92, 11, 7, '¤');
  sombrear(l, '¤', '9vR', { base: 0.5, pendiente: 0.9, borde: 2, fuerzaBorde: 0.4, brillo: 0 });
  l.rect(CX - 10, 86, 21, 1, 'o');
  l.elipse(CX - 4, 93, 2, 2.6, '0').elipse(CX + 4, 93, 2, 2.6, '0');
  // los colmillos de marfil, largos, que suben curvos por fuera de la cara
  for (const s of [-1, 1]) l.poli([[CX + s * 9, 99], [CX + s * 17, 92], [CX + s * 22, 76], [CX + s * 19, 91], [CX + s * 12, 100]], '¤');
  sombrear(l, '¤', 'hmw', { base: 0.6, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
}

/** Los cinco Mazos, en el orden del menú. */
export const MAZOS = ['escoba', 'truco', 'chinchon', 'mentiroso', 'chancho'];

/** Una flor de esquina: rombo de oro con su piedra. */
function flor(l: Lienzo, x: number, y: number, piedra: string): void {
  l.poli([[x, y - 4], [x + 4, y], [x, y + 4], [x - 4, y]], 'y');
  l.set(x, y - 1, piedra).set(x, y, piedra).set(x - 1, y, piedra).set(x + 1, y, piedra).set(x, y + 1, piedra);
  l.set(x + 2, y + 1, 'o').set(x + 1, y + 2, 'o').set(x - 2, y - 1, 'Y').set(x - 1, y - 2, 'Y');
}

const mapas = new Map<string, string[]>();
/** El dorso de un Mazo como mapa de 100 × 140 celdas. */
export function dorsoMapa(mazo: string): string[] {
  const id = CAMPO[mazo] ? mazo : 'escoba';
  let m = mapas.get(id);
  if (m) return m;
  const d = CAMPO[id];
  const l = new Lienzo(W, H);
  // campo hondo con su celosía de rombos (cada 8 celdas) y clavos de oro en los cruces
  l.rect(0, 0, W, H, d.hondo);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const a = (((x + y) % 8) + 8) % 8;
      const b = (((x - y) % 8) + 8) % 8;
      if (a === 0 || b === 0) l.set(x, y, d.celosia).marcar(x, y);
      if (a === 0 && b === 0) l.set(x, y, 'o').marcar(x, y);
    }
  // la penumbra tramada hacia los cantos: el campo se hunde al violeta abismal
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const borde = Math.min(x, y, W - 1 - x, H - 1 - y);
      const v = Math.min(1, borde / 16);
      const [k, t] = tonoTramado('9' + d.hondo, 0.25 + v * 0.75, x, y, { ancho: 1 });
      if (k === '9') {
        l.set(x, y, '9');
        if (t) l.marcar(x, y);
      }
    }
  // doble filete de oro con las esquinas cortadas: luz arriba a la izquierda, sombra abajo a la derecha
  for (const [i, n] of [[4, 2], [8, 1]] as [number, number][])
    for (let k = 0; k < n; k++) {
      const j = i + k;
      l.rect(j + 4, j, W - 2 * j - 8, 1, 'y').rect(j, j + 4, 1, H - 2 * j - 8, 'y');
      l.rect(j + 4, H - 1 - j, W - 2 * j - 8, 1, 'o').rect(W - 1 - j, j + 4, 1, H - 2 * j - 8, 'o');
      l.linea(j, j + 4, j + 4, j, 'y').linea(W - 1 - j - 4, j, W - 1 - j, j + 4, 'o');
      l.linea(j, H - 1 - j - 4, j + 4, H - 1 - j, 'o').linea(W - 1 - j, H - 1 - j - 4, W - 1 - j - 4, H - 1 - j, 'z');
    }
  for (const [x, y] of [[15, 15], [W - 16, 15], [15, H - 16], [W - 16, H - 16]]) flor(l, x, y, id === 'truco' ? 'C' : 'r');
  // el medallón: cerco de oro tramado y el fondo oscuro con la luz que nace detrás del motivo
  l.elipse(CX, CY, 37, 49, '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.6, pendiente: 1.1, borde: 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.35 });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const e = ((x + 0.5 - CX) / 34) ** 2 + ((y + 0.5 - CY) / 46) ** 2;
      if (e > 1) continue;
      const [k, t] = tonoTramado('09' + d.hondo + d.celosia, (1 - Math.sqrt(e)) * 0.95, x, y, { ancho: 0.9 });
      l.set(x, y, k);
      if (t) l.marcar(x, y);
    }
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
