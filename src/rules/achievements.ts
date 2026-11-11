// Logros: metas que se cumplen jugando campañas. Dan renombre y desbloquean barajas iniciales
// y cartas legendarias. Viven en el gremio de cada jugador (Meta), así que cuentan igual
// en solitario y en sala online.
import type { GameEvent } from './engine';
import { BOSSES, DECKS, Meta, RELICS, Run, STAGES } from './run';
import { BASE_POOL, SPECIALS } from './specials';

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

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primera', name: 'Primera piedra', desc: 'Demuele tu primera obra de campaña.', renown: 1, progress: count((m) => m.stats.reach, 1) },
  { id: 'capataz', name: 'Adiós, capataz', desc: 'Supera la obra 3.', renown: 2, progress: count((m) => m.stats.reach, 3) },
  { id: 'media', name: 'Media ciudad', desc: 'Supera la obra 5.', renown: 3, progress: count((m) => m.stats.reach, 5) },
  { id: 'madre', name: 'La Torre Madre', desc: 'Gana una campaña.', renown: 5, progress: count((m) => m.wins, 1) },
  { id: 'asc3', name: 'Maestro de obras', desc: 'Gana una campaña en ascenso 3 o más.', renown: 8, progress: count((m) => m.stats.winAsc + 1, 4) },
  { id: 'doblepar', name: 'Dos y dos', desc: 'Juega un doble par.', renown: 1, progress: flag((m) => has(m.seen.forms, 'doblepar')) },
  { id: 'color', name: 'Todo al mismo palo', desc: 'Juega un color.', renown: 1, progress: flag((m) => has(m.seen.forms, 'color')) },
  { id: 'full', name: 'Casa llena', desc: 'Juega un full.', renown: 2, progress: flag((m) => has(m.seen.forms, 'full')) },
  { id: 'poker', name: 'Póker', desc: 'Juega un póker.', renown: 3, progress: flag((m) => has(m.seen.forms, 'poker')) },
  { id: 'golpe100', name: 'De un solo golpe', desc: 'Haz 100 o más de daño con un golpe.', renown: 3, progress: count((m) => m.stats.maxHit, 100) },
  { id: 'golpe300', name: 'Terremoto', desc: 'Haz 300 o más de daño con un golpe.', renown: 6, progress: count((m) => m.stats.maxHit, 300) },
  { id: 'limpio10', name: 'Cirujano', desc: 'Da 10 golpes limpios.', renown: 2, progress: count((m) => m.stats.cleans, 10) },
  { id: 'pisos100', name: 'Cien pisos', desc: 'Demuele 100 pisos.', renown: 3, progress: count((m) => m.stats.floors, 100) },
  { id: 'pisos500', name: 'Demoledor', desc: 'Demuele 500 pisos.', renown: 6, progress: count((m) => m.stats.floors, 500) },
  { id: 'intacto', name: 'Ni un rasguño', desc: 'Termina una obra con el búnker entero.', renown: 2, progress: count((m) => m.stats.intact, 1) },
  { id: 'rico', name: 'Tacaño', desc: 'Junta 30 de oro a la vez.', renown: 2, progress: count((m) => m.stats.maxGold, 30) },
  { id: 'coleccion', name: 'Coleccionista', desc: 'Consigue las 16 cartas especiales comunes, entre todas tus campañas.', renown: 5, progress: count((m) => m.seen.specials.filter((id) => BASE_POOL.includes(id)).length, BASE_POOL.length) },
  { id: 'ferretero', name: 'Cliente del mes', desc: 'Lleva las 22 herramientas del Ferretero, entre todas tus campañas.', renown: 8, progress: count((m) => m.seen.relics.length, RELICS.length) },
  ...BOSSES.map(
    (b): Achievement => ({ id: `j-${b.id}`, name: `Trofeo: ${b.who}`, desc: `Derrota a ${b.who} (${b.name.toLowerCase()}).`, renown: 2, progress: flag((m) => has(m.seen.bosses, b.id)) }),
  ),
  { id: 'jefes', name: 'Cazajefes', desc: 'Derrota a los 7 jefes de obra.', renown: 8, progress: count((m) => m.seen.bosses.length, BOSSES.length) },
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
    } else if (ev.e === 'hit' && !ev.splash) meta.stats.maxHit = Math.max(meta.stats.maxHit, ev.amount);
    else if (ev.e === 'play') add(meta.seen.forms, ev.formation);
  }
}

/** Anota en el gremio el estado de la campaña (colección, récords). Se puede llamar las veces que haga falta. */
export function noteRun(meta: Meta, run: Run): void {
  for (const id of run.relics) add(meta.seen.relics, id);
  for (const c of run.deck) if (c.sp) add(meta.seen.specials, c.sp);
  for (const id of run.beaten) add(meta.seen.bosses, id);
  const cleared = run.phase === 'won' ? STAGES.length : run.phase === 'battle' || run.phase === 'pack' || run.phase === 'lost' ? run.stage - 1 : run.stage;
  meta.stats.reach = Math.max(meta.stats.reach, cleared);
  meta.stats.maxGold = Math.max(meta.stats.maxGold, run.gold);
  meta.stats.intact = Math.max(meta.stats.intact, run.intact);
  if (run.phase === 'won') meta.stats.winAsc = Math.max(meta.stats.winAsc, run.ascension);
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
