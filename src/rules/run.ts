// CAMPAÑA — roguelike de construcción de mazo. Sirve igual en solitario (corre en el cliente)
// y en sala online (corre en el servidor): es un reductor puro y determinista. Con la misma
// semilla y las mismas decisiones, la campaña es idéntica.
//
//   sobre → [ plano: ruta con contrato · o atajo → obra → cobro + selección (+ botín de jefe)
//             → ferretería → (hallazgo tras cada jefe) ] × 8 → Cimientos abisales (infinito)
import { Card, Config, DEFAULT_CONFIG, FORM, FORMATIONS, Formation, GameEvent, GameState, SEALS, Seal, SUITS, Suit, TREATMENTS, Treatment, cardValue, newTowers, nextRandom, reorder, seedFrom, shuffle, standardDeck } from './engine';
import { BASE_POOL, SPECIAL } from './specials';
import { Arch, BOXES, RARITY, Rarity, TOOL, TOOL_SLOTS, ToolInst, toolPool } from './tools';

export const MIN_DECK = 12;
export const LAST_STAGE = 8;
/** Versión del formato de campaña guardada: una campaña de otra versión no se puede continuar. */
export const RUN_VERSION = 3;

/**
 * Niveles de obra (ascensos). El nivel 1 es la obra limpia; cada nivel siguiente añade un giro
 * a todos los anteriores. `run.ascension` es el índice: 0 para el nivel 1, 7 para el nivel 8.
 */
export interface Ascension {
  name: string;
  desc: string;
}
export const ASCENSIONS: Ascension[] = [
  { name: 'Obra limpia', desc: 'Las reglas de siempre.' },
  { name: 'Hormigón armado', desc: 'Todos los pisos aguantan un 5 % más.' },
  { name: 'Precios de obra', desc: 'Todo en la ferretería cuesta 2 de oro más.' },
  { name: 'Vigas maestras', desc: 'En las obras con jefe, las K llegan apuntaladas.' },
  { name: 'Sirena afinada', desc: 'La amenaza de las K sube 1.' },
  { name: 'Búnker viejo', desc: 'El búnker tiene 1 punto menos de integridad.' },
  { name: 'Turno de noche', desc: 'La amenaza de las J y las Q sube 1.' },
  { name: 'Clausura', desc: 'En las obras con jefe, la amenaza de todas las torres sube 1.' },
];
export const MAX_ASCENSION = ASCENSIONS.length - 1;

// ───────────────────────── Obras y jefes ─────────────────────────

export interface StageDef {
  name: string;
  floors: number[];
  /** Multiplicador de la resistencia base de los pisos. */
  hp: number;
  /** Se suma a la amenaza base. */
  threat: number;
  boss: boolean;
}
/**
 * Balanceado con el laboratorio (npm run analyze:meta). Las obras son cortas (de 6 a 12 turnos de mediana,
 * y casi ninguna pasa de 18): la dificultad sube por la amenaza de la sirena y por la fatiga de cimientos,
 * no por pisos interminables.
 */
export const STAGES: StageDef[] = [
  { name: 'Caseta de obra', floors: [11], hp: 3.93, threat: 2, boss: false },
  { name: 'Bloque de pisos', floors: [11, 12], hp: 2.8, threat: 3, boss: false },
  { name: 'Torre del capataz', floors: [11, 12], hp: 3.35, threat: 4, boss: true },
  { name: 'Polígono', floors: [11, 12, 13], hp: 4.05, threat: 5, boss: false },
  { name: 'Ciudadela', floors: [11, 12, 13], hp: 4.5, threat: 5, boss: true },
  { name: 'Rascacielos', floors: [11, 12, 13], hp: 5, threat: 6, boss: false },
  { name: 'Fortaleza', floors: [11, 12, 13], hp: 5.3, threat: 5, boss: true },
  { name: 'La Torre Madre', floors: [11, 12, 13], hp: 6.25, threat: 6, boss: true },
];
/** La obra n. Más allá de la octava empiezan los Cimientos abisales: siempre con jefe y cada vez más duros. */
export function stageDef(n: number): StageDef {
  if (n <= LAST_STAGE) return STAGES[n - 1];
  const depth = n - LAST_STAGE;
  return { name: `Cimiento abisal ${depth}`, floors: [11, 12, 13], hp: Math.round(STAGES[LAST_STAGE - 1].hp * 1.45 ** depth * 10) / 10, threat: STAGES[LAST_STAGE - 1].threat + Math.ceil(depth / 2), boss: true };
}
/** Tras estas obras aparece un hallazgo en los cimientos. */
export const EVENT_AFTER = [3, 5, 7];

export interface Boss {
  id: string;
  /** El personaje. */
  who: string;
  /** Su maldición. */
  name: string;
  desc: string;
  apply(cfg: Config): void;
}
const eachHand = (c: Config, n: number) => void (c.handSize = Object.fromEntries(Object.entries(c.handSize).map(([k, v]) => [k, Math.max(3, v + n)])));
const eachThreat = (c: Config, n: number) => void [11, 12, 13].forEach((r) => (c.floorThreat[r] = Math.max(1, c.floorThreat[r] + n)));
export const BOSSES: Boss[] = [
  { id: 'doble', who: 'La Sirena', name: 'Doble sirena', desc: 'La sirena voltea 2 cartas cada turno, pero cada golpe pega un 40 % menos.', apply: (c) => void ((c.sirenCount = 2), [11, 12, 13].forEach((r) => (c.floorThreat[r] = Math.max(1, Math.ceil(c.floorThreat[r] * 0.6))))) },
  { id: 'escasez', who: 'El Usurero', name: 'Escasez', desc: 'Jugáis con 1 carta menos en la mano.', apply: (c) => eachHand(c, -1) },
  { id: 'sequia', who: 'El Matasanos', name: 'Sin botiquín', desc: 'Los ♥ no reparan el búnker.', apply: (c) => void (c.repairDiv = 9999) },
  { id: 'intemperie', who: 'La Ventisca', name: 'Intemperie', desc: 'El muro no puede pasar de 3.', apply: (c) => void (c.wallCap = Math.min(c.wallCap, 3)) },
  { id: 'blindaje', who: 'El Coloso', name: 'Blindaje', desc: 'Todos los pisos llegan apuntalados y, mientras lo estén, su amenaza sube 1.', apply: (c) => void ((c.apuntalado = [11, 12, 13]), (c.bracedThreat = 1)) },
  { id: 'furia', who: 'La Furia', name: 'Furia', desc: 'La amenaza de todas las torres sube 2.', apply: (c) => eachThreat(c, 2) },
  { id: 'inestable', who: 'El Topo', name: 'Suelo inestable', desc: 'La fatiga de cimientos empieza 3 turnos antes, y cada piso que cae sin golpe limpio le cuesta 1 al búnker.', apply: (c) => void ((c.crumbleHurt = 1), (c.fatigueStart = Math.max(1, (c.fatigueStart ?? 8) - 3))) },
];
export const BOSS: Record<string, Boss> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

// ───────────────────────── Contratos (rutas del plano) ─────────────────────────

/** Lo que pasó en la obra en curso, para comprobar contratos. */
export interface BattleStats {
  taken: number;
  cleans: number;
  jokers: number;
  forms: Formation[];
}

export interface Contract {
  id: string;
  name: string;
  /** La condición (o la traba, si es de riesgo). */
  desc: string;
  reward: string;
  /** De riesgo: endurece la obra y paga siempre que la termines. */
  risk?: boolean;
  cfg?(c: Config): void;
  done?(b: BattleStats, state: GameState, run: Run): boolean;
  pay(run: Run): void;
}
const turnLimit = (run: Run) => 3 + 4 * stageDef(run.stage).floors.length;
export const CONTRACTS: Contract[] = [
  { id: 'intacto', name: 'Sin un rasguño', desc: 'Termina la obra sin que el búnker pierda integridad.', reward: '+8 de oro', done: (b) => b.taken === 0, pay: (run) => void (run.gold += 8) },
  { id: 'limpios', name: 'Pulso firme', desc: 'Da 3 golpes limpios.', reward: 'Un sello al azar', done: (b) => b.cleans >= 3, pay: (run) => void stampRandom(run, 1) },
  { id: 'rapido', name: 'A destajo', desc: 'Demuele la obra en pocos turnos (4 por piso, más 3).', reward: '+6 de oro', done: (_, s, run) => s.turnCount < turnLimit(run), pay: (run) => void (run.gold += 6) },
  { id: 'sincolapso', name: 'Cantera medida', desc: 'Termina sin provocar ningún colapso.', reward: '+5 de oro', done: (_, s) => s.collapses === 0, pay: (run) => void (run.gold += 5) },
  { id: 'austero', name: 'Sin huelgas', desc: 'No juegues ningún comodín.', reward: 'Un tratamiento al azar', done: (b) => b.jokers === 0, pay: (run) => void treatRandom(run) },
  { id: 'maestra', name: 'Jugada maestra', desc: 'Juega un color, un full, un póker o una escalera de color.', reward: 'Un plano al azar', done: (b) => b.forms.some((f) => ['color', 'full', 'poker', 'escaleracolor'].includes(f)), pay: (run) => void run.levels[pick(run, FORMATIONS, 1)[0]]++ },
  { id: 'horas', name: 'Horas extra', desc: 'La amenaza de todas las torres sube 1.', reward: '+10 de oro', risk: true, cfg: (c) => eachThreat(c, 1), pay: (run) => void (run.gold += 10) },
  { id: 'sinred', name: 'Sin red', desc: 'El muro no puede pasar de 2.', reward: 'Una herramienta de oficio o mejor', risk: true, cfg: (c) => void (c.wallCap = Math.min(c.wallCap, 2)), pay: (run) => void grantTool(run, ['oficio', 'capataz', 'reliquia']) },
  { id: 'corta', name: 'Cuadrilla corta', desc: 'Jugáis con 1 carta menos en la mano.', reward: '+12 de oro', risk: true, cfg: (c) => eachHand(c, -1), pay: (run) => void (run.gold += 12) },
];
export const CONTRACT: Record<string, Contract> = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));

// ───────────────────────── Etiquetas sindicales (premio por saltar una obra) ─────────────────────────

export interface Tag {
  id: string;
  name: string;
  desc: string;
  apply(run: Run): void;
}
export const TAGS: Tag[] = [
  { id: 'vale', name: 'Vale de ferretería', desc: 'En la próxima ferretería, herramientas, sobres y forja son gratis.', apply: (run) => void (run.freeShop = true) },
  { id: 'envio', name: 'Envío urgente', desc: 'Recibes ya una herramienta de capataz o una reliquia.', apply: (run) => void (grantTool(run, ['capataz', 'reliquia']) || (run.gold += 12)) },
  { id: 'molde', name: 'Molde', desc: 'Duplicas una carta de tu mazo, la que elijas.', apply: (run) => void (run.pending = { kind: 'dup' }) },
  { id: 'liquidacion', name: 'Liquidación', desc: '+15 de oro.', apply: (run) => void (run.gold += 15) },
  { id: 'timbrado', name: 'Timbrado', desc: 'Dos cartas al azar de tu mazo reciben un sello.', apply: (run) => void stampRandom(run, 2) },
];
export const TAG: Record<string, Tag> = Object.fromEntries(TAGS.map((t) => [t.id, t]));

// ───────────────────────── Hallazgos en los cimientos ─────────────────────────

export interface EventOption {
  label: string;
  desc: string;
  can?(run: Run): boolean;
  apply(run: Run): void;
}
export interface EventDef {
  id: string;
  name: string;
  text: string;
  options: EventOption[];
}
export const EVENTS: EventDef[] = [
  {
    id: 'caja',
    name: 'La caja fuerte sepultada',
    text: 'Bajo un forjado partido asoma una caja fuerte del antiguo contratista. Forzarla hará temblar medio búnker.',
    options: [
      { label: 'Forzarla', desc: 'El búnker pierde 5 de integridad. Te llevas una herramienta de capataz o una reliquia.', can: (run) => run.integrity > 5 && run.tools.length < TOOL_SLOTS, apply: (run) => void ((run.integrity -= 5), grantTool(run, ['capataz', 'reliquia'])) },
      { label: 'Vendérsela al chatarrero', desc: '+8 de oro.', apply: (run) => void (run.gold += 8) },
    ],
  },
  {
    id: 'horno',
    name: 'El horno de fundición',
    text: 'Un horno que nadie apagó sigue al rojo en el segundo sótano. Lo que entre, sale convertido en otra cosa.',
    options: [
      { label: 'Fundir dos cartas', desc: 'Eliges dos cartas: se destruyen y nace una con el número más alto de las dos, en Bronce vivo y con el sello que llevaran.', can: (run) => run.deck.filter(isPlain).length > MIN_DECK, apply: (run) => void (run.pending = { kind: 'fuse' }) },
      { label: 'Calentarse y seguir', desc: '+4 de integridad.', apply: (run) => void (run.integrity = Math.min(run.maxIntegrity, run.integrity + 4)) },
    ],
  },
  {
    id: 'contrato',
    name: 'El contrato maldito',
    text: 'Clavado en un puntal hay un contrato con la tinta aún fresca y una cifra obscena. La letra pequeña habla de la próxima obra.',
    options: [
      { label: 'Firmar', desc: '+20 de oro ahora. En la próxima obra, la amenaza de todas las torres sube 1.', apply: (run) => void ((run.gold += 20), (run.curse = true)) },
      { label: 'Romperlo', desc: 'El papel vale para la estufa: +3 de oro.', apply: (run) => void (run.gold += 3) },
    ],
  },
  {
    id: 'clandestino',
    name: 'El gremio clandestino',
    text: 'Tres timbradores trabajan a la luz de un candil. Sellan lo que les pongas delante, y no aceptan regateos.',
    options: [
      { label: 'Pagar con sangre', desc: 'El búnker pierde 6 de integridad. Tres cartas al azar reciben un sello.', can: (run) => run.integrity > 6, apply: (run) => void ((run.integrity -= 6), stampRandom(run, 3)) },
      { label: 'Pagar con oro', desc: '8 de oro. Tu carta más alta recibe Bronce vivo.', can: (run) => run.gold >= 8, apply: (run) => void ((run.gold -= 8), treatBest(run, 'policromado')) },
      { label: 'Seguir de largo', desc: 'Nada cambia.', apply: () => {} },
    ],
  },
  {
    id: 'planos',
    name: 'Los planos del arquitecto',
    text: 'Empotrados en el muro maestro están los planos originales. Arrancarlos debilita lo poco que os sostiene.',
    options: [
      { label: 'Arrancarlos', desc: 'El búnker pierde 3 de integridad máxima para siempre. Dos formaciones al azar suben 2 niveles.', can: (run) => run.maxIntegrity > 8, apply: (run) => void ((run.maxIntegrity -= 3), (run.integrity = Math.min(run.integrity, run.maxIntegrity)), pick(run, FORMATIONS, 2).forEach((f) => (run.levels[f] += 2))) },
      { label: 'Copiarlos a mano', desc: '5 de oro. Una formación al azar sube 1 nivel.', can: (run) => run.gold >= 5, apply: (run) => void ((run.gold -= 5), run.levels[pick(run, FORMATIONS, 1)[0]]++) },
      { label: 'Dejarlos donde están', desc: 'Nada cambia.', apply: () => {} },
    ],
  },
];
export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

// ───────────────────────── Gremio (progreso permanente, horizontal) ─────────────────────────

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  costs: number[];
  /** Emblema con que se dibuja. */
  glyph: string;
}
const boxUp = (arch: Arch, name: string, glyph: string): Upgrade => ({
  id: `caja_${arch}`,
  name,
  glyph,
  costs: [4],
  desc: `Añade al surtido: ${Object.values(TOOL).filter((t) => t.box === arch).map((t) => t.name).join(', ')}.`,
});
export const UPGRADES: Upgrade[] = [
  boxUp('precision', 'Caja de precisión', 'calibre'),
  boxUp('sismo', 'Caja sísmica', 'diapason'),
  boxUp('alquimia', 'Caja de alquimia', 'crisol'),
  boxUp('limite', 'Caja de riesgo', 'megafono'),
  boxUp('trituradora', 'Caja de chatarra', 'prensa'),
  boxUp('aguante', 'Caja de aguante', 'ariete'),
  { id: 'tampones', name: 'Tampones nuevos', desc: 'La forja también ofrece los sellos de dinamita y sindical.', costs: [5], glyph: 'sello' },
  { id: 'bronce', name: 'Taller de bronce', desc: 'La forja también ofrece Bronce vivo y Agrietado.', costs: [6], glyph: 'forja' },
  { id: 'vale', name: 'Vale de remesa', desc: 'Un «Revolver cajones» gratis en cada ferretería, por nivel.', costs: [4, 8], glyph: 'cinta' },
  { id: 'tienda', name: 'Proveedor', desc: '+1 herramienta en oferta en cada ferretería, por nivel.', costs: [8, 12], glyph: 'andamio' },
  { id: 'caja', name: 'Caja chica', desc: '+2 de oro inicial por nivel.', costs: [3, 6], glyph: 'hucha' },
  { id: 'rutas', name: 'Topógrafo', desc: 'Cada obra sin jefe ofrece 3 rutas con contrato en vez de 2.', costs: [6], glyph: 'plano' },
];
/** Mejoras de versiones anteriores que ya no existen: se devuelve el renombre gastado en ellas. */
const RETIRED: Record<string, number[]> = { seguro: [4, 8, 14], interes: [3, 6, 10], manos: [18], caja: [2, 4, 7, 11, 16], cimientos: [3, 5, 8, 12, 17], tienda: [8, 15] };

export interface Meta {
  /** Versión del gremio: al cambiar las mejoras se devuelve el renombre de las retiradas. */
  v: number;
  renown: number;
  up: Record<string, number>;
  runs: number;
  wins: number;
  best: number;
  ascMax: number;
  /** Logros conseguidos. */
  ach: Record<string, boolean>;
  /** Contadores acumulados entre campañas. */
  stats: { floors: number; cleans: number; maxHit: number; maxGold: number; reach: number; winAsc: number; intact: number; depth: number; forged: number; contracts: number; skips: number; maxTools: number; dailies: number };
  /** Colección: lo que alguna vez pasó por tus manos. */
  seen: { tools: string[]; specials: string[]; bosses: string[]; forms: string[] };
  /** Para no contar dos veces lo que acumula una campaña en curso. */
  last: { id: number; forged: number; contracts: number; skips: number };
  /** Sellos de maestría: el nivel de obra más alto ganado con cada herramienta en el cinturón y con cada baraja. */
  mastery: { tools: Record<string, number>; decks: Record<string, number> };
  /** Mejor resultado en la Obra diaria. */
  daily: { date: string; cleared: number; won: boolean };
}
export const META_VERSION = 2;
export const newMeta = (): Meta => ({
  v: META_VERSION,
  renown: 0,
  up: {},
  runs: 0,
  wins: 0,
  best: 0,
  ascMax: 0,
  ach: {},
  stats: { floors: 0, cleans: 0, maxHit: 0, maxGold: 0, reach: 0, winAsc: -1, intact: 0, depth: 0, forged: 0, contracts: 0, skips: 0, maxTools: 0, dailies: 0 },
  seen: { tools: [], specials: [], bosses: [], forms: [] },
  last: { id: 0, forged: 0, contracts: 0, skips: 0 },
  mastery: { tools: {}, decks: {} },
  daily: { date: '', cleared: 0, won: false },
});

/** Carga un gremio guardado (de esta versión o de una anterior) sobre uno nuevo. */
export function loadMeta(saved: unknown): Meta {
  const base = newMeta();
  if (!saved || typeof saved !== 'object') return base;
  const old = saved as Partial<Meta> & { seen?: { relics?: string[] } & Partial<Meta['seen']> };
  const meta: Meta = { ...base, ...old, ach: { ...old.ach }, stats: { ...base.stats, ...old.stats }, seen: { ...base.seen, ...old.seen }, last: { ...base.last, ...old.last }, daily: { ...base.daily, ...old.daily }, up: { ...old.up }, mastery: { tools: { ...old.mastery?.tools }, decks: { ...old.mastery?.decks } } };
  meta.ascMax = Math.max(0, Math.min(MAX_ASCENSION, meta.ascMax));
  if ((old.v ?? 1) < META_VERSION) {
    // las mejoras cambiaron de arriba abajo: se devuelve todo lo gastado y se empieza de cero
    for (const [id, level] of Object.entries(meta.up)) for (let i = 0; i < level; i++) meta.renown += RETIRED[id]?.[i] ?? 0;
    meta.up = {};
    meta.seen.tools = [...new Set([...(old.seen?.relics ?? []), ...meta.seen.tools])].filter((id) => TOOL[id]);
    meta.v = META_VERSION;
  }
  delete (meta.seen as { relics?: unknown }).relics;
  return meta;
}

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

export type OfferKind = 'tool' | 'sobre' | 'clandestino' | 'forja' | 'plano';
export interface Offer {
  kind: OfferKind;
  cost: number;
  sold?: boolean;
  /** tool: herramienta */
  id?: string;
  /** forja: lo que estampa */
  seal?: Seal;
  tr?: Treatment;
  /** plano: formación que sube de nivel */
  form?: Formation;
}

export type DraftOpt = { kind: 'special'; id: string } | { kind: 'card'; card: Card };
export type Pending = { kind: 'forge'; i: number } | { kind: 'dup' } | { kind: 'fuse' };

export interface MapNode {
  /** Contratos entre los que elegir (vacío en las obras con jefe). */
  routes: string[];
  /** Etiqueta que se cobra por saltar la obra (null si no se puede saltar). */
  tag: string | null;
}

export type RunAction =
  | { t: 'begin' }
  /** Plano: tomar la ruta i (su contrato) y entrar a la obra. */
  | { t: 'route'; i: number }
  /** Plano: saltar la obra a cambio de la etiqueta. */
  | { t: 'skip' }
  /** Cobro: llevarse la opción i de la selección, o ninguna (bonifica oro). */
  | { t: 'draft'; i: number | null }
  | { t: 'loot'; id: string | null }
  | { t: 'buy'; i: number }
  /** Sobre abierto: quedarse con la carta i. */
  | { t: 'open'; i: number }
  /** Resolver una elección pendiente de cartas (forja, molde, fundición). */
  | { t: 'target'; cards: string[] }
  | { t: 'cancel' }
  | { t: 'burn'; card: string }
  | { t: 'heal' }
  | { t: 'sell'; i: number }
  | { t: 'reroll' }
  | { t: 'next' }
  | { t: 'event'; i: number }
  /** Cinturón: nuevo orden de las herramientas (permutación de índices). */
  | { t: 'reorder'; order: number[] }
  /** Tras la obra 8: seguir en los Cimientos abisales. */
  | { t: 'endless' };

/** Con qué se monta una campaña: lo aporta el jugador (o el anfitrión de la sala). */
export interface RunOpts {
  up?: Record<string, number>;
  ascension?: number;
  deck?: string;
  /** Cartas especiales legendarias que el jugador tiene desbloqueadas. */
  pool?: string[];
  /** Semilla numérica, o un texto del que sacarla. */
  seed?: number;
  seedText?: string;
  /** Obra diaria (AAAA-MM-DD): misma semilla para todos, sin mejoras del gremio. */
  daily?: string;
}

export interface Run {
  /** Versión del formato (RUN_VERSION). */
  v: number;
  id: number;
  /** La semilla, tal como se muestra y se comparte. */
  seedText: string;
  daily: string | null;
  rng: number;
  ascension: number;
  deckId: string;
  up: Record<string, number>;
  /** Surtidos de esta campaña. */
  pool: string[];
  toolPool: string[];
  seals: Seal[];
  treats: Treatment[];
  stage: number;
  phase: 'pack' | 'map' | 'battle' | 'reward' | 'shop' | 'event' | 'won' | 'lost';
  gold: number;
  integrity: number;
  maxIntegrity: number;
  tools: ToolInst[];
  deck: Card[];
  levels: Record<Formation, number>;
  handBonus: number;
  interestCap: number;
  scrap: number;
  /** Jefes ya sorteados, a la vista en el plano desde el principio. */
  bosses: Record<number, string>;
  boss: string | null;
  node: MapNode;
  contract: string | null;
  /** Lo que pasó con el contrato de la última obra. */
  contractDone: boolean | null;
  /** El contrato maldito: la próxima obra tiene +1 de amenaza. */
  curse: boolean;
  freeShop: boolean;
  pack: string[];
  pay: [string, number][];
  draft: DraftOpt[];
  drafted: boolean;
  loot: string[];
  looted: boolean;
  shop: Offer[];
  /** Sobre abierto, esperando que elijas una de sus cartas. */
  sobre: string[] | null;
  pending: Pending | null;
  event: string | null;
  events: string[];
  rerolls: number;
  vouchers: number;
  removals: number;
  heals: number;
  serial: number;
  battle: BattleStats;
  endless: boolean;
  /** Ya cayó la Torre Madre. */
  conquered: boolean;
  /** Obras que se saltaron por el atajo (para sellarlas en el plano). */
  skipped: number[];
  /** Jefes derrotados y obras terminadas con el búnker entero. */
  beaten: string[];
  intact: number;
  stats: { floors: number; cleans: number; turns: number; gold: number; maxHit: number; burned: number; forged: number; contracts: number; skips: number; toolUse: Record<string, number>; stageTurns: number[] };
}

const isPlain = (c: Card) => !c.sp && c.suit !== 'X';
const lvl = (run: Run, id: string) => run.up[id] ?? 0;
function pick<T>(run: Run, pool: T[], n: number): T[] {
  const copy = [...pool];
  shuffle(copy, run);
  return copy.slice(0, n);
}
const roll = (run: Run, n: number) => Math.floor(nextRandom(run) * n);
const vary = (run: Run, base: number) => Math.max(2, base + roll(run, 3) - 1);

/** n cartas especiales distintas del surtido. Las legendarias salen cuatro veces menos que las comunes. */
function rollSpecials(run: Run, n: number): string[] {
  const pool = [...run.pool];
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const weights = pool.map((id) => (SPECIAL[id]?.locked ? 1 : 4));
    let at = nextRandom(run) * weights.reduce((a, b) => a + b, 0);
    const i = weights.findIndex((w) => (at -= w) <= 0);
    out.push(...pool.splice(i < 0 ? pool.length - 1 : i, 1));
  }
  return out;
}

/** Una herramienta al azar del surtido, ponderada por rareza. */
function rollTool(run: Run, rarities: Rarity[], exclude: string[] = []): string | null {
  const owned = run.tools.map((t) => t.id);
  const pool = run.toolPool.filter((id) => !owned.includes(id) && !exclude.includes(id) && rarities.includes(TOOL[id].rarity));
  const total = pool.reduce((a, id) => a + RARITY[TOOL[id].rarity].weight, 0);
  if (!pool.length) return null;
  let at = nextRandom(run) * total;
  for (const id of pool) if ((at -= RARITY[TOOL[id].rarity].weight) <= 0) return id;
  return pool[pool.length - 1];
}
const ALL_RARITIES: Rarity[] = ['comun', 'oficio', 'capataz', 'reliquia'];

function grantTool(run: Run, rarities: Rarity[]): boolean {
  if (run.tools.length >= TOOL_SLOTS) return false;
  const id = rollTool(run, rarities) ?? rollTool(run, ALL_RARITIES);
  if (!id) return false;
  run.tools.push({ id, n: 0 });
  return true;
}
function stampRandom(run: Run, n: number): void {
  for (const c of pick(run, run.deck.filter((d) => isPlain(d) && !d.seal), n)) {
    c.seal = pick(run, run.seals, 1)[0];
    run.stats.forged++;
  }
}
function treatRandom(run: Run): void {
  const [c] = pick(run, run.deck.filter((d) => isPlain(d) && !d.tr), 1);
  if (!c) return;
  c.tr = pick(run, run.treats, 1)[0];
  run.stats.forged++;
}
function treatBest(run: Run, tr: Treatment): void {
  const best = run.deck.filter((d) => isPlain(d) && !d.tr).sort((a, b) => cardValue(b) - cardValue(a))[0];
  if (!best) return;
  best.tr = tr;
  run.stats.forged++;
}

/** Añade una carta especial al mazo de la campaña. */
export function addSpecial(run: Run, spId: string): Card {
  const card: Card = { id: `sp-${spId}-${++run.serial}`, suit: 'X', rank: 0, sp: spId };
  run.deck.push(card);
  return card;
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
    desc: 'Solo ♠ y ♣, por duplicado: ni reparas ni lanzas esquirlas. Empiezas con Ácido y Sacos terreros y un búnker reforzado (+5); con la Caja de aguante del gremio, también con el Bastión.',
    unlock: 'capataz',
    build: (run) => {
      const black = run.deck.filter((c) => c.suit === 'S' || c.suit === 'C');
      run.deck = [...black, ...black.map(copyOf), ...run.deck.filter((c) => c.suit === 'X')];
      run.tools.push({ id: 'acido', n: 0 }, { id: 'sacos', n: 0 });
      // la caja de aguante del gremio le da con qué cobrar tanto muro: el Bastión
      if (run.toolPool.includes('bastion')) run.tools.push({ id: 'bastion', n: 0 });
      run.maxIntegrity += 5;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'prestamista',
    name: 'Baraja del prestamista',
    desc: '+12 de oro inicial y el interés rinde el doble, pero el búnker tiene 1 menos.',
    unlock: 'media',
    build: (run) => {
      run.gold += 12;
      run.interestCap += 3;
      run.maxIntegrity -= 1;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'ases',
    name: 'Baraja de ases',
    desc: 'Ocho ases y ningún 2: más compañías y más pegada, pero el búnker tiene 4 menos.',
    unlock: 'madre',
    build: (run) => {
      const aces = run.deck.filter((c) => c.rank === 1);
      run.deck = [...run.deck.filter((c) => c.rank !== 2), ...aces.map(copyOf)];
      run.maxIntegrity -= 4;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'corta',
    name: 'Baraja corta',
    desc: 'Sin doses ni treses. Golpes gordos, pero la cantera se agota enseguida y el búnker tiene 6 menos. Empiezas con +3 de oro.',
    unlock: 'golpe100',
    build: (run) => {
      run.deck = run.deck.filter((c) => c.rank < 2 || c.rank > 3);
      run.gold += 3;
      run.maxIntegrity -= 6;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'caos',
    name: 'Baraja del caos',
    desc: 'Un solo comodín, pero el sobre inicial trae 5 cartas especiales.',
    unlock: 'coleccion',
    build: (run) => {
      run.deck = run.deck.filter((c) => c.id !== 'X2');
      for (const id of rollSpecials(run, 2)) {
        run.pack.push(id);
        addSpecial(run, id);
      }
    },
  },
];
export const DECK: Record<string, DeckDef> = Object.fromEntries(DECKS.map((d) => [d.id, d]));

/** Semilla de la Obra diaria: la misma para todo el mundo ese día. */
export const dailySeed = (date: string) => seedFrom(`derrumbe-diaria-${date}`);

export function newRun(opts: RunOpts, fallbackSeed = 1): Run {
  const daily = typeof opts.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(opts.daily) ? opts.daily : null;
  const seedText = daily ?? (typeof opts.seedText === 'string' && opts.seedText.trim() ? opts.seedText.trim().slice(0, 24).toUpperCase() : '');
  const seed = daily ? dailySeed(daily) : seedText ? seedFrom(seedText) : ((Number.isFinite(opts.seed) ? Number(opts.seed) : fallbackSeed) | 0);
  const up = daily ? cleanUp({}) : cleanUp(opts.up);
  const boxes = BOXES.filter((b) => up[`caja_${b}`]);
  const maxIntegrity = 20;
  const run: Run = {
    v: RUN_VERSION,
    id: seed,
    seedText: seedText || (seed >>> 0).toString(36).toUpperCase(),
    daily,
    rng: seed,
    ascension: daily ? 0 : Math.max(0, Math.min(MAX_ASCENSION, Math.floor(opts.ascension ?? 0) || 0)),
    deckId: !daily && DECK[opts.deck ?? ''] ? opts.deck! : 'obra',
    up,
    pool: [...new Set([...BASE_POOL, ...(!daily && Array.isArray(opts.pool) ? opts.pool.filter((id) => typeof id === 'string' && SPECIAL[id]) : [])])],
    toolPool: toolPool(boxes),
    seals: up.tampones ? [...SEALS] : ['eco', 'jornal'],
    treats: up.bronce ? [...TREATMENTS] : ['forjado', 'templado'],
    stage: 1,
    phase: 'pack',
    gold: 4 + 2 * up.caja,
    integrity: maxIntegrity,
    maxIntegrity,
    tools: [],
    deck: standardDeck(),
    levels: Object.fromEntries(FORMATIONS.map((f) => [f, 0])) as Record<Formation, number>,
    handBonus: 0,
    interestCap: 3,
    scrap: 0,
    bosses: {},
    boss: null,
    node: { routes: [], tag: null },
    contract: null,
    contractDone: null,
    curse: false,
    freeShop: false,
    pack: [],
    pay: [],
    draft: [],
    drafted: true,
    loot: [],
    looted: true,
    shop: [],
    sobre: null,
    pending: null,
    event: null,
    events: [],
    rerolls: 0,
    vouchers: 0,
    removals: 0,
    heals: 0,
    serial: 2,
    battle: { taken: 0, cleans: 0, jokers: 0, forms: [] },
    endless: false,
    conquered: false,
    skipped: [],
    beaten: [],
    intact: 0,
    stats: { floors: 0, cleans: 0, turns: 0, gold: 0, maxHit: 0, burned: 0, forged: 0, contracts: 0, skips: 0, toolUse: {}, stageTurns: [] },
  };
  run.pack = rollSpecials(run, 3);
  for (const id of run.pack) addSpecial(run, id);
  if (run.ascension >= 5) run.maxIntegrity -= 1;
  run.integrity = Math.min(run.integrity, run.maxIntegrity);
  DECK[run.deckId].build(run);
  // los jefes se sortean ya: el plano los enseña desde el primer momento
  const bosses = pick(run, BOSSES, 4).map((b) => b.id);
  STAGES.forEach((s, i) => s.boss && (run.bosses[i + 1] = bosses.shift()!));
  run.events = pick(run, EVENTS, EVENT_AFTER.length).map((e) => e.id);
  return run;
}

/** Cuánto más aguantan las obras según el tamaño de la cuadrilla (1 a 4 jugadores). */
const COOP_HP = [1, 1.3, 1.4, 1.48];
/** Fatiga de cimientos en campaña: turno en que empieza (en solitario), cada cuántos turnos sube y cuánta Resonancia da cada nivel. */
export const FATIGUE = { start: 8, every: 2, res: 0.25 };

/** Reglas efectivas de la obra actual: base + nivel de obra + planos + herramientas + jefe + contrato. */
export function stageConfig(run: Run, players = 1): Config {
  const st = stageDef(run.stage);
  const cfg: Config = structuredClone(DEFAULT_CONFIG);
  cfg.maxIntegrity = run.maxIntegrity;
  cfg.handSize = { [players]: 7 + run.handBonus };
  // en cuadrilla hay más manos entre las que elegir: las obras aguantan más
  const a = run.ascension;
  const scale = st.hp * (a >= 1 ? 1.05 : 1) * COOP_HP[Math.min(players, 4) - 1];
  for (const r of [11, 12, 13]) {
    cfg.floorHp[r] = Math.round(DEFAULT_CONFIG.floorHp[r] * scale);
    cfg.floorThreat[r] = Math.max(1, DEFAULT_CONFIG.floorThreat[r] + st.threat + (a >= 4 && r === 13 ? 1 : 0) + (a >= 6 && r !== 13 ? 1 : 0) + (a >= 7 && st.boss ? 1 : 0));
  }
  if (a >= 3 && st.boss) cfg.apuntalado = [13];
  // fatiga de cimientos: en cuadrilla las obras duran más turnos y empieza en proporción
  cfg.fatigueStart = Math.round(FATIGUE.start * COOP_HP[Math.min(players, 4) - 1]);
  cfg.fatigueEvery = FATIGUE.every;
  cfg.fatigueRes = FATIGUE.res;
  cfg.formLevel = { ...run.levels };
  for (const t of run.tools) TOOL[t.id]?.cfg?.(cfg);
  if (run.boss) BOSS[run.boss]?.apply(cfg);
  if (run.contract) CONTRACT[run.contract]?.cfg?.(cfg);
  if (run.curse) eachThreat(cfg, 1);
  return cfg;
}

/** Prepara la partida de la obra actual con el mazo y el cinturón de la campaña. */
export function startStage(run: Run, players: { id: string; name: string }[]): GameState {
  const config = stageConfig(run, players.length);
  const deck = run.deck.map((c) => ({ ...c }));
  shuffle(deck, run);
  const size = config.handSize[players.length];
  run.battle = { taken: 0, cleans: 0, jokers: 0, forms: [] };
  return {
    config,
    rng: (run.rng ^ 0x5bd1e995) | 0,
    players: players.map((p) => ({ id: p.id, name: p.name, hand: deck.splice(0, size), reserve: [] })),
    deck,
    discard: [],
    towers: newTowers(stageDef(run.stage).floors, config),
    integrity: Math.min(run.integrity, config.maxIntegrity),
    wall: 0,
    turn: 0,
    turnCount: 0,
    collapses: 0,
    phase: 'playing',
    lastSiren: null,
    tools: run.tools.map((t) => ({ ...t })),
    chain: 0,
    charge: 0,
    scrap: run.scrap,
    burned: [],
    exhausted: [],
    stashed: false,
    // una tiza de replanteo por obra, solo en solitario
    chalk: players.length === 1 ? 1 : 0,
    undo: null,
    fatigue: 0,
  };
}

/** Anota lo que la campaña necesita de cada jugada: oro, golpes limpios, contratos y estadísticas. */
export function trackEvents(run: Run, events: GameEvent[]): void {
  for (const ev of events) {
    if (ev.e === 'floorDown') {
      run.stats.floors++;
      if (ev.clean) {
        run.battle.cleans++;
        run.stats.cleans++;
      }
    } else if (ev.e === 'gold') {
      run.gold += ev.amount;
      run.stats.gold += ev.amount;
    } else if (ev.e === 'siren') run.battle.taken += ev.taken;
    else if (ev.e === 'collapse') run.battle.taken += ev.loss;
    else if (ev.e === 'hurt') run.battle.taken += ev.amount;
    else if (ev.e === 'joker') run.battle.jokers++;
    else if (ev.e === 'play') run.battle.forms.includes(ev.formation) || run.battle.forms.push(ev.formation);
    else if (ev.e === 'impact') run.stats.maxHit = Math.max(run.stats.maxHit, ev.total);
    else if (ev.e === 'burn') run.stats.burned++;
    else if (ev.e === 'step' && ev.src === 'tool') run.stats.toolUse[ev.id] = (run.stats.toolUse[ev.id] ?? 0) + 1;
  }
}

export const removeCost = (run: Run) => 3 + 2 * run.removals;
export const healCost = (run: Run) => 5 + run.heals;
export const rerollCost = (run: Run) => (run.vouchers > 0 ? 0 : 2 + run.rerolls);
export const offerCost = (run: Run, o: Offer) => (run.freeShop ? 0 : o.cost);
export const sellValue = (id: string) => Math.max(1, Math.floor(RARITY[TOOL[id]?.rarity ?? 'comun'].cost / 2));

function generateShop(run: Run): Offer[] {
  const offers = stock(run);
  if (run.ascension >= 2) for (const o of offers) o.cost += 2;
  return offers;
}

function stock(run: Run): Offer[] {
  const offers: Offer[] = [];
  const seen: string[] = [];
  for (let i = 0; i < 2 + lvl(run, 'tienda'); i++) {
    const id = rollTool(run, ALL_RARITIES, seen);
    if (!id) break;
    seen.push(id);
    offers.push({ kind: 'tool', id, cost: vary(run, RARITY[TOOL[id].rarity].cost) });
  }
  offers.push({ kind: 'sobre', cost: vary(run, 6) }, { kind: 'clandestino', cost: vary(run, 3) });
  if (roll(run, 2)) offers.push({ kind: 'forja', cost: vary(run, 5), seal: pick(run, run.seals, 1)[0] });
  else offers.push({ kind: 'forja', cost: vary(run, 5), tr: pick(run, run.treats, 1)[0] });
  const form = pick(run, FORMATIONS, 1)[0];
  offers.push({ kind: 'plano', cost: vary(run, 4 + 2 * run.levels[form]), form });
  return offers;
}

function openShop(run: Run): void {
  run.phase = 'shop';
  run.rerolls = 0;
  run.vouchers = lvl(run, 'vale');
  run.shop = generateShop(run);
}

/** Entra al plano de la obra en curso: sus rutas, su atajo o su jefe. */
function toMap(run: Run): void {
  run.phase = 'map';
  run.contract = null;
  run.contractDone = null;
  run.boss = null;
  const st = stageDef(run.stage);
  if (st.boss) {
    if (!run.bosses[run.stage]) run.bosses[run.stage] = pick(run, BOSSES.filter((b) => b.id !== run.bosses[run.stage - 1]), 1)[0].id;
    run.node = { routes: [], tag: null };
    return;
  }
  // la primera ruta nunca es de riesgo; el Topógrafo del gremio añade una tercera
  const [safe] = pick(run, CONTRACTS.filter((c) => !c.risk), 1);
  const others = pick(run, CONTRACTS.filter((c) => c.id !== safe.id), 1 + lvl(run, 'rutas'));
  run.node = { routes: [safe.id, ...others.map((c) => c.id)], tag: pick(run, TAGS, 1)[0].id };
}

function advance(run: Run): void {
  run.stage++;
  run.curse = run.curse && run.phase === 'event'; // el contrato maldito pesa sobre la obra que viene
  run.shop = [];
  run.event = null;
  run.freeShop = false;
  toMap(run);
}

function draftOptions(run: Run): DraftOpt[] {
  const specials = rollSpecials(run, 2).map((id): DraftOpt => ({ kind: 'special', id }));
  const card: Card = { id: `c-${++run.serial}`, suit: pick<Suit>(run, SUITS, 1)[0], rank: pick(run, [1, 6, 7, 8, 9, 10], 1)[0] };
  if (roll(run, 2)) card.seal = pick(run, run.seals, 1)[0];
  else card.tr = pick(run, run.treats, 1)[0];
  return [...specials, { kind: 'card', card }];
}

/** Cierra la batalla: sincroniza mazo y cinturón, y si se ganó cobra y abre la selección. */
export function finishBattle(run: Run, state: GameState): void {
  if (run.phase !== 'battle' || state.phase === 'playing') return;
  run.tools = state.tools.map((t) => ({ ...t }));
  run.deck = run.deck.filter((c) => !state.burned.includes(c.id));
  run.scrap = state.scrap;
  run.stats.turns += state.turnCount;
  run.stats.stageTurns.push(state.turnCount);
  if (state.phase === 'lost') {
    run.integrity = 0;
    run.phase = 'lost';
    return;
  }
  const st = stageDef(run.stage);
  const lines: [string, number][] = [
    ['Obra demolida', 4 + Math.min(run.stage, LAST_STAGE)],
    ['Golpes limpios', Math.min(5, run.battle.cleans)],
    ['Búnker en pie', Math.floor(state.integrity / 5)],
    ['Interés (1 por cada 5 de oro)', Math.min(run.interestCap, Math.floor(run.gold / 5))],
  ];
  if (run.tools.some((t) => t.id === 'hucha')) lines.push(['Hucha', 4]);
  run.pay = lines.filter(([, n]) => n > 0);
  const total = run.pay.reduce((a, [, n]) => a + n, 0);
  run.gold += total;
  run.stats.gold += total;
  if (state.integrity >= run.maxIntegrity) run.intact++;
  if (run.boss) run.beaten.includes(run.boss) || run.beaten.push(run.boss);
  run.integrity = Math.min(run.maxIntegrity, state.integrity + 4);
  const contract = run.contract ? CONTRACT[run.contract] : null;
  if (contract) {
    run.contractDone = contract.risk ? true : !!contract.done?.(run.battle, state, run);
    if (run.contractDone) {
      contract.pay(run);
      run.stats.contracts++;
    }
  }
  run.curse = false;
  if (run.stage === LAST_STAGE && !run.endless) {
    run.conquered = true;
    run.phase = 'won';
    return;
  }
  run.phase = 'reward';
  run.draft = draftOptions(run);
  run.drafted = false;
  const lootA = st.boss ? rollTool(run, ['oficio', 'capataz', 'reliquia']) : null;
  const lootB = lootA ? rollTool(run, ['oficio', 'capataz', 'reliquia'], [lootA]) : null;
  run.loot = [lootA, lootB].filter((id): id is string => !!id);
  run.looted = run.loot.length === 0;
}

/** Aplica una decisión de campaña. Devuelve un mensaje de error legible, o null si se aplicó. */
export function runAction(run: Run, a: RunAction): string | null {
  if (a.t === 'reorder') {
    const next = reorder(run.tools, a.order);
    if (!next) return 'Ese orden no es válido.';
    run.tools = next;
    return null;
  }
  if (run.pending && a.t !== 'target' && a.t !== 'cancel') return 'Antes elige las cartas pendientes.';
  switch (a.t) {
    case 'begin':
      if (run.phase !== 'pack') return 'La campaña ya empezó.';
      toMap(run);
      return null;
    case 'route': {
      if (run.phase !== 'map') return 'No estás en el plano.';
      const boss = stageDef(run.stage).boss;
      if (!boss && !run.node.routes[a.i]) return 'Esa ruta no existe.';
      run.contract = boss ? null : run.node.routes[a.i];
      run.boss = boss ? run.bosses[run.stage] : null;
      run.phase = 'battle';
      return null;
    }
    case 'skip': {
      if (run.phase !== 'map' || !run.node.tag) return 'Esta obra no se puede saltar.';
      const tag = TAG[run.node.tag];
      run.stats.skips++;
      run.skipped.push(run.stage);
      tag.apply(run);
      run.stage++;
      toMap(run);
      return null;
    }
    case 'draft': {
      if (run.phase !== 'reward' || run.drafted) return 'No hay selección pendiente.';
      if (a.i === null) run.gold += 3;
      else {
        const opt = run.draft[a.i];
        if (!opt) return 'Esa carta no está en la selección.';
        if (opt.kind === 'special') addSpecial(run, opt.id);
        else run.deck.push({ ...opt.card });
      }
      run.drafted = true;
      if (run.looted) openShop(run);
      return null;
    }
    case 'loot':
      if (run.phase !== 'reward' || run.looted) return 'No hay botín que elegir.';
      if (a.id !== null) {
        if (!run.loot.includes(a.id)) return 'Esa herramienta no está en el botín.';
        if (run.tools.length >= TOOL_SLOTS) return `En el cinturón solo caben ${TOOL_SLOTS} herramientas.`;
        run.tools.push({ id: a.id, n: 0 });
      }
      run.looted = true;
      if (run.drafted) openShop(run);
      return null;
    case 'buy': {
      const o = run.shop[a.i];
      if (run.phase !== 'shop' || !o || o.sold) return 'Esa oferta ya no está.';
      if (run.sobre) return 'Antes elige una carta del sobre abierto.';
      const cost = offerCost(run, o);
      if (run.gold < cost) return 'No te alcanza el oro.';
      if (o.kind === 'forja') {
        if (!run.deck.some(isPlain)) return 'No tienes cartas que forjar.';
        run.pending = { kind: 'forge', i: a.i }; // se cobra al elegir la carta
        return null;
      }
      if (o.kind === 'tool') {
        if (run.tools.length >= TOOL_SLOTS) return `En el cinturón solo caben ${TOOL_SLOTS} herramientas. Vende una antes.`;
        run.tools.push({ id: o.id!, n: 0 });
      } else if (o.kind === 'sobre') run.sobre = rollSpecials(run, 3);
      else if (o.kind === 'clandestino') addSpecial(run, rollSpecials(run, 1)[0]);
      else run.levels[o.form!]++;
      run.gold -= cost;
      o.sold = true;
      return null;
    }
    case 'open': {
      if (!run.sobre) return 'No hay ningún sobre abierto.';
      const id = run.sobre[a.i];
      if (!id) return 'Esa carta no está en el sobre.';
      addSpecial(run, id);
      run.sobre = null;
      return null;
    }
    case 'target':
      return resolvePending(run, a.cards);
    case 'cancel':
      if (!run.pending) return 'No hay nada pendiente.';
      run.pending = null;
      if (run.phase === 'event') advance(run);
      return null;
    case 'burn': {
      if (run.phase !== 'shop') return 'Solo se queman cartas en la ferretería.';
      if (run.gold < removeCost(run)) return 'No te alcanza el oro.';
      if (run.deck.length <= MIN_DECK) return `El mazo no puede bajar de ${MIN_DECK} cartas.`;
      const i = run.deck.findIndex((c) => c.id === a.card);
      if (i < 0) return 'Esa carta no está en el mazo.';
      run.deck.splice(i, 1);
      run.gold -= removeCost(run);
      run.removals++;
      run.scrap++;
      run.stats.burned++;
      return null;
    }
    case 'heal':
      if (run.phase !== 'shop') return 'Solo en la ferretería.';
      if (run.integrity >= run.maxIntegrity) return 'El búnker ya está entero.';
      if (run.gold < healCost(run)) return 'No te alcanza el oro.';
      run.gold -= healCost(run);
      run.heals++;
      run.integrity = Math.min(run.maxIntegrity, run.integrity + 6);
      return null;
    case 'sell': {
      if (run.phase === 'battle') return 'En plena obra no se vende.';
      const t = run.tools[a.i];
      if (!t) return 'Esa herramienta no está en el cinturón.';
      run.gold += sellValue(t.id);
      run.tools.splice(a.i, 1);
      return null;
    }
    case 'reroll':
      if (run.phase !== 'shop') return 'Solo en la ferretería.';
      if (run.sobre) return 'Antes elige una carta del sobre abierto.';
      if (run.gold < rerollCost(run)) return 'No te alcanza el oro.';
      run.gold -= rerollCost(run);
      if (run.vouchers > 0) run.vouchers--;
      else run.rerolls++;
      run.shop = generateShop(run);
      return null;
    case 'next':
      if (run.phase !== 'shop') return 'Aún no puedes seguir.';
      if (run.sobre) return 'Antes elige una carta del sobre abierto.';
      if (!run.endless && EVENT_AFTER.includes(run.stage) && run.events.length) {
        run.phase = 'event';
        run.event = run.events.shift()!;
        run.shop = [];
        run.freeShop = false;
        return null;
      }
      advance(run);
      return null;
    case 'event': {
      if (run.phase !== 'event' || !run.event) return 'No hay ningún hallazgo.';
      const opt = EVENT[run.event].options[a.i];
      if (!opt) return 'Esa opción no existe.';
      if (opt.can && !opt.can(run)) return 'No puedes elegir eso ahora.';
      opt.apply(run);
      if (!run.pending) advance(run);
      return null;
    }
    case 'endless':
      if (run.phase !== 'won' || run.endless) return 'Los cimientos abisales se abren al ganar la campaña.';
      run.endless = true;
      run.draft = draftOptions(run);
      run.drafted = false;
      run.loot = [];
      run.looted = true;
      run.phase = 'reward';
      return null;
  }
}

function resolvePending(run: Run, ids: string[]): string | null {
  const p = run.pending;
  if (!p) return 'No hay nada pendiente.';
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) return 'Elección inválida.';
  const cards = ids.map((id) => run.deck.find((c) => c.id === id));
  if (cards.some((c) => !c)) return 'Esa carta no está en el mazo.';
  const chosen = cards as Card[];
  if (p.kind === 'forge') {
    const o = run.shop[p.i];
    if (chosen.length !== 1 || !isPlain(chosen[0])) return 'Elige una carta de baraja.';
    if (!o || o.sold) return 'Esa oferta ya no está.';
    const cost = offerCost(run, o);
    if (run.gold < cost) return 'No te alcanza el oro.';
    if (o.seal) chosen[0].seal = o.seal;
    if (o.tr) chosen[0].tr = o.tr;
    run.gold -= cost;
    o.sold = true;
    run.stats.forged++;
  } else if (p.kind === 'dup') {
    if (chosen.length !== 1) return 'Elige una carta.';
    run.deck.push({ ...chosen[0], id: `c-${++run.serial}` });
  } else {
    if (chosen.length !== 2 || !chosen.every(isPlain)) return 'Elige dos cartas de baraja.';
    if (run.deck.length - 1 < MIN_DECK) return `El mazo no puede bajar de ${MIN_DECK} cartas.`;
    const [a, b] = chosen;
    const high = cardValue(a) >= cardValue(b) ? a : b;
    const fused: Card = { id: `c-${++run.serial}`, suit: a.suit, rank: high.rank, tr: 'policromado' };
    const seal = a.seal ?? b.seal;
    if (seal) fused.seal = seal;
    run.deck = run.deck.filter((c) => c !== a && c !== b);
    run.deck.push(fused);
    run.scrap += 2;
    run.stats.burned += 2;
    run.stats.forged++;
  }
  run.pending = null;
  if (run.phase === 'event') advance(run);
  return null;
}

/** Obras superadas (las saltadas no cuentan como demolidas, pero sí como camino recorrido). */
export const stagesCleared = (run: Run) => (run.phase === 'battle' || run.phase === 'map' || run.phase === 'pack' || run.phase === 'lost' ? run.stage - 1 : run.stage);
export const depthOf = (run: Run) => Math.max(0, stagesCleared(run) - LAST_STAGE);

export function renownFor(run: Run): number {
  const base = Math.min(LAST_STAGE, stagesCleared(run)) + (run.conquered ? 5 : 0) + depthOf(run);
  return Math.max(1, Math.ceil(base * (1 + 0.25 * run.ascension)));
}

/** Abona al gremio el renombre de una campaña terminada. */
export function settle(meta: Meta, run: Run): number {
  const gained = renownFor(run);
  meta.renown += gained;
  meta.runs++;
  meta.best = Math.max(meta.best, Math.min(LAST_STAGE, stagesCleared(run)));
  if (run.conquered) {
    meta.wins++;
    meta.ascMax = Math.min(MAX_ASCENSION, Math.max(meta.ascMax, run.ascension + 1));
    // sellos de maestría: el nivel más alto ganado con cada herramienta puesta y con esta baraja
    const level = run.ascension + 1;
    for (const t of run.tools) meta.mastery.tools[t.id] = Math.max(meta.mastery.tools[t.id] ?? 0, level);
    meta.mastery.decks[run.deckId] = Math.max(meta.mastery.decks[run.deckId] ?? 0, level);
  }
  if (run.daily) {
    const cleared = stagesCleared(run);
    if (meta.daily.date !== run.daily || cleared > meta.daily.cleared) meta.daily = { date: run.daily, cleared, won: run.conquered };
    meta.stats.dailies++;
  }
  return gained;
}

/** Reordena el cinturón de la campaña y, si hay obra en curso, el de la mesa (misma permutación). */
export function reorderBelt(run: Run, state: GameState | null, order: number[]): string | null {
  const err = runAction(run, { t: 'reorder', order });
  if (err) return err;
  if (state && state.phase === 'playing') state.tools = reorder(state.tools, order) ?? state.tools;
  return null;
}

/**
 * La campaña tal como viaja a los clientes de una sala: sin el estado del azar ni la semilla
 * (con ellos se podría deducir el orden de la cantera), y sin los hallazgos que aún no salieron.
 * La semilla se revela cuando la campaña termina (si luego se sigue a los Cimientos abisales,
 * el servidor vuelve a sembrar el azar).
 */
export function publicRun(run: Run, uid: number): Run {
  const over = run.phase === 'lost' || run.phase === 'won';
  return { ...run, id: uid, rng: 0, events: [], seedText: over ? run.seedText : '' };
}

/** La herramienta que más veces se activó: la MVP del acta. */
export function mvpTool(run: Run): string | null {
  const best = Object.entries(run.stats.toolUse).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

/** Base de Fuerza y Resonancia de una formación con los planos de la campaña. */
export const formBase = (run: Run, f: Formation) => ({ f: FORM[f].f + run.levels[f] * FORM[f].lf, r: Math.round((FORM[f].r + run.levels[f] * FORM[f].lr) * 100) / 100 });
