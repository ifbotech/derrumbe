// DERRUMBE — motor de reglas puro (sin dependencias, determinista con semilla).
// Lo usan el servidor (autoridad) y el cliente (validar y previsualizar jugadas).

import { MAX_SPECIALS, SPECIAL } from './specials';

export type Suit = 'S' | 'D' | 'H' | 'C';
export type CardSuit = Suit | 'X'; // X = comodín
export interface Card {
  id: string;
  suit: CardSuit;
  rank: number; // 0 comodín · 1-10 numerales · 11-13 figuras (J, Q, K)
  /** Mejora de forja (campaña): se suma al valor de la carta. */
  plus?: number;
  /** Carta especial (campaña): id en SPECIAL. No tiene palo ni número (suit X, rank 0). */
  sp?: string;
}

/** Valor de una carta para daño y poderes. El As es la carta más fuerte: vale 11. */
export const cardValue = (c: Card): number => (c.rank === 1 ? 11 : c.rank) + (c.plus ?? 0);

/** Modificadores de reglas que aportan herramientas y jefes en la campaña. Todos opcionales. */
export interface Mods {
  /** Daño extra por carta de ese palo. */
  suitFlat?: Partial<Record<Suit, number>>;
  /** Multiplicador con ventaja de material (2 por defecto). */
  advMult?: number;
  /** Multiplicador contra la torre del propio palo (0 por defecto). */
  ownMult?: number;
  /** Daño extra por carta según la formación (planos y herramientas). */
  formFlat?: Partial<Record<Formation, number>>;
  /** Se suma al multiplicador de la formación. */
  formMult?: Partial<Record<Formation, number>>;
  /** Todo golpe perfora, lleve o no picas. */
  alwaysPierce?: boolean;
  /** Al demoler un piso. */
  floorHeal?: number;
  floorWall?: number;
  /** Al dar un golpe limpio. */
  cleanHeal?: number;
}

export const SUITS: Suit[] = ['S', 'D', 'H', 'C'];
/** BEATS[a] === b  →  el palo a hace daño doble a la torre b. */
export const BEATS: Record<Suit, Suit> = { S: 'D', D: 'H', H: 'C', C: 'S' };
export const MATERIAL: Record<Suit, string> = { S: 'ACERO', D: 'VIDRIO', H: 'LADRILLO', C: 'HORMIGÓN' };
export const SUIT_GLYPH: Record<CardSuit, string> = { S: '♠', D: '♦', H: '♥', C: '♣', X: '★' };
export const RANK_LABEL = ['★', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export interface Config {
  maxIntegrity: number;
  wallCap: number;
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
  mods?: Mods;
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
/** Balanceado por simulación (npm run simulate): el bot gana ~60% en OBRA y ~40% en BRUTAL. */
const OBRA: Config = { ...DEFAULT_CONFIG, floorHp: { 11: 32, 12: 46, 13: 62 }, floorThreat: { 11: 3, 12: 5, 13: 7 }, handSize: { 1: 6, 2: 6, 3: 6, 4: 6 } };
export const DIFFICULTY: Record<Difficulty, Config> = {
  obra: OBRA,
  brutal: { ...OBRA, maxIntegrity: 16, collapseLoss: 6 },
};

export interface Tower {
  suit: Suit;
  /** Pisos restantes; el índice 0 es el piso activo. */
  floors: number[];
  damage: number;
  disarmed: boolean;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
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
}

export type Action =
  | { type: 'attack'; cards: string[]; target: Suit }
  | { type: 'discard'; cards: string[] }
  | { type: 'joker'; card: string; target: Suit }
  | { type: 'pass' };

export type GameEvent =
  | { e: 'play'; player: string; cards: Card[]; target: Suit; formation: Formation }
  | { e: 'discard'; player: string; cards: Card[] }
  | { e: 'joker'; player: string; card: Card; target: Suit }
  | { e: 'pass'; player: string }
  | { e: 'hit'; tower: Suit; amount: number; splash: boolean; damage: number; hp: number }
  | { e: 'floorDown'; tower: Suit; rank: number; clean: boolean; towerDown: boolean; damage: number }
  | { e: 'wall'; amount: number; total: number }
  | { e: 'repair'; amount: number; total: number }
  | { e: 'hurt'; amount: number; integrity: number }
  | { e: 'gold'; amount: number }
  | { e: 'siren'; card: Card | null; tower: Suit | null; threat: number; blocked: number; taken: number; integrity: number; wall: number; reason: 'strike' | 'ruin' | 'disarmed' | 'joker' | 'clean' | 'huelga' | 'empty' }
  | { e: 'collapse'; loss: number; integrity: number }
  | { e: 'draw'; player: string; count: number; cards?: Card[] }
  | { e: 'turn'; player: string }
  | { e: 'end'; result: 'won' | 'lost' };

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

// ───────────────────────── Preparación ─────────────────────────

export function createGame(players: { id: string; name: string }[], seed: number, config: Config = DEFAULT_CONFIG): GameState {
  if (players.length < 1 || players.length > 4) throw new RuleError('Se juega de 1 a 4 jugadores.');
  const deck: Card[] = [];
  for (const s of SUITS) for (let r = 1; r <= 10; r++) deck.push({ id: `${s}${r}`, suit: s, rank: r });
  deck.push({ id: 'X1', suit: 'X', rank: 0 }, { id: 'X2', suit: 'X', rank: 0 });
  const state: GameState = {
    config,
    rng: seed | 0,
    players: players.map((p) => ({ id: p.id, name: p.name, hand: [] })),
    deck,
    discard: [],
    towers: Object.fromEntries(SUITS.map((s) => [s, { suit: s, floors: [11, 12, 13], damage: 0, disarmed: false }])) as Record<Suit, Tower>,
    integrity: config.maxIntegrity,
    wall: 0,
    turn: 0,
    turnCount: 0,
    collapses: 0,
    phase: 'playing',
    lastSiren: null,
  };
  shuffle(state.deck, state);
  const size = config.handSize[players.length];
  for (const p of state.players) p.hand = state.deck.splice(0, size);
  return state;
}

// ───────────────────────── Formaciones ─────────────────────────

export type Formation = 'solo' | 'grupo' | 'doblepar' | 'escalera' | 'color' | 'full' | 'poker' | 'escaleracolor';
export const FORMATIONS: Formation[] = ['solo', 'grupo', 'doblepar', 'escalera', 'color', 'full', 'poker', 'escaleracolor'];
export const FORMATION_NAME: Record<Formation, string> = {
  solo: 'Carta sola',
  grupo: 'Grupo',
  doblepar: 'Doble par',
  escalera: 'Escalera',
  color: 'Color',
  full: 'Full',
  poker: 'Póker',
  escaleracolor: 'Escalera de color',
};
/** Las formaciones difíciles multiplican el golpe entero. */
export const FORMATION_MULT: Record<Formation, number> = { solo: 1, grupo: 1, doblepar: 1.25, escalera: 1, color: 1.5, full: 1.5, poker: 2, escaleracolor: 1.5 };

/**
 * Devuelve el tipo de formación o null si las cartas no forman una jugada legal de ataque.
 *  solo · grupo (2-3 iguales) · póker (4 iguales) · doble par · full (trío + par)
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

export function multiplier(card: CardSuit, tower: Suit, mods: Mods = {}): number {
  if (card === 'X') return 0;
  if (card === tower) return mods.ownMult ?? 0;
  return BEATS[card] === tower ? (mods.advMult ?? 2) : 1;
}

export function standing(t: Tower): boolean {
  return t.floors.length > 0;
}

export interface StrikeResult {
  events: GameEvent[];
  formation: Formation | null;
  /** Multiplicador total del golpe (formación × cartas especiales). */
  mult: number;
  wallGain: number;
  repair: number;
  clean: boolean;
  /** Efectos de cartas especiales. */
  hurt: number;
  gold: number;
  draw: number;
  noSiren: boolean;
  disarm: boolean;
  /** Daño aplicado a cada torre (para previsualizar). */
  dealt: Partial<Record<Suit, number>>;
  fallen: Partial<Record<Suit, number>>;
}

function applyDamage(t: Tower, amount: number, pierce: boolean, splash: boolean, cfg: Config, out: StrikeResult): void {
  if (amount <= 0 || !standing(t)) return;
  out.dealt[t.suit] = (out.dealt[t.suit] ?? 0) + amount;
  t.damage += amount;
  out.events.push({ e: 'hit', tower: t.suit, amount, splash, damage: t.damage, hp: cfg.floorHp[t.floors[0]] });
  while (standing(t) && t.damage >= cfg.floorHp[t.floors[0]]) {
    const excess = t.damage - cfg.floorHp[t.floors[0]];
    const rank = t.floors.shift()!;
    const clean = excess === 0;
    if (clean) out.clean = true;
    out.fallen[t.suit] = (out.fallen[t.suit] ?? 0) + 1;
    t.disarmed = false;
    t.damage = pierce && standing(t) ? excess : 0;
    out.events.push({ e: 'floorDown', tower: t.suit, rank, clean, towerDown: !standing(t), damage: t.damage });
  }
}

/** Resuelve el golpe sobre las torres (las muta). Pura respecto del resto del estado: sirve para previsualizar. */
export function strike(towers: Record<Suit, Tower>, cards: Card[], target: Suit, cfg: Config): StrikeResult {
  const m = cfg.mods ?? {};
  const formation = classify(cards);
  const out: StrikeResult = { events: [], formation, mult: formation ? FORMATION_MULT[formation] + (m.formMult?.[formation] ?? 0) : 1, wallGain: 0, repair: 0, clean: false, hurt: 0, gold: 0, draw: 0, noSiren: false, disarm: false, dealt: {}, fallen: {} };
  let dmg = 0;
  let glass = 0;
  let concrete = 0;
  let brick = 0;
  let steel = false;
  let splash = 0;
  let goldOnKill = 0;
  const formFlat = formation ? (m.formFlat?.[formation] ?? 0) : 0;
  const riders = cards.filter((c) => c.sp).map((c) => SPECIAL[c.sp!]?.fx ?? {});
  const base = cards.filter((c) => !c.sp);
  const highest = Math.max(0, ...base.map(cardValue));
  const perCard = riders.reduce((a, fx) => a + (fx.flatPerCard ?? 0), 0);
  const allHigh = riders.some((fx) => fx.allHigh);
  const allAdv = riders.some((fx) => fx.allAdv);
  let best = 0;
  for (const c of base) {
    const v = allHigh ? highest : cardValue(c);
    const flat = c.suit === 'X' ? 0 : (m.suitFlat?.[c.suit] ?? 0) + formFlat + perCard;
    const hit = (v + flat) * (allAdv ? (m.advMult ?? 2) : multiplier(c.suit, target, m));
    best = Math.max(best, hit);
    dmg += hit;
    if (c.suit === 'S') steel = true;
    if (c.suit === 'D') glass += v;
    if (c.suit === 'C') concrete += v;
    if (c.suit === 'H') brick += v;
  }
  for (const fx of riders) {
    dmg += (fx.flat ?? 0) + (fx.highDouble ? best : 0);
    if (fx.pierce) steel = true;
    out.mult *= fx.strikeMult ?? 1;
    out.wallGain += (fx.wall ?? 0) + (fx.wallPerCard ?? 0) * cards.length;
    out.repair += fx.heal ?? 0;
    out.hurt += fx.hurt ?? 0;
    out.gold += fx.gold ?? 0;
    out.draw += fx.draw ?? 0;
    splash += fx.splash ?? 0;
    goldOnKill += fx.goldOnKill ?? 0;
    if (fx.noSiren) out.noSiren = true;
    if (fx.disarm) out.disarm = true;
  }
  applyDamage(towers[target], Math.floor(dmg * out.mult), steel || !!m.alwaysPierce, false, cfg, out);
  const shards = Math.floor(glass / cfg.shardDiv) + splash;
  if (shards > 0) for (const s of SUITS) if (s !== target) applyDamage(towers[s], shards, false, true, cfg, out);
  const fallen = SUITS.reduce((a, s) => a + (out.fallen[s] ?? 0), 0);
  if (fallen > 0) out.gold += goldOnKill;
  if (out.disarm && standing(towers[target])) towers[target].disarmed = true;
  out.wallGain += Math.ceil(concrete / cfg.wallDiv) + fallen * (m.floorWall ?? 0);
  out.repair += Math.ceil(brick / cfg.repairDiv) + fallen * (m.floorHeal ?? 0) + (out.clean ? (m.cleanHeal ?? 0) : 0);
  return out;
}

export function previewStrike(towers: Record<Suit, Tower>, cards: Card[], target: Suit, cfg: Config): StrikeResult {
  return strike(structuredClone(towers), cards, target, cfg);
}

// ───────────────────────── Turno ─────────────────────────

function reshuffleIfNeeded(state: GameState, events: GameEvent[]): void {
  if (state.deck.length > 0 || state.discard.length === 0) return;
  state.deck = state.discard;
  state.discard = [];
  shuffle(state.deck, state);
  state.collapses++;
  state.integrity -= state.config.collapseLoss;
  events.push({ e: 'collapse', loss: state.config.collapseLoss, integrity: Math.max(0, state.integrity) });
}

function drawOne(state: GameState, events: GameEvent[]): Card | null {
  reshuffleIfNeeded(state, events);
  return state.deck.shift() ?? null;
}

function siren(state: GameState, events: GameEvent[], skip: 'clean' | 'huelga' | null): void {
  const base = { blocked: 0, taken: 0, threat: 0 };
  if (skip) {
    events.push({ e: 'siren', card: null, tower: null, ...base, integrity: state.integrity, wall: state.wall, reason: skip });
    return;
  }
  const card = drawOne(state, events);
  if (state.integrity <= 0) return;
  if (!card) {
    events.push({ e: 'siren', card: null, tower: null, ...base, integrity: state.integrity, wall: state.wall, reason: 'empty' });
    return;
  }
  state.discard.push(card);
  state.lastSiren = card;
  if (card.suit === 'X') {
    events.push({ e: 'siren', card, tower: null, ...base, integrity: state.integrity, wall: state.wall, reason: 'joker' });
    return;
  }
  const t = state.towers[card.suit];
  if (!standing(t) || t.disarmed) {
    events.push({ e: 'siren', card, tower: t.suit, ...base, integrity: state.integrity, wall: state.wall, reason: standing(t) ? 'disarmed' : 'ruin' });
    return;
  }
  const threat = state.config.floorThreat[t.floors[0]];
  const blocked = Math.min(state.wall, threat);
  state.wall -= blocked;
  const taken = threat - blocked;
  state.integrity -= taken;
  events.push({ e: 'siren', card, tower: t.suit, threat, blocked, taken, integrity: Math.max(0, state.integrity), wall: state.wall, reason: 'strike' });
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

function takeFromHand(p: Player, ids: string[]): Card[] {
  if (new Set(ids).size !== ids.length) throw new RuleError('Cartas repetidas.');
  const cards = ids.map((id) => {
    const c = p.hand.find((h) => h.id === id);
    if (!c) throw new RuleError('Esa carta no está en tu mano.');
    return c;
  });
  return cards;
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.turn];
}

/** Aplica una acción. No muta el estado recibido. Lanza RuleError si la jugada es ilegal. */
export function applyAction(prev: GameState, playerId: string, action: Action): { state: GameState; events: GameEvent[] } {
  if (prev.phase !== 'playing') throw new RuleError('La partida ya terminó.');
  if (currentPlayer(prev).id !== playerId) throw new RuleError('No es tu turno.');
  const state = structuredClone(prev);
  const p = currentPlayer(state);
  const events: GameEvent[] = [];
  let skip: 'clean' | 'huelga' | null = null;
  let extraDraw = 0;

  if (action.type === 'attack') {
    const cards = takeFromHand(p, action.cards);
    const formation = classify(cards);
    if (!formation) throw new RuleError('Formación inválida: carta sola, grupo, doble par, full, póker, escalera o color.');
    const tower = state.towers[action.target];
    if (!tower || !standing(tower)) throw new RuleError('Esa torre ya está en ruinas.');
    p.hand = p.hand.filter((c) => !action.cards.includes(c.id));
    events.push({ e: 'play', player: p.id, cards, target: action.target, formation });
    const res = strike(state.towers, cards, action.target, state.config);
    events.push(...res.events);
    if (res.wallGain > 0) {
      const before = state.wall;
      state.wall = Math.min(state.config.wallCap, state.wall + res.wallGain);
      events.push({ e: 'wall', amount: state.wall - before, total: state.wall });
    }
    if (res.repair > 0) {
      const before = state.integrity;
      state.integrity = Math.min(state.config.maxIntegrity, state.integrity + res.repair);
      events.push({ e: 'repair', amount: state.integrity - before, total: state.integrity });
    }
    if (res.hurt > 0) {
      state.integrity -= res.hurt;
      events.push({ e: 'hurt', amount: res.hurt, integrity: Math.max(0, state.integrity) });
    }
    if (res.gold > 0) events.push({ e: 'gold', amount: res.gold });
    extraDraw = res.draw;
    state.discard.push(...cards);
    if (res.clean) skip = 'clean';
    else if (res.noSiren) skip = 'huelga';
    if (SUITS.every((s) => !standing(state.towers[s]))) {
      state.phase = 'won';
      events.push({ e: 'end', result: 'won' });
      return { state, events };
    }
  } else if (action.type === 'discard') {
    const cards = takeFromHand(p, action.cards);
    if (cards.length === 0) throw new RuleError('Elige al menos una carta para descartar.');
    p.hand = p.hand.filter((c) => !action.cards.includes(c.id));
    state.discard.push(...cards);
    events.push({ e: 'discard', player: p.id, cards });
  } else if (action.type === 'joker') {
    const [card] = takeFromHand(p, [action.card]);
    if (card.suit !== 'X' || card.sp) throw new RuleError('Esa carta no es un comodín.');
    const tower = state.towers[action.target];
    if (!tower || !standing(tower)) throw new RuleError('Esa torre ya está en ruinas.');
    p.hand = p.hand.filter((c) => c.id !== card.id);
    tower.disarmed = true; // el comodín sale del juego
    skip = 'huelga';
    events.push({ e: 'joker', player: p.id, card, target: action.target });
  } else if (action.type === 'pass') {
    if (p.hand.length > 0) throw new RuleError('Solo puedes pasar con la mano vacía.');
    events.push({ e: 'pass', player: p.id });
  } else {
    throw new RuleError('Acción desconocida.');
  }

  const sirens = skip ? 1 : (state.config.sirenCount ?? 1);
  for (let i = 0; i < sirens && state.integrity > 0; i++) siren(state, events, skip);
  if (state.integrity > 0) refill(state, p, events, extraDraw);
  if (state.integrity <= 0) {
    state.integrity = 0;
    state.phase = 'lost';
    events.push({ e: 'end', result: 'lost' });
    return { state, events };
  }
  state.turn = (state.turn + 1) % state.players.length;
  state.turnCount++;
  events.push({ e: 'turn', player: currentPlayer(state).id });
  return { state, events };
}

// ───────────────────────── Vista por jugador (información oculta) ─────────────────────────

export interface PlayerView {
  you: string;
  config: Config;
  players: { id: string; name: string; handCount: number }[];
  hand: Card[];
  towers: Record<Suit, Tower>;
  integrity: number;
  wall: number;
  deckCount: number;
  discardCount: number;
  lastSiren: Card | null;
  turnPlayer: string;
  turnCount: number;
  collapses: number;
  phase: Phase;
}

export function viewFor(state: GameState, playerId: string): PlayerView {
  return {
    you: playerId,
    config: state.config,
    players: state.players.map((p) => ({ id: p.id, name: p.name, handCount: p.hand.length })),
    hand: state.players.find((p) => p.id === playerId)?.hand ?? [],
    towers: state.towers,
    integrity: state.integrity,
    wall: state.wall,
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    lastSiren: state.lastSiren,
    turnPlayer: currentPlayer(state).id,
    turnCount: state.turnCount,
    collapses: state.collapses,
    phase: state.phase,
  };
}

/** Oculta las cartas robadas a quien no es su dueño. */
export function eventsFor(events: GameEvent[], playerId: string): GameEvent[] {
  return events.map((ev) => (ev.e === 'draw' && ev.player !== playerId ? { e: 'draw', player: ev.player, count: ev.count } : ev));
}
