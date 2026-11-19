// V40 · fase 2b · El 1 de cada palo, ornamentado y a toda la cara del naipe (rejilla de 96 × 140): la espada grande con
// su cinta y sus borlas, el basto en diagonal con sus brotes, el oro con su laurel y su lazo, y el cáliz con tapa.
// Dibujos originales en el lenguaje de la baraja española, sin contorno negro: luz de arriba a la izquierda.
import type { Suit } from '../../rules/engine';
import { Lienzo, cintaOndulada } from './pincel';

export const ANCHO = 96;
export const ALTO = 140;

/** Una rama de laurel: hojas alternas a lo largo de una curva, de (x0, y0) a (x1, y1). */
function laurel(l: Lienzo, x0: number, y0: number, x1: number, y1: number, hojas: number, lado: 1 | -1): void {
  l.trazo(x0, y0, x1, y1, 0.7, 'g');
  for (let i = 1; i <= hojas; i++) {
    const t = i / (hojas + 1);
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const n = Math.hypot(nx, ny) || 1;
    for (const s of [1, -1]) {
      // hoja lanceolada: más ancha al medio, con la cara de la luz clara y la otra en sombra
      const hx = x + ((nx / n) * 4.4 * s + ((x1 - x0) / n) * 2.6) * lado;
      const hy = y + ((ny / n) * 4.4 * s + ((y1 - y0) / n) * 2.6);
      l.elipse((x + hx) / 2, (y + hy) / 2, 1.7, 1.7, s > 0 ? 'l' : 'g');
      l.trazo(x, y, hx, hy, 0.9, s > 0 ? 'l' : 'g');
    }
  }
}

/** Una cinta que ondula: tramo de ancho `r` con su cara clara y su revés oscuro alternando por medias ondas. */
function cinta(l: Lienzo, pts: [number, number][], r: number, cara: string, reves: string): void {
  for (let i = 0; i < pts.length - 1; i++) l.trazo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, i % 2 ? reves : cara);
}

function asEspadas(): string[] {
  const l = new Lienzo(ANCHO, ALTO);
  const cx = 48;
  // la cinta roja pasa por detrás de la hoja (se dibuja antes) y la azul, por delante (después), en ondas suaves
  cintaOndulada(l, 14, 70, 82, 62, 5, 3, 2.3, 'r', 'R');
  // hoja: ancha, con vaceo claro y filo en sombra
  l.poli([[cx - 5, 18], [cx, 8], [cx + 5, 18], [cx + 5, 92], [cx - 5, 92]], 'c');
  l.sombra('c', 'b', 1, 0, 3);
  l.rect(cx - 3, 18, 2, 72, 'C');
  l.rect(cx, 22, 1, 66, 'b');
  cintaOndulada(l, 82, 44, 14, 38, 5, 3, 2.3, 't', 'T');
  // borlas de oro en las puntas de las cintas
  for (const [x, y, k] of [[14, 38, 'T'], [82, 44, 'T'], [14, 70, 'R'], [82, 62, 'R']] as [number, number, string][]) {
    l.trazo(x, y, x, y + 7, 0.6, k);
    l.poli([[x - 3, y + 14], [x - 1, y + 7], [x + 2, y + 7], [x + 4, y + 14]], 'y');
    l.elipse(x + 0.5, y + 7, 2, 1.5, 'o');
    l.sombra('y', 'o', 1, 0, 1, 'yo');
  }
  // guarda: gavilanes curvos de oro con sus volutas
  l.rect(cx - 18, 92, 37, 4, 'y');
  l.elipse(cx - 19, 90, 3.2, 3.2, 'y');
  l.elipse(cx + 20, 90, 3.2, 3.2, 'y');
  l.elipse(cx - 19, 90, 1.4, 1.4, 'o');
  l.elipse(cx + 20, 90, 1.4, 1.4, 'o');
  l.elipse(cx + 0.5, 94, 6, 5, 'y');
  l.elipse(cx + 0.5, 94, 2.2, 2.2, 'r');
  l.rect(cx - 18, 96, 37, 1, 'o');
  // guardamano en D y empuñadura trenzada
  l.trazo(cx + 9, 97, cx + 9, 116, 1.1, 'y');
  l.trazo(cx + 9, 116, cx + 3, 120, 1.1, 'y');
  for (let y = 97; y < 117; y++) for (let x = cx - 3; x <= cx + 3; x++) l.set(x, y, (x + y) % 4 === 0 ? 'y' : x >= cx + 2 ? 'R' : 'r');
  l.elipse(cx + 0.5, 123, 6, 6, 'y');
  l.sombra('y', 'o', 1, 1, 2);
  l.rect(cx - 3, 119, 2, 2, 'Y').rect(cx - 19, 92, 30, 1, 'Y');
  // laurel a los pies de la guarda
  laurel(l, cx - 8, 102, cx - 22, 119, 4, -1);
  laurel(l, cx + 14, 102, cx + 26, 119, 4, 1);
  return l.mapa();
}

function asBastos(): string[] {
  const l = new Lienzo(ANCHO, ALTO);
  // el garrote en diagonal: discos que se afinan de la copa al puño
  const [x0, y0, x1, y1] = [36, 22, 66, 124];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const r = 13 - 7.5 * t ** 0.9 + Math.sin(t * 19) * 0.6;
    l.elipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, 'r');
  }
  // nudos y brotes con hojas
  const ramas: [number, number, number, number][] = [[26, 50, 14, 46], [58, 58, 72, 50], [40, 82, 28, 86], [64, 100, 76, 96]];
  for (const [ax, ay, bx, by] of ramas) l.trazo(ax, ay, bx, by, 2.2, 'r');
  l.sombra('r', 'R', 1, 0, 5);
  l.sombra('r', 'e', -1, -1, 2, 'rR');
  for (const [, , bx, by] of ramas) {
    l.elipse(bx, by, 2, 2, 'Y');
    l.elipse(bx + 0.5, by + 0.5, 1, 1, 'y');
    for (const [dx, dy, k] of [[-4, -5, 'l'], [3, -6, 'g'], [5, 2, 'l']] as [number, number, string][]) {
      l.trazo(bx, by, bx + dx, by + dy, 0.6, 'g');
      l.elipse(bx + dx, by + dy, 2.4, 1.6, k);
    }
  }
  // la guía de oro en espiral
  for (let i = 0; i < 7; i++) {
    const t = 0.08 + i * 0.13;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    const r = 13 - 7.5 * t ** 0.9;
    l.trazo(cx - r, cy - 3, cx + r, cy + 5, 1.1, 'y', 'reR');
  }
  l.cambiar('y', 'o', [0, 0, ANCHO, ALTO]);
  l.sombra('o', 'y', -1, -1, 1, 'o');
  l.cambiar('o', 'o');
  // el pie cortado
  l.elipse(x1 + 0.5, y1 + 3, 5, 3, 'x');
  l.elipse(x1 + 1, y1 + 3.5, 2.4, 1.4, 'd');
  return l.mapa();
}

function asOros(): string[] {
  const l = new Lienzo(ANCHO, ALTO);
  const cx = 48;
  const cy = 58;
  // rayos de oro detrás
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    const [ex, ey] = [cx + Math.cos(a) * 40, cy + Math.sin(a) * 40];
    l.trazo(cx, cy, ex, ey, i % 2 ? 1 : 1.8, 'o');
    if (!(i % 2)) l.trazo(cx, cy, ex, ey, 0.6, 'y', 'o');
  }
  l.rect(0, 0, 16, 34, '.').rect(80, 106, 16, 34, '.');
  // laurel abajo y el lazo azul
  laurel(l, cx - 4, 112, cx - 32, 82, 6, -1);
  laurel(l, cx + 4, 112, cx + 32, 82, 6, 1);
  cinta(l, [[cx - 16, 108], [cx - 6, 116], [cx, 112]], 2.4, 't', 'T');
  cinta(l, [[cx + 16, 108], [cx + 6, 116], [cx, 112]], 2.4, 't', 'T');
  l.trazo(cx - 4, 114, cx - 12, 128, 1.8, 't').trazo(cx + 4, 114, cx + 12, 128, 1.8, 'T');
  l.elipse(cx, 113, 3, 3, 'r');
  // la moneda grande: festón, cerco, campo con luz y la efigie
  l.elipse(cx, cy, 29, 29, 'o');
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    l.elipse(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28, 3, 3, 'o');
  }
  l.elipse(cx, cy, 26, 26, 'y');
  l.elipse(cx, cy, 22, 22, 'o', 'y');
  l.elipse(cx, cy, 21, 21, 'y');
  l.sombra('o', 'z', 1, 1, 1, 'oyYz');
  l.sombra('y', 'Y', -1, -1, 2, 'y');
  // efigie roja: busto de perfil mirando a la izquierda, con corona de laurel de oro viejo
  l.poli([[cx - 15, cy + 18], [cx + 15, cy + 18], [cx + 12, cy + 9], [cx + 4, cy + 6], [cx - 6, cy + 6], [cx - 12, cy + 10]], 'R', 'yY');
  l.rect(cx - 3, cy + 1, 7, 7, 'r');
  l.elipse(cx + 1, cy - 5, 8.5, 9.5, 'r', 'yY');
  l.poli([[cx - 8, cy - 5], [cx - 11, cy], [cx - 7, cy + 1]], 'r', 'yY'); // nariz
  l.poli([[cx - 7, cy + 2], [cx - 6, cy + 6], [cx - 2, cy + 6]], 'r', 'yY'); // mentón
  l.sombra('r', 'R', 1, 0, 3, 'rR');
  l.sombra('r', 'e', -1, -1, 1, 'rR');
  l.rect(cx + 3, cy - 11, 7, 9, 'v'); // el pelo de la nuca
  l.rect(cx - 5, cy - 6, 2, 2, 'y'); // ojo
  l.trazo(cx - 7, cy - 12, cx + 9, cy - 10, 1.2, 'z', 'rRev');
  for (const x of [-4, 0, 4, 8]) l.elipse(cx + x, cy - 13, 1.4, 1, 'g', 'rRevyY');
  l.trazo(cx - 12, cy + 12, cx + 12, cy + 12, 0.6, 'o', 'R');
  return l.mapa();
}

function asCopas(): string[] {
  const l = new Lienzo(ANCHO, ALTO);
  const cx = 48;
  // remate y tapa
  l.elipse(cx, 12, 3, 3, 'y');
  l.rect(cx - 1, 6, 2, 4, 'y').rect(cx - 3, 7, 6, 1, 'y');
  l.elipse(cx, 34, 24, 18, 'c');
  l.rect(0, 34, ANCHO, 106, '.');
  l.sombra('c', 'b', 1, 0, 6);
  l.sombra('c', 'C', -1, -1, 2, 'cb');
  for (let x = cx - 18; x <= cx + 18; x += 6) l.rect(x, 26, 2, 6, l.get(x, 28) === 'b' ? 'T' : 't');
  // cerco con piedras
  l.rect(cx - 27, 34, 54, 6, 'y');
  l.rect(cx - 27, 39, 54, 1, 'o');
  for (let x = cx - 22; x <= cx + 22; x += 8) l.rect(x, 35, 3, 3, (x / 8) % 2 ? 'r' : 't');
  // cuenco
  l.pintar((x, y) => {
    if (y < 40 || y > 82) return false;
    const t = (y - 40) / 42;
    return Math.abs(x - cx) <= 25 * Math.sqrt(1 - t * t * 0.9);
  }, 'r');
  l.sombra('r', 'R', 1, 0, 7);
  l.sombra('r', 'e', -1, 0, 2, 'rR');
  l.rect(cx - 25, 52, 51, 4, 'y');
  l.sombra('y', 'o', 1, 0, 6, 'yo');
  for (let x = cx - 20; x <= cx + 20; x += 5) l.rect(x, 62, 2, 2, x > cx + 10 ? 'o' : 'y');
  for (let x = cx - 17; x <= cx + 17; x += 5) l.rect(x + 2, 68, 2, 2, x > cx + 8 ? 'o' : 'y');
  // tallo con dos nudos y el pie
  l.rect(cx - 3, 82, 7, 32, 'y');
  l.elipse(cx + 0.5, 88, 9, 4, 'y');
  l.elipse(cx + 0.5, 101, 7, 4, 'y');
  l.elipse(cx + 0.5, 101, 2, 2, 'r');
  l.poli([[cx - 4, 112], [cx + 5, 112], [cx + 22, 126], [cx - 21, 126]], 'y');
  l.rect(cx - 23, 126, 47, 4, 'o');
  l.sombra('y', 'o', 1, 0, 3, 'yoY');
  l.sombra('y', 'Y', -1, 0, 1, 'yoY');
  return l.mapa();
}

const ASES: Record<Suit, () => string[]> = { S: asEspadas, C: asBastos, D: asOros, H: asCopas };
const cache = new Map<Suit, string[]>();
/** El mapa del 1 de un palo, en la rejilla del naipe. */
export function asMapa(s: Suit): string[] {
  let m = cache.get(s);
  if (!m) cache.set(s, (m = ASES[s]()));
  return m;
}
