// Logros: metas que se cumplen jugando campañas. Dan renombre y desbloquean barajas iniciales
// y cartas legendarias. Viven en el gremio de cada jugador (Meta), así que cuentan igual
// en solitario y en sala online.
import type { GameEvent } from './engine';
import { BOSSES, DECKS, LAST_STAGE, Meta, Run, depthOf, stagesCleared } from './run';
import { BASE_POOL, SPECIALS } from './specials';
import { TOOL_SLOTS } from './tools';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  /** Renombre que da al cumplirse. */
  renown: number;
  /** Progreso hacia la meta: [actual, objetivo]. */
  progress(meta: Meta): [number, number];
}

const flag = (ok: (m: Meta) => boolean) => (m: Meta): [number, number] => [ok(m) ? 1 : 0, 1];
const count = (n: (m: Meta) => number, goal: number) => (m: Meta): [number, number] => [Math.min(goal, n(m)), goal];
const has = (list: string[], id: string) => list.includes(id);
/** Herramientas distintas que pide «Cliente del mes». */
export const TOOL_GOAL = 30;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primera', name: 'Primera piedra', desc: 'Demuele tu primera obra de campaña.', renown: 1, progress: count((m) => m.stats.reach, 1) },
  { id: 'capataz', name: 'Adiós, capataz', desc: 'Supera la obra 3.', renown: 2, progress: count((m) => m.stats.reach, 3) },
  { id: 'media', name: 'Media ciudad', desc: 'Supera la obra 5.', renown: 3, progress: count((m) => m.stats.reach, 5) },
  { id: 'madre', name: 'La Torre Madre', desc: 'Gana una campaña.', renown: 5, progress: count((m) => m.wins, 1) },
  { id: 'asc3', name: 'Maestro de obras', desc: 'Gana una campaña en ascenso 3 o más.', renown: 8, progress: count((m) => m.stats.winAsc + 1, 4) },
  { id: 'abismo', name: 'Más abajo', desc: 'Supera un cimiento abisal.', renown: 4, progress: count((m) => m.stats.depth, 1) },
  { id: 'abismo3', name: 'Sin fondo', desc: 'Supera tres cimientos abisales en una campaña.', renown: 8, progress: count((m) => m.stats.depth, 3) },
  { id: 'diaria', name: 'Parte diario', desc: 'Termina una Obra diaria.', renown: 2, progress: count((m) => m.stats.dailies, 1) },
  { id: 'doblepar', name: 'Dos y dos', desc: 'Juega un doble par.', renown: 1, progress: flag((m) => has(m.seen.forms, 'doblepar')) },
  { id: 'color', name: 'Todo al mismo palo', desc: 'Juega un color.', renown: 1, progress: flag((m) => has(m.seen.forms, 'color')) },
  { id: 'full', name: 'Casa llena', desc: 'Juega un full.', renown: 2, progress: flag((m) => has(m.seen.forms, 'full')) },
  { id: 'poker', name: 'Póker', desc: 'Juega un póker.', renown: 3, progress: flag((m) => has(m.seen.forms, 'poker')) },
  { id: 'real', name: 'Escalera real', desc: 'Juega una escalera de color de 5 cartas o más.', renown: 3, progress: flag((m) => has(m.seen.forms, 'escaleracolor5')) },
  { id: 'golpe100', name: 'De un solo golpe', desc: 'Haz 100 o más de daño con un golpe.', renown: 2, progress: count((m) => m.stats.maxHit, 100) },
  { id: 'golpe500', name: 'Terremoto', desc: 'Haz 500 o más de daño con un golpe.', renown: 4, progress: count((m) => m.stats.maxHit, 500) },
  { id: 'golpe2000', name: 'Cataclismo', desc: 'Haz 2000 o más de daño con un golpe.', renown: 8, progress: count((m) => m.stats.maxHit, 2000) },
  { id: 'limpio10', name: 'Cirujano', desc: 'Da 10 golpes limpios.', renown: 2, progress: count((m) => m.stats.cleans, 10) },
  { id: 'limpio50', name: 'Pulso de relojero', desc: 'Da 50 golpes limpios.', renown: 5, progress: count((m) => m.stats.cleans, 50) },
  { id: 'pisos100', name: 'Cien pisos', desc: 'Demuele 100 pisos.', renown: 3, progress: count((m) => m.stats.floors, 100) },
  { id: 'pisos500', name: 'Demoledor', desc: 'Demuele 500 pisos.', renown: 6, progress: count((m) => m.stats.floors, 500) },
  { id: 'intacto', name: 'Ni un rasguño', desc: 'Termina una obra con el búnker entero.', renown: 2, progress: count((m) => m.stats.intact, 1) },
  { id: 'rico', name: 'Tacaño', desc: 'Junta 30 de oro a la vez.', renown: 2, progress: count((m) => m.stats.maxGold, 30) },
  { id: 'cinturon', name: 'Cinturón lleno', desc: `Lleva ${TOOL_SLOTS} herramientas a la vez.`, renown: 3, progress: count((m) => m.stats.maxTools, TOOL_SLOTS) },
  { id: 'forja', name: 'Timbrador', desc: 'Estampa 10 sellos o tratamientos.', renown: 3, progress: count((m) => m.stats.forged, 10) },
  { id: 'contratos', name: 'Hombre de palabra', desc: 'Cumple 10 contratos.', renown: 3, progress: count((m) => m.stats.contracts, 10) },
  { id: 'atajo', name: 'Por la puerta de atrás', desc: 'Salta 3 obras.', renown: 2, progress: count((m) => m.stats.skips, 3) },
  { id: 'coleccion', name: 'Coleccionista', desc: `Consigue las ${BASE_POOL.length} cartas especiales comunes, entre todas tus campañas.`, renown: 5, progress: count((m) => m.seen.specials.filter((id) => BASE_POOL.includes(id)).length, BASE_POOL.length) },
  { id: 'ferretero', name: 'Cliente del mes', desc: `Lleva ${TOOL_GOAL} herramientas distintas, entre todas tus campañas.`, renown: 8, progress: count((m) => m.seen.tools.length, TOOL_GOAL) },
  ...BOSSES.map(
    (b): Achievement => ({ id: `j-${b.id}`, name: `Trofeo: ${b.who}`, desc: `Derrota a ${b.who} (${b.name.toLowerCase()}).`, renown: 2, progress: flag((m) => has(m.seen.bosses, b.id)) }),
  ),
  { id: 'jefes', name: 'Cazajefes', desc: `Derrota a los ${BOSSES.length} jefes de obra.`, renown: 8, progress: count((m) => m.seen.bosses.length, BOSSES.length) },
];

/** Qué desbloquea cada logro, para mostrarlo. */
export function unlocksOf(id: string): string | null {
  const deck = DECKS.find((d) => d.unlock === id);
  if (deck) return deck.name;
  const card = SPECIALS.find((s) => s.locked === id);
  return card ? `Carta legendaria: ${card.name}` : null;
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
