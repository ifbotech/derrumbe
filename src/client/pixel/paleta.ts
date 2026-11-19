// V40 · fase 2c · Paleta del pixel-art «Dark Dithered & Textured»: híper-saturada y con corrimiento de matiz agresivo.
// Cada material es una rampa de oscuro a claro cuya sombra se va al violeta o al índigo y cuya luz se va al cálido; las
// sombras hondas caen a la tinta abismal (#0B0711) o al violeta abismal (#120A24) por tramas de píxeles alternados
// (pixel/dither.ts), nunca por degradado. Nada de blanco ni negro puros.
//
//   Espadas  cobalto eléctrico → cian filo → brillo      #0C1A5C #1440B8 #2C7BF0 #00C8FF #B8F6FF
//   Bastos   esmeralda profundo → lima salvaje           #0A3D24 #0B5E28 #139A3C #22D95B #B4F03C
//   Oros     ámbar quemado → ámbar fuego → oro solar     #5E2408 #D86000 #FF7B00 #FFD500 #FFF799
//   Copas    vino violáceo → carmesí sangre → magenta    #47062C #7A0026 #F0124A #FF6E8E
//   púrpura del Bufón y de los fondos                    #2E0F52 #5A1E96 #9038D8 #C88BFF
//
// Contraste sobre el papel hueso #F4EFE2 (WCAG): las tintas de índice pasan de 7:1 (Espadas #1238A8 8,5 · Bastos
// #0A5424 7,9 · Oros #7A3300 8,0 · Copas #930030 8,0); los tonos de borde de las pintas pasan de 3:1 (cobalto #2C7BF0
// 3,5 · esmeralda #139A3C 3,2 · ámbar #D86000 3,3 · carmesí #F0124A 3,7), el mínimo de WCAG 1.4.11 que mide la forja.
import type { Suit } from '../../rules/engine';
import { heredar, type Tintas } from './rejilla';

export const PX = {
  tinta: '#1c1024',
  /** Tinta abismal: el fondo de las sombras más hondas. */
  abismo: '#0b0711',
  /** Violeta abismal: la sombra fría que tiñe todo lo hondo. */
  abismoVioleta: '#120a24',
  marfilClaro: '#fbf7ec',
  marfil: '#f4efe2',
  hueso: '#d9ceb4',
  // oro: ámbar quemado · ámbar fuego · fuego vivo · oro solar · luz
  bronce: '#5e2408',
  oroOsc: '#d86000',
  oroFuego: '#ff7b00',
  oro: '#ffd500',
  oroClaro: '#fff799',
  // carmesí: vino violáceo · sangre · carmesí · luz magenta
  vino: '#47062c',
  carmesiOsc: '#7a0026',
  carmesi: '#f0124a',
  lacre: '#ff6e8e',
  // acero: índigo hondo · cobalto · cobalto eléctrico · cian filo · brillo
  aceroOsc: '#0c1a5c',
  aceroMed: '#1440b8',
  acero: '#2c7bf0',
  aceroClaro: '#00c8ff',
  aceroBrillo: '#b8f6ff',
  // esmeralda: hondo · profundo · vivo · lima · lima salvaje
  olivaOsc: '#0a3d24',
  oliva: '#0b5e28',
  olivaMed: '#139a3c',
  olivaClaro: '#22d95b',
  lima: '#b4f03c',
  // turquesa (tapas, cintas, piedras): honda · intensa
  cintaOsc: '#06425a',
  cinta: '#00b3b0',
  // piel en claroscuro: sombra violácea · media · luz
  pielSombra: '#7a4458',
  piel: '#d99a78',
  pielLuz: '#f6d6b0',
  // madera y corteza: honda violácea · corteza · castaña · veta
  maderaOsc: '#3a1426',
  madera: '#6b2e1a',
  maderaCastana: '#a0602a',
  maderaVeta: '#e0a050',
  // gris frío (caballo, plata vieja): hondo · sombra · base · luz
  grisOsc: '#2c2440',
  grisMed: '#5c5470',
  gris: '#9a90a8',
  grisClaro: '#d8d0dc',
  // púrpura (el Bufón, la penumbra, los fondos): hondo · real · eléctrico · luz
  purpuraOsc: '#2e0f52',
  purpura: '#5a1e96',
  purpuraViva: '#9038d8',
  purpuraLuz: '#c88bff',
  /** El papel del naipe (hueso cálido). */
  papel: '#f4efe2',
} as const;

/** Tinta oscura de cada palo (índice, recuadro), con su respaldo: la cambian «Colores de la baraja» y «Alto contraste». */
export const OSC: Record<Suit, string> = {
  S: `var(--suit-S, #1238a8)`,
  C: `var(--suit-C, #0a5424)`,
  D: `var(--suit-D, #7a3300)`,
  H: `var(--suit-H, #930030)`,
};
/** Los respaldos de OSC en hexadecimal (forja, láminas y pruebas). */
export const OSC_HEX: Record<Suit, string> = { S: '#1238a8', C: '#0a5424', D: '#7a3300', H: '#930030' };

/**
 * Las letras comunes de todos los mapas (rampas de oscuro a claro):
 *   oro      z o O y Y      carmesí  v R r e        acero  B b c C A      esmeralda  G g l L K
 *   turquesa T t            piel     s p P          madera N n d x        gris   i j J u
 *   púrpura  f F q Q        0 tinta abismal · 9 violeta abismal
 *   k tinta (ojos y bocas) · w marfil claro · m marfil (papel) · h hueso
 *   1 2 3 4: la tinta oscura de Espadas, Bastos, Oros y Copas (sigue a la paleta elegida en Ajustes)
 */
export const BASE: Tintas = {
  k: PX.tinta,
  '0': PX.abismo,
  '9': PX.abismoVioleta,
  w: PX.marfilClaro,
  m: PX.marfil,
  h: PX.hueso,
  z: PX.bronce,
  o: PX.oroOsc,
  O: PX.oroFuego,
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
  A: PX.aceroBrillo,
  G: PX.olivaOsc,
  g: PX.oliva,
  l: PX.olivaMed,
  L: PX.olivaClaro,
  K: PX.lima,
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
  f: PX.purpuraOsc,
  F: PX.purpura,
  q: PX.purpuraViva,
  Q: PX.purpuraLuz,
  '1': OSC.S,
  '2': OSC.C,
  '3': OSC.D,
  '4': OSC.H,
};

/** Las letras con los cambios de un dibujo. */
export const tintas = (extra: Tintas = {}): Tintas => ({ ...BASE, ...extra });

/** El carácter de la tinta oscura de cada palo en los mapas. */
export const LETRA_PALO: Record<Suit, string> = { S: '1', C: '2', D: '3', H: '4' };

/**
 * Rampas por material, de oscuro a claro, de cuatro tonos (para recolorear un dibujo: ropa, bastos, fondos). La quinta
 * letra de cada `RAMPA5` es el brillo; la sombra honda de todas es el violeta abismal '9'.
 */
export const RAMPA = {
  oro: 'zoyY',
  rojo: 'vRre',
  acero: 'BbcC',
  oliva: 'GglL',
  cinta: 'TtcC',
  madera: 'Nndx',
  gris: 'ijJu',
  piel: 'spPw',
  purpura: 'fFqQ',
} as const;
export type Material = keyof typeof RAMPA;
/** Rampas largas para el tramado pesado (de la sombra abismal al brillo). */
export const RAMPA5: Record<Material, string> = {
  oro: '9zoOyY',
  rojo: '9vRre',
  acero: '9BbcCA',
  oliva: '9GglLK',
  cinta: '9TtcC',
  madera: '9Nndx',
  gris: '9ijJu',
  piel: '9spP',
  purpura: '9fFqQ',
};

/** Cambia las letras de una rampa por las de otra, tono a tono. */
export function trocar(m: readonly string[], de: Material, a: Material): string[] {
  const f = RAMPA[de];
  const t = RAMPA[a];
  return heredar(m.map((r) => [...r].map((k) => (f.includes(k) ? t[f.indexOf(k)] : k)).join('')), m);
}
