// CAMPAÑA — roguelike de construcción de mazo con progreso permanente. Sirve igual en solitario
// (corre en el cliente) y en sala online (corre en el servidor): es un reductor puro y determinista.
//
//   sobre inicial → [ obra → cobro + elegir carta (+ botín de jefe) → ferretería ] × 8
//
// Al terminar, ganes o pierdas, la campaña da renombre para las mejoras permanentes del gremio.
import { Card, Config, DEFAULT_CONFIG, FORMATIONS, Formation, GameEvent, GameState, Mods, SUITS, Suit, nextRandom, shuffle } from './engine';
import { BASE_POOL, SPECIAL } from './specials';

export const RELIC_SLOTS = 6;
export const MIN_DECK = 12;

// ───────────────────────── Herramientas ─────────────────────────

export interface Relic {
  id: string;
  name: string;
  desc: string;
  cost: number;
  apply(cfg: Config, m: Mods): void;
}

const suitFlat = (s: Suit, n: number) => (_: Config, m: Mods) => {
  m.suitFlat = { ...m.suitFlat, [s]: (m.suitFlat?.[s] ?? 0) + n };
};
const formFlat = (fs: Formation[], n: number) => (_: Config, m: Mods) => {
  m.formFlat = { ...m.formFlat };
  for (const f of fs) m.formFlat[f] = (m.formFlat[f] ?? 0) + n;
};
const formMult = (fs: Formation[], n: number) => (_: Config, m: Mods) => {
  m.formMult = { ...m.formMult };
  for (const f of fs) m.formMult[f] = (m.formMult[f] ?? 0) + n;
};
const eachPlayers = (c: Config, n: number) => {
  c.handSize = Object.fromEntries(Object.entries(c.handSize).map(([k, v]) => [k, Math.max(3, v + n)]));
};

export const RELICS: Relic[] = [
  { id: 'piqueta', name: 'Piqueta', desc: 'Cada ♠ hace +3 de daño.', cost: 8, apply: suitFlat('S', 3) },
  { id: 'cortavidrios', name: 'Diamante de corte', desc: 'Cada ♦ hace +3 de daño.', cost: 8, apply: suitFlat('D', 3) },
  { id: 'paleta', name: 'Paleta de albañil', desc: 'Cada ♥ hace +3 de daño.', cost: 8, apply: suitFlat('H', 3) },
  { id: 'maza', name: 'Maza de hierro', desc: 'Cada ♣ hace +3 de daño.', cost: 8, apply: suitFlat('C', 3) },
  { id: 'dinamita', name: 'Dinamita', desc: 'La ventaja de material multiplica ×3 en vez de ×2.', cost: 14, apply: (_, m) => void (m.advMult = (m.advMult ?? 2) + 1) },
  { id: 'acido', name: 'Ácido', desc: 'Tus cartas ya no son inmunes: ×1 contra la torre de su palo.', cost: 10, apply: (_, m) => void (m.ownMult = 1) },
  { id: 'taladro', name: 'Taladro', desc: 'Todos tus golpes perforan, lleven o no picas.', cost: 9, apply: (_, m) => void (m.alwaysPierce = true) },
  { id: 'andamio', name: 'Andamio', desc: '+1 carta en la mano.', cost: 12, apply: (c) => eachPlayers(c, 1) },
  { id: 'sacos', name: 'Sacos terreros', desc: 'El muro sube la mitad de tus ♣ y su tope crece +4.', cost: 8, apply: (c) => void ((c.wallDiv = 2), (c.wallCap += 4)) },
  { id: 'botiquin', name: 'Botiquín', desc: 'Reparas la mitad de tus ♥ en vez de un tercio.', cost: 8, apply: (c) => void (c.repairDiv = Math.min(c.repairDiv, 2)) },
  { id: 'metralla', name: 'Metralla', desc: 'Las esquirlas hacen la mitad de tus ♦.', cost: 9, apply: (c) => void (c.shardDiv = 2) },
  { id: 'casco', name: 'Casco', desc: 'Cada piso demolido: +1 de integridad.', cost: 9, apply: (_, m) => void (m.floorHeal = (m.floorHeal ?? 0) + 1) },
  { id: 'encofrado', name: 'Encofrado', desc: 'Cada piso demolido: +2 de muro.', cost: 7, apply: (_, m) => void (m.floorWall = (m.floorWall ?? 0) + 2) },
  { id: 'plomada', name: 'Plomada', desc: 'Cada golpe limpio: +4 de integridad.', cost: 6, apply: (_, m) => void (m.cleanHeal = (m.cleanHeal ?? 0) + 4) },
  { id: 'sordina', name: 'Sordina', desc: 'La amenaza de todas las torres baja 1.', cost: 12, apply: (c) => void [11, 12, 13].forEach((r) => (c.floorThreat[r] = Math.max(1, c.floorThreat[r] - 1))) },
  { id: 'puntales', name: 'Puntales', desc: 'Los colapsos quitan 3 menos.', cost: 6, apply: (c) => void (c.collapseLoss = Math.max(0, c.collapseLoss - 3)) },
  { id: 'gemelos', name: 'Cuadrilla doble', desc: 'En grupos, doble par, full y póker: +2 por carta.', cost: 7, apply: formFlat(['grupo', 'doblepar', 'full', 'poker'], 2) },
  { id: 'cinta', name: 'Cinta transportadora', desc: 'En las escaleras, cada carta hace +2.', cost: 7, apply: formFlat(['escalera', 'escaleracolor'], 2) },
  { id: 'cincel', name: 'Cincel', desc: 'Una carta jugada sola hace +5.', cost: 7, apply: formFlat(['solo'], 5) },
  { id: 'estandarte', name: 'Estandarte', desc: 'Color y escalera de color multiplican ×0,5 más.', cost: 8, apply: formMult(['color', 'escaleracolor'], 0.5) },
  { id: 'dados', name: 'Dados cargados', desc: 'Doble par y full multiplican ×0,5 más.', cost: 8, apply: formMult(['doblepar', 'full'], 0.5) },
  { id: 'hucha', name: 'Hucha', desc: '+3 de oro al terminar cada obra.', cost: 6, apply: () => {} },
];
export const RELIC: Record<string, Relic> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

// ───────────────────────── Jefes de obra ─────────────────────────

export interface Boss {
  id: string;
  /** El personaje. */
  who: string;
  /** Su maldición. */
  name: string;
  desc: string;
  apply(cfg: Config, m: Mods): void;
}
export const BOSSES: Boss[] = [
  { id: 'doble', who: 'La Sirena', name: 'Doble sirena', desc: 'La sirena voltea 2 cartas cada turno.', apply: (c) => void (c.sirenCount = 2) },
  { id: 'escasez', who: 'El Usurero', name: 'Escasez', desc: 'Jugáis con 1 carta menos en la mano.', apply: (c) => eachPlayers(c, -1) },
  { id: 'sequia', who: 'El Matasanos', name: 'Sin botiquín', desc: 'Los ♥ no reparan el búnker.', apply: (c) => void (c.repairDiv = 9999) },
  { id: 'intemperie', who: 'La Ventisca', name: 'Intemperie', desc: 'El muro no puede pasar de 2.', apply: (c) => void (c.wallCap = 2) },
  { id: 'blindaje', who: 'El Coloso', name: 'Blindaje', desc: 'Todos los pisos resisten un 25 % más.', apply: (c) => void [11, 12, 13].forEach((r) => (c.floorHp[r] = Math.round(c.floorHp[r] * 1.25))) },
  { id: 'furia', who: 'La Furia', name: 'Furia', desc: 'La amenaza de todas las torres sube 1.', apply: (c) => void [11, 12, 13].forEach((r) => (c.floorThreat[r] += 1)) },
  { id: 'inestable', who: 'El Topo', name: 'Suelo inestable', desc: 'Los colapsos quitan el doble.', apply: (c) => void (c.collapseLoss *= 2) },
];
export const BOSS: Record<string, Boss> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

// ───────────────────────── Obras ─────────────────────────

export interface Stage {
  name: string;
  floors: number[];
  hp: number;
  threat: number;
  boss: boolean;
}
export const STAGES: Stage[] = [
  { name: 'Caseta de obra', floors: [11], hp: 1, threat: -1, boss: false },
  { name: 'Bloque de pisos', floors: [11, 12], hp: 1, threat: -1, boss: false },
  { name: 'Torre del capataz', floors: [11, 12, 13], hp: 1, threat: 0, boss: true },
  { name: 'Polígono', floors: [11, 12, 13], hp: 1.3, threat: 0, boss: false },
  { name: 'Ciudadela', floors: [11, 12, 13], hp: 1.6, threat: 0, boss: true },
  { name: 'Rascacielos', floors: [11, 12, 13], hp: 2, threat: 1, boss: false },
  { name: 'Fortaleza', floors: [11, 12, 13], hp: 2.45, threat: 1, boss: true },
  { name: 'La Torre Madre', floors: [11, 12, 13], hp: 3, threat: 1, boss: true },
];

// ───────────────────────── Gremio (progreso permanente) ─────────────────────────

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  costs: number[];
}
export const UPGRADES: Upgrade[] = [
  { id: 'cimientos', name: 'Cimientos', desc: '+2 de integridad máxima por nivel.', costs: [3, 5, 8, 12, 17] },
  { id: 'caja', name: 'Caja chica', desc: '+2 de oro inicial por nivel.', costs: [2, 4, 7, 11, 16] },
  { id: 'seguro', name: 'Seguro de obra', desc: 'Los colapsos quitan 1 menos por nivel.', costs: [4, 8, 14] },
  { id: 'interes', name: 'Prestamista', desc: '+1 al tope de interés por nivel.', costs: [3, 6, 10] },
  { id: 'tienda', name: 'Proveedor', desc: '+1 herramienta en oferta por nivel.', costs: [8, 15] },
  { id: 'manos', name: 'Manos expertas', desc: '+1 carta en la mano.', costs: [18] },
];

export interface Meta {
  renown: number;
  up: Record<string, number>;
  runs: number;
  wins: number;
  best: number;
  ascMax: number;
  /** Logros conseguidos. */
  ach: Record<string, boolean>;
  /** Contadores acumulados entre campañas. */
  stats: { floors: number; cleans: number; maxHit: number; maxGold: number; reach: number; winAsc: number; intact: number };
  /** Colección: lo que alguna vez pasó por tus manos. */
  seen: { relics: string[]; specials: string[]; bosses: string[]; forms: string[] };
}
export const newMeta = (): Meta => ({
  renown: 0,
  up: {},
  runs: 0,
  wins: 0,
  best: 0,
  ascMax: 0,
  ach: {},
  stats: { floors: 0, cleans: 0, maxHit: 0, maxGold: 0, reach: 0, winAsc: -1, intact: 0 },
  seen: { relics: [], specials: [], bosses: [], forms: [] },
});

/** Niveles válidos de mejora (lo que llega de un cliente se recorta a su máximo). */
export function cleanUp(up: unknown): Record<string, number> {
  const src = (up && typeof up === 'object' ? up : {}) as Record<string, unknown>;
  return Object.fromEntries(UPGRADES.map((u) => [u.id, Math.max(0, Math.min(u.costs.length, Math.floor(Number(src[u.id]) || 0)))]));
}

export function buyUpgrade(meta: Meta, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  const level = meta.up[id] ?? 0;
  const cost = u.costs[level];
  if (cost === undefined || meta.renown < cost) return false;
  meta.renown -= cost;
  meta.up[id] = level + 1;
  return true;
}

// ───────────────────────── Campaña ─────────────────────────

export type OfferKind = 'relic' | 'sobre' | 'forja' | 'plano' | 'reparacion' | 'comodin';
export interface Offer {
  kind: OfferKind;
  cost: number;
  sold?: boolean;
  /** relic: herramienta */
  id?: string;
  /** forja: cartas candidatas */
  cards?: string[];
  /** plano: formación que sube de nivel */
  form?: Formation;
}

export type RunAction =
  | { t: 'begin' }
  /** Recompensa: llevarse (o no) la carta incógnita. */
  | { t: 'pick'; take: boolean }
  | { t: 'pickRelic'; id: string | null }
  | { t: 'buy'; i: number; choice?: string }
  | { t: 'remove'; card: string }
  | { t: 'reroll' }
  | { t: 'next' };

/** Con qué se monta una campaña: lo aporta el jugador (o el anfitrión de la sala). */
export interface RunOpts {
  up?: Record<string, number>;
  ascension?: number;
  deck?: string;
  /** Cartas especiales que entran en el sorteo (las legendarias desbloqueadas). */
  pool?: string[];
}

// ───────────────────────── Barajas iniciales ─────────────────────────

export interface DeckDef {
  id: string;
  name: string;
  desc: string;
  /** Logro que la desbloquea (null: disponible desde el principio). */
  unlock: string | null;
  build(run: Run): void;
}
const copyOf = (c: Card): Card => ({ ...c, id: `${c.id}b` });
export const DECKS: DeckDef[] = [
  { id: 'obra', name: 'Baraja de obra', desc: 'La de siempre: 40 cartas, 2 comodines y un sobre de 3 especiales.', unlock: null, build: () => {} },
  {
    id: 'acero',
    name: 'Baraja negra',
    desc: 'Solo ♠ y ♣, por duplicado. Empiezas con Ácido (nada te es inmune) y +6 de oro.',
    unlock: 'capataz',
    build: (run) => {
      const black = run.deck.filter((c) => c.suit === 'S' || c.suit === 'C');
      run.deck = [...black, ...black.map(copyOf), ...run.deck.filter((c) => c.suit === 'X')];
      run.relics.push('acido');
      run.gold += 6;
    },
  },
  {
    id: 'prestamista',
    name: 'Baraja del prestamista',
    desc: '+12 de oro inicial y +3 al tope de interés, pero el búnker tiene 4 menos.',
    unlock: 'media',
    build: (run) => {
      run.gold += 12;
      run.up.interes = (run.up.interes ?? 0) + 3;
      run.maxIntegrity -= 4;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'ases',
    name: 'Baraja de ases',
    desc: 'Ocho ases y ningún 2 ni 3. Menos cartas, más pegada.',
    unlock: 'madre',
    build: (run) => {
      const aces = run.deck.filter((c) => c.rank === 1);
      run.deck = [...run.deck.filter((c) => c.rank !== 2 && c.rank !== 3), ...aces.map(copyOf)];
    },
  },
  {
    id: 'corta',
    name: 'Baraja corta',
    desc: 'Sin cartas del 2 al 5. Golpes gordos, pero la cantera se agota enseguida y el búnker tiene 4 menos.',
    unlock: 'golpe100',
    build: (run) => {
      run.deck = run.deck.filter((c) => c.rank < 2 || c.rank > 5);
      run.maxIntegrity -= 4;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'caos',
    name: 'Baraja del caos',
    desc: 'Un solo comodín, pero el sobre inicial trae 6 cartas especiales y juegas con 1 carta más en la mano.',
    unlock: 'coleccion',
    build: (run) => {
      run.deck = run.deck.filter((c) => c.id !== 'X2');
      run.up.manos = (run.up.manos ?? 0) + 1;
      for (const id of pick(run, run.pool, 3)) {
        run.pack.push(id);
        addSpecial(run, id);
      }
    },
  },
];
export const DECK: Record<string, DeckDef> = Object.fromEntries(DECKS.map((d) => [d.id, d]));

export interface Run {
  id: number;
  rng: number;
  ascension: number;
  deckId: string;
  /** Cartas especiales que pueden tocar en esta campaña. */
  pool: string[];
  /** Jefes derrotados en esta campaña. */
  beaten: string[];
  /** Obras terminadas con el búnker entero. */
  intact: number;
  /** Niveles de mejora del gremio con los que se juega esta campaña. */
  up: Record<string, number>;
  stage: number;
  phase: 'pack' | 'battle' | 'reward' | 'shop' | 'won' | 'lost';
  gold: number;
  integrity: number;
  maxIntegrity: number;
  relics: string[];
  deck: Card[];
  levels: Record<Formation, number>;
  boss: string | null;
  nextBoss: string | null;
  /** Sobre inicial: ids de las cartas especiales que tocaron. */
  pack: string[];
  /** Cobro de la última obra. */
  pay: [string, number][];
  picked: boolean;
  relicPicks: string[];
  relicPicked: boolean;
  shop: Offer[];
  rerolls: number;
  removals: number;
  serial: number;
  cleans: number;
  stats: { floors: number; cleans: number; turns: number; gold: number };
}

const lvl = (run: Run, id: string) => run.up[id] ?? 0;
function pick<T>(run: Run, pool: T[], n: number): T[] {
  const copy = [...pool];
  shuffle(copy, run);
  return copy.slice(0, n);
}
const roll = (run: Run, n: number) => Math.floor(nextRandom(run) * n);
const pickBoss = (run: Run, stage: number): string | null => (STAGES[stage - 1]?.boss ? pick(run, BOSSES.filter((b) => b.id !== run.boss), 1)[0].id : null);

/** Añade una carta especial al mazo de la campaña. */
export function addSpecial(run: Run, spId: string): Card {
  const card: Card = { id: `sp-${spId}-${++run.serial}`, suit: 'X', rank: 0, sp: spId };
  run.deck.push(card);
  return card;
}

/** Una carta especial al azar del sorteo de la campaña. */
export function drawSpecial(run: Run): Card {
  return addSpecial(run, pick(run, run.pool, 1)[0]);
}

export function newRun(opts: RunOpts, seed: number): Run {
  const up = opts.up ?? {};
  const ascension = opts.ascension ?? 0;
  const pool = [...new Set([...BASE_POOL, ...(Array.isArray(opts.pool) ? opts.pool.filter((id) => typeof id === 'string' && SPECIAL[id]) : [])])];
  const deck: Card[] = [];
  for (const s of SUITS) for (let r = 1; r <= 10; r++) deck.push({ id: `${s}${r}`, suit: s, rank: r });
  deck.push({ id: 'X1', suit: 'X', rank: 0 }, { id: 'X2', suit: 'X', rank: 0 });
  const levels = cleanUp(up);
  const maxIntegrity = 20 + 2 * levels.cimientos;
  const run: Run = {
    id: seed | 0,
    rng: seed | 0,
    ascension: Math.max(0, Math.min(20, Math.floor(ascension) || 0)),
    deckId: DECK[opts.deck ?? ''] ? opts.deck! : 'obra',
    pool,
    beaten: [],
    intact: 0,
    up: levels,
    stage: 1,
    phase: 'pack',
    gold: 3 + 2 * levels.caja,
    integrity: maxIntegrity,
    maxIntegrity,
    relics: [],
    deck,
    levels: Object.fromEntries(FORMATIONS.map((f) => [f, 0])) as Record<Formation, number>,
    boss: null,
    nextBoss: null,
    pack: [],
    pay: [],
    picked: true,
    relicPicks: [],
    relicPicked: true,
    shop: [],
    rerolls: 0,
    removals: 0,
    serial: 2,
    cleans: 0,
    stats: { floors: 0, cleans: 0, turns: 0, gold: 0 },
  };
  run.pack = pick(run, run.pool, 3);
  for (const id of run.pack) addSpecial(run, id);
  DECK[run.deckId].build(run);
  run.boss = pickBoss(run, 1);
  return run;
}

/** Reglas efectivas de la obra actual: base + ascenso + gremio + planos + herramientas + jefe. */
export function stageConfig(run: Run, players = 1): Config {
  const st = STAGES[run.stage - 1];
  const cfg: Config = structuredClone(DEFAULT_CONFIG);
  const mods: Mods = {};
  cfg.maxIntegrity = run.maxIntegrity;
  cfg.handSize = { [players]: 7 + lvl(run, 'manos') };
  cfg.collapseLoss = Math.max(1, 5 - lvl(run, 'seguro'));
  const scale = st.hp * (1 + 0.15 * run.ascension);
  for (const r of [11, 12, 13]) {
    cfg.floorHp[r] = Math.round(DEFAULT_CONFIG.floorHp[r] * scale);
    cfg.floorThreat[r] = Math.max(1, DEFAULT_CONFIG.floorThreat[r] + st.threat + (run.ascension >= 3 ? 1 : 0));
  }
  mods.formFlat = Object.fromEntries(FORMATIONS.map((f) => [f, run.levels[f] * (f === 'solo' ? 3 : 2)]));
  for (const id of run.relics) RELIC[id]?.apply(cfg, mods);
  if (run.boss) BOSS[run.boss]?.apply(cfg, mods);
  cfg.mods = mods;
  return cfg;
}

/** Prepara la partida de la obra actual con el mazo de la campaña. */
export function startStage(run: Run, players: { id: string; name: string }[]): GameState {
  const config = stageConfig(run, players.length);
  const deck = run.deck.map((c) => ({ ...c }));
  shuffle(deck, run);
  const size = config.handSize[players.length];
  const floors = STAGES[run.stage - 1].floors;
  run.cleans = 0;
  return {
    config,
    rng: (run.rng ^ 0x5bd1e995) | 0,
    players: players.map((p) => ({ id: p.id, name: p.name, hand: deck.splice(0, size) })),
    deck,
    discard: [],
    towers: Object.fromEntries(SUITS.map((s) => [s, { suit: s, floors: [...floors], damage: 0, disarmed: false }])) as GameState['towers'],
    integrity: Math.min(run.integrity, config.maxIntegrity),
    wall: 0,
    turn: 0,
    turnCount: 0,
    collapses: 0,
    phase: 'playing',
    lastSiren: null,
  };
}

/** Anota lo que la campaña necesita de cada jugada: golpes limpios y oro de cartas especiales. */
export function trackEvents(run: Run, events: GameEvent[]): void {
  for (const ev of events) {
    if (ev.e === 'floorDown' && ev.clean) run.cleans++;
    if (ev.e === 'gold') {
      run.gold += ev.amount;
      run.stats.gold += ev.amount;
    }
  }
}

export const interestCap = (run: Run) => 3 + lvl(run, 'interes');
export const removeCost = (run: Run) => 3 + 2 * run.removals;
export const rerollCost = (run: Run) => 2 + run.rerolls;

function generateShop(run: Run): Offer[] {
  const vary = (base: number) => Math.max(2, base + roll(run, 3) - 1);
  const relics = pick(run, RELICS.filter((r) => !run.relics.includes(r.id)), 2 + lvl(run, 'tienda'));
  const service = pick<OfferKind>(run, ['forja', 'plano', 'reparacion', 'comodin'], 1)[0];
  const offers: Offer[] = [...relics.map((r): Offer => ({ kind: 'relic', id: r.id, cost: vary(r.cost) })), { kind: 'sobre', cost: vary(5) }];
  if (service === 'forja') offers.push({ kind: 'forja', cost: vary(4), cards: pick(run, run.deck.filter((c) => c.suit !== 'X'), 3).map((c) => c.id) });
  else if (service === 'comodin') offers.push({ kind: 'comodin', cost: vary(6) });
  else if (service === 'plano') {
    const form = pick(run, FORMATIONS, 1)[0];
    offers.push({ kind: 'plano', cost: vary(4 + 2 * run.levels[form]), form });
  } else offers.push({ kind: 'reparacion', cost: vary(5) });
  return offers;
}

function openShop(run: Run): void {
  run.phase = 'shop';
  run.rerolls = 0;
  run.nextBoss = pickBoss(run, run.stage + 1);
  run.shop = generateShop(run);
}

/** Cierra la batalla: si se ganó, cobra y abre la recompensa; si no, la campaña termina. */
export function finishBattle(run: Run, state: GameState): void {
  if (run.phase !== 'battle' || state.phase === 'playing') return;
  if (state.phase === 'lost') {
    run.phase = 'lost';
    return;
  }
  const st = STAGES[run.stage - 1];
  const lines: [string, number][] = [
    ['Obra demolida', 4 + run.stage],
    ['Golpes limpios', Math.min(5, run.cleans)],
    ['Búnker en pie', Math.floor(state.integrity / 5)],
    ['Interés (1 por cada 5 de oro)', Math.min(interestCap(run), Math.floor(run.gold / 5))],
  ];
  if (run.relics.includes('hucha')) lines.push(['Hucha', 3]);
  run.pay = lines.filter(([, n]) => n > 0);
  const total = run.pay.reduce((a, [, n]) => a + n, 0);
  run.gold += total;
  run.stats.gold += total;
  run.stats.cleans += run.cleans;
  run.stats.turns += state.turnCount;
  run.stats.floors += st.floors.length * 4;
  if (state.integrity >= run.maxIntegrity) run.intact++;
  if (run.boss) run.beaten.push(run.boss);
  run.integrity = Math.min(run.maxIntegrity, state.integrity + 4);
  if (run.stage >= STAGES.length) {
    run.phase = 'won';
    return;
  }
  run.phase = 'reward';
  run.picked = false;
  run.relicPicks = st.boss ? pick(run, RELICS.filter((r) => !run.relics.includes(r.id)), 2).map((r) => r.id) : [];
  run.relicPicked = run.relicPicks.length === 0;
}

/** Aplica una decisión de campaña. Devuelve un mensaje de error legible, o null si se aplicó. */
export function runAction(run: Run, a: RunAction): string | null {
  switch (a.t) {
    case 'begin':
      if (run.phase !== 'pack') return 'La campaña ya empezó.';
      run.phase = 'battle';
      return null;
    case 'pick':
      if (run.phase !== 'reward' || run.picked) return 'No hay carta que elegir.';
      if (a.take) drawSpecial(run);
      run.picked = true;
      if (run.relicPicked) openShop(run);
      return null;
    case 'pickRelic':
      if (run.phase !== 'reward' || run.relicPicked) return 'No hay botín que elegir.';
      if (a.id !== null) {
        if (!run.relicPicks.includes(a.id)) return 'Esa herramienta no está en el botín.';
        if (run.relics.length >= RELIC_SLOTS) return `Solo caben ${RELIC_SLOTS} herramientas.`;
        run.relics.push(a.id);
      }
      run.relicPicked = true;
      if (run.picked) openShop(run);
      return null;
    case 'buy': {
      const o = run.shop[a.i];
      if (run.phase !== 'shop' || !o || o.sold) return 'Esa oferta ya no está.';
      if (run.gold < o.cost) return 'No te alcanza el oro.';
      if (o.kind === 'relic') {
        if (run.relics.length >= RELIC_SLOTS) return `Solo caben ${RELIC_SLOTS} herramientas.`;
        run.relics.push(o.id!);
      } else if (o.kind === 'sobre') drawSpecial(run);
      else if (o.kind === 'forja') {
        const card = run.deck.find((c) => c.id === a.choice && o.cards!.includes(c.id));
        if (!card) return 'Elige una de las tres cartas.';
        card.plus = (card.plus ?? 0) + 3;
      } else if (o.kind === 'plano') run.levels[o.form!]++;
      else if (o.kind === 'reparacion') {
        if (run.integrity >= run.maxIntegrity) return 'El búnker ya está entero.';
        run.integrity = Math.min(run.maxIntegrity, run.integrity + 6);
      } else run.deck.push({ id: `X${++run.serial}`, suit: 'X', rank: 0 });
      run.gold -= o.cost;
      o.sold = true;
      return null;
    }
    case 'remove': {
      if (run.phase !== 'shop') return 'Solo se retiran cartas en la ferretería.';
      if (run.gold < removeCost(run)) return 'No te alcanza el oro.';
      if (run.deck.length <= MIN_DECK) return `El mazo no puede bajar de ${MIN_DECK} cartas.`;
      const i = run.deck.findIndex((c) => c.id === a.card);
      if (i < 0) return 'Esa carta no está en el mazo.';
      run.deck.splice(i, 1);
      run.gold -= removeCost(run);
      run.removals++;
      return null;
    }
    case 'reroll':
      if (run.phase !== 'shop') return 'Solo en la ferretería.';
      if (run.gold < rerollCost(run)) return 'No te alcanza el oro.';
      run.gold -= rerollCost(run);
      run.rerolls++;
      run.shop = generateShop(run);
      return null;
    case 'next':
      if (run.phase !== 'shop') return 'Aún no puedes pasar a la siguiente obra.';
      run.stage++;
      run.boss = run.nextBoss;
      run.nextBoss = null;
      run.shop = [];
      run.phase = 'battle';
      return null;
  }
}

export const stagesCleared = (run: Run) => (run.phase === 'won' ? STAGES.length : run.stage - 1);

export function renownFor(run: Run): number {
  const base = stagesCleared(run) + (run.phase === 'won' ? 5 : 0);
  return Math.max(1, Math.ceil(base * (1 + 0.25 * run.ascension)));
}

/** Abona al gremio el renombre de una campaña terminada. */
export function settle(meta: Meta, run: Run): number {
  const gained = renownFor(run);
  meta.renown += gained;
  meta.runs++;
  meta.best = Math.max(meta.best, stagesCleared(run));
  if (run.phase === 'won') {
    meta.wins++;
    meta.ascMax = Math.max(meta.ascMax, run.ascension + 1);
  }
  return gained;
}
