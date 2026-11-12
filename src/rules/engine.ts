// CORONA ROTA — motor de reglas puro (sin dependencias, determinista con semilla).
// Lo usan el servidor (autoridad), el cliente (validar y previsualizar jugadas), el bot y los tests.
//
// Cada golpe se resuelve en dos ejes, de izquierda a derecha:
//
//     Golpe = redondear(Daño × Multi)      (en el código: fuerza × res)
//
// La formación pone la base; cada carta suma su Daño; acabados, sellos de lacre, cartas especiales
// y reliquias suman Daño, suman Multi o lo multiplican, en ese orden.
// Cada aportación sale en el flujo de eventos como un `step`, para que el cliente la anime.
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
/** BEATS[a] === b  →  el palo a hace daño doble a la torre b. */
export const BEATS: Record<Suit, Suit> = { S: 'D', D: 'H', H: 'C', C: 'S' };
/** Nombre del palo en mayúsculas, tal como se escribe en la mesa («Contraataque de PICAS»). */
export const MATERIAL: Record<Suit, string> = { S: 'PICAS', D: 'DIAMANTES', H: 'CORAZONES', C: 'TRÉBOLES' };
export const SUIT_GLYPH: Record<CardSuit, string> = { S: '♠', D: '♦', H: '♥', C: '♣', X: '★' };
export const RANK_LABEL = ['★', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SEALS: Seal[] = ['dinamita', 'eco', 'jornal', 'sindical'];
export const SEAL: Record<Seal, { name: string; desc: string }> = {
  dinamita: { name: 'Sello de pólvora', desc: 'Al golpear, los tronos vecinos (orden ♠ ♦ ♥ ♣) reciben el valor de esta carta.' },
  eco: { name: 'Sello de eco', desc: 'Su Daño y el poder de su palo cuentan 2 veces.' },
  jornal: { name: 'Sello de oro real', desc: '+2 de oro si el golpe abate a un guardia.' },
  sindical: { name: 'Sello de la manga', desc: 'Robas 1 carta extra al jugarla o descartarla.' },
};
export const TREATMENTS: Treatment[] = ['forjado', 'templado', 'policromado', 'agrietado'];
export const TREATMENT: Record<Treatment, { name: string; desc: string }> = {
  forjado: { name: 'Filo de plata', desc: '+6 de Daño.' },
  templado: { name: 'Templado', desc: '+0,3 de Multi.' },
  policromado: { name: 'Lacre policromo', desc: '×1,5 de Multi.' },
  agrietado: { name: 'Cristal maldito', desc: '×2,5 de Multi, pero 1 de cada 4 veces la carta se hace añicos.' },
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
/** Base de cada formación (f Fuerza, r Resonancia) y lo que gana por nivel de plano (lf, lr). */
export const FORM: Record<Formation, { f: number; r: number; lf: number; lr: number }> = {
  solo: { f: 0, r: 1, lf: 4, lr: 0.15 },
  compania: { f: 0, r: 1.1, lf: 3, lr: 0.15 },
  grupo: { f: 2, r: 1.2, lf: 3, lr: 0.2 },
  escalera: { f: 4, r: 1.3, lf: 3, lr: 0.2 },
  doblepar: { f: 6, r: 1.5, lf: 3, lr: 0.2 },
  color: { f: 8, r: 1.8, lf: 3, lr: 0.2 },
  full: { f: 10, r: 2, lf: 3, lr: 0.2 },
  escaleracolor: { f: 10, r: 2, lf: 3, lr: 0.2 },
  poker: { f: 14, r: 2.5, lf: 3, lr: 0.2 },
};

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
  /** Lo que quita el primer colapso; después sube 1 por cada tanda de colapsos (uno por jugador). */
  collapseLoss: number;
  /** Divisores de los poderes: muro = ⌈♣/wallDiv⌉, reparación = ⌈♥/repairDiv⌉, esquirlas = ⌊♦/shardDiv⌋. */
  wallDiv: number;
  repairDiv: number;
  shardDiv: number;
  floorHp: Record<number, number>;
  floorThreat: Record<number, number>;
  handSize: Record<number, number>;
  /** Cartas que voltea la sirena cada turno (1 por defecto). */
  sirenCount?: number;
  /** Multiplicador con ventaja de material (2) y contra la torre del propio palo (0). */
  advMult?: number;
  ownMult?: number;
  /** Margen del golpe limpio: el piso cae y cuenta como limpio a ±cleanTol de su resistencia. */
  cleanTol?: number;
  /** Todo golpe perfora, lleve o no picas. */
  alwaysPierce?: boolean;
  /** Niveles de plano por formación. */
  formLevel?: Partial<Record<Formation, number>>;
  /** Pisos que empiezan apuntalados (el primer golpe contra ellos resuena a la mitad). */
  apuntalado?: number[];
  /** Lo que multiplica una fractura expuesta (1,5 por defecto). */
  fracturaMult?: number;
  /** Los golpes policromos también fracturan. */
  polyFractura?: boolean;
  /** Los sellos de las cartas se activan dos veces. */
  sealTwice?: boolean;
  /** Las cartas descartadas se agotan (no vuelven esta obra) y cargan Fuerza para el próximo golpe. */
  discardExhaust?: number;
  /** Huecos de andamio: cartas que cada jugador puede guardar aparte de su mano (1 por defecto). */
  reserveSize?: number;
  /**
   * Fatiga de cimientos: desde este turno de la obra, y cada `fatigueEvery` turnos, sube un nivel.
   * Cada nivel da +`fatigueRes` de Resonancia a todos los golpes y +1 de amenaza a todas las torres:
   * la obra se acelera en los dos sentidos. Sin definir, no hay fatiga.
   */
  fatigueStart?: number;
  fatigueEvery?: number;
  fatigueRes?: number;
  /** Amenaza extra de un piso mientras siga apuntalado. */
  bracedThreat?: number;
  /** Lo que le cuesta al búnker cada piso que cae sin golpe limpio. */
  crumbleHurt?: number;
  /** Fuerza que se guarda para el próximo golpe por cada punto reparado de más con el búnker lleno. */
  overhealCharge?: number;
  /** Puntos de muro sobrante (por encima del tope) que hacen falta para reparar 1 de integridad. */
  overwallRepair?: number;
  /** Partida clásica: lo que se le perdona (o se le carga, si es negativo) a cada colapso según jueguen 1, 2, 3 o 4. */
  collapseRelief?: number[];
}

/** Nivel de fatiga de cimientos que corresponde a un turno de la obra. */
export function fatigueAt(cfg: Config, turnCount: number): number {
  if (cfg.fatigueStart === undefined || turnCount < cfg.fatigueStart) return 0;
  return 1 + Math.floor((turnCount - cfg.fatigueStart) / Math.max(1, cfg.fatigueEvery ?? 2));
}

export const DEFAULT_CONFIG: Config = {
  maxIntegrity: 20,
  wallCap: 8,
  collapseLoss: 5,
  wallDiv: 3,
  repairDiv: 3,
  shardDiv: 3,
  floorHp: { 11: 20, 12: 30, 13: 40 },
  floorThreat: { 11: 3, 12: 4, 13: 6 },
  handSize: { 1: 7, 2: 6, 3: 6, 4: 6 },
};

export type Difficulty = 'obra' | 'brutal';
/** Partida clásica (una obra). Balanceado por simulación (npm run simulate): el bot gana ~60 % en OBRA y ~40 % en BRUTAL. */
const OBRA: Config = { ...DEFAULT_CONFIG, floorHp: { 11: 124, 12: 177, 13: 231 }, floorThreat: { 11: 3, 12: 5, 13: 7 }, handSize: { 1: 6, 2: 6, 3: 6, 4: 6 }, fatigueStart: 32, fatigueEvery: 3, fatigueRes: 0.25, collapseRelief: [0, -1, 0, 1] };
export const DIFFICULTY: Record<Difficulty, Config> = {
  obra: OBRA,
  brutal: { ...OBRA, maxIntegrity: 16, collapseLoss: 6 },
};

/** Estados estructurales de una torre (los provoca la mezcla de materiales del golpe, o un jefe). */
export interface TowerFx {
  /** Fractura expuesta: el próximo golpe contra ella resuena ×1,5. */
  fractura?: boolean;
  /** Sobrecarga: se salta su próximo golpe de sirena. */
  sobrecarga?: boolean;
  /** Apuntalado: el primer golpe contra este piso resuena a la mitad. */
  apuntalado?: boolean;
}
export const TOWER_FX: Record<keyof TowerFx, { name: string; desc: string }> = {
  fractura: { name: 'Brecha', desc: 'El próximo golpe contra este trono hace ×1,5 de Multi.' },
  sobrecarga: { name: 'Desarmado ×1', desc: 'Este trono se salta su próximo Contraataque.' },
  apuntalado: { name: 'En guardia', desc: '×0,5 de Multi en el primer golpe contra este guardia.' },
};

export interface Tower {
  suit: Suit;
  /** Pisos restantes; el índice 0 es el piso activo. */
  floors: number[];
  damage: number;
  disarmed: boolean;
  fx: TowerFx;
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
  /** Racha de golpes limpios: cada uno da +0,5 de Resonancia al siguiente golpe. */
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
  | { e: 'siren'; card: Card | null; tower: Suit | null; threat: number; blocked: number; taken: number; integrity: number; wall: number; reason: 'strike' | 'ruin' | 'disarmed' | 'sobrecarga' | 'joker' | 'clean' | 'huelga' | 'empty' }
  | { e: 'collapse'; loss: number; integrity: number }
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

const floorFx = (rank: number | undefined, cfg: Config): TowerFx => (rank !== undefined && cfg.apuntalado?.includes(rank) ? { apuntalado: true } : {});

export function newTowers(floors: number[], cfg: Config): Record<Suit, Tower> {
  return Object.fromEntries(SUITS.map((s) => [s, { suit: s, floors: [...floors], damage: 0, disarmed: false, fx: floorFx(floors[0], cfg) }])) as Record<Suit, Tower>;
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

export function multiplier(card: CardSuit, tower: Suit, cfg: Config = DEFAULT_CONFIG): number {
  if (card === 'X') return 0;
  if (card === tower) return cfg.ownMult ?? 0;
  return BEATS[card] === tower ? (cfg.advMult ?? 2) : 1;
}

export function standing(t: Tower): boolean {
  return t.floors.length > 0;
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

/** Amenaza de una torre ahora mismo: la de su piso, más la fatiga de cimientos y lo que añada el apuntalamiento. */
export function threatOf(env: { config: Config; fatigue?: number }, t: Tower): number {
  if (!t.floors.length) return 0;
  return env.config.floorThreat[t.floors[0]] + (env.fatigue ?? 0) + (t.fx.apuntalado ? (env.config.bracedThreat ?? 0) : 0);
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
  /** Daño adicional tras el golpe: fracción de la resistencia del piso activo de una torre. */
  extra: { tower: Suit; pct: number }[];
  /** +n de Fuerza. */
  F(n: number): void;
  /** +n de Resonancia. */
  R(n: number): void;
  /** ×n de Resonancia. */
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

const r2 = (n: number) => Math.round(n * 100) / 100;

interface Tally {
  events: GameEvent[];
  dealt: Partial<Record<Suit, number>>;
  fallenBy: Partial<Record<Suit, number>>;
  fell: { tower: Suit; rank: number; clean: boolean }[];
}

function applyDamage(t: Tower, amount: number, pierce: boolean, splash: boolean, cfg: Config, out: Tally): void {
  if (amount <= 0 || !standing(t)) return;
  const tol = cfg.cleanTol ?? 0;
  out.dealt[t.suit] = (out.dealt[t.suit] ?? 0) + amount;
  t.damage += amount;
  out.events.push({ e: 'hit', tower: t.suit, amount, splash, damage: t.damage, hp: floorHp(t, cfg) });
  while (standing(t) && t.damage >= floorHp(t, cfg) - tol) {
    const hp = floorHp(t, cfg);
    const clean = Math.abs(t.damage - hp) <= tol;
    const excess = clean ? 0 : t.damage - hp;
    const rank = t.floors.shift()!;
    out.fallenBy[t.suit] = (out.fallenBy[t.suit] ?? 0) + 1;
    out.fell.push({ tower: t.suit, rank, clean });
    t.disarmed = false;
    t.fx = floorFx(t.floors[0], cfg);
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
    tally.events.push({ e: 'step', src: cur.src, id: cur.id, slot: cur.slot, label: cur.label, ...d, fuerza: x.fuerza, res: r2(x.res), ...proc });
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
    F(n) {
      if (!n) return;
      x.fuerza += n;
      emit({ df: n });
    },
    R(n) {
      if (!n) return;
      x.res += n;
      emit({ dr: r2(n) });
    },
    X(n) {
      if (n === 1) return;
      x.res *= n;
      emit({ mr: r2(n) });
    },
    note(text) {
      tally.events.push({ e: 'step', src: cur.src, id: cur.id, slot: cur.slot, label: `${cur.label}: ${text}`, fuerza: x.fuerza, res: r2(x.res) });
    },
  };

  // 1 · la formación pone la base
  const level = cfg.formLevel?.[formation] ?? 0;
  const base = FORM[formation];
  x.fuerza = base.f + level * base.lf;
  x.res = base.r + level * base.lr;
  emit({ df: x.fuerza, dr: r2(x.res - 1) });

  // 2 · lo que arrastra la mesa: racha de golpes limpios, carga acumulada y estado de la torre
  if (env.chain > 0) {
    cur = { src: 'chain', id: 'onda', label: 'Racha' };
    x.R(0.5 * env.chain);
  }
  if (env.charge > 0) {
    cur = { src: 'state', id: 'carga', label: 'Carga' };
    x.F(env.charge);
    env.charge = 0;
  }
  if ((env.fatigue ?? 0) > 0) {
    cur = { src: 'state', id: 'fatiga', label: 'Asedio final' };
    x.R(r2((cfg.fatigueRes ?? 0.25) * env.fatigue!));
  }
  if (standing(tower) && tower.fx.fractura) {
    cur = { src: 'state', id: 'fractura', label: TOWER_FX.fractura.name };
    x.X(cfg.fracturaMult ?? 1.5);
    tower.fx.fractura = false;
    tally.events.push({ e: 'state', tower: target, fx: 'fractura', on: false });
  }
  if (standing(tower) && tower.fx.apuntalado && cards.length) {
    cur = { src: 'state', id: 'apuntalado', label: TOWER_FX.apuntalado.name };
    x.X(0.5);
    tower.fx.apuntalado = false;
    tally.events.push({ e: 'state', tower: target, fx: 'apuntalado', on: false });
  }

  // 3 · las cartas, de izquierda a derecha
  const riders = specials.map((c) => SPECIAL[c.sp!]?.fx ?? {});
  const allHigh = riders.some((fx) => fx.allHigh);
  const allAdv = riders.some((fx) => fx.allAdv);
  const highest = Math.max(0, ...cards.map(cardValue));
  const sealReps = cfg.sealTwice ? 2 : 1;
  const power: Record<Suit, number> = { S: 0, D: 0, H: 0, C: 0 };
  let adjacent = 0;
  let jornal = 0;
  const cracked: Card[] = [];
  for (const c of cards) {
    const suit = c.suit as Suit;
    const v = allHigh ? highest : cardValue(c);
    const impact = v * (allAdv ? (cfg.advMult ?? 2) : multiplier(suit, target, cfg));
    cur = { src: 'card', id: c.id, label: cardLabel(c) };
    x.impacts.push(impact);
    if (impact) x.F(impact);
    else x.note('inmune');
    power[suit] += v;
    if (c.tr) {
      cur = { src: 'treat', id: c.id, label: `${cardLabel(c)} · ${TREATMENT[c.tr].name}` };
      if (c.tr === 'forjado') x.F(6);
      else if (c.tr === 'templado') x.R(0.3);
      else if (c.tr === 'policromado') x.X(1.5);
      else {
        x.X(2.5);
        cracked.push(c);
      }
    }
    if (c.seal) {
      cur = { src: 'seal', id: c.id, label: `${cardLabel(c)} · ${SEAL[c.seal].name}` };
      for (let i = 0; i < sealReps; i++) {
        if (c.seal === 'eco') {
          if (impact) x.F(impact);
          else x.note('eco');
          power[suit] += v;
        } else if (c.seal === 'dinamita') {
          adjacent += v;
          x.note(`${v} a los tronos vecinos`);
        } else if (c.seal === 'jornal') {
          jornal++;
          x.note('+2 de oro si cae un guardia');
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

  // 6 · Fuerza × Resonancia
  const total = Math.max(0, Math.round(x.fuerza * x.res));
  tally.events.push({ e: 'impact', tower: target, fuerza: x.fuerza, res: r2(x.res), total });
  applyDamage(tower, total, x.pierce, false, cfg, tally);
  const shards = Math.floor(power.D / cfg.shardDiv) + x.splash + Math.round(total * x.splashPct);
  SUITS.forEach((s, i) => {
    if (s === target) return;
    const near = Math.abs(i - SUITS.indexOf(target)) === 1 ? adjacent : 0;
    applyDamage(env.towers[s], shards + near, false, true, cfg, tally);
  });

  // 7 · golpe limpio: onda sísmica sobre el piso siguiente, un jornal extra y una carta de impulso
  if (tally.fell.some((f) => f.clean)) x.draw += 1;
  for (const f of [...tally.fell]) {
    if (!f.clean) continue;
    x.gold += 1;
    const t = env.towers[f.tower];
    if (!standing(t)) continue;
    const amount = Math.ceil(floorHp(t, cfg) * 0.25);
    tally.events.push({ e: 'onda', tower: f.tower, amount });
    applyDamage(t, amount, false, true, cfg, tally);
  }

  // 8 · las herramientas reaccionan a cómo quedó el golpe
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
  if (tally.fell.length > 0) x.gold += goldOnKill + 2 * jornal;
  // suelo inestable: cada piso que cae sin golpe limpio se lleva algo del búnker
  const rough = tally.fell.filter((f) => !f.clean).length;
  if (cfg.crumbleHurt && rough) {
    cur = { src: 'state', id: 'inestable', label: CRUMBLE_LABEL };
    x.hurt += cfg.crumbleHurt * rough;
    x.note(`pierdes ${cfg.crumbleHurt * rough} de Vida`);
  }

  // 9 · estados estructurales que deja la mezcla de materiales
  if (standing(tower)) {
    if (x.disarm) tower.disarmed = true;
    const setFx = (fx: keyof TowerFx) => {
      if (tower.fx[fx]) return;
      tower.fx[fx] = true;
      tally.events.push({ e: 'state', tower: target, fx, on: true });
    };
    if (x.mono || (x.poly && cfg.polyFractura)) setFx('fractura');
    if (x.poly) setFx('sobrecarga');
  }

  // 10 · las cartas agrietadas pueden hacerse añicos
  if (rng) for (const c of cracked) if (nextRandom(rng) < 0.25) out.shattered.push(c);

  return {
    ...out,
    ...outcome(),
    fuerza: x.fuerza,
    res: r2(x.res),
    wallGain: x.wall + Math.ceil(power.C / cfg.wallDiv),
    repair: x.heal + Math.ceil(power.H / cfg.repairDiv),
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

/**
 * Lo que quitará el próximo colapso de cantera. Cada vuelta completa de la cuadrilla a la cantera lo
 * encarece en 1; en cuadrilla hay más cartas en las manos y la cantera se agota antes: cada colapso pesa menos.
 */
export function nextCollapse(env: { config: Config; collapses: number }, players: number): number {
  const crowd = env.config.collapseRelief?.[Math.min(players, 4) - 1] ?? 0;
  return Math.max(1, env.config.collapseLoss - crowd) + Math.floor(env.collapses / Math.max(1, players));
}

function reshuffleIfNeeded(state: GameState, events: GameEvent[]): void {
  if (state.deck.length > 0 || state.discard.length === 0) return;
  state.deck = state.discard;
  state.discard = [];
  shuffle(state.deck, state);
  const loss = nextCollapse(state, state.players.length);
  state.collapses++;
  state.integrity -= loss;
  events.push({ e: 'collapse', loss, integrity: Math.max(0, state.integrity) });
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
  if (state.integrity <= 0) {
    // el colapso fue mortal: la carta no llega a sonar, pero tampoco se pierde
    if (card) state.discard.push(card);
    return;
  }
  if (!card) return say(null, null, 'empty');
  state.discard.push(card);
  state.lastSiren = card;
  if (card.suit === 'X') return say(card, null, 'joker');
  const t = state.towers[card.suit];
  if (!standing(t)) return say(card, t.suit, 'ruin');
  if (t.disarmed) return say(card, t.suit, 'disarmed');
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
    state.chain = res.clean ? Math.min(4, state.chain + 1) : 0;
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
    tower.disarmed = true;
    state.exhausted.push(card); // el comodín no vuelve esta obra
    skip = 'huelga';
    events.push({ e: 'joker', player: p.id, card, target: action.target });
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
  const fatigue = fatigueAt(state.config, state.turnCount);
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
