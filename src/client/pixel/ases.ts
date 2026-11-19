// V40 · fase 2c · El 1 de cada palo, monumental y a toda la cara del naipe (rejilla de 96 × 140), en claroscuro tramado:
// la espada grande de cobalto y cian con sus cintas y borlas; el basto nudoso de corteza esmeralda empuñado por una mano
// que sale de su manga carmesí, con sus muñones cortados en rojo sangre y sus brotes; el oro solar con su efigie grabada,
// sus rayos, el laurel y el lazo; y el cáliz carmesí con tapa turquesa. Dibujos originales en el lenguaje de la baraja
// española, sin contorno negro: luz de arriba a la izquierda y volumen por trama de Bayer.
import type { Suit } from '../../rules/engine';
import { hueco, rayado, sombrear } from './dither';
import { Lienzo, cintaOndulada } from './pincel';

export const ANCHO = 96;
export const ALTO = 140;

/** Una rama de laurel: hojas alternas a lo largo de una curva, de (x0, y0) a (x1, y1). */
function laurel(l: Lienzo, x0: number, y0: number, x1: number, y1: number, hojas: number, lado: 1 | -1): void {
  l.trazo(x0, y0, x1, y1, 0.7, 'G');
  for (let i = 1; i <= hojas; i++) {
    const t = i / (hojas + 1);
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const n = Math.hypot(nx, ny) || 1;
    for (const s of [1, -1]) {
      // hoja lanceolada: la cara de la luz en esmeralda vivo, la otra en sombra honda
      const hx = x + ((nx / n) * 4.4 * s + ((x1 - x0) / n) * 2.6) * lado;
      const hy = y + ((ny / n) * 4.4 * s + ((y1 - y0) / n) * 2.6);
      l.elipse((x + hx) / 2, (y + hy) / 2, 1.7, 1.7, s > 0 ? 'l' : 'g');
      l.trazo(x, y, hx, hy, 0.9, s > 0 ? 'l' : 'g');
    }
  }
}

/** Una borla de oro colgando de (x, y), con su cordón del color `k`. */
function borla(l: Lienzo, x: number, y: number, k: string): void {
  l.trazo(x, y, x, y + 7, 0.6, k);
  l.poli([[x - 3, y + 14], [x - 1, y + 7], [x + 2, y + 7], [x + 4, y + 14]], '¤');
  l.elipse(x + 0.5, y + 7, 2, 1.5, '¤');
  sombrear(l, '¤', '9zoOy', { base: 0.6, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
  l.canto('yO', 'o');
}

function asEspadas(): string[] {
  const l = new Lienzo(ANCHO, ALTO);
  const cx = 48;
  // la cinta carmesí pasa por detrás de la hoja (se dibuja antes) y la turquesa, por delante (después)
  cintaOndulada(l, 14, 70, 82, 62, 5, 3, 2.3, 'r', 'v');
  // hoja: ancha, de cobalto a cian filo, con el vaceo de luz
  l.poli([[cx - 5, 18], [cx, 8], [cx + 5, 18], [cx + 5, 92], [cx - 5, 92]], '¤');
  sombrear(l, '¤', '9BbcCA', { luz: [-1, -0.25], base: 0.5, pendiente: 1.2, borde: 2, fuerzaBorde: 0.3, brillo: 0, ancho: 0.85 });
  l.rect(cx - 2, 20, 1, 68, 'A');
  l.canto('CA', 'c');
  cintaOndulada(l, 82, 44, 14, 38, 5, 3, 2.3, 't', 'T');
  // borlas de oro en las puntas de las cintas
  for (const [x, y, k] of [[14, 38, 'T'], [82, 44, 'T'], [14, 70, 'v'], [82, 62, 'v']] as [number, number, string][]) borla(l, x, y, k);
  // guarda: gavilanes curvos de oro con sus volutas, el guardamano en D y el pomo
  l.rect(cx - 18, 92, 37, 5, '¤');
  l.elipse(cx - 19, 90, 3.2, 3.2, '¤');
  l.elipse(cx + 20, 90, 3.2, 3.2, '¤');
  l.elipse(cx + 0.5, 94, 6, 5, '¤');
  l.trazo(cx + 9, 97, cx + 9, 116, 1.1, '¤');
  l.trazo(cx + 9, 116, cx + 3, 120, 1.1, '¤');
  l.elipse(cx + 0.5, 123, 6, 6, '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.6, pendiente: 1, borde: 2, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.35, ancho: 0.8 });
  l.canto('yYO', 'o');
  l.elipse(cx - 19, 90, 1.4, 1.4, 'z');
  l.elipse(cx + 20, 90, 1.4, 1.4, 'z');
  l.elipse(cx + 0.5, 94, 2.2, 2.2, 'r').set(cx - 1, 93, 'e');
  // empuñadura trenzada de carmesí sangre y oro vivo
  for (let y = 98; y < 117; y++) for (let x = cx - 3; x <= cx + 3; x++) l.set(x, y, (x + y) % 4 === 0 ? 'O' : x >= cx + 2 ? 'v' : x <= cx - 2 ? 'r' : 'R');
  // laurel a los pies de la guarda
  laurel(l, cx - 8, 102, cx - 22, 119, 4, -1);
  laurel(l, cx + 14, 102, cx + 26, 119, 4, 1);
  return l.mapa();
}

function asBastos(): string[] {
  const l = new Lienzo(ANCHO, ALTO);
  // el garrote, casi erguido: discos que se afinan de la copa al puño, con un vaivén de madera viva
  const [x0, y0, x1, y1] = [42, 20, 56, 128];
  for (let i = 0; i <= 70; i++) {
    const t = i / 70;
    const r = 13 - 6 * t ** 0.9 + Math.sin(t * 17) * 0.7;
    l.elipse(x0 + (x1 - x0) * t + Math.sin(t * 5) * 1.5, y0 + (y1 - y0) * t, r, r, '¤');
  }
  // muñones de ramas cortadas y una rama viva que brota a cada lado
  const munones: [number, number, number, number][] = [[30, 46, 21, 41], [58, 56, 68, 50], [34, 78, 25, 81]];
  for (const [ax, ay, bx, by] of munones) l.trazo(ax, ay, bx, by, 2.6, '¤');
  const ramas: [number, number, number, number][] = [[56, 36, 74, 24], [60, 84, 76, 76]];
  for (const [ax, ay, bx, by] of ramas) l.trazo(ax, ay, bx, by, 1.4, '¤');
  sombrear(l, '¤', '9GglL', { base: 0.45, pendiente: 1.15, borde: 5, fuerzaBorde: 0.45, brillo: 2, fuerzaBrillo: 0.2, ancho: 0.85 });
  l.canto('L', 'l');
  // estrías y nudos de la corteza
  rayado(l, 'gl', 'G', { angulo: '|', paso: 3, hasta: 0.55, caja: [28, 24, 72, 126] });
  for (const [x, y] of [[38, 60], [50, 96], [46, 32]]) hueco(l, x, y, 2.4, 1.6, '9Gg', { curva: 1 });
  // la cara de los cortes: rojo sangre con su corazón de ámbar
  for (const [, , bx, by] of munones) {
    l.elipse(bx, by, 2.6, 2.6, 'r');
    l.elipse(bx + 0.5, by + 0.5, 1.1, 1.1, 'O');
    l.set(Math.round(bx) - 1, Math.round(by) - 2, 'e');
  }
  // el corte de arriba: la madera viva, con sus anillos
  l.elipse(x0 + 0.5, y0 - 4, 10, 4.5, 'r');
  l.elipse(x0 + 0.5, y0 - 4, 7, 3, 'O');
  l.elipse(x0 + 0.5, y0 - 4, 4, 1.7, 'R');
  l.elipse(x0 + 0.5, y0 - 4, 1.6, 0.8, 'y');
  l.sombra('r', 'R', 1, 1, 1);
  // los brotes de lima en las ramas vivas
  for (const [, , bx, by] of ramas)
    for (const [dx, dy, k] of [[-3, -4, 'l'], [3, -3, 'L'], [4, 3, 'l'], [0, -1, 'K']] as [number, number, string][]) {
      l.trazo(bx, by, bx + dx, by + dy, 0.6, 'g');
      l.elipse(bx + dx, by + dy, 2.2, 1.5, k);
    }
  // la manga carmesí que sube desde el pie y el puño de encaje
  l.poli([[44, 140], [46, 118], [70, 116], [74, 140]], '§');
  sombrear(l, '§', '9vRre', { base: 0.5, pendiente: 1.1, borde: 4, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.2, ancho: 0.85 });
  rayado(l, '9vRre', 'v', { angulo: '/', paso: 4, caja: [58, 118, 74, 139], hasta: 1 });
  l.poli([[42, 118], [47, 111], [53, 114], [59, 110], [65, 114], [71, 111], [74, 118], [66, 121], [58, 118], [50, 121]], '§');
  sombrear(l, '§', '9hw', { base: 0.62, pendiente: 1, borde: 2, fuerzaBorde: 0.45, brillo: 0 });
  // la mano que empuña: cuatro dedos cerrados sobre el garrote y el pulgar encima
  for (let i = 0; i < 4; i++) l.elipse(51 + i * 0.6, 92 + i * 4.6, 7.2, 2.7, '¤');
  l.poli([[47, 90], [60, 92], [62, 110], [49, 110]], '¤');
  l.elipse(57, 89, 2.4, 4, '¤');
  sombrear(l, '¤', '9spP', { base: 0.55, pendiente: 1.1, borde: 3, fuerzaBorde: 0.5, brillo: 1, fuerzaBrillo: 0.2, ancho: 0.8 });
  for (let i = 1; i < 4; i++) l.linea(44 + i * 0.6, 90 + i * 4.6, 53 + i * 0.6, 91 + i * 4.6, 's');
  return l.mapa();
}

function asOros(): string[] {
  const l = new Lienzo(ANCHO, ALTO);
  const cx = 48;
  const cy = 58;
  // rayos de fuego detrás, largos y cortos
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    const [ex, ey] = [cx + Math.cos(a) * 40, cy + Math.sin(a) * 40];
    l.trazo(cx, cy, ex, ey, i % 2 ? 1 : 1.8, 'o');
    if (!(i % 2)) l.trazo(cx, cy, ex, ey, 0.6, 'O', 'o');
  }
  l.rect(0, 0, 16, 34, '.').rect(80, 106, 16, 34, '.');
  // laurel abajo y el lazo turquesa
  laurel(l, cx - 4, 112, cx - 32, 82, 6, -1);
  laurel(l, cx + 4, 112, cx + 32, 82, 6, 1);
  l.trazo(cx - 16, 108, cx - 6, 116, 2.4, 't').trazo(cx - 6, 116, cx, 112, 2.4, 'T');
  l.trazo(cx + 16, 108, cx + 6, 116, 2.4, 'T').trazo(cx + 6, 116, cx, 112, 2.4, 't');
  l.trazo(cx - 4, 114, cx - 12, 128, 1.8, 't').trazo(cx + 4, 114, cx + 12, 128, 1.8, 'T');
  l.elipse(cx, 113, 3, 3, 'r');
  // la moneda grande: festón de ámbar, campo de oro tramado con la luz arriba a la izquierda
  l.elipse(cx, cy, 29, 29, '¤');
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    l.elipse(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28, 3, 3, '¤');
  }
  sombrear(l, '¤', '9zoO', { base: 0.6, pendiente: 1.1, borde: 3, fuerzaBorde: 0.5, brillo: 0 });
  l.canto('O', 'o');
  l.elipse(cx, cy, 25, 25, '§');
  sombrear(l, '§', '9zoOyY', { base: 0.62, pendiente: 1.15, borde: 3, fuerzaBorde: 0.45, brillo: 2, fuerzaBrillo: 0.25, ancho: 0.85 });
  l.elipse(cx, cy, 21.5, 21.5, 'o', 'OyY');
  l.elipse(cx, cy, 20.5, 20.5, '§');
  sombrear(l, '§', 'oOyY', { base: 0.6, pendiente: 1.1, borde: 2, fuerzaBorde: 0.3, brillo: 0, ancho: 0.85, foco: [cx - 8, cy - 8, 14, 0.2] });
  // efigie grabada en carmesí: busto de perfil mirando a la izquierda, con la corona de laurel en tinta honda
  const F = 'oOyY';
  l.poli([[cx - 15, cy + 18], [cx + 15, cy + 18], [cx + 12, cy + 9], [cx + 4, cy + 6], [cx - 6, cy + 6], [cx - 12, cy + 10]], 'R', F);
  l.rect(cx - 3, cy + 1, 7, 7, 'R');
  l.elipse(cx + 1, cy - 5, 8.5, 9.5, 'R', F);
  l.poli([[cx - 7, cy - 6], [cx - 12, cy], [cx - 7, cy + 1]], 'R', F); // nariz
  l.poli([[cx - 7, cy + 2], [cx - 7, cy + 6], [cx - 2, cy + 6]], 'R', F); // mentón
  // la cara a la luz y la nuca en sombra, con el grabado de líneas
  l.pintar((x, y) => x < cx - 1 && y < cy + 7, 'r', 'R');
  l.elipse(cx + 3, cy - 7, 7, 7.5, 'v', 'Rr');
  rayado(l, 'R', 'v', { angulo: '/', paso: 2, caja: [cx - 15, cy - 15, cx + 15, cy + 18], hasta: 0.55 });
  l.trazo(cx - 7, cy - 12, cx + 9, cy - 10, 1.2, 'z', 'rRev');
  for (const x of [-4, 0, 4, 8]) l.elipse(cx + x, cy - 13, 1.4, 1, 'G', 'rRevoOyY');
  l.rect(cx - 5, cy - 6, 2, 1, 'k');
  l.trazo(cx - 12, cy + 12, cx + 12, cy + 12, 0.6, 'O', 'Rv');
  return l.mapa();
}

function asCopas(): string[] {
  const l = new Lienzo(ANCHO, ALTO);
  const cx = 48;
  // remate de oro y tapa turquesa
  l.elipse(cx, 12, 3, 3, '¤');
  l.rect(cx - 1, 6, 2, 4, '¤').rect(cx - 3, 7, 6, 1, '¤');
  sombrear(l, '¤', '9zoOy', { base: 0.6, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
  l.elipse(cx, 34, 24, 18, '§');
  l.rect(0, 34, ANCHO, 106, '.');
  sombrear(l, '§', '9Ttc', { base: 0.48, pendiente: 1.1, borde: 5, fuerzaBorde: 0.45, brillo: 2, fuerzaBrillo: 0.2, ancho: 0.85 });
  for (let x = cx - 18; x <= cx + 18; x += 6) l.rect(x, 26, 2, 6, x > cx ? 'T' : 'o');
  // cerco de oro con piedras
  l.rect(cx - 27, 34, 54, 6, '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.6, pendiente: 1, borde: 1, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.3 });
  for (let x = cx - 22; x <= cx + 22; x += 8) l.rect(x, 35, 3, 3, (x / 8) % 2 ? 'r' : 't').set(x, 35, (x / 8) % 2 ? 'e' : 'C');
  // cuenco carmesí, hondo, con su faja de oro
  l.pintar((x, y) => {
    if (y < 40 || y > 82) return false;
    const t = (y - 40) / 42;
    return Math.abs(x - cx) <= 25 * Math.sqrt(1 - t * t * 0.9);
  }, '§');
  sombrear(l, '§', '9vRre', { base: 0.5, pendiente: 1.2, borde: 7, fuerzaBorde: 0.5, brillo: 2, fuerzaBrillo: 0.2, ancho: 0.85 });
  l.canto('e', 'r');
  l.rect(cx - 25, 52, 51, 4, '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.62, pendiente: 1.1, borde: 1, fuerzaBorde: 0.35, brillo: 0, caja: [cx - 25, 52, cx + 25, 55] });
  for (let x = cx - 20; x <= cx + 20; x += 5) l.rect(x, 63, 2, 2, x > cx + 10 ? 'o' : 'O');
  // tallo con dos nudos y el pie
  l.rect(cx - 3, 82, 7, 32, '¤');
  l.elipse(cx + 0.5, 88, 9, 4, '¤');
  l.elipse(cx + 0.5, 101, 7, 4, '¤');
  l.poli([[cx - 4, 112], [cx + 5, 112], [cx + 22, 126], [cx - 21, 126]], '¤');
  l.rect(cx - 23, 126, 47, 4, '¤');
  sombrear(l, '¤', '9zoOyY', { base: 0.6, pendiente: 1.1, borde: 3, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.3, ancho: 0.85 });
  l.canto('yYO', 'o');
  l.elipse(cx + 0.5, 101, 2, 2, 'r');
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
