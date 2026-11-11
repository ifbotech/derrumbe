// DERRUMBE — motor de reglas puro (sin dependencias, determinista con semilla).
// Lo usan el servidor (autoridad) y el cliente (validar y previsualizar jugadas).

export type Suit = 'S' | 'D' | 'H' | 'C';
export type CardSuit = Suit | 'X'; // X = comodín
export interface Card {
  id: string;
  suit: CardSuit;
  rank: number; // 0 comodín · 1-10 numerales · 11-13 figuras (J, Q, K)
  /** Mejora de forja (campaña): se suma al valor de la carta. */
  plus?: number;
}

/** Valor de una carta para daño y poderes. */
export const cardValue = (c: Card): number => c.rank + (c.plus ?? 0);

/** Modificadores de reglas que aportan herramientas y jefes en la campaña. Todos opcionales. */
export interface Mods {
  /** Daño extra por carta de ese palo. */
  suitFlat?: Partial<Record<Suit, number>>;
  /** Multiplicador con ventaja de material (2 por defecto). */
  advMult?: number;
  /** Multiplicador contra la torre del propio palo (0 por defecto). */
  ownMult?: number;
  /** Daño extra por carta según la formación. */
  soloFlat?: number;
  groupFlat?: number;
  runFlat?: number;
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
export const DIFFICULTY: Record<Difficulty, Config> = {
  obra: DEFAULT_CONFIG,
  brutal: { ...DEFAULT_CONFIG, maxIntegrity: 16, collapseLoss: 6 },
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

export type Formation = 'solo' | 'grupo' | 'escalera';

/** Devuelve el tipo de formación o null si las cartas no forman una jugada legal de ataque. */
export function classify(cards: Card[]): Formation | null {
  if (cards.length === 0) return null;
  if (cards.some((c) => c.suit === 'X')) return null;
  if (cards.length === 1) return 'solo';
  if (cards.every((c) => c.rank === cards[0].rank)) return 'grupo';
  if (cards.length >= 3) {
    const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
    if (ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1)) return 'escalera';
  }
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
  wallGain: number;
  repair: number;
  clean: boolean;
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
  const out: StrikeResult = { events: [], wallGain: 0, repair: 0, clean: false, dealt: {}, fallen: {} };
  let dmg = 0;
  let glass = 0;
  let concrete = 0;
  let brick = 0;
  let steel = false;
  const m = cfg.mods ?? {};
  const formation = classify(cards);
  const formFlat = (formation === 'solo' ? m.soloFlat : formation === 'grupo' ? m.groupFlat : formation === 'escalera' ? m.runFlat : 0) ?? 0;
  for (const c of cards) {
    const v = cardValue(c);
    const flat = c.suit === 'X' ? 0 : (m.suitFlat?.[c.suit] ?? 0) + formFlat;
    dmg += (v + flat) * multiplier(c.suit, target, m);
    if (c.suit === 'S') steel = true;
    if (c.suit === 'D') glass += v;
    if (c.suit === 'C') concrete += v;
    if (c.suit === 'H') brick += v;
  }
  applyDamage(towers[target], dmg, steel || !!m.alwaysPierce, false, cfg, out);
  const shards = Math.floor(glass / cfg.shardDiv);
  if (shards > 0) for (const s of SUITS) if (s !== target) applyDamage(towers[s], shards, false, true, cfg, out);
  const fallen = SUITS.reduce((a, s) => a + (out.fallen[s] ?? 0), 0);
  out.wallGain = Math.ceil(concrete / cfg.wallDiv) + fallen * (m.floorWall ?? 0);
  out.repair = Math.ceil(brick / cfg.repairDiv) + fallen * (m.floorHeal ?? 0) + (out.clean ? (m.cleanHeal ?? 0) : 0);
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

function refill(state: GameState, p: Player, events: GameEvent[]): void {
  const size = state.config.handSize[state.players.length];
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

  if (action.type === 'attack') {
    const cards = takeFromHand(p, action.cards);
    const formation = classify(cards);
    if (!formation) throw new RuleError('Formación inválida: juega 1 carta, un grupo del mismo número o una escalera de 3+.');
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
    state.discard.push(...cards);
    if (res.clean) skip = 'clean';
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
    if (card.suit !== 'X') throw new RuleError('Esa carta no es un comodín.');
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
  if (state.integrity > 0) refill(state, p, events);
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
