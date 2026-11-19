// V40 · fase 2b · Paleta del pixel-art «sin línea» (lineless / flat-cluster), sacada de las referencias del usuario
// (artifacts/mision/v40/referencias): acero azul, oro, carmesí y verde oliva, cada material en una rampa de cuatro tonos
// con el corrimiento de matiz de la pintura (la sombra va al azul y se satura; la luz va al amarillo y se aclara). Nada
// de blanco ni negro puros, y ningún contorno negro: la silueta la da el tono propio de cada material, con su lado de
// sombra abajo a la derecha (luz de arriba a la izquierda).
//
// Contraste sobre el papel del naipe #f8f3e9 (WCAG): las tintas oscuras de palo pasan de 7:1 (Espadas #1d3a66 10,3 ·
// Bastos #34481a 9,1 · Oros #633f06 8,5 · Copas #8e1424 8,3). Los tonos medios de borde pasan de 3:1 (acero #6a8ab6 3,2 ·
// sombra de acero #4a6896 5,1 · carmesí #c2363a 4,9 · oliva #6f8a47 3,5 · sombra de oro #b07816 3,4 · bronce #6e470e
// 7,4): es el mínimo de WCAG 1.4.11 para objetos gráficos, y la forja lo mide en el borde de cada pinta.
import type { Suit } from '../../rules/engine';
import type { Tintas } from './rejilla';

export const PX = {
  tinta: '#2a2220',
  marfilClaro: '#fbf7ee',
  marfil: '#efe6d5',
  hueso: '#d8cbb2',
  // oro: bronce · sombra · base · luz
  bronce: '#6e470e',
  oroOsc: '#b07816',
  oro: '#ecc03c',
  oroClaro: '#f8df86',
  // carmesí: vino · sombra · base · luz
  vino: '#5c1420',
  carmesiOsc: '#8c1f2a',
  carmesi: '#c2363a',
  lacre: '#e26a58',
  // acero: hondo · sombra · base · luz
  aceroOsc: '#283e64',
  aceroMed: '#4a6896',
  acero: '#6a8ab6',
  aceroClaro: '#b9cce3',
  // oliva: hondo · sombra · base · luz
  olivaOsc: '#2d3f1f',
  oliva: '#4c6534',
  olivaMed: '#6f8a47',
  olivaClaro: '#aebf78',
  // azul de cinta (gola, cintas, tapas): sombra · base
  cintaOsc: '#2a467c',
  cinta: '#3f64a8',
  // piel pálida: sombra · base · luz
  pielSombra: '#d0ab80',
  piel: '#efd8b2',
  pielLuz: '#f8ead0',
  // madera: honda · sombra · base · veta
  maderaOsc: '#43281a',
  madera: '#73462a',
  maderaCastana: '#a06a3c',
  maderaVeta: '#cf9b62',
  // gris del caballo: hondo · sombra · base · luz
  grisOsc: '#5c5550',
  grisMed: '#8b8379',
  gris: '#b5ada0',
  grisClaro: '#ddd6c9',
  /** El papel del naipe (marfil luminoso). */
  papel: '#f8f3e9',
} as const;

/** Tinta oscura de cada palo (índice, pintas del marco), con su respaldo: la cambian «Colores de la baraja» y «Alto contraste». */
export const OSC: Record<Suit, string> = {
  S: `var(--suit-S, #1d3a66)`,
  C: `var(--suit-C, #34481a)`,
  D: `var(--suit-D, #633f06)`,
  H: `var(--suit-H, #8e1424)`,
};

/**
 * Las letras comunes de todos los mapas (rampas de oscuro a claro):
 *   oro      z o y Y        carmesí  v R r e        acero  B b c C        oliva  G g l L
 *   cinta    T t            piel     s p P          madera N n d x        gris   i j J u
 *   k tinta (ojos y bocas) · w marfil claro · m marfil · h hueso
 *   1 2 3 4: la tinta oscura de Espadas, Bastos, Oros y Copas (sigue a la paleta elegida en Ajustes)
 */
export const BASE: Tintas = {
  k: PX.tinta,
  w: PX.marfilClaro,
  m: PX.marfil,
  h: PX.hueso,
  z: PX.bronce,
  o: PX.oroOsc,
  y: PX.oro,
  Y: PX.oroClaro,
  v: PX.vino,
  R: PX.carmesiOsc,
  r: PX.carmesi,
  e: PX.lacre,
  B: PX.aceroOsc,
  b: PX.aceroMed,
  c: PX.acero,
  C: PX.aceroClaro,
  G: PX.olivaOsc,
  g: PX.oliva,
  l: PX.olivaMed,
  L: PX.olivaClaro,
  T: PX.cintaOsc,
  t: PX.cinta,
  s: PX.pielSombra,
  p: PX.piel,
  P: PX.pielLuz,
  N: PX.maderaOsc,
  n: PX.madera,
  d: PX.maderaCastana,
  x: PX.maderaVeta,
  i: PX.grisOsc,
  j: PX.grisMed,
  J: PX.gris,
  u: PX.grisClaro,
  '1': OSC.S,
  '2': OSC.C,
  '3': OSC.D,
  '4': OSC.H,
};

/** Las letras con los cambios de un dibujo. */
export const tintas = (extra: Tintas = {}): Tintas => ({ ...BASE, ...extra });

/** El carácter de la tinta oscura de cada palo en los mapas. */
export const LETRA_PALO: Record<Suit, string> = { S: '1', C: '2', D: '3', H: '4' };

/** Rampas por material, de oscuro a claro (para recolorear un dibujo: ropa, bastos, fondos). */
export const RAMPA = {
  oro: 'zoyY',
  rojo: 'vRre',
  acero: 'BbcC',
  oliva: 'GglL',
  cinta: 'TtcC',
  madera: 'Nndx',
  gris: 'ijJu',
  piel: 'spPw',
} as const;
export type Material = keyof typeof RAMPA;

/** Cambia las letras de una rampa por las de otra, tono a tono. */
export function trocar(m: readonly string[], de: Material, a: Material): string[] {
  const f = RAMPA[de];
  const t = RAMPA[a];
  return m.map((r) => [...r].map((k) => (f.includes(k) ? t[f.indexOf(k)] : k)).join(''));
}
