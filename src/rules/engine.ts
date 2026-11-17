// Motor de reglas puro (sin dependencias, determinista con semilla).
// Lo usan el servidor (autoridad), el cliente (validar y previsualizar jugadas), el bot y los tests.
//
// Cada golpe se resuelve en dos ejes, de izquierda a derecha:
//
//     Golpe = Daño × Multi      (en el código: fuerza × res; los dos, siempre enteros)
//
// La formación pone la base; cada carta suma su Daño (0 contra el trono de su palo: Inmune); acabados,
// sellos de lacre, cartas especiales y reliquias suman Daño, suman Multi o lo multiplican, en ese orden.
// Al final, si el trono estaba Expuesto, el Daño se multiplica.
// Cada aportación sale en el flujo de eventos como un `step`, para que el cliente la anime.
import { BALANCE, fill } from './balance-config';
import { MAX_SPECIALS, SPECIAL } from './specials';
import { TOOL } from './tools';
import type { ToolInst } from './tools';

// ───────────────────────── Cartas ─────────────────────────

export type Suit = 'S' | 'D' | 'H' | 'C';
export type CardSuit = Suit | 'X'; // X = comodín o carta especial
export type Seal = 'dinamita' | 'eco' | 'jornal' | 'sindical';
export type Treatment = 'forjado' | 'templado' | 'policromado' | 'agrietado';

export interface Card {
  id: string;
  suit: CardSuit;
  rank: number; // 0 comodín / especial · 1-10 numerales · 11-13 figuras (J, Q, K)
  /** Carta especial (campaña): id en SPECIAL. */
  sp?: string;
  /** Sello de obra estampado en la carta. */
  seal?: Seal;
  /** Tratamiento del material de la carta. */
  tr?: Treatment;
}

export const SUITS: Suit[] = ['S', 'D', 'H', 'C'];
/** Nombre del palo en mayúsculas, tal como se escribe en la mesa («Contraataque de PICAS»). */
export const MATERIAL: Record<Suit, string> = { S: 'PICAS', D: 'DIAMANTES', H: 'CORAZONES', C: 'TRÉBOLES' };
export const SUIT_GLYPH: Record<CardSuit, string> = { S: '♠', D: '♦', H: '♥', C: '♣', X: '★' };
export const RANK_LABEL = ['★', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SEALS: Seal[] = ['dinamita', 'eco', 'jornal', 'sindical'];
export const SEAL: Record<Seal, { name: string; desc: string }> = {
  dinamita: { name: 'Sello de pólvora', desc: 'Al golpear, los tronos al lado del golpeado en la mesa reciben el valor de esta carta.' },
  eco: { name: 'Sello de eco', desc: 'Su Daño y el poder de su palo cuentan 2 veces.' },
  jornal: { name: 'Sello de oro real', desc: fill('+{oro} de oro si el golpe abate a un guardia.', { oro: BALANCE.sellos.jornal }) },
  sindical: { name: 'Sello de la manga', desc: 'Robas 1 carta extra al jugarla o descartarla.' },
};
export const TREATMENTS: Treatment[] = ['forjado', 'templado', 'policromado', 'agrietado'];
export const TREATMENT: Record<Treatment, { name: string; desc: string }> = {
  forjado: { name: 'Filo de plata', desc: fill('+{n} de Daño.', { n: BALANCE.acabados.forjado }) },
  templado: { name: 'Templado', desc: fill('+{n} de Multi.', { n: BALANCE.acabados.templado }) },
  policromado: { name: 'Lacre policromo', desc: fill('×{n} de Multi.', { n: BALANCE.acabados.policromado }) },
  agrietado: { name: 'Cristal maldito', desc: fill('×{n} de Multi, pero 1 de cada {cada} veces la carta se hace añicos.', { n: BALANCE.acabados.agrietado, cada: 1 / BALANCE.acabados.agrietadoRompe }) },
};

/** Valor de una carta para el Daño y los poderes. El As es la carta fuerte: vale 11. */
export const cardValue = (c: Card): number => (c.rank === 1 ? 11 : c.rank);
export const cardLabel = (c: Card): string => (c.sp ? (SPECIAL[c.sp]?.name ?? '?') : `${RANK_LABEL[c.rank]}${SUIT_GLYPH[c.suit]}`);
/** Orden estable de lectura (palo y número): sirve para mostrar montones sin revelar su orden real. */
export function sortCards(cards: Card[]): Card[] {
  const suit = 'SDHCX';
  return [...cards].sort((a, b) => Number(!!a.sp) - Number(!!b.sp) || suit.indexOf(a.suit) - suit.indexOf(b.suit) || a.rank - b.rank || a.id.localeCompare(b.id));
}

// ───────────────────────── Formaciones ─────────────────────────

export type Formation = 'solo' | 'compania' | 'grupo' | 'doblepar' | 'escalera' | 'color' | 'full' | 'poker' | 'escaleracolor';
export const FORMATIONS: Formation[] = ['solo', 'compania', 'grupo', 'escalera', 'doblepar', 'color', 'full', 'escaleracolor', 'poker'];
export const FORMATION_NAME: Record<Formation, string> = {
  solo: 'Carta sola',
  compania: 'As cómplice',
  grupo: 'Grupo',
  doblepar: 'Doble par',
  escalera: 'Escalera',
  color: 'Color',
  full: 'Full',
  poker: 'Póker',
  escaleracolor: 'Escalera de color',
};
/** Base de cada formación (f Daño, r Multi entero) y el Daño que gana por nivel de Pergamino (lf): `formaciones` de balance-config.json. */
export const FORM: Record<Formation, { f: number; r: number; lf: number }> = BALANCE.formaciones as Record<Formation, { f: number; r: number; lf: number }>;

/**
 * Devuelve el tipo de formación o null si las cartas no forman una jugada legal de ataque.
 *  solo · as de compañía (un As con cualquier otra carta) · grupo (2-3 iguales) · póker (4 iguales)
 *  doble par · full (trío + par)
 *  escalera (3+ seguidas) · escalera de color (3+ seguidas del mismo palo) · color (5+ del mismo palo)
 * El As enlaza por abajo (A-2-3) y por arriba (9-10-A). Las cartas especiales no cuentan para la
 * formación: acompañan al golpe (hasta MAX_SPECIALS) o se juegan solas.
 */
export function classify(all: Card[]): Formation | null {
  const specials = all.filter((c) => c.sp);
  const cards = all.filter((c) => !c.sp);
  if (specials.length > MAX_SPECIALS) return null;
  const n = cards.length;
  if (n === 0) return specials.length ? 'solo' : null;
  if (cards.some((c) => c.suit === 'X')) return null;
  if (n === 1) return 'solo';
  const sameSuit = cards.every((c) => c.suit === cards[0].suit);
  if (cards.every((c) => c.rank === cards[0].rank)) return n >= 4 ? 'poker' : 'grupo';
  if (n === 2 && cards.some((c) => c.rank === 1)) return 'compania';
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const seq = (rs: number[]) => rs.every((r, i) => i === 0 || r === rs[i - 1] + 1);
  const high = cards.map((c) => (c.rank === 1 ? 11 : c.rank)).sort((a, b) => a - b);
  if (n >= 3 && (seq(ranks) || seq(high))) return sameSuit ? 'escaleracolor' : 'escalera';
  const counts = [...new Set(ranks)].map((r) => ranks.filter((x) => x === r).length).sort();
  if (n === 4 && counts.join() === '2,2') return 'doblepar';
  if (n === 5 && counts.join() === '2,3') return 'full';
  if (n >= 5 && sameSuit) return 'color';
  return null;
}

// ───────────────────────── Configuración y estado ─────────────────────────

export interface Config {
  maxIntegrity: number;
  wallCap: number;
  /**
   * V27 · Mazo agotado: el Descarte se baraja sin quitar Vida y el Asedio final sube estos niveles
   * (cada nivel, +1 de Ataque a todos los tronos y más Daño a tus golpes: se ve en la mesa).
   */
  collapseSiege: number;
  /** Mazos agotados por asalto que no suben el Asedio (Baraja de reserva). */
  collapseFree?: number;
  /** Poderes de palo, por carta (sea cual sea su rango): Escudo por cada ♣, Cura por cada ♥ y Salpica por cada ♦. */
  escudoPorCarta: number;
  curaPorCarta: number;
  salpicaPorCarta: number;
  floorHp: Record<number, number>;
  floorThreat: Record<number, number>;
  handSize: Record<number, number>;
  /** Cartas que voltea la sirena cada turno (1 por defecto). */
  sirenCount?: number;
  /** Lo que multiplica una carta contra el trono de su palo (0 por defecto: Inmune). */
  ownMult?: number;
  /** Margen del golpe limpio: el piso cae y cuenta como limpio a ±cleanTol de su resistencia. */
  cleanTol?: number;
  /** Gracia del Golpe exacto por arriba (V12, Buen ojo): también es exacto si el Daño se pasa por cleanTol + cleanOver o menos. */
  cleanOver?: number;
  /** Todo golpe perfora, lleve o no picas. */
  alwaysPierce?: boolean;
  /** Niveles de plano por formación. */
  formLevel?: Partial<Record<Formation, number>>;
  /** Lo que multiplica el Daño de un golpe contra un trono Expuesto (`golpe.expuesto` por defecto; el Caldero lo sube). */
  expuestoMult?: number;
  /** Los golpes de 3 palos o más también dejan Expuesto (Caldero). */
  polyExpuesto?: boolean;
  /** Ningún trono queda en ese estado (true: en ninguno). El decreto del Inquisidor quita Aturdido. */
  noFx?: boolean | keyof TowerFx;
  /** Los sellos de las cartas se activan dos veces. */
  sealTwice?: boolean;
  /** Las cartas descartadas se agotan (no vuelven esta obra) y cargan Fuerza para el próximo golpe. */
  discardExhaust?: number;
  /** Huecos de andamio: cartas que cada jugador puede guardar aparte de su mano (1 por defecto). */
  reserveSize?: number;
  /**
   * Fatiga de cimientos: desde este turno de la obra, y cada `fatigueEvery` turnos, sube un nivel.
   * Cada nivel da +`fatigueDano` de Daño a todos los golpes y +1 de Ataque a todos los tronos:
   * el asalto se acelera en los dos sentidos. Sin definir, no hay fatiga.
   */
  fatigueStart?: number;
  fatigueEvery?: number;
  fatigueDano?: number;
  /** Lo que le cuesta al búnker cada piso que cae sin golpe limpio. */
  crumbleHurt?: number;
  /** Fuerza que se guarda para el próximo golpe por cada punto reparado de más con el búnker lleno. */
  overhealCharge?: number;
  /** Puntos de muro sobrante (por encima del tope) que hacen falta para reparar 1 de integridad. */
  overwallRepair?: number;
}

/** Nivel de fatiga de cimientos que corresponde a un turno de la obra. */
export function fatigueAt(cfg: Config, turnCount: number): number {
  if (cfg.fatigueStart === undefined || turnCount < cfg.fatigueStart) return 0;
  return 1 + Math.floor((turnCount - cfg.fatigueStart) / Math.max(1, cfg.fatigueEvery ?? 2));
}

/** La mesa por defecto: `mesa` de balance-config.json (copiada: quien la toque no cambia el archivo). */
export const DEFAULT_CONFIG: Config = structuredClone(BALANCE.mesa);

export type Difficulty = 'obra' | 'brutal';
/** Partida clásica (una obra). Balanceado por simulación (npm run simulate): el bot gana ~60 % en OBRA y ~40 % en BRUTAL. */
const OBRA: Config = { ...DEFAULT_CONFIG, ...structuredClone(BALANCE.clasica.obra) };
export const DIFFICULTY: Record<Difficulty, Config> = {
  obra: OBRA,
  brutal: { ...OBRA, ...BALANCE.clasica.brutal },
};

/** Los dos estados de un trono (los deja la mezcla de palos del golpe, el Motín o El Espía). */
export interface TowerFx {
  /** Expuesto: el próximo golpe contra él hace ×`golpe.expuesto` de Daño. */
  fractura?: boolean;
  /** Aturdido: se salta su próximo Contraataque. */
  sobrecarga?: boolean;
}
export const TOWER_FX: Record<keyof TowerFx, { name: string; desc: string }> = {
  fractura: { name: 'Expuesto', desc: fill('El próximo golpe contra este trono hace ×{n} de Daño.', { n: BALANCE.golpe.expuesto }) },
  sobrecarga: { name: 'Aturdido', desc: 'Este trono se salta su próximo Contraataque.' },
};

export interface Tower {
  suit: Suit;
  /** Pisos restantes; el índice 0 es el piso activo. */
  floors: number[];
  damage: number;
  fx: TowerFx;
  /** No está en este asalto (los asaltos 1 y 2 tienen 2 y 3 tronos): sin guardias, no cuenta para ganar y su Contraataque no hace nada. */
  away?: true;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  /** El andamio: cartas guardadas aparte de la mano. Se juegan como si estuvieran en ella. */
  reserve: Card[];
}

export type Phase = 'playing' | 'won' | 'lost';

export interface GameState {
  config: Config;
  rng: number;
  players: Player[];
  deck: Card[];
  discard: Card[];
  towers: Record<Suit, Tower>;
  integrity: number;
  wall: number;
  turn: number;
  turnCount: number;
  collapses: number;
  phase: Phase;
  lastSiren: Card | null;
  /** Cinturón de herramientas, de izquierda a derecha (campaña). */
  tools: ToolInst[];
  /** Racha de Golpes exactos: cada eslabón da +`golpe.racha` de Multi al siguiente golpe (hasta `golpe.rachaTope`). */
  chain: number;
  /** Fuerza cargada para el próximo golpe. */
  charge: number;
  /** Escombros: cartas destruidas en toda la campaña. */
  scrap: number;
  /** Cartas destruidas en esta obra (salen del mazo de la campaña). */
  burned: string[];
  /** Cartas agotadas: fuera de juego hasta la obra siguiente. */
  exhausted: Card[];
  /** El jugador de turno ya movió el andamio este turno. */
  stashed: boolean;
  /** Tizas de replanteo: jugadas que aún se pueden deshacer en esta obra (solo en solitario). */
  chalk: number;
  /** La mesa justo antes de la última jugada, mientras quede tiza. */
  undo: GameState | null;
  /** Nivel de fatiga de cimientos (ver Config.fatigueStart). */
  fatigue: number;
}

export type Action =
  | { type: 'attack'; cards: string[]; target: Suit }
  | { type: 'discard'; cards: string[] }
  | { type: 'joker'; card: string; target: Suit }
  | { type: 'pass' }
  /** Guarda una carta de la mano en el andamio (si está lleno, la más antigua vuelve a la mano). No gasta el turno. */
  | { type: 'stash'; card: string }
  /** Gasta una tiza de replanteo: deshace la última jugada y vuelve a barajar la cantera. */
  | { type: 'undo' };

export type StepSrc = 'form' | 'chain' | 'state' | 'card' | 'treat' | 'seal' | 'special' | 'tool';
/**
 * Aviso de herramienta que dispara: qué hizo (sumó Fuerza al golpe, pegó a una torre, reparó el búnker
 * o cargó Fuerza para el golpe siguiente) y cuánto. Lo llevan los `step` de las herramientas cuya cuenta
 * no se ve en las cartas: la interfaz lo pinta como insignia sobre la herramienta.
 */
export interface Proc {
  what: 'fuerza' | 'dano' | 'repara' | 'carga';
  n: number;
  /** La torre que recibe el daño, si `what` es 'dano'. */
  tower?: Suit;
}

export type GameEvent =
  | { e: 'play'; player: string; cards: Card[]; target: Suit; formation: Formation }
  /** Un paso de la resolución: quién aporta (src + id, y slot si es una herramienta) y cuánto. */
  | { e: 'step'; src: StepSrc; id: string; slot?: number; label: string; df?: number; dr?: number; mr?: number; fuerza: number; res: number; proc?: Proc }
  | { e: 'impact'; tower: Suit; fuerza: number; res: number; total: number }
  | { e: 'discard'; player: string; cards: Card[] }
  | { e: 'joker'; player: string; card: Card; target: Suit }
  | { e: 'pass'; player: string }
  | { e: 'stash'; player: string; card?: Card; back?: Card | null }
  | { e: 'undo'; chalk: number }
  | { e: 'fatigue'; level: number }
  | { e: 'hit'; tower: Suit; amount: number; splash: boolean; damage: number; hp: number }
  | { e: 'floorDown'; tower: Suit; rank: number; clean: boolean; towerDown: boolean; damage: number }
  | { e: 'onda'; tower: Suit; amount: number }
  | { e: 'state'; tower: Suit; fx: keyof TowerFx; on: boolean }
  | { e: 'wall'; amount: number; total: number }
  | { e: 'repair'; amount: number; total: number }
  | { e: 'hurt'; amount: number; integrity: number }
  | { e: 'gold'; amount: number }
  | { e: 'burn'; card: Card }
  | { e: 'siren'; card: Card | null; tower: Suit | null; threat: number; blocked: number; taken: number; integrity: number; wall: number; reason: 'strike' | 'ruin' | 'sobrecarga' | 'joker' | 'clean' | 'huelga' | 'empty' }
  /** Mazo agotado: el Descarte se barajó. `sube`: niveles de Asedio final que sumó (0 si salió gratis); `asedio`: el nivel que queda. */
  | { e: 'collapse'; sube: number; asedio: number }
  | { e: 'draw'; player: string; count: number; cards?: Card[] }
  | { e: 'turn'; player: string }
  /** `was`: integridad del búnker al empezar la jugada que cerró la obra (para la autopsia de la derrota). */
  | { e: 'end'; result: 'won' | 'lost'; was?: number };

export class RuleError extends Error {}

// ───────────────────────── RNG ─────────────────────────

export function nextRandom(state: { rng: number }): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffle<T>(arr: T[], state: { rng: number }): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Convierte cualquier texto (una semilla escrita, una fecha) en una semilla numérica. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h | 0;
}

// ───────────────────────── Preparación ─────────────────────────

export function standardDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (let r = 1; r <= 10; r++) deck.push({ id: `${s}${r}`, suit: s, rank: r });
  deck.push({ id: 'X1', suit: 'X', rank: 0 }, { id: 'X2', suit: 'X', rank: 0 });
  return deck;
}

/** Los cuatro tronos con sus guardias. Con `palos`, solo esos están en el asalto: los demás salen sin guardias y con `away`. */
export function newTowers(floors: number[], _cfg?: Config, palos?: Suit[]): Record<Suit, Tower> {
  return Object.fromEntries(
    SUITS.map((s) => [s, palos && !palos.includes(s) ? { suit: s, floors: [], damage: 0, fx: {}, away: true } : { suit: s, floors: [...floors], damage: 0, fx: {} }]),
  ) as Record<Suit, Tower>;
}

export function createGame(players: { id: string; name: string }[], seed: number, config: Config = DEFAULT_CONFIG): GameState {
  if (players.length < 1 || players.length > 4) throw new RuleError('Se juega de 1 a 4 jugadores.');
  const state: GameState = {
    config,
    rng: seed | 0,
    players: players.map((p) => ({ id: p.id, name: p.name, hand: [], reserve: [] })),
    deck: standardDeck(),
    discard: [],
    towers: newTowers([11, 12, 13], config),
    integrity: config.maxIntegrity,
    wall: 0,
    turn: 0,
    turnCount: 0,
    collapses: 0,
    phase: 'playing',
    lastSiren: null,
    tools: [],
    chain: 0,
    charge: 0,
    scrap: 0,
    burned: [],
    exhausted: [],
    stashed: false,
    chalk: 0,
    undo: null,
    fatigue: 0,
  };
  shuffle(state.deck, state);
  const size = config.handSize[players.length];
  for (const p of state.players) p.hand = state.deck.splice(0, size);
  return state;
}

// ───────────────────────── El golpe ─────────────────────────

/** Una sola regla de palos: contra el trono de su palo, una carta hace 0 (Inmune; `ownMult` lo cambia); contra los demás, su número. */
export function multiplier(card: CardSuit, tower: Suit, cfg: Config = DEFAULT_CONFIG): number {
  if (card === 'X') return 0;
  if (card === tower) return cfg.ownMult ?? 0;
  return 1;
}

export function standing(t: Tower): boolean {
  return t.floors.length > 0;
}

/**
 * Los tronos al lado de `target` en la mesa (V12): el de su izquierda y el de su derecha en la fila ♠ ♦ ♥ ♣,
 * saltándose los que no están en el asalto (`away`). Un trono ya caído sigue en la mesa y cuenta. Con 4
 * tronos son los vecinos de siempre; con 2, el otro; con 3, uno o dos. Lo usa el sello de pólvora.
 */
export function vecinosPresentes(towers: Record<Suit, Tower>, target: Suit): Suit[] {
  const fila = SUITS.filter((s) => s === target || !towers[s].away);
  const i = fila.indexOf(target);
  return [fila[i - 1], fila[i + 1]].filter((s): s is Suit => s !== undefined);
}
export const floorHp = (t: Tower, cfg: Config): number => cfg.floorHp[t.floors[0]];

/** Etiqueta en mesa del decreto «inestable» (cada guardia abatido sin Golpe exacto te cuesta Vida). */
export const CRUMBLE_LABEL = 'Arena rápida';

/** Lo que un golpe necesita saber del estado. Lo cumplen tanto GameState como PlayerView. */
export interface StrikeEnv {
  config: Config;
  towers: Record<Suit, Tower>;
  tools: ToolInst[];
  chain: number;
  charge: number;
  scrap: number;
  integrity: number;
  wall: number;
  fatigue?: number;
}

/** Ataque de un trono ahora mismo: el de su guardia más el Asedio final. */
export function threatOf(env: { config: Config; fatigue?: number }, t: Tower): number {
  if (!t.floors.length) return 0;
  return env.config.floorThreat[t.floors[0]] + (env.fatigue ?? 0);
}

/** El golpe en curso, tal como lo ven las cartas especiales y las herramientas. */
export interface Strike {
  env: StrikeEnv;
  cfg: Config;
  /** Cartas de baraja del golpe, en orden de izquierda a derecha. */
  cards: Card[];
  specials: Card[];
  formation: Formation;
  target: Suit;
  fuerza: number;
  res: number;
  /** 2+ cartas, todas del mismo palo. */
  mono: boolean;
  /** 3+ palos distintos. */
  poly: boolean;
  /** Impacto que hizo cada carta (para repetirlas). */
  impacts: number[];
  pierce: boolean;
  /** Daño fijo a cada una de las otras torres. */
  splash: number;
  /** Parte del daño final que salpica a las otras torres. */
  splashPct: number;
  wall: number;
  heal: number;
  hurt: number;
  gold: number;
  draw: number;
  noSiren: boolean;
  disarm: boolean;
  /** Daño adicional tras el golpe: fracción de la Vida del guardia activo de un trono. */
  extra: { tower: Suit; pct: number }[];
  /** Daño fijo adicional tras el golpe a un trono (cuenta como Salpica). */
  burst: { tower: Suit; n: number }[];
  /** +n de Daño. */
  F(n: number): void;
  /** +n de Multi (entero). */
  R(n: number): void;
  /** ×n de Multi (entero). */
  X(n: number): void;
  /** Aviso sin números (un efecto que no toca Fuerza ni Resonancia). */
  note(text: string): void;
}

/** Cómo quedó el golpe: lo reciben las herramientas en su gancho `after`. */
export interface Outcome {
  total: number;
  /** Pisos derribados (en cualquier torre). */
  fallen: number;
  clean: boolean;
  fell: { tower: Suit; rank: number; clean: boolean }[];
}

export interface StrikeResult extends Outcome {
  events: GameEvent[];
  formation: Formation | null;
  fuerza: number;
  res: number;
  wallGain: number;
  repair: number;
  hurt: number;
  gold: number;
  draw: number;
  noSiren: boolean;
  /** Daño aplicado a cada torre y pisos caídos (para previsualizar). */
  dealt: Partial<Record<Suit, number>>;
  fallenBy: Partial<Record<Suit, number>>;
  /** Cartas agrietadas que se hicieron añicos (solo con azar real, nunca en la previsualización). */
  shattered: Card[];
}

interface Tally {
  events: GameEvent[];
  dealt: Partial<Record<Suit, number>>;
  fallenBy: Partial<Record<Suit, number>>;
  fell: { tower: Suit; rank: number; clean: boolean }[];
}

/** Deja un estado en un trono en pie (si no lo tiene ya y la mesa lo permite) y lo anuncia. */
function setFx(t: Tower, fx: keyof TowerFx, events: GameEvent[], cfg?: Config): void {
  if (!standing(t) || t.fx[fx] || cfg?.noFx === true || cfg?.noFx === fx) return;
  t.fx[fx] = true;
  events.push({ e: 'state', tower: t.suit, fx, on: true });
}

function applyDamage(t: Tower, amount: number, pierce: boolean, splash: boolean, cfg: Config, out: Tally): void {
  if (amount <= 0 || !standing(t)) return;
  const tol = cfg.cleanTol ?? 0;
  out.dealt[t.suit] = (out.dealt[t.suit] ?? 0) + amount;
  t.damage += amount;
  out.events.push({ e: 'hit', tower: t.suit, amount, splash, damage: t.damage, hp: floorHp(t, cfg) });
  while (standing(t) && t.damage >= floorHp(t, cfg) - tol) {
    const hp = floorHp(t, cfg);
    // exacto a ±cleanTol; por arriba, también hasta cleanTol + cleanOver (Buen ojo)
    const clean = t.damage - hp >= -tol && t.damage - hp <= tol + (cfg.cleanOver ?? 0);
    const excess = clean ? 0 : t.damage - hp;
    const rank = t.floors.shift()!;
    out.fallenBy[t.suit] = (out.fallenBy[t.suit] ?? 0) + 1;
    out.fell.push({ tower: t.suit, rank, clean });
    t.fx = {};
    t.damage = pierce && standing(t) ? excess : 0;
    out.events.push({ e: 'floorDown', tower: t.suit, rank, clean, towerDown: !standing(t), damage: t.damage });
  }
}

/**
 * Resuelve un golpe sobre `env` (muta sus torres, su carga y los contadores de sus herramientas).
 * Con `rng` las cartas agrietadas pueden hacerse añicos; sin él (previsualización) nunca.
 */
export function strike(env: StrikeEnv, all: Card[], target: Suit, rng?: { rng: number }): StrikeResult {
  const cfg = env.config;
  const formation = classify(all);
  const tally: Tally = { events: [], dealt: {}, fallenBy: {}, fell: [] };
  const out: StrikeResult = { ...tally, formation, fuerza: 0, res: 1, total: 0, fallen: 0, clean: false, wallGain: 0, repair: 0, hurt: 0, gold: 0, draw: 0, noSiren: false, shattered: [] };
  if (!formation) return out;
  const tower = env.towers[target];
  const cards = all.filter((c) => !c.sp);
  const specials = all.filter((c) => c.sp);
  const suits = [...new Set(cards.map((c) => c.suit as Suit))];

  let cur: { src: StepSrc; id: string; slot?: number; label: string; loud?: boolean } = { src: 'form', id: formation, label: FORMATION_NAME[formation] };
  const emit = (d: { df?: number; dr?: number; mr?: number }) => {
    const proc: { proc?: Proc } = cur.loud && d.df ? { proc: { what: 'fuerza', n: d.df } } : {};
    tally.events.push({ e: 'step', src: cur.src, id: cur.id, slot: cur.slot, label: cur.label, ...d, fuerza: x.fuerza, res: x.res, ...proc });
  };
  const x: Strike = {
    env,
    cfg,
    cards,
    specials,
    formation,
    target,
    fuerza: 0,
    res: 1,
    mono: cards.length >= 2 && suits.length === 1,
    poly: suits.length >= 3,
    impacts: [],
    pierce: !!cfg.alwaysPierce,
    splash: 0,
    splashPct: 0,
    wall: 0,
    heal: 0,
    hurt: 0,
    gold: 0,
    draw: 0,
    noSiren: false,
    disarm: false,
    extra: [],
    burst: [],
    F(n) {
      if (!n) return;
      x.fuerza += n;
      emit({ df: n });
    },
    R(n) {
      if (!n) return;
      x.res += n;
      emit({ dr: n });
    },
    X(n) {
      if (n === 1) return;
      x.res *= n;
      emit({ mr: n });
    },
    note(text) {
      tally.events.push({ e: 'step', src: cur.src, id: cur.id, slot: cur.slot, label: `${cur.label}: ${text}`, fuerza: x.fuerza, res: x.res });
    },
  };

  // 1 · la formación pone la base (el Pergamino solo sube su Daño)
  const level = cfg.formLevel?.[formation] ?? 0;
  const base = FORM[formation];
  x.fuerza = base.f + level * base.lf;
  x.res = base.r;
  emit({ df: x.fuerza, dr: x.res - 1 });

  // 2 · lo que arrastra la mesa: Racha de Golpes exactos, Daño cargado y Asedio final
  if (env.chain > 0) {
    cur = { src: 'chain', id: 'onda', label: 'Racha' };
    x.R(BALANCE.golpe.racha * env.chain);
  }
  if (env.charge > 0) {
    cur = { src: 'state', id: 'carga', label: 'Carga' };
    x.F(env.charge);
    env.charge = 0;
  }
  if ((env.fatigue ?? 0) > 0) {
    cur = { src: 'state', id: 'fatiga', label: 'Asedio final' };
    x.F((cfg.fatigueDano ?? BALANCE.asedio.dano) * env.fatigue!);
  }

  // 3 · las cartas, de izquierda a derecha
  const riders = specials.map((c) => SPECIAL[c.sp!]?.fx ?? {});
  const allHigh = riders.some((fx) => fx.allHigh);
  const noImmune = riders.some((fx) => fx.noImmune);
  const highest = Math.max(0, ...cards.map(cardValue));
  const sealReps = cfg.sealTwice ? 2 : 1;
  /** Cartas de cada palo en el golpe (el sello de eco cuenta su carta dos veces): de aquí salen los poderes. */
  const power: Record<Suit, number> = { S: 0, D: 0, H: 0, C: 0 };
  let adjacent = 0;
  let jornal = 0;
  const cracked: Card[] = [];
  for (const c of cards) {
    const suit = c.suit as Suit;
    const v = allHigh ? highest : cardValue(c);
    const m = multiplier(suit, target, cfg);
    const impact = v * (noImmune ? Math.max(1, m) : m);
    cur = { src: 'card', id: c.id, label: cardLabel(c) };
    x.impacts.push(impact);
    if (impact) x.F(impact);
    else x.note('inmune');
    power[suit] += 1;
    if (c.tr) {
      cur = { src: 'treat', id: c.id, label: `${cardLabel(c)} · ${TREATMENT[c.tr].name}` };
      if (c.tr === 'forjado') x.F(BALANCE.acabados.forjado);
      else if (c.tr === 'templado') x.R(BALANCE.acabados.templado);
      else if (c.tr === 'policromado') x.X(BALANCE.acabados.policromado);
      else {
        x.X(BALANCE.acabados.agrietado);
        cracked.push(c);
      }
    }
    if (c.seal) {
      cur = { src: 'seal', id: c.id, label: `${cardLabel(c)} · ${SEAL[c.seal].name}` };
      for (let i = 0; i < sealReps; i++) {
        if (c.seal === 'eco') {
          if (impact) x.F(impact);
          else x.note('eco');
          power[suit] += 1;
        } else if (c.seal === 'dinamita') {
          adjacent += v;
          x.note(`${v} a los tronos vecinos`);
        } else if (c.seal === 'jornal') {
          jornal++;
          x.note(`+${BALANCE.sellos.jornal} de oro si cae un guardia`);
        } else {
          x.draw++;
          x.note('robas 1');
        }
      }
    }
  }
  if (power.S > 0) x.pierce = true;

  // 4 · las cartas especiales que acompañan
  const best = Math.max(0, ...x.impacts);
  let goldOnKill = 0;
  specials.forEach((c, i) => {
    const fx = riders[i];
    cur = { src: 'special', id: c.id, label: cardLabel(c) };
    const before = tally.events.length;
    x.F((fx.flat ?? 0) + (fx.flatPerCard ?? 0) * cards.length + (fx.highDouble ? best : 0) + (fx.wallForce ?? 0) * env.wall);
    x.R(fx.multi ?? 0);
    x.X(fx.strikeMult ?? 1);
    if (fx.pierce) x.pierce = true;
    x.wall += (fx.wall ?? 0) + (fx.wallPerCard ?? 0) * all.length;
    x.heal += fx.heal ?? 0;
    x.hurt += fx.hurt ?? 0;
    x.gold += fx.gold ?? 0;
    x.draw += fx.draw ?? 0;
    x.splash += fx.splash ?? 0;
    goldOnKill += fx.goldOnKill ?? 0;
    if (fx.noSiren) x.noSiren = true;
    if (fx.disarm) x.disarm = true;
    if (tally.events.length === before) x.note(SPECIAL[c.sp!]?.desc ?? '');
  });

  // 5 · el cinturón de herramientas, de izquierda a derecha
  env.tools.forEach((t, slot) => {
    const def = TOOL[t.id];
    if (!def) return;
    if (def.kind === 'copy') {
      const next = env.tools[slot + 1];
      const copied = next && TOOL[next.id];
      if (!copied?.strike) return;
      cur = { src: 'tool', id: t.id, slot, label: `${def.name} → ${copied.name}`, loud: copied.loud };
      copied.strike(x, next);
      return;
    }
    cur = { src: 'tool', id: t.id, slot, label: def.name, loud: def.loud };
    def.strike?.(x, t);
  });

  // 6 · Expuesto, al final de la columna de Daño: el golpe hace ×n de Daño (se suma otro tanto)
  if (standing(tower) && tower.fx.fractura) {
    const mult = cfg.expuestoMult ?? BALANCE.golpe.expuesto;
    cur = { src: 'state', id: 'fractura', label: `Expuesto ×${mult}` };
    x.F(x.fuerza * (mult - 1));
    tower.fx.fractura = false;
    tally.events.push({ e: 'state', tower: target, fx: 'fractura', on: false });
  }

  // 7 · Daño × Multi = Golpe, todo entero
  const total = Math.max(0, x.fuerza * x.res);
  tally.events.push({ e: 'impact', tower: target, fuerza: x.fuerza, res: x.res, total });
  applyDamage(tower, total, x.pierce, false, cfg, tally);
  const shards = power.D * cfg.salpicaPorCarta + x.splash + Math.round(total * x.splashPct);
  const vecinos = adjacent ? vecinosPresentes(env.towers, target) : [];
  SUITS.forEach((s) => {
    if (s === target) return;
    const near = vecinos.includes(s) ? adjacent : 0;
    applyDamage(env.towers[s], shards + near, false, true, cfg, tally);
  });

  // 8 · Golpe exacto: Impulso sobre el guardia siguiente, oro y una carta
  if (tally.fell.some((f) => f.clean)) x.draw += 1;
  for (const f of [...tally.fell]) {
    if (!f.clean) continue;
    x.gold += BALANCE.golpe.oroExacto;
    const t = env.towers[f.tower];
    if (!standing(t)) continue;
    const amount = Math.ceil(floorHp(t, cfg) * BALANCE.golpe.onda);
    tally.events.push({ e: 'onda', tower: f.tower, amount });
    applyDamage(t, amount, false, true, cfg, tally);
  }

  // 9 · las reliquias reaccionan a cómo quedó el golpe
  const outcome = (): Outcome => ({ total, fallen: tally.fell.length, clean: tally.fell.some((f) => f.clean), fell: tally.fell });
  const seen = outcome();
  env.tools.forEach((t, slot) => {
    const def = TOOL[t.id];
    if (!def?.after) return;
    cur = { src: 'tool', id: t.id, slot, label: def.name };
    def.after(x, t, seen);
  });
  for (const e of x.extra) {
    const t = env.towers[e.tower];
    if (standing(t)) applyDamage(t, Math.ceil(floorHp(t, cfg) * e.pct), false, true, cfg, tally);
  }
  for (const b of x.burst) applyDamage(env.towers[b.tower], b.n, false, true, cfg, tally);
  if (tally.fell.length > 0) x.gold += goldOnKill + BALANCE.sellos.jornal * jornal;
  // suelo inestable: cada piso que cae sin golpe limpio se lleva algo del búnker
  const rough = tally.fell.filter((f) => !f.clean).length;
  if (cfg.crumbleHurt && rough) {
    cur = { src: 'state', id: 'inestable', label: CRUMBLE_LABEL };
    x.hurt += cfg.crumbleHurt * rough;
    x.note(`pierdes ${cfg.crumbleHurt * rough} de Vida`);
  }

  // 10 · los estados que deja la mezcla de palos: un solo palo deja Expuesto; tres palos (o El Espía), Aturdido
  if (standing(tower)) {
    if (x.mono || (x.poly && cfg.polyExpuesto)) setFx(tower, 'fractura', tally.events, cfg);
    if (x.poly || x.disarm) setFx(tower, 'sobrecarga', tally.events, cfg);
  }

  // 11 · las cartas de Cristal maldito pueden hacerse añicos
  if (rng) for (const c of cracked) if (nextRandom(rng) < BALANCE.acabados.agrietadoRompe) out.shattered.push(c);

  return {
    ...out,
    ...outcome(),
    fuerza: x.fuerza,
    res: x.res,
    wallGain: x.wall + power.C * cfg.escudoPorCarta,
    repair: x.heal + power.H * cfg.curaPorCarta,
    hurt: x.hurt,
    gold: x.gold,
    draw: x.draw,
    noSiren: x.noSiren,
  };
}

/** Lo mismo que `strike`, sin tocar el estado: para previsualizar y para que el bot compare jugadas. */
export function previewStrike(env: StrikeEnv, cards: Card[], target: Suit): StrikeResult {
  return strike({ ...env, towers: structuredClone(env.towers), tools: env.tools.map((t) => ({ ...t })) }, cards, target);
}

// ───────────────────────── Turno ─────────────────────────

/** Lo que una herramienta puede hacer fuera de un golpe (sirena, huelga, descartes, cartas destruidas). */
export interface Hook {
  state: GameState;
  gold(n: number): void;
  heal(n: number): void;
  wall(n: number): void;
  /** Roba n cartas extra al final del turno. */
  draw(n: number): void;
  /** Carga Fuerza para el próximo golpe. */
  charge(n: number): void;
  /** Daño directo a una torre. `why` es la cuenta que lo explica en mesa («3 × 4 frenado»). */
  hit(tower: Suit, n: number, why?: string): void;
  /** Destruye una carta: sale del mazo de la campaña. */
  burn(card: Card): void;
}

interface Turn {
  state: GameState;
  events: GameEvent[];
  draw: number;
}

function hookFor(turn: Turn, slot: number): Hook {
  const { state, events } = turn;
  const t = state.tools[slot];
  const mark = (label: string, proc?: Proc) => events.push({ e: 'step', src: 'tool', id: t.id, slot, label: `${TOOL[t.id]?.name ?? t.id}: ${label}`, fuerza: 0, res: 0, ...(proc ? { proc } : {}) });
  return {
    state,
    gold(n) {
      mark(`+${n} de oro`);
      events.push({ e: 'gold', amount: n });
    },
    heal(n) {
      const before = state.integrity;
      state.integrity = Math.min(state.config.maxIntegrity, state.integrity + n);
      mark(`+${state.integrity - before} de Vida`, { what: 'repara', n: state.integrity - before });
      events.push({ e: 'repair', amount: state.integrity - before, total: state.integrity });
    },
    wall(n) {
      const before = state.wall;
      state.wall = Math.min(state.config.wallCap, state.wall + n);
      mark(`+${state.wall - before} de Escudo`);
      events.push({ e: 'wall', amount: state.wall - before, total: state.wall });
    },
    draw(n) {
      mark(`robas ${n}`);
      turn.draw += n;
    },
    charge(n) {
      mark(`+${n} de Daño cargado`, { what: 'carga', n });
      state.charge += n;
    },
    hit(tower, n, why) {
      mark(`${why ? `${why} = ` : ''}${n} a ${MATERIAL[tower]}`, { what: 'dano', n, tower });
      const tally: Tally = { events, dealt: {}, fallenBy: {}, fell: [] };
      applyDamage(state.towers[tower], n, false, true, state.config, tally);
    },
    burn(card) {
      if (destroy(turn, card)) mark(`destruye ${cardLabel(card)}`);
    },
  };
}

/** Cartas de baraja que como mínimo quedan siempre en juego: por debajo, ninguna se destruye. */
export const MIN_PLAIN = 12;
const isPlain = (c: Card) => !c.sp && c.suit !== 'X';

/**
 * Destruye una carta para toda la campaña: suma un escombro y avisa a las herramientas.
 * Devuelve false (y no hace nada) si con ello el mazo se quedaría sin cartas de baraja suficientes.
 */
function destroy(turn: Turn, card: Card): boolean {
  const { state, events } = turn;
  if (state.burned.includes(card.id)) return true;
  if (isPlain(card)) {
    const left = [...state.deck, ...state.discard, ...state.exhausted, ...state.players.flatMap((p) => [...p.hand, ...p.reserve])].filter((c) => isPlain(c) && c.id !== card.id).length;
    if (left < MIN_PLAIN) return false;
  }
  state.burned.push(card.id);
  state.scrap++;
  events.push({ e: 'burn', card });
  state.tools.forEach((t, slot) => TOOL[t.id]?.burn?.(hookFor(turn, slot), t, card));
  return true;
}

/** V27 · Niveles de Asedio final que deben los Mazos agotados de este asalto (los gratis no cuentan). */
export function deckSiege(env: { config: Config; collapses: number }): number {
  return Math.max(0, env.collapses - (env.config.collapseFree ?? 0)) * env.config.collapseSiege;
}

/** Niveles de Asedio final que subirá el próximo Mazo agotado (0 si sale gratis). Ya no quita Vida. */
export function nextCollapse(env: { config: Config; collapses: number }): number {
  return deckSiege({ config: env.config, collapses: env.collapses + 1 }) - deckSiege(env);
}

/** Nivel de Asedio final: el que toca por turno más el de los Mazos agotados. */
export function siegeLevel(env: { config: Config; collapses: number; turnCount: number }): number {
  return fatigueAt(env.config, env.turnCount) + deckSiege(env);
}

function reshuffleIfNeeded(state: GameState, events: GameEvent[]): void {
  if (state.deck.length > 0 || state.discard.length === 0) return;
  state.deck = state.discard;
  state.discard = [];
  shuffle(state.deck, state);
  const sube = nextCollapse(state);
  state.collapses++;
  // V27: barajar el Descarte no quita Vida; sube el Asedio final, a la vista en cada trono
  events.push({ e: 'collapse', sube, asedio: siegeLevel(state) });
  if (sube > 0) {
    state.fatigue = siegeLevel(state);
    events.push({ e: 'fatigue', level: state.fatigue });
  }
}

function drawOne(state: GameState, events: GameEvent[]): Card | null {
  reshuffleIfNeeded(state, events);
  return state.deck.shift() ?? null;
}

type SirenReason = Extract<GameEvent, { e: 'siren' }>['reason'];

function siren(turn: Turn, skip: 'clean' | 'huelga' | null): void {
  const { state, events } = turn;
  const say = (card: Card | null, tower: Suit | null, reason: SirenReason): void => {
    events.push({ e: 'siren', card, tower, blocked: 0, taken: 0, threat: 0, integrity: state.integrity, wall: state.wall, reason });
  };
  if (skip) return say(null, null, skip);
  const card = drawOne(state, events);
  if (!card) return say(null, null, 'empty');
  state.discard.push(card);
  state.lastSiren = card;
  if (card.suit === 'X') return say(card, null, 'joker');
  const t = state.towers[card.suit];
  if (!standing(t)) return say(card, t.suit, 'ruin');
  if (t.fx.sobrecarga) {
    t.fx.sobrecarga = false;
    events.push({ e: 'state', tower: t.suit, fx: 'sobrecarga', on: false });
    return say(card, t.suit, 'sobrecarga');
  }
  const threat = threatOf(state, t);
  const blocked = Math.min(state.wall, threat);
  state.wall -= blocked;
  const taken = threat - blocked;
  state.integrity -= taken;
  events.push({ e: 'siren', card, tower: t.suit, threat, blocked, taken, integrity: Math.max(0, state.integrity), wall: state.wall, reason: 'strike' });
  state.tools.forEach((tool, slot) => TOOL[tool.id]?.siren?.(hookFor(turn, slot), tool, { tower: t.suit, threat, blocked, taken }));
}

function refill(state: GameState, p: Player, events: GameEvent[], extra = 0): void {
  const size = Math.max(p.hand.length, state.config.handSize[state.players.length]) + extra;
  const drawn: Card[] = [];
  while (p.hand.length < size) {
    const c = drawOne(state, events);
    if (!c) break;
    p.hand.push(c);
    drawn.push(c);
  }
  if (drawn.length) events.push({ e: 'draw', player: p.id, count: drawn.length, cards: drawn });
}

/** Quita de la mano y del andamio las cartas jugadas. */
function spend(p: Player, ids: string[]): void {
  p.hand = p.hand.filter((c) => !ids.includes(c.id));
  p.reserve = p.reserve.filter((c) => !ids.includes(c.id));
}

function takeFromHand(p: Player, ids: string[]): Card[] {
  if (new Set(ids).size !== ids.length) throw new RuleError('Cartas repetidas.');
  return ids.map((id) => {
    const c = p.hand.find((h) => h.id === id) ?? p.reserve.find((h) => h.id === id);
    if (!c) throw new RuleError('Esa carta no está en tu mano.');
    return c;
  });
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.turn];
}

const allDown = (state: GameState) => SUITS.every((s) => !standing(state.towers[s]));

/** Aplica una acción. No muta el estado recibido. Lanza RuleError si la jugada es ilegal. */
export function applyAction(prev: GameState, playerId: string, action: Action): { state: GameState; events: GameEvent[] } {
  if (prev.phase !== 'playing') throw new RuleError('La partida ya terminó.');
  if (currentPlayer(prev).id !== playerId) throw new RuleError('No es tu turno.');
  if (action.type === 'undo') return rewind(prev);
  const state = structuredClone({ ...prev, undo: null }) as GameState;
  // mientras quede tiza se guarda la mesa anterior (sin su propia historia) para poder deshacer
  state.undo = prev.chalk > 0 ? (structuredClone({ ...prev, undo: null }) as GameState) : null;
  const p = currentPlayer(state);
  const events: GameEvent[] = [];
  if (action.type === 'stash') {
    if (state.stashed) throw new RuleError('Ya usaste la Manga este turno.');
    const card = p.hand.find((c) => c.id === action.card);
    if (!card) throw new RuleError('Esa carta no está en tu mano.');
    const size = state.config.reserveSize ?? 1;
    if (size <= 0) throw new RuleError('En este asalto no hay Manga.');
    p.hand = p.hand.filter((c) => c !== card);
    const back = p.reserve.length >= size ? p.reserve.shift()! : null;
    if (back) p.hand.push(back);
    p.reserve.push(card);
    state.stashed = true;
    // mover el andamio no gasta el punto de replanteo: la tiza sigue apuntando a la última jugada de verdad
    state.undo = prev.undo ?? null;
    return { state, events: [{ e: 'stash', player: p.id, card, back }] };
  }
  const turn: Turn = { state, events, draw: 0 };
  let skip: 'clean' | 'huelga' | null = null;
  const win = () => {
    state.phase = 'won';
    events.push({ e: 'end', result: 'won' });
    return { state, events };
  };

  if (action.type === 'attack') {
    const cards = takeFromHand(p, action.cards);
    const formation = classify(cards);
    if (!formation) throw new RuleError('Formación inválida: carta sola, grupo, doble par, full, póker, escalera o color.');
    const tower = state.towers[action.target];
    if (!tower || !standing(tower)) throw new RuleError('Ese trono ya cayó.');
    spend(p, action.cards);
    events.push({ e: 'play', player: p.id, cards, target: action.target, formation });
    const res = strike(state, cards, action.target, state);
    events.push(...res.events);
    let repair = res.repair;
    if (res.wallGain > 0) {
      const before = state.wall;
      state.wall = Math.min(state.config.wallCap, state.wall + res.wallGain);
      events.push({ e: 'wall', amount: state.wall - before, total: state.wall });
      // el muro que no cabe no se pierde si alguien lo recoge: repara el búnker
      const spill = before + res.wallGain - state.wall;
      const mend = state.config.overwallRepair ? Math.floor(spill / state.config.overwallRepair) : 0;
      if (mend > 0) {
        repair += mend;
        const slot = state.tools.findIndex((t) => t.id === 'rebosadero');
        events.push({ e: 'step', src: 'tool', id: 'rebosadero', slot: slot < 0 ? undefined : slot, label: `${TOOL.rebosadero?.name ?? 'Rebosadero'}: ${spill} de Escudo que no cabe ÷ ${state.config.overwallRepair} = cura ${mend}`, fuerza: 0, res: 0, proc: { what: 'repara', n: mend } });
      }
    }
    if (repair > 0) {
      const before = state.integrity;
      state.integrity = Math.min(state.config.maxIntegrity, state.integrity + repair);
      events.push({ e: 'repair', amount: state.integrity - before, total: state.integrity });
      // lo reparado de más con el búnker lleno no se pierde si alguien lo recoge
      const over = before + repair - state.integrity;
      if (over > 0 && state.config.overhealCharge) {
        const gain = over * state.config.overhealCharge;
        state.charge += gain;
        const slot = state.tools.findIndex((t) => t.id === 'rebosadero');
        events.push({ e: 'step', src: 'tool', id: 'rebosadero', slot: slot < 0 ? undefined : slot, label: `${TOOL.rebosadero?.name ?? 'Rebosadero'}: ${over} de curación que no cabe × ${state.config.overhealCharge} = +${gain} de Daño cargado`, fuerza: 0, res: 0, proc: { what: 'carga', n: gain } });
      }
    }
    if (res.hurt > 0) {
      state.integrity -= res.hurt;
      events.push({ e: 'hurt', amount: res.hurt, integrity: Math.max(0, state.integrity) });
    }
    if (res.gold > 0) events.push({ e: 'gold', amount: res.gold });
    turn.draw += res.draw;
    state.chain = res.clean ? Math.min(BALANCE.golpe.rachaTope, state.chain + 1) : 0;
    state.discard.push(...cards.filter((c) => !res.shattered.includes(c)));
    for (const c of res.shattered) if (!destroy(turn, c)) state.discard.push(c);
    if (res.clean) skip = 'clean';
    else if (res.noSiren) skip = 'huelga';
    if (allDown(state)) return win();
  } else if (action.type === 'discard') {
    const cards = takeFromHand(p, action.cards);
    if (cards.length === 0) throw new RuleError('Elige al menos una carta para descartar.');
    spend(p, action.cards);
    events.push({ e: 'discard', player: p.id, cards });
    turn.draw += cards.filter((c) => c.seal === 'sindical').length * (state.config.sealTwice ? 2 : 1);
    state.tools.forEach((t, slot) => TOOL[t.id]?.discard?.(hookFor(turn, slot), t, cards));
    const rest = cards.filter((c) => !state.burned.includes(c.id));
    if (state.config.discardExhaust) {
      state.exhausted.push(...rest);
      state.charge += rest.length * state.config.discardExhaust;
    } else state.discard.push(...rest);
  } else if (action.type === 'joker') {
    const [card] = takeFromHand(p, [action.card]);
    if (card.suit !== 'X' || card.sp) throw new RuleError('Esa carta no es un Comodín.');
    const tower = state.towers[action.target];
    if (!tower || !standing(tower)) throw new RuleError('Ese trono ya cayó.');
    spend(p, [card.id]);
    state.exhausted.push(card); // el comodín no vuelve esta obra
    skip = 'huelga';
    events.push({ e: 'joker', player: p.id, card, target: action.target });
    // el Motín: ese trono queda Aturdido y este turno no hay Contraataque
    setFx(tower, 'sobrecarga', events, state.config);
    state.tools.forEach((t, slot) => TOOL[t.id]?.joker?.(hookFor(turn, slot), t));
  } else if (action.type === 'pass') {
    if (p.hand.length + p.reserve.length > 0) throw new RuleError('Solo puedes pasar con la mano vacía.');
    events.push({ e: 'pass', player: p.id });
    // nadie tiene cartas y no queda cantera ni escombrera: no hay con qué seguir
    if (state.deck.length + state.discard.length === 0 && state.players.every((q) => q.hand.length + q.reserve.length === 0)) state.integrity = 0;
  } else {
    throw new RuleError('Acción desconocida.');
  }

  const sirens = skip ? 1 : (state.config.sirenCount ?? 1);
  for (let i = 0; i < sirens && state.integrity > 0; i++) siren(turn, skip);
  if (allDown(state)) return win(); // una herramienta puede rematar durante la sirena
  if (state.integrity > 0) refill(state, p, events, turn.draw);
  if (state.integrity <= 0) {
    state.integrity = 0;
    state.phase = 'lost';
    events.push({ e: 'end', result: 'lost', was: prev.integrity });
    return { state, events };
  }
  state.turn = (state.turn + 1) % state.players.length;
  state.turnCount++;
  state.stashed = false;
  const fatigue = siegeLevel(state);
  if (fatigue !== (state.fatigue ?? 0)) {
    state.fatigue = fatigue;
    events.push({ e: 'fatigue', level: fatigue });
  }
  events.push({ e: 'turn', player: currentPlayer(state).id });
  return { state, events };
}

/**
 * Tiza de replanteo: vuelve a la mesa de antes de la última jugada. Para que deshacer no enseñe nada,
 * la cantera se baraja de nuevo: lo que viste salir ya no vale.
 */
function rewind(prev: GameState): { state: GameState; events: GameEvent[] } {
  if (prev.chalk <= 0 || !prev.undo) throw new RuleError('No te quedan rebobinados.');
  const state = structuredClone(prev.undo);
  state.undo = null;
  state.chalk = prev.chalk - 1;
  state.rng = (prev.rng ^ 0x2545f491) | 0;
  shuffle(state.deck, state);
  return { state, events: [{ e: 'undo', chalk: state.chalk }] };
}

/** Reordena una lista con una permutación de sus índices; null si la permutación no es válida. */
export function reorder<T>(items: T[], order: number[]): T[] | null {
  if (!Array.isArray(order) || order.length !== items.length || new Set(order).size !== items.length || order.some((i) => !Number.isInteger(i) || i < 0 || i >= items.length)) return null;
  return order.map((i) => items[i]);
}

// ───────────────────────── Vista por jugador (información oculta) ─────────────────────────

export interface PlayerView extends StrikeEnv {
  you: string;
  players: { id: string; name: string; handCount: number; reserveCount: number }[];
  hand: Card[];
  /** Tu andamio. */
  reserve: Card[];
  reserveSize: number;
  /** Ya moviste el andamio este turno. */
  stashed: boolean;
  /** Tizas de replanteo que quedan, y si hay una jugada que deshacer. */
  chalk: number;
  canUndo: boolean;
  /** Nivel de fatiga de cimientos de la obra. */
  fatigue: number;
  deckCount: number;
  discardCount: number;
  lastSiren: Card | null;
  turnPlayer: string;
  turnCount: number;
  collapses: number;
  phase: Phase;
  /** Lo que aún no has visto (cantera y manos ajenas), ordenado: no revela el orden de robo. */
  unseen: Card[];
  /** La escombrera, ordenada. */
  discard: Card[];
  exhausted: number;
  burned: number;
}

export function viewFor(state: GameState, playerId: string): PlayerView {
  const me = state.players.find((p) => p.id === playerId);
  return {
    you: playerId,
    config: state.config,
    players: state.players.map((p) => ({ id: p.id, name: p.name, handCount: p.hand.length, reserveCount: p.reserve.length })),
    hand: me?.hand ?? [],
    reserve: me?.reserve ?? [],
    reserveSize: state.config.reserveSize ?? 1,
    stashed: state.stashed,
    chalk: state.chalk,
    canUndo: state.chalk > 0 && !!state.undo,
    fatigue: state.fatigue ?? 0,
    towers: state.towers,
    tools: state.tools,
    chain: state.chain,
    charge: state.charge,
    scrap: state.scrap,
    integrity: state.integrity,
    wall: state.wall,
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    lastSiren: state.lastSiren,
    turnPlayer: currentPlayer(state).id,
    turnCount: state.turnCount,
    collapses: state.collapses,
    phase: state.phase,
    unseen: sortCards([...state.deck, ...state.players.filter((p) => p.id !== playerId).flatMap((p) => [...p.hand, ...p.reserve])]),
    discard: sortCards(state.discard),
    exhausted: state.exhausted.length,
    burned: state.burned.length,
  };
}

/** Oculta a quien no es su dueño las cartas robadas y las que pasan por el andamio. */
export function eventsFor(events: GameEvent[], playerId: string): GameEvent[] {
  return events.map((ev) => {
    if (ev.e === 'draw' && ev.player !== playerId) return { e: 'draw', player: ev.player, count: ev.count };
    if (ev.e === 'stash' && ev.player !== playerId) return { e: 'stash', player: ev.player };
    return ev;
  });
}
