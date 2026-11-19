// V40 · fase 2 · Paleta plana del pixel-art (constitución, apartado 8): acero azul, oro, carmesí, verde oliva y azul
// de cinta sobre marfil. Nada de blanco ni negro puros. Las tintas oscuras de palo (≥ 7:1 sobre el marfil) salen de
// `--suit-*` de theme.css, para que «Colores de la baraja» y «Alto contraste» las cambien sin tocar el dibujo; los
// valores de aquí son su respaldo.
//
// Contraste sobre el marfil #efe6d5 (WCAG): Espadas #1d3a66 9,2:1 · Bastos #34481a 8,1:1 · Oros #633f06 7,6:1 ·
// Copas #8e1424 7,5:1 · tinta #1d1a17 15:1. Los rellenos claros (acero, oliva claro, oro) pasan de la mitad de la
// luminancia del papel: la forja no los cuenta como tinta, y la silueta la dibuja el contorno oscuro.
import type { Suit } from '../../rules/engine';
import type { Tintas } from './rejilla';

export const PX = {
  tinta: '#1d1a17',
  marfil: '#efe6d5',
  marfilClaro: '#f8f1e3',
  hueso: '#d9ccb4',
  oro: '#e3b23c',
  oroClaro: '#f6d77e',
  oroOsc: '#a8741a',
  bronce: '#633f06',
  carmesi: '#b51f30',
  carmesiOsc: '#8e1424',
  vino: '#5e0d17',
  acero: '#a9c4e2',
  aceroClaro: '#d6e4f2',
  aceroMed: '#5b86ba',
  aceroOsc: '#1d3a66',
  oliva: '#6f7d2c',
  olivaClaro: '#b9cd6e',
  olivaOsc: '#34481a',
  cinta: '#2f5fb0',
  cintaOsc: '#1b3570',
  piel: '#f4ead9',
  pielSombra: '#d2c3ab',
  madera: '#9a6430',
  maderaOsc: '#4a2c12',
  lacre: '#c4462a',
} as const;

/** Tinta oscura de cada palo (índice, contorno de la pinta, pintas del marco), con su respaldo. */
export const OSC: Record<Suit, string> = {
  S: `var(--suit-S, ${PX.aceroOsc})`,
  C: `var(--suit-C, ${PX.olivaOsc})`,
  D: `var(--suit-D, ${PX.bronce})`,
  H: `var(--suit-H, ${PX.carmesiOsc})`,
};

/**
 * Las letras comunes de todos los mapas. Un dibujo puede añadir o cambiar las suyas.
 *   k tinta · w marfil claro · m marfil · h hueso
 *   y oro · Y oro claro · o oro oscuro · z bronce
 *   r carmesí · R carmesí oscuro · v vino · e lacre
 *   c acero · C acero claro · b acero medio · B acero oscuro
 *   g oliva · l oliva claro · G oliva oscuro
 *   t azul de cinta · T cinta oscura · p piel · s sombra de la piel · n madera · N madera oscura
 *   1 2 3 4: la tinta oscura de Espadas, Bastos, Oros y Copas (sigue a la paleta elegida en Ajustes)
 */
export const BASE: Tintas = {
  k: PX.tinta,
  w: PX.marfilClaro,
  m: PX.marfil,
  h: PX.hueso,
  y: PX.oro,
  Y: PX.oroClaro,
  o: PX.oroOsc,
  z: PX.bronce,
  r: PX.carmesi,
  R: PX.carmesiOsc,
  v: PX.vino,
  e: PX.lacre,
  c: PX.acero,
  C: PX.aceroClaro,
  b: PX.aceroMed,
  B: PX.aceroOsc,
  g: PX.oliva,
  l: PX.olivaClaro,
  G: PX.olivaOsc,
  t: PX.cinta,
  T: PX.cintaOsc,
  p: PX.piel,
  s: PX.pielSombra,
  n: PX.madera,
  N: PX.maderaOsc,
  '1': OSC.S,
  '2': OSC.C,
  '3': OSC.D,
  '4': OSC.H,
};

/** Las letras con los cambios de un dibujo. */
export const tintas = (extra: Tintas = {}): Tintas => ({ ...BASE, ...extra });

/** El carácter de la tinta oscura de cada palo en los mapas. */
export const LETRA_PALO: Record<Suit, string> = { S: '1', C: '2', D: '3', H: '4' };
