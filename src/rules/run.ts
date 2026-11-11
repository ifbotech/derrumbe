// CAMPAÑA — modo roguelike con progreso permanente.
// Una campaña son 8 obras cada vez más duras. Entre obra y obra se cobra oro y se compra en la
// ferretería: herramientas que cambian las reglas, forja de cartas, planos de formación…
// Al terminar (ganes o pierdas) se gana renombre, que se gasta en mejoras permanentes del gremio.
// Todo es puro y determinista: lo juega un test y lo balancea scripts/simulate-run.ts.
import { Card, Config, DEFAULT_CONFIG, Formation, GameState, Mods, SUITS, Suit, nextRandom, shuffle } from './engine';

export const RUN_PLAYER = 'tu';
export const RELIC_SLOTS = 6;

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

export const RELICS: Relic[] = [
  { id: 'piqueta', name: 'Piqueta', desc: 'Cada ♠ hace +3 de daño.', cost: 8, apply: suitFlat('S', 3) },
  { id: 'cortavidrios', name: 'Diamante de corte', desc: 'Cada ♦ hace +3 de daño.', cost: 8, apply: suitFlat('D', 3) },
  { id: 'paleta', name: 'Paleta de albañil', desc: 'Cada ♥ hace +3 de daño.', cost: 8, apply: suitFlat('H', 3) },
  { id: 'maza', name: 'Maza de hierro', desc: 'Cada ♣ hace +3 de daño.', cost: 8, apply: suitFlat('C', 3) },
  { id: 'dinamita', name: 'Dinamita', desc: 'La ventaja de material multiplica ×3 en vez de ×2.', cost: 14, apply: (_, m) => void (m.advMult = (m.advMult ?? 2) + 1) },
  { id: 'acido', name: 'Ácido', desc: 'Tus cartas ya no son inmunes: ×1 contra la torre de su propio palo.', cost: 10, apply: (_, m) => void (m.ownMult = 1) },
  { id: 'taladro', name: 'Taladro neumático', desc: 'Todos tus golpes perforan, lleven o no picas.', cost: 9, apply: (_, m) => void (m.alwaysPierce = true) },
  { id: 'andamio', name: 'Andamio', desc: '+1 carta en la mano.', cost: 12, apply: (c) => void (c.handSize = { ...c.handSize, 1: c.handSize[1] + 1 }) },
  { id: 'sacos', name: 'Sacos terreros', desc: 'El muro sube la mitad de tus ♣ (no un tercio) y su tope crece +4.', cost: 8, apply: (c) => void ((c.wallDiv = 2), (c.wallCap += 4)) },
  { id: 'botiquin', name: 'Botiquín', desc: 'Reparas la mitad de tus ♥ en vez de un tercio.', cost: 8, apply: (c) => void (c.repairDiv = Math.min(c.repairDiv, 2)) },
  { id: 'metralla', name: 'Metralla', desc: 'Las esquirlas hacen la mitad de tus ♦ en vez de un tercio.', cost: 9, apply: (c) => void (c.shardDiv = 2) },
  { id: 'casco', name: 'Casco', desc: 'Cada piso demolido: +1 de integridad.', cost: 9, apply: (_, m) => void (m.floorHeal = (m.floorHeal ?? 0) + 1) },
  { id: 'encofrado', name: 'Encofrado', desc: 'Cada piso demolido: +2 de muro.', cost: 7, apply: (_, m) => void (m.floorWall = (m.floorWall ?? 0) + 2) },
  { id: 'plomada', name: 'Plomada', desc: 'Cada golpe limpio: +4 de integridad.', cost: 6, apply: (_, m) => void (m.cleanHeal = (m.cleanHeal ?? 0) + 4) },
  { id: 'sordina', name: 'Sordina', desc: 'La amenaza de todas las torres baja 1.', cost: 12, apply: (c) => void [11, 12, 13].forEach((r) => (c.floorThreat[r] = Math.max(1, c.floorThreat[r] - 1))) },
  { id: 'puntales', name: 'Puntales', desc: 'Los colapsos quitan 3 menos.', cost: 6, apply: (c) => void (c.collapseLoss = Math.max(0, c.collapseLoss - 3)) },
  { id: 'gemelos', name: 'Cuadrilla doble', desc: 'En los grupos, cada carta hace +2.', cost: 7, apply: (_, m) => void (m.groupFlat = (m.groupFlat ?? 0) + 2) },
  { id: 'cinta', name: 'Cinta transportadora', desc: 'En las escaleras, cada carta hace +2.', cost: 7, apply: (_, m) => void (m.runFlat = (m.runFlat ?? 0) + 2) },
  { id: 'cincel', name: 'Cincel', desc: 'Una carta jugada sola hace +5.', cost: 7, apply: (_, m) => void (m.soloFlat = (m.soloFlat ?? 0) + 5) },
  { id: 'hucha', name: 'Hucha', desc: '+3 de oro al terminar cada obra.', cost: 6, apply: () => {} },
];
export const RELIC: Record<string, Relic> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

// ───────────────────────── Jefes de obra ─────────────────────────

export interface Boss {
  id: string;
  name: string;
  desc: string;
  apply(cfg: Config, m: Mods): void;
}
export const BOSSES: Boss[] = [
  { id: 'doble', name: 'Doble sirena', desc: 'La sirena voltea 2 cartas cada turno.', apply: (c) => void (c.sirenCount = 2) },
  { id: 'escasez', name: 'Escasez', desc: 'Juegas con 1 carta menos en la mano.', apply: (c) => void (c.handSize = { ...c.handSize, 1: c.handSize[1] - 1 }) },
  { id: 'sequia', name: 'Sin botiquín', desc: 'Los ♥ no reparan el búnker.', apply: (c) => void (c.repairDiv = 9999) },
  { id: 'intemperie', name: 'Intemperie', desc: 'El muro no puede pasar de 2.', apply: (c) => void (c.wallCap = 2) },
  { id: 'blindaje', name: 'Blindaje', desc: 'Todos los pisos resisten un 25 % más.', apply: (c) => void [11, 12, 13].forEach((r) => (c.floorHp[r] = Math.round(c.floorHp[r] * 1.25))) },
  { id: 'furia', name: 'Furia', desc: 'La amenaza de todas las torres sube 1.', apply: (c) => void [11, 12, 13].forEach((r) => (c.floorThreat[r] += 1)) },
  { id: 'inestable', name: 'Suelo inestable', desc: 'Los colapsos quitan el doble.', apply: (c) => void (c.collapseLoss *= 2) },
];
export const BOSS: Record<string, Boss> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

// ───────────────────────── Obras ─────────────────────────

export interface Stage {
  name: string;
  floors: number[];
  hp: number; // multiplicador de resistencia
  threat: number; // se suma a la amenaza base
  boss: boolean;
}
export const STAGES: Stage[] = [
  { name: 'Caseta de obra', floors: [11], hp: 1, threat: -1, boss: false },
  { name: 'Bloque de pisos', floors: [11, 12], hp: 1, threat: -1, boss: false },
  { name: 'Torre del capataz', floors: [11, 12, 13], hp: 0.85, threat: 0, boss: true },
  { name: 'Polígono', floors: [11, 12, 13], hp: 1.3, threat: 0, boss: false },
  { name: 'Ciudadela', floors: [11, 12, 13], hp: 1.6, threat: 0, boss: true },
  { name: 'Rascacielos', floors: [11, 12, 13], hp: 2, threat: 1, boss: false },
  { name: 'Fortaleza', floors: [11, 12, 13], hp: 2.5, threat: 1, boss: true },
  { name: 'La Torre Madre', floors: [11, 12, 13], hp: 3.1, threat: 2, boss: true },
];

// ───────────────────────── Gremio (progreso permanente) ─────────────────────────

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  costs: number[]; // coste de cada nivel
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
  /** Ascenso más alto desbloqueado: cada victoria abre el siguiente. */
  ascMax: number;
}
export const newMeta = (): Meta => ({ renown: 0, up: {}, runs: 0, wins: 0, best: 0, ascMax: 0 });
const lvl = (meta: Meta, id: string) => meta.up[id] ?? 0;

export function buyUpgrade(meta: Meta, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  const cost = u.costs[lvl(meta, id)];
  if (cost === undefined || meta.renown < cost) return false;
  meta.renown -= cost;
  meta.up[id] = lvl(meta, id) + 1;
  return true;
}

// ───────────────────────── Campaña ─────────────────────────

export type OfferKind = 'relic' | 'forja' | 'plano' | 'reparacion' | 'comodin';
export interface Offer {
  kind: OfferKind;
  cost: number;
  sold?: boolean;
  /** relic: id de la herramienta */
  id?: string;
  /** forja: cartas candidatas (se elige una) */
  cards?: string[];
  /** plano: formación que sube de nivel */
  form?: Formation;
}

export interface Run {
  rng: number;
  ascension: number;
  stage: number; // 1..8
  phase: 'battle' | 'shop' | 'won' | 'lost';
  gold: number;
  integrity: number;
  maxIntegrity: number;
  relics: string[];
  deck: Card[];
  levels: Record<Formation, number>;
  boss: string | null;
  nextBoss: string | null;
  shop: Offer[];
  rerolls: number;
  jokers: number;
  stats: { floors: number; cleans: number; turns: number; gold: number };
}

const rand = (run: Run) => nextRandom(run);
function pick<T>(run: Run, pool: T[], n: number): T[] {
  const copy = [...pool];
  shuffle(copy, run);
  return copy.slice(0, n);
}
const pickBoss = (run: Run, stage: number): string | null => (STAGES[stage - 1]?.boss ? pick(run, BOSSES.filter((b) => b.id !== run.boss), 1)[0].id : null);

export function newRun(meta: Meta, seed: number, ascension = 0): Run {
  const deck: Card[] = [];
  for (const s of SUITS) for (let r = 1; r <= 10; r++) deck.push({ id: `${s}${r}`, suit: s, rank: r });
  deck.push({ id: 'X1', suit: 'X', rank: 0 }, { id: 'X2', suit: 'X', rank: 0 });
  const maxIntegrity = 20 + 2 * lvl(meta, 'cimientos');
  const run: Run = {
    rng: seed | 0,
    ascension: Math.min(ascension, meta.ascMax),
    stage: 1,
    phase: 'battle',
    gold: 3 + 2 * lvl(meta, 'caja'),
    integrity: maxIntegrity,
    maxIntegrity,
    relics: [],
    deck,
    levels: { solo: 0, grupo: 0, escalera: 0 },
    boss: null,
    nextBoss: null,
    shop: [],
    rerolls: 0,
    jokers: 2,
    stats: { floors: 0, cleans: 0, turns: 0, gold: 0 },
  };
  run.boss = pickBoss(run, 1);
  return run;
}

/** Reglas efectivas de la obra actual: base + ascenso + gremio + planos + herramientas + jefe. */
export function stageConfig(run: Run, meta: Meta): Config {
  const st = STAGES[run.stage - 1];
  const cfg: Config = structuredClone(DEFAULT_CONFIG);
  const mods: Mods = {};
  cfg.maxIntegrity = run.maxIntegrity;
  cfg.handSize = { 1: 7 + lvl(meta, 'manos') };
  cfg.collapseLoss = Math.max(1, 5 - lvl(meta, 'seguro'));
  const scale = st.hp * (1 + 0.15 * run.ascension);
  for (const r of [11, 12, 13]) {
    cfg.floorHp[r] = Math.round(DEFAULT_CONFIG.floorHp[r] * scale);
    cfg.floorThreat[r] = Math.max(1, DEFAULT_CONFIG.floorThreat[r] + st.threat + (run.ascension >= 3 ? 1 : 0));
  }
  mods.soloFlat = run.levels.solo * 3;
  mods.groupFlat = run.levels.grupo * 2;
  mods.runFlat = run.levels.escalera * 2;
  for (const id of run.relics) RELIC[id]?.apply(cfg, mods);
  if (run.boss) BOSS[run.boss]?.apply(cfg, mods);
  cfg.handSize[1] = Math.max(3, cfg.handSize[1]);
  cfg.mods = mods;
  return cfg;
}

/** Prepara la partida de la obra actual con el mazo de la campaña. */
export function startStage(run: Run, meta: Meta): GameState {
  const config = stageConfig(run, meta);
  const deck = run.deck.map((c) => ({ ...c }));
  shuffle(deck, run);
  const hand = deck.splice(0, config.handSize[1]);
  const floors = STAGES[run.stage - 1].floors;
  return {
    config,
    rng: (run.rng ^ 0x5bd1e995) | 0,
    players: [{ id: RUN_PLAYER, name: 'TÚ', hand }],
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

export const interestCap = (meta: Meta) => 3 + lvl(meta, 'interes');

/** Paga de la obra recién demolida, línea a línea. */
export function stageReward(run: Run, state: GameState, cleans: number, meta: Meta): [string, number][] {
  const lines: [string, number][] = [
    ['Obra demolida', 4 + run.stage],
    ['Golpes limpios', Math.min(5, cleans)],
    ['Búnker en pie', Math.floor(state.integrity / 5)],
    ['Interés (1 por cada 5 de oro)', Math.min(interestCap(meta), Math.floor(run.gold / 5))],
  ];
  if (run.relics.includes('hucha')) lines.push(['Hucha', 3]);
  return lines.filter(([, n]) => n > 0);
}

export function generateShop(run: Run, meta: Meta): Offer[] {
  const relics = pick(run, RELICS.filter((r) => !run.relics.includes(r.id)), 3 + lvl(meta, 'tienda'));
  const form = pick<Formation>(run, ['solo', 'grupo', 'escalera'], 1)[0];
  const cards = pick(run, run.deck.filter((c) => c.suit !== 'X'), 3).map((c) => c.id);
  return [
    ...relics.map((r): Offer => ({ kind: 'relic', id: r.id, cost: r.cost })),
    { kind: 'forja', cost: 4, cards },
    { kind: 'plano', cost: 4 + 2 * run.levels[form], form },
    { kind: 'reparacion', cost: 5 },
    { kind: 'comodin', cost: 6 },
  ];
}

/** Cierra la obra ganada: cobra, cura un poco y abre la ferretería (o corona la campaña). */
export function completeStage(run: Run, state: GameState, cleans: number, meta: Meta): [string, number][] {
  const lines = stageReward(run, state, cleans, meta);
  const total = lines.reduce((a, [, n]) => a + n, 0);
  run.gold += total;
  run.stats.gold += total;
  run.stats.cleans += cleans;
  run.stats.turns += state.turnCount;
  run.stats.floors += STAGES[run.stage - 1].floors.length * 4;
  run.integrity = Math.min(run.maxIntegrity, state.integrity + 4);
  if (run.stage >= STAGES.length) run.phase = 'won';
  else {
    run.phase = 'shop';
    run.rerolls = 0;
    run.nextBoss = pickBoss(run, run.stage + 1);
    run.shop = generateShop(run, meta);
  }
  return lines;
}

export const rerollCost = (run: Run) => 2 + run.rerolls;

export function reroll(run: Run, meta: Meta): boolean {
  if (run.phase !== 'shop' || run.gold < rerollCost(run)) return false;
  run.gold -= rerollCost(run);
  run.rerolls++;
  run.shop = generateShop(run, meta);
  return true;
}

/** Compra la oferta i. Para la forja, `choice` es la carta elegida. Devuelve un error legible o null. */
export function buy(run: Run, i: number, choice?: string): string | null {
  const o = run.shop[i];
  if (run.phase !== 'shop' || !o || o.sold) return 'Esa oferta ya no está.';
  if (run.gold < o.cost) return 'No te alcanza el oro.';
  switch (o.kind) {
    case 'relic':
      if (run.relics.length >= RELIC_SLOTS) return `Solo caben ${RELIC_SLOTS} herramientas.`;
      run.relics.push(o.id!);
      break;
    case 'forja': {
      const card = run.deck.find((c) => c.id === choice && o.cards!.includes(c.id));
      if (!card) return 'Elige una de las tres cartas.';
      card.plus = (card.plus ?? 0) + 3;
      break;
    }
    case 'plano':
      run.levels[o.form!]++;
      break;
    case 'reparacion':
      if (run.integrity >= run.maxIntegrity) return 'El búnker ya está entero.';
      run.integrity = Math.min(run.maxIntegrity, run.integrity + 6);
      break;
    case 'comodin':
      run.jokers++;
      run.deck.push({ id: `X${run.jokers}`, suit: 'X', rank: 0 });
      break;
  }
  run.gold -= o.cost;
  o.sold = true;
  return null;
}

/** Sale de la ferretería hacia la obra siguiente. */
export function advance(run: Run): void {
  if (run.phase !== 'shop') return;
  run.stage++;
  run.boss = run.nextBoss;
  run.nextBoss = null;
  run.shop = [];
  run.phase = 'battle';
}

export const stagesCleared = (run: Run) => (run.phase === 'won' ? STAGES.length : run.stage - 1);

export function renownFor(run: Run): number {
  const base = stagesCleared(run) + (run.phase === 'won' ? 5 : 0);
  return Math.max(1, Math.ceil(base * (1 + 0.25 * run.ascension)));
}

/** Cierra la campaña (ganada o perdida) y abona el renombre al gremio. */
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

void rand;
