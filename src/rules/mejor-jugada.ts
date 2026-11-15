// Mejor jugada (V12, SPECS/V12.md 1.6). Regla, tal como la lee el jugador:
//   «Mejor jugada: si puedes dar un Golpe exacto, lo elige. Si no, elige tu Golpe más alto. Tú confirmas.»
//
// Puro: no toca el estado. Recorre TODAS las formaciones legales que se pueden armar con la mano y La Manga
// (sin cartas especiales ni Comodín) contra cada trono en pie, con `previewStrike` (la misma cuenta que se
// enseña en mesa: reliquias, acabados, sellos, Expuesto y Racha incluidos). No golpea: la interfaz
// selecciona las cartas y el trono y el jugador confirma con Golpear.
//
// Desempates, por orden: Golpe más alto; menos cartas; trono en el orden ♠ ♦ ♥ ♣; `id` de las cartas.
import { arrange } from './bot';
import { Card, GameState, Player, SUITS, Suit, classify, currentPlayer, previewStrike, standing } from './engine';

/** La regla en una línea, tal como va en el Reglamento (clave `regla.mejor`; ≤ 100 caracteres). */
export const REGLA_MEJOR = 'Mejor jugada: si puedes dar un Golpe exacto, lo elige. Si no, elige tu Golpe más alto. Tú confirmas.';

export interface MejorJugada {
  /** Las cartas en el orden en que se juegan (el del bot: la más alta primero, lo que multiplica al final). */
  cards: string[];
  target: Suit;
  /** Golpe (Daño × Multi) contra el trono apuntado. */
  total: number;
  /** Si la jugada da un Golpe exacto. */
  exacto: boolean;
}

/** Más cartas que esto en mano y Manga ya no se recorren por fuerza bruta (2^n): no ocurre en una partida normal. */
const MAX_CARTAS = 14;

function jugador(state: GameState, playerId?: string): Player | undefined {
  return playerId === undefined ? currentPlayer(state) : state.players.find((p) => p.id === playerId);
}

/** Todas las formaciones legales con estas cartas (subconjuntos que `classify` acepta), en el orden de juego. */
export function formacionesLegales(cartas: Card[]): Card[][] {
  const lisas = cartas.filter((c) => c.suit !== 'X' && !c.sp).slice(0, MAX_CARTAS);
  const out: Card[][] = [];
  for (let mask = 1; mask < 1 << lisas.length; mask++) {
    const sub = lisas.filter((_, i) => mask & (1 << i));
    if (classify(sub)) out.push(arrange(sub));
  }
  return out;
}

/** Clave de desempate por `id`: los de la jugada, ordenados. */
const claveIds = (ids: string[]) => [...ids].sort().join('|');

/** ¿Gana `a` a `b`? Golpe más alto, menos cartas, trono ♠ ♦ ♥ ♣, `id` de cartas. */
function mejorQue(a: MejorJugada, b: MejorJugada): boolean {
  if (a.total !== b.total) return a.total > b.total;
  if (a.cards.length !== b.cards.length) return a.cards.length < b.cards.length;
  if (a.target !== b.target) return SUITS.indexOf(a.target) < SUITS.indexOf(b.target);
  return claveIds(a.cards) < claveIds(b.cards);
}

/** Cada jugada legal contra cada trono en pie, con su Golpe y si es exacta. */
export function jugadasPosibles(state: GameState, playerId?: string): MejorJugada[] {
  if (state.phase !== 'playing') return [];
  const p = jugador(state, playerId);
  if (!p) return [];
  const tronos = SUITS.filter((s) => standing(state.towers[s]));
  const out: MejorJugada[] = [];
  for (const cartas of formacionesLegales([...p.hand, ...p.reserve])) {
    for (const target of tronos) {
      const r = previewStrike(state, cartas, target);
      out.push({ cards: cartas.map((c) => c.id), target, total: r.total, exacto: r.clean });
    }
  }
  return out;
}

/**
 * La mejor jugada del jugador (por defecto, el del turno): el Golpe exacto más alto si hay alguno; si no, el
 * Golpe más alto que haga Daño. `null` si ninguna jugada hace Daño (la mesa dice «descarta o guarda en La Manga»).
 */
export function mejorJugada(state: GameState, playerId?: string): MejorJugada | null {
  let exacta: MejorJugada | null = null;
  let alta: MejorJugada | null = null;
  for (const j of jugadasPosibles(state, playerId)) {
    if (j.exacto && (!exacta || mejorQue(j, exacta))) exacta = j;
    if (j.total > 0 && (!alta || mejorQue(j, alta))) alta = j;
  }
  return exacta ?? alta;
}

/** Los `id` de las cartas (mano y Manga) que forman parte de alguna jugada que ya da un Golpe exacto. */
export function cartasConExacto(state: GameState, playerId?: string): string[] {
  const ids = new Set<string>();
  for (const j of jugadasPosibles(state, playerId)) if (j.exacto) for (const id of j.cards) ids.add(id);
  const p = jugador(state, playerId);
  // en el orden de la mano y luego la Manga, para que la interfaz no tenga que ordenarlas
  return p ? [...p.hand, ...p.reserve].map((c) => c.id).filter((id) => ids.has(id)) : [];
}
