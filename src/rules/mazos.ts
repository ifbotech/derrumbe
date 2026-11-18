// V40 · Los 5 Mazos (SPECS/V40-REFUNDACION.md, apartado 5). Sustituyen a las barajas de inicio: cada uno es una
// fantasía de juego de naipes rioplatense con una o dos reglas propias que se suman a las de siempre.
//
//   Truco       mazo corto (1 a 7); los cuatro bravos pegan con bono propio; 2 cartas del mismo palo cantan Envido
//   Escoba      si las cartas del golpe suman 15, ¡Escoba!: Multi extra y una carga para el resto de la campaña
//   Chinchón    premia la Pierna (trío) y la Escalera del palo; las manos largas cargan Daño y frenan el Contraataque
//   Mentiroso   Comodines de más y un Engaño por asalto
//   Chancho Va  pasar 1 carta por turno sin gastarlo; el Chancho (póker) aturde en cadena; abatir rápido carga Daño
//
// Puro y sin estado: aquí viven los datos (ids, nombres, textos y cifras) y las cuentas pequeñas que comparten el motor
// (engine.ts), el bot y la interfaz. El motor aplica las reglas dentro de `strike` y de `applyAction`; la campaña
// (run.ts) arma cada Mazo y guarda sus cargas permanentes en `run.cargas`.
import { BALANCE, fill } from './balance-config';
import type { Card, Formation, Suit } from './engine';

export type MazoId = 'escoba' | 'truco' | 'chinchon' | 'mentiroso' | 'chancho';
/** Los 5 Mazos en el orden en que se enseñan (el inicial primero, luego por desbloqueo). */
export const MAZO_IDS: MazoId[] = ['escoba', 'truco', 'chinchon', 'mentiroso', 'chancho'];
/**
 * El Mazo con el que se empieza (sin desbloqueo). La Escoba: baraja entera y una regla que se entiende sola («si
 * suma 15, barre»). Los otros cuatro piden algo que se aprende jugando (bravos, tríos, el Engaño, pasar cartas).
 */
export const MAZO_INICIAL: MazoId = 'escoba';
export const esMazo = (id: unknown): id is MazoId => typeof id === 'string' && (MAZO_IDS as string[]).includes(id);

/** Cifras de los Mazos (`mazos` de balance-config.json). */
export const MZ = BALANCE.mazos;
/** La suma que barre la mesa en la Escoba (la regla del juego de naipes: no se afina). */
export const ESCOBA_SUMA = 15;
/** El Truco se juega del 1 al 7: sin 8 ni 9. */
export const TRUCO_MAX = 7;

// ───────────────────────── Reglas ─────────────────────────

export type ReglaId = 'bravo' | 'envido' | 'escoba' | 'pierna' | 'escalera' | 'larga' | 'piedra' | 'engano' | 'pasar' | 'chancho' | 'arranque';
export interface Regla {
  id: ReglaId;
  mazo: MazoId;
  /** Nombre de la regla: es la cabecera de su paso en la cuenta («Envido», «¡Escoba!»). */
  name: string;
  /** Qué hace, con sus cifras (≤ 100 caracteres). */
  desc: string;
}
const B = MZ;
/** Las cifras de cada regla, para rellenar sus textos en los dos idiomas. */
export const CIFRAS_REGLA: Record<ReglaId, Record<string, number>> = {
  bravo: { s1: B.truco.bravo.S1, c1: B.truco.bravo.C1, s7: B.truco.bravo.S7, d7: B.truco.bravo.D7 },
  envido: { n: B.truco.envido },
  escoba: { multi: B.escoba.multi, carga: B.escoba.carga },
  pierna: { n: B.chinchon.pierna },
  escalera: { n: B.chinchon.escalera },
  larga: { cartas: B.chinchon.cartas, alivio: B.chinchon.alivio, carga: B.chinchon.carga },
  piedra: { n: B.mentiroso.dano },
  engano: {},
  pasar: {},
  chancho: { n: B.chancho.cadena },
  arranque: { turnos: B.chancho.turnos, n: B.chancho.dano },
};
/** La mano de siempre (7 cartas en solitario); cada Mazo le suma o le resta `mazos.<id>.mano`. */
export const MANO_BASE = 7;
/**
 * Con qué se empieza en cada Mazo: Vida inicial y cartas en la mano (sin el Árbol ni las reliquias). Es lo que la
 * pantalla de elegir Mazo enseña junto al lema.
 */
export function perfilMazo(id: MazoId): { vida: number; mano: number } {
  return { vida: BALANCE.inicio.vida + B[id].vida, mano: MANO_BASE + B[id].mano };
}
/** Las cifras de la descripción de cada Mazo. */
export const CIFRAS_MAZO: Record<MazoId, Record<string, number>> = Object.fromEntries(
  MAZO_IDS.map((id) => [id, { ...perfilMazo(id), ...(id === 'escoba' ? { multi: B.escoba.multi } : {}), ...(id === 'mentiroso' ? { n: 2 + B.mentiroso.comodines } : {}) }]),
) as unknown as Record<MazoId, Record<string, number>>;
const regla = (id: ReglaId, mazo: MazoId, name: string, desc: string): Regla => ({ id, mazo, name, desc: fill(desc, CIFRAS_REGLA[id]) });
export const REGLAS: Regla[] = [
  regla('bravo', 'truco', 'Bravo', 'Los bravos suman Daño: 1 de Espadas +{s1}, 1 de Bastos +{c1}, 7 de Espadas +{s7} y 7 de Oros +{d7}.'),
  regla('envido', 'truco', 'Envido', 'Golpe de 2 cartas del mismo palo (vale como jugada): +{n} de Daño.'),
  regla('escoba', 'escoba', '¡Escoba!', 'Si las cartas suman 15 (vale como jugada): +{multi} de Multi y +{carga} de Daño por cada Escoba ya hecha.'),
  regla('pierna', 'chinchon', 'Pierna', 'Un grupo de 3 cartas iguales: +{n} de Multi.'),
  regla('escalera', 'chinchon', 'Escalera del palo', 'Una escalera de color: +{n} de Daño.'),
  regla('larga', 'chinchon', 'Mano larga', 'Golpe de {cartas} cartas o más: −{alivio} al Contraataque, y +{carga} de Daño para siempre a esas manos largas.'),
  regla('piedra', 'mentiroso', 'Cara de piedra', 'Jugar un Comodín no gasta el turno: el Contraataque de ese guardia no llega y tu golpe siguiente suma +{n} de Daño.'),
  regla('engano', 'mentiroso', 'Engaño', 'Una vez por asalto, el golpe que no abatía cuenta como de un palo, de un número o sin Inmune.'),
  regla('pasar', 'chancho', 'Pasar', 'Una vez por turno, descartar 1 sola carta no gasta el turno: robás otra en el acto.'),
  regla('chancho', 'chancho', 'Chancho', 'Un póker (4 iguales): los {n} Contraataques siguientes no llegan.'),
  regla('arranque', 'chancho', 'De arranque', 'Abatir a un guardia en los {turnos} primeros turnos del asalto: +{n} de Daño al golpe siguiente.'),
];
export const REGLA: Record<ReglaId, Regla> = Object.fromEntries(REGLAS.map((r) => [r.id, r])) as Record<ReglaId, Regla>;
/** Las reglas de un Mazo, en el orden en que se explican. */
export const reglasDe = (mazo: MazoId): Regla[] => REGLAS.filter((r) => r.mazo === mazo);

// ───────────────────────── Cargas permanentes ─────────────────────────

/** Reglas que dejan cargas para el resto de la campaña (las guarda `run.cargas`, las lleva `state.cargas`). */
export type CargaId = 'escoba' | 'larga';
export type Cargas = Partial<Record<CargaId, number>>;
/** Daño que da cada carga en los golpes a los que se aplica. */
export const DANO_POR_CARGA: Record<CargaId, number> = { escoba: B.escoba.carga, larga: B.chinchon.carga };
/**
 * Lo que la interfaz puede decir de las cargas de un Mazo: la regla, cuántas lleva y el Daño que suman ahora
 * («¡Escoba! · 3 cargas · +3 de Daño»). Solo las que existen en ese Mazo, aunque estén a cero.
 */
export function cargasVisibles(mazo: string | undefined, cargas: Cargas | undefined): { id: CargaId; regla: Regla; n: number; dano: number }[] {
  const ids: CargaId[] = mazo === 'escoba' ? ['escoba'] : mazo === 'chinchon' ? ['larga'] : [];
  return ids.map((id) => ({ id, regla: REGLA[id], n: cargas?.[id] ?? 0, dano: (cargas?.[id] ?? 0) * DANO_POR_CARGA[id] }));
}

// ───────────────────────── Cuentas de cada regla ─────────────────────────

const lisa = (c: Card) => !c.sp && c.suit !== 'X';

/** Daño de más de un bravo del Truco (0 si la carta no lo es). Por palo y número: una copia también es bravo. */
export function bravoDe(c: Card): number {
  if (!lisa(c)) return 0;
  return (B.truco.bravo as Record<string, number>)[`${c.suit}${c.rank}`] ?? 0;
}

/** Lo que suman las cartas para la Escoba: cada una por su número (el As vale 1). */
export const sumaEscoba = (cards: Card[]): number => cards.reduce((a, c) => a + c.rank, 0);
/** ¿El golpe es una Escoba? Cartas de baraja (sin Comodín) que suman exactamente 15. */
export const esEscoba = (cards: Card[]): boolean => cards.length > 0 && cards.every(lisa) && sumaEscoba(cards) === ESCOBA_SUMA;
/** ¿Canta Envido? Exactamente 2 cartas de baraja del mismo palo. */
export const esEnvido = (cards: Card[]): boolean => cards.length === 2 && cards.every(lisa) && cards[0].suit === cards[1].suit;

/**
 * La formación propia de un Mazo para unas cartas que las formaciones de siempre no aceptan: «Par de palo» en el Truco
 * (2 cartas del mismo palo) y «Quince» en la Escoba (2 cartas o más que suman 15). null si no hay.
 */
export function formacionMazo(mazo: string | undefined, cards: Card[]): Formation | null {
  if (!cards.length || !cards.every(lisa)) return null;
  if (mazo === 'truco' && esEnvido(cards)) return 'parpalo';
  if (mazo === 'escoba' && cards.length >= 2 && esEscoba(cards)) return 'quince';
  return null;
}

// ───────────────────────── Engaño (El Mentiroso) ─────────────────────────

/**
 * Qué cuenta el Engaño: `inmune`, las cartas del palo del enemigo pegan igual; `palo`, el golpe cuenta como de un solo
 * palo (deja Expuesto y una escalera pasa a escalera de color); `numero`, como de un solo número (grupo o póker).
 */
export type EnganoModo = 'inmune' | 'palo' | 'numero';
export const ENGANO_MODOS: EnganoModo[] = ['inmune', 'palo', 'numero'];
/**
 * El Engaño del asalto, a la vista de la interfaz. `usado` y, si se usó, cómo (`modo`), en qué turno (`turno`, contado
 * desde 0), si fue automático (`auto`) y si abatió al enemigo (`abatio`; si no, la Furia subió `furia`).
 */
export interface EnganoEstado {
  usado: boolean;
  modo?: EnganoModo;
  turno?: number;
  auto?: boolean;
  abatio?: boolean;
  furia?: number;
}

/** ¿Cambia algo el Engaño en este golpe? (con Inmune: si alguna carta es del palo del enemigo). */
export function enganoCambia(modo: EnganoModo, cards: Card[], target: Suit): boolean {
  const c = cards.filter(lisa);
  if (!c.length) return false;
  if (modo === 'inmune') return c.some((x) => x.suit === target);
  if (c.length < 2) return false;
  if (modo === 'palo') return c.some((x) => x.suit !== c[0].suit);
  return c.some((x) => x.rank !== c[0].rank);
}

/** Las cartas tal como las cuenta el Engaño para la formación (mismo palo o mismo número que la primera). */
export function enganoCartas(modo: EnganoModo, cards: Card[]): Card[] {
  if (modo === 'palo') return cards.map((c) => (lisa(c) ? { ...c, suit: cards.find(lisa)!.suit } : c));
  if (modo === 'numero') return cards.map((c) => (lisa(c) ? { ...c, rank: cards.find(lisa)!.rank } : c));
  return cards;
}
