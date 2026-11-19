// Logros: metas que se cumplen jugando campañas. Dan Coronas y desbloquean barajas iniciales
// y cartas legendarias. Viven en la Orden de cada jugador (Meta), así que cuentan igual
// en solitario y en sala online.
import type { GameEvent } from './engine';
import { BOSSES, DECKS, LAST_STAGE, Meta, Run, depthOf, stagesCleared } from './run';
import { ESQUIRLAS_POR_CORONA } from './migracion';
import { BASE_POOL, SPECIALS } from './specials';
import { TOOL_SLOTS } from './tools';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  /** Esquirlas de Corona que da al cumplirse (campo `renown`): desde la V12, las Coronas de la tabla × ESQUIRLAS_POR_CORONA. */
  renown: number;
  /** Progreso hacia la meta: [actual, objetivo]. */
  progress(meta: Meta): [number, number];
}

const flag = (ok: (m: Meta) => boolean) => (m: Meta): [number, number] => [ok(m) ? 1 : 0, 1];
const count = (n: (m: Meta) => number, goal: number) => (m: Meta): [number, number] => [Math.min(goal, n(m)), goal];
const has = (list: string[], id: string) => list.includes(id);
/** «Vence al Usurero», «Vence a la Dama del Cáliz»: el artículo se contrae como en castellano. */
const toWho = (who: string) => (who.startsWith('El ') ? `al ${who.slice(3)}` : `a ${who.replace(/^La /, 'la ')}`);
/** Amuletos distintos que pide «Cliente del Tratante» (V40 1d: de 22, 16; con 52 Reliquias eran 30). */
export const TOOL_GOAL = 16;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primera', name: 'Primer paso', desc: 'Ganá tu primer asalto de campaña.', renown: 1, progress: count((m) => m.stats.reach, 1) },
  { id: 'capataz', name: 'Adiós, carcelero', desc: 'Supera el asalto 2.', renown: 2, progress: count((m) => m.stats.reach, 2) },
  { id: 'media', name: 'Medio castillo', desc: 'Supera el asalto 3.', renown: 3, progress: count((m) => m.stats.reach, 3) },
  { id: 'madre', name: 'Fin del reinado', desc: 'Ganá una campaña.', renown: 5, progress: count((m) => m.wins, 1) },
  { id: 'asc3', name: 'Gran conspirador', desc: 'Ganá una campaña en el Reinado 4 o superior.', renown: 8, progress: count((m) => m.stats.winAsc + 1, 4) },
  { id: 'abismo', name: 'Más allá del trono', desc: 'Supera un Trono infinito.', renown: 4, progress: count((m) => m.stats.depth, 1) },
  { id: 'abismo3', name: 'Sin fin', desc: 'Supera tres Tronos infinitos en una campaña.', renown: 8, progress: count((m) => m.stats.depth, 3) },
  { id: 'doblepar', name: 'Dos y dos', desc: 'Jugá un doble par.', renown: 1, progress: flag((m) => has(m.seen.forms, 'doblepar')) },
  { id: 'color', name: 'Todo al mismo palo', desc: 'Jugá un color.', renown: 1, progress: flag((m) => has(m.seen.forms, 'color')) },
  { id: 'full', name: 'Casa llena', desc: 'Jugá un full.', renown: 2, progress: flag((m) => has(m.seen.forms, 'full')) },
  { id: 'poker', name: 'Póker', desc: 'Jugá un póker.', renown: 3, progress: flag((m) => has(m.seen.forms, 'poker')) },
  { id: 'real', name: 'Escalera real', desc: 'Jugá una escalera de color de 5 cartas o más.', renown: 3, progress: flag((m) => has(m.seen.forms, 'escaleracolor5')) },
  { id: 'golpe100', name: 'De un solo golpe', desc: 'Hacé un Golpe de 100 o más.', renown: 2, progress: count((m) => m.stats.maxHit, 100) },
  { id: 'golpe500', name: 'Trueno', desc: 'Hacé un Golpe de 500 o más.', renown: 4, progress: count((m) => m.stats.maxHit, 500) },
  { id: 'golpe2000', name: 'Cataclismo', desc: 'Hacé un Golpe de 2000 o más.', renown: 8, progress: count((m) => m.stats.maxHit, 2000) },
  { id: 'limpio10', name: 'Mano firme', desc: 'Da 10 Golpes exactos.', renown: 2, progress: count((m) => m.stats.cleans, 10) },
  { id: 'limpio50', name: 'Pulso de ladrón', desc: 'Da 50 Golpes exactos.', renown: 5, progress: count((m) => m.stats.cleans, 50) },
  { id: 'pisos100', name: 'Cien guardias', desc: 'Abatí a 100 guardias.', renown: 3, progress: count((m) => m.stats.floors, 100) },
  { id: 'pisos500', name: 'Azote de la corte', desc: 'Abatí a 500 guardias.', renown: 6, progress: count((m) => m.stats.floors, 500) },
  { id: 'intacto', name: 'Ni un rasguño', desc: 'Terminá un asalto con la Vida entera.', renown: 2, progress: count((m) => m.stats.intact, 1) },
  { id: 'rico', name: 'Tacaño', desc: 'Juntá 30 de oro a la vez.', renown: 2, progress: count((m) => m.stats.maxGold, 30) },
  { id: 'cinturon', name: 'Faja llena', desc: `Llevá ${TOOL_SLOTS} Amuletos a la vez.`, renown: 3, progress: count((m) => m.stats.maxTools, TOOL_SLOTS) },
  { id: 'forja', name: 'Lacrador', desc: 'Estampa 10 sellos de lacre o acabados.', renown: 3, progress: count((m) => m.stats.forged, 10) },
  { id: 'contratos', name: 'De guapo', desc: 'Vencé a 10 Guardias Bravos.', renown: 3, progress: count((m) => m.stats.contracts, 10) },
  { id: 'atajo', name: 'Al calor del fogón', desc: 'Descansá en 3 Fogones.', renown: 2, progress: count((m) => m.stats.skips, 3) },
  { id: 'coleccion', name: 'Coleccionista', desc: `Conseguí las ${BASE_POOL.length} Trampas del Bufón, entre todas tus campañas.`, renown: 5, progress: count((m) => m.seen.specials.filter((id) => BASE_POOL.includes(id)).length, BASE_POOL.length) },
  { id: 'ferretero', name: 'Cliente del Tratante', desc: `Llevá ${TOOL_GOAL} Amuletos distintos, entre todas tus campañas.`, renown: 8, progress: count((m) => m.seen.tools.length, TOOL_GOAL) },
  ...BOSSES.map(
    (b): Achievement => ({ id: `j-${b.id}`, name: `Trofeo: ${b.who}`, desc: `Vence ${toWho(b.who)} (${b.name.toLowerCase()}).`, renown: 2, progress: flag((m) => has(m.seen.bosses, b.id)) }),
  ),
  { id: 'jefes', name: 'Ningún rey en pie', desc: `Vence a los ${BOSSES.length} Reyes.`, renown: 8, progress: count((m) => m.seen.bosses.length, BOSSES.length) },
];
// V12: una sola moneda permanente. Cada logro da sus Coronas de siempre en Esquirlas de Corona (× 100).
for (const a of ACHIEVEMENTS) a.renown *= ESQUIRLAS_POR_CORONA;

/** Qué desbloquea cada logro, para mostrarlo. */
export function unlocksOf(id: string): string | null {
  const deck = DECKS.find((d) => d.unlock === id);
  if (deck) return deck.name;
  const cards = SPECIALS.filter((s) => s.locked === id);
  // V40 1c · el trofeo de un Rey abre las dos legendarias de su palo
  if (cards.length === 2) return `Cartas legendarias: ${cards[0].name} y ${cards[1].name}`;
  return cards.length ? `Carta legendaria: ${cards[0].name}` : null;
}

/** Cartas legendarias que este jugador ya puede sortear. */
export const unlockedPool = (meta: Meta): string[] => SPECIALS.filter((s) => s.locked && meta.ach[s.locked]).map((s) => s.id);
export const deckUnlocked = (meta: Meta, id: string): boolean => {
  const d = DECKS.find((x) => x.id === id);
  return !!d && (d.unlock === null || !!meta.ach[d.unlock]);
};

const add = (list: string[], id: string) => void (list.includes(id) || list.push(id));

/** Anota en el gremio lo que pasa en la mesa. */
export function noteEvents(meta: Meta, events: GameEvent[]): void {
  for (const ev of events) {
    if (ev.e === 'floorDown') {
      meta.stats.floors++;
      if (ev.clean) meta.stats.cleans++;
    } else if (ev.e === 'impact') meta.stats.maxHit = Math.max(meta.stats.maxHit, ev.total);
    else if (ev.e === 'play') {
      add(meta.seen.forms, ev.formation);
      if (ev.formation === 'escaleracolor' && ev.cards.filter((c) => !c.sp).length >= 5) add(meta.seen.forms, 'escaleracolor5');
    }
  }
}

/** Anota en el gremio el estado de la campaña (colección, récords). Se puede llamar las veces que haga falta. */
export function noteRun(meta: Meta, run: Run): void {
  for (const t of run.tools) add(meta.seen.tools, t.id);
  for (const c of run.deck) if (c.sp) add(meta.seen.specials, c.sp);
  for (const id of run.beaten) add(meta.seen.bosses, id);
  meta.stats.reach = Math.max(meta.stats.reach, Math.min(LAST_STAGE, stagesCleared(run)));
  meta.stats.depth = Math.max(meta.stats.depth, depthOf(run));
  meta.stats.maxGold = Math.max(meta.stats.maxGold, run.gold);
  meta.stats.intact = Math.max(meta.stats.intact, run.intact);
  meta.stats.maxTools = Math.max(meta.stats.maxTools, run.tools.length);
  if (run.conquered) meta.stats.winAsc = Math.max(meta.stats.winAsc, run.ascension);
  // lo que la campaña va acumulando se abona por diferencia, para no contarlo dos veces
  if (meta.last.id !== run.id) meta.last = { id: run.id, forged: 0, contracts: 0, skips: 0 };
  for (const k of ['forged', 'contracts', 'skips'] as const) {
    if (run.stats[k] < meta.last[k]) meta.last[k] = 0; // misma semilla, campaña nueva
    meta.stats[k] += run.stats[k] - meta.last[k];
    meta.last[k] = run.stats[k];
  }
}

/** Concede los logros recién cumplidos (con su renombre) y los devuelve. */
export function claim(meta: Meta): Achievement[] {
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (meta.ach[a.id]) continue;
    const [now, goal] = a.progress(meta);
    if (now >= goal) {
      meta.ach[a.id] = true;
      meta.renown += a.renown;
      fresh.push(a);
    }
  }
  return fresh;
}
