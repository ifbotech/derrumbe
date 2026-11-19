// V40 · fase 2c · Las vestimentas van en claroscuro tramado (Bayer, de la sombra abismal a la luz), las caras son
// severas —cejas que bajan hacia la nariz, la boca recta, sin arrebol— y el caballo es gris frío tramado.
//
// V40 · fase 2b · La Corte de la baraja española en pixel-art «sin línea», de cuerpo entero sobre la rejilla del naipe
// (96 × 140): 10 Sota (paje de pie), 11 Caballo (jinete sobre un caballo gris con gualdrapa) y 12 Rey (corona, barba,
// esclavina y manto con armiño). Figuras altas y estilizadas, con masa: mangas abullonadas con franjas, faldón
// acampanado, calzas partidas de dos colores, capa a la espalda. Caras pálidas simples de tres cuartos mirando a la
// izquierda, pliegues en dos tonos y la luz de arriba a la izquierda. Cada palo viste sus colores y empuña su pinta.
// Dibujos originales; sin texto.
//
// El dibujo deja libres las zonas del índice de dos cifras: arriba a la izquierda (x ≤ 27, y ≤ 32) y abajo a la
// derecha (x ≥ 69, y ≥ 107).
import type { Suit } from '../../rules/engine';
import { rayado, sombrear } from './dither';
import { RAMPA, type Material } from './paleta';
import { Lienzo, recortar } from './pincel';
import { heredar } from './rejilla';
import { pintaNaipe } from './pintas';

export const FIG_W = 96;
export const FIG_H = 140;

/** Ropa de cada palo: túnica, capa y adorno (materiales de la paleta). */
export const ROPA: Record<Suit, { tunica: Material; capa: Material; adorno: Material }> = {
  S: { tunica: 'acero', capa: 'rojo', adorno: 'oro' },
  C: { tunica: 'oliva', capa: 'rojo', adorno: 'oro' },
  D: { tunica: 'rojo', capa: 'acero', adorno: 'oro' },
  H: { tunica: 'rojo', capa: 'oliva', adorno: 'oro' },
};

// letras provisionales del dibujo (se tiñen al final por palo): 1-4 túnica (honda, sombra, base, luz), 5-8 capa
const TUN = '1234';
const CAP = '5678';

/**
 * Una masa de tela en volumen tramado: las celdas del tono base de `prov` se sombrean entre la sombra abismal y la luz
 * (rampa '9' + prov), con el canto de sombra de `n` celdas abajo a la derecha y un filo de luz arriba a la izquierda.
 */
function volumen(l: Lienzo, prov: string, n: number, brillo = true, base = 0.5): void {
  sombrear(l, prov[2], '9' + prov, { base, pendiente: 1.15, borde: n, fuerzaBorde: 0.45, brillo: brillo ? 1 : 0, fuerzaBrillo: 0.2, ancho: 0.85, masa: prov + '9' });
}

/**
 * Cabeza de tres cuartos mirando a la izquierda: óvalo pálido, sombra a la derecha, oreja, ojos de dos celdas, ceja,
 * nariz que asoma, boca y mejilla. `pelo` y su sombra enmarcan la cara.
 */
function cabeza(l: Lienzo, cx: number, cy: number, pelo: [string, string], opts: { barba?: boolean; boca?: string } = {}): void {
  // pelo de atrás (melena hasta la nuca), tramado
  l.elipse(cx + 1.5, cy - 1, 8, 9, '¤');
  l.rect(cx + 2, cy, 7, 8, '¤');
  sombrear(l, '¤', '9' + pelo[1] + pelo[0], { base: 0.45, pendiente: 1, borde: 2, fuerzaBorde: 0.4, brillo: 0 });
  // cara en claroscuro: la mitad de la sombra cae a la piel violácea
  l.elipse(cx - 0.5, cy + 0.5, 6.5, 8, '§');
  l.rect(cx - 7, cy + 1, 1, 2, '§'); // la nariz asoma por el perfil
  sombrear(l, '§', '9spP', { base: 0.56, pendiente: 1.15, borde: 2, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.2, ancho: 0.8 });
  l.rect(cx + 4, cy, 2, 3, 's'); // oreja
  // flequillo
  l.poli([[cx - 7, cy - 4], [cx - 5, cy - 8], [cx + 2, cy - 9], [cx + 7, cy - 6], [cx + 6, cy - 2], [cx + 1, cy - 5], [cx - 4, cy - 4]], pelo[0]);
  l.sombra(pelo[0], pelo[1], 1, 1, 1, pelo[0] + pelo[1]);
  // ojos hundidos y cejas que bajan hacia la nariz (la mirada severa), nariz con su sombra y la boca recta
  l.rect(cx - 5, cy - 1, 1, 2, 'k').rect(cx - 1, cy - 1, 1, 2, 'k');
  l.set(cx - 5, cy - 2, 's').set(cx - 1, cy - 2, 's');
  l.linea(cx - 7, cy - 4, cx - 4, cy - 3, 'k').linea(cx - 2, cy - 3, cx + 1, cy - 4, 'k');
  l.rect(cx - 4, cy + 2, 1, 2, 's').set(cx - 3, cy + 3, '9');
  l.rect(cx - 4, cy + 5, 4, 1, opts.boca ?? 'v');
  if (opts.barba) {
    l.poli([[cx - 7, cy + 4], [cx + 5, cy + 2], [cx + 5, cy + 9], [cx + 1, cy + 16], [cx - 4, cy + 14], [cx - 7, cy + 9]], '¤');
    sombrear(l, '¤', '9shw', { base: 0.6, pendiente: 1, borde: 2, fuerzaBorde: 0.45, brillo: 0, ancho: 0.8 });
    rayado(l, 'hw', 's', { angulo: '|', paso: 2, caja: [cx - 6, cy + 8, cx + 4, cy + 15], hasta: 0.6 });
    l.rect(cx - 6, cy + 4, 8, 1, 'h'); // bigote
    l.rect(cx - 3, cy + 6, 4, 1, 'v');
  }
}

/** Colorea las letras provisionales con los materiales del palo. */
function vestir(m: string[], s: Suit): string[] {
  const r = ROPA[s];
  const tun = RAMPA[r.tunica];
  const cap = RAMPA[r.capa];
  const mapa: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    mapa[TUN[i]] = tun[i];
    mapa[CAP[i]] = cap[i];
  }
  return heredar(m.map((f) => [...f].map((k) => mapa[k] ?? k).join('')), m);
}

/** Pega la pinta del palo con su centro en (x, y). */
function empuñar(l: Lienzo, s: Suit, x: number, y: number, v = 0): void {
  const p = pintaNaipe(s, 'chica', v);
  l.pegar(p, Math.round(x - p[0].length / 2), Math.round(y - p.length / 2));
}
/** Una mano en claroscuro. */
const mano = (l: Lienzo, x: number, y: number) => {
  l.elipse(x, y, 2.8, 2.6, '§');
  sombrear(l, '§', '9spP', { base: 0.55, borde: 1, fuerzaBorde: 0.4, brillo: 0 });
};

/** Manga abullonada de (x0, y0) a (x1, y1), con franjas de oro. */
function manga(l: Lienzo, x0: number, y0: number, x1: number, y1: number, r: number, k: string): void {
  l.trazo(x0, y0, x1, y1, r, k);
  for (const t of [0.35, 0.7]) {
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    l.trazo(x - r, y - 0.5, x + r, y + 0.5, 0.7, 'y', k);
  }
}

// ───────────── 10 · Sota ─────────────
function sota(s: Suit): string[] {
  const l = new Lienzo(FIG_W, FIG_H);
  const cx = 50;
  // capa a la espalda: cae del hombro derecho hasta las corvas, abierta
  l.poli([[cx + 6, 40], [cx + 17, 42], [cx + 19, 96], [cx + 10, 102], [cx + 8, 70]], '7');
  volumen(l, CAP, 3);
  // calzas partidas y zapatos
  l.poli([[cx - 9, 86], [cx - 1, 86], [cx - 2, 126], [cx - 8, 126]], '7');
  l.poli([[cx + 1, 86], [cx + 9, 86], [cx + 8, 126], [cx + 2, 126]], '3');
  volumen(l, CAP, 2, false, 0.45);
  volumen(l, TUN, 2, false, 0.45);
  l.rect(cx - 2, 96, 1, 22, '6');
  l.poli([[cx - 12, 126], [cx - 2, 125], [cx - 2, 130], [cx - 12, 130]], 'N').poli([[cx + 1, 125], [cx + 10, 125], [cx + 10, 130], [cx + 1, 130]], 'N');
  l.rect(cx - 11, 126, 4, 1, 'n').rect(cx + 2, 126, 3, 1, 'n');
  // jubón: hombros anchos, talle y faldón acampanado
  l.poli([[cx - 14, 41], [cx + 14, 41], [cx + 11, 66], [cx + 16, 88], [cx - 16, 88], [cx - 11, 66]], '3');
  volumen(l, TUN, 5);
  for (const x of [cx - 8, cx + 2]) l.trazo(x, 70, x - 2, 87, 0.5, '2', TUN); // pliegues del faldón
  l.rect(cx - 16, 86, 33, 2, 'y').rect(cx - 16, 87, 33, 1, 'o');
  // pechera de oro, botones y cinto
  l.poli([[cx - 4, 42], [cx + 4, 42], [cx + 2, 64], [cx - 2, 64]], '4');
  for (let y = 46; y < 63; y += 4) l.rect(cx - 1, y, 2, 2, 'y');
  l.rect(cx - 12, 64, 24, 3, 'n').rect(cx - 2, 64, 4, 3, 'y').set(cx - 1, 65, 'o');
  // cuello de lechuguilla
  l.elipse(cx, 41, 8, 2.5, '¤');
  sombrear(l, '¤', '9hw', { base: 0.62, borde: 1, fuerzaBorde: 0.45, brillo: 0 });
  // brazo derecho (el del fondo) caído, con la mano sobre el cinto
  manga(l, cx + 13, 45, cx + 15, 62, 3.6, '2');
  mano(l, cx + 14, 66);
  // brazo izquierdo (el de delante), doblado hacia afuera con la pinta
  manga(l, cx - 12, 45, cx - 20, 58, 3.8, '3');
  l.sombra('3', '4', -1, -1, 1, TUN);
  // cabeza con bonete de pluma
  cabeza(l, cx - 1, 29, ['y', 'o']);
  l.poli([[cx - 10, 22], [cx - 7, 15], [cx + 6, 14], [cx + 10, 21]], '7');
  volumen(l, CAP, 2);
  l.rect(cx - 10, 21, 21, 2, 'y').rect(cx - 10, 22, 21, 1, 'o');
  l.trazo(cx + 6, 16, cx + 16, 8, 1.5, 'w');
  l.trazo(cx + 8, 15, cx + 17, 10, 0.6, 'h', 'w');
  // la pinta, en la mano izquierda
  const prop: Record<Suit, [number, number]> = { S: [cx - 22, 49], C: [cx - 22, 52], D: [cx - 24, 58], H: [cx - 24, 55] };
  empuñar(l, s, prop[s][0], prop[s][1], 1);
  mano(l, cx - 21.5, 62);
  return vestir(l.mapa(), s);
}

// ───────────── 11 · Caballo ─────────────
function caballo(s: Suit): string[] {
  const l = new Lienzo(FIG_W, FIG_H);
  // la cola, que cae del anca
  l.poli([[62, 84], [70, 86], [72, 98], [68, 104], [64, 96]], 'j');
  l.sombra('j', 'i', 1, 0, 2);
  // patas: de atrás, la delantera alzada y la de apoyo
  const pata = (x0: number, y0: number, xr: number, yr: number, x1: number, y1: number, k: string) => {
    l.trazo(x0, y0, xr, yr, 2.4, k);
    l.trazo(xr, yr, x1, y1, 1.6, k);
    l.poli([[x1 - 2.5, y1], [x1 + 2.5, y1], [x1 + 2.5, y1 + 3], [x1 - 2.5, y1 + 3]], 'i');
  };
  pata(60, 96, 62, 112, 61, 124, 'j'); // trasera del fondo
  pata(56, 96, 54, 112, 56, 125, 'J'); // trasera
  pata(34, 96, 36, 112, 37, 125, 'j'); // delantera del fondo
  // delantera alzada: el caballo manotea
  l.trazo(30, 94, 22, 104, 2.4, 'J');
  l.trazo(22, 104, 24, 113, 1.6, 'J');
  l.poli([[21, 113], [26, 112], [27, 115], [22, 116]], 'i');
  // cuerpo: pecho, barril y anca
  l.elipse(47, 90, 18, 10, 'J');
  l.elipse(31, 87, 8, 10, 'J');
  l.elipse(60, 89, 9, 10, 'J');
  // cuello arqueado y cabeza
  l.poli([[24, 84], [36, 82], [32, 66], [26, 56], [18, 58], [20, 70]], 'J');
  l.poli([[18, 56], [26, 54], [28, 62], [20, 72], [12, 76], [8, 74], [9, 68]], 'J');
  l.poli([[20, 54], [22, 48], [25, 54]], 'J'); // oreja
  sombrear(l, 'J', '9ijJu', { base: 0.5, pendiente: 1.15, borde: 4, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.25, ancho: 0.85, masa: 'Jjiu9' });
  // crin, ojo, ollar y riendas
  for (let i = 0; i < 6; i++) l.trazo(26 + i * 1.2, 56 + i * 4, 31 + i * 1.2, 58 + i * 4, 1.2, 'i');
  l.rect(17, 62, 2, 2, 'k').set(17, 62, 'u');
  l.rect(9, 72, 2, 1, 'i');
  l.trazo(12, 68, 20, 66, 0.6, 'v');
  l.trazo(20, 66, 39, 68, 0.6, 'v');
  // gualdrapa del palo, con su ribete y sus flecos de oro
  l.poli([[34, 78], [66, 80], [70, 100], [52, 104], [30, 100]], '7');
  volumen(l, CAP, 3, true, 0.42);
  l.trazo(30, 100, 52, 104, 0.8, 'y').trazo(52, 104, 70, 100, 0.8, 'y');
  for (let x = 31; x < 69; x += 3) l.rect(x, x < 52 ? 101 + Math.round((x - 30) * 0.2) : 104 - Math.round((x - 52) * 0.24), 1, 3, 'o');
  for (let x = 38; x < 64; x += 8) l.rect(x, 90, 3, 3, 'y');
  // silla y estribo
  l.poli([[40, 76], [58, 76], [56, 81], [42, 81]], 'n');
  l.sombra('n', 'N', 1, 1, 1);
  // el jinete: pierna con bota, torso, brazo en alto, cabeza y sombrero con pluma
  l.poli([[44, 74], [54, 74], [52, 94], [46, 94]], '3');
  l.sombra('3', '2', 1, 0, 2, TUN);
  l.poli([[44, 93], [53, 93], [55, 100], [42, 100]], 'N');
  l.rect(43, 94, 3, 1, 'n');
  l.poli([[41, 50], [59, 50], [57, 76], [43, 76]], '3');
  volumen(l, TUN, 4);
  l.rect(43, 72, 14, 3, 'y').rect(43, 74, 14, 1, 'o');
  l.elipse(50, 50, 7, 2.2, '¤');
  sombrear(l, '¤', '9hw', { base: 0.62, borde: 1, fuerzaBorde: 0.45, brillo: 0 });
  // el brazo del fondo, en alto con la pinta; el de delante lleva las riendas
  manga(l, 57, 54, 62, 40, 3.2, '2');
  manga(l, 43, 53, 39, 65, 3.4, '3');
  l.sombra('3', '4', -1, -1, 1, TUN);
  cabeza(l, 49, 38, ['n', 'N']);
  l.poli([[38, 31], [41, 25], [56, 24], [60, 30]], '7');
  volumen(l, CAP, 2);
  l.rect(36, 30, 26, 2, 'y').rect(36, 31, 26, 1, 'o');
  l.trazo(40, 28, 31, 22, 1.6, 'Y');
  l.trazo(39, 27, 32, 23, 0.7, 'y', 'Y');
  // la pinta, en alto
  const prop: Record<Suit, [number, number]> = { S: [63, 22], C: [63, 23], D: [63, 29], H: [63, 28] };
  empuñar(l, s, prop[s][0], prop[s][1]);
  mano(l, 62.5, 38);
  mano(l, 39, 67);
  return vestir(l.mapa(), s);
}

// ───────────── 12 · Rey ─────────────
function rey(s: Suit): string[] {
  const l = new Lienzo(FIG_W, FIG_H);
  const cx = 47;
  // manto largo, abierto por delante, que se abre hasta el suelo
  l.poli([[cx - 15, 40], [cx + 15, 40], [cx + 20, 100], [cx + 21, 129], [cx - 24, 129], [cx - 21, 90]], '7');
  volumen(l, CAP, 6);
  for (const x of [cx - 14, cx + 13]) l.trazo(x, 70, x + (x > cx ? 3 : -4), 126, 0.6, '6', CAP);
  // túnica larga con pliegues, cinto y orla de oro
  l.poli([[cx - 9, 46], [cx + 9, 46], [cx + 12, 129], [cx - 12, 129]], '3');
  volumen(l, TUN, 4);
  for (const x of [cx - 4, cx + 3]) l.trazo(x, 76, x + (x > cx ? 1 : -2), 126, 0.5, '2', TUN);
  l.rect(cx - 12, 124, 25, 3, 'y').rect(cx - 12, 126, 25, 1, 'o');
  l.rect(cx - 9, 70, 19, 3, 'y').rect(cx - 9, 72, 19, 1, 'o');
  l.rect(cx - 2, 69, 4, 5, 'r');
  // armiño: los bordes del manto y el ruedo, con sus motas
  l.trazo(cx - 14, 52, cx - 22, 128, 1.8, 'w');
  l.trazo(cx + 14, 52, cx + 19, 128, 1.8, 'h');
  l.rect(cx - 25, 129, 47, 3, 'w');
  for (let y = 58; y < 126; y += 8) {
    l.rect(Math.round(cx - 14 - (y - 52) * 0.105), y, 1, 2, 'k');
    l.rect(Math.round(cx + 14 + (y - 52) * 0.066), y + 4, 1, 2, 'k');
  }
  for (let x = cx - 22; x < cx + 20; x += 6) l.rect(x, 130, 1, 2, 'k');
  l.rect(cx - 10, 132, 8, 3, 'N').rect(cx + 2, 132, 8, 3, 'N');
  // esclavina (la capa corta de los hombros) con su cadena de oro
  l.poli([[cx - 17, 41], [cx + 17, 41], [cx + 21, 56], [cx, 62], [cx - 21, 56]], '7');
  volumen(l, CAP, 3, true, 0.42);
  for (let x = cx - 15; x <= cx + 15; x += 4) l.rect(x, 50 + Math.round((15 - Math.abs(x - cx)) * 0.38), 2, 2, 'y');
  // cuello de armiño
  l.elipse(cx, 41, 10, 3, '¤');
  sombrear(l, '¤', '9hw', { base: 0.62, borde: 1, fuerzaBorde: 0.45, brillo: 0 });
  l.set(cx - 5, 41, 'k').set(cx + 1, 42, 'k').set(cx + 6, 41, 'k');
  // brazos: el de la pinta, hacia afuera; el otro, con la mano en el cinto
  manga(l, cx - 17, 46, cx - 23, 62, 4, '7');
  volumen(l, CAP, 2, true, 0.4);
  mano(l, cx + 11, 72);
  // cabeza con barba y corona
  cabeza(l, cx, 30, ['w', 'h'], { barba: true });
  l.poli([[cx - 9, 20], [cx + 9, 20], [cx + 9, 15], [cx + 6, 18], [cx + 3, 11], [cx, 17], [cx - 3, 11], [cx - 6, 18], [cx - 9, 15]], 'y');
  for (const x of [cx - 9, cx - 3, cx + 3, cx + 9]) l.elipse(x + 0.5, x === cx - 9 || x === cx + 9 ? 14.5 : 10.5, 1.4, 1.4, 'Y');
  l.rect(cx - 9, 20, 19, 3, 'y').rect(cx - 9, 22, 19, 1, 'o');
  l.rect(cx - 1, 20, 2, 2, 'r').rect(cx - 6, 20, 2, 2, 't').rect(cx + 4, 20, 2, 2, 't');
  l.sombra('y', 'o', 1, 0, 1, 'yoY');
  // la pinta
  const prop: Record<Suit, [number, number]> = { S: [cx - 24, 51], C: [cx - 24, 54], D: [cx - 26, 60], H: [cx - 26, 58] };
  empuñar(l, s, prop[s][0], prop[s][1]);
  mano(l, cx - 23.5, 66);
  return vestir(l.mapa(), s);
}

const DIBUJO: Record<10 | 11 | 12, (s: Suit) => string[]> = { 10: sota, 11: caballo, 12: rey };
const cache = new Map<string, string[]>();
/** La figura en su lienzo de 96 × 140 (la cara del naipe la coloca tal cual). */
export function figuraLienzo(s: Suit, rango: 10 | 11 | 12): string[] {
  const k = `${s}${rango}`;
  let m = cache.get(k);
  if (!m) cache.set(k, (m = DIBUJO[rango](s)));
  return m;
}
/** La figura entera de un palo y un rango (10, 11 o 12), recortada a su silueta. */
export const figuraMapa = (s: Suit, rango: 10 | 11 | 12): string[] => recortar(figuraLienzo(s, rango));
