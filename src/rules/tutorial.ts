// Partida guiada: un asalto pequeño con la mano y el Mazo preparados para enseñar, jugando, cinco cosas:
// el poder de un palo, el trono Inmune, La Manga, la cuenta Daño × Multi = Golpe y el Golpe exacto.
// Corre entera en el cliente con el mismo motor; tests/tutorial.test.ts la juega de principio a fin.
//
// El guion, siguiendo el foco (5 acciones; la partida termina ganada con la última):
//   1 · palo    6♣ a PICAS (×2): 12 de Golpe, cae su guardia y los ♣ dan +2 de Escudo.
//   2 · inmune  8♥ a TRÉBOLES (×2): 16, cae. Los ♥ no harían nada a CORAZONES (×0).
//   3 · manga   el 9♦ a La Manga (no gasta el turno).
//   4 · cuenta  grupo 7♠ 7♣ a DIAMANTES: (2 + 14 + 7) × 1,2 = 28, cae.
//   5 · exacto  el 9♦ de La Manga a CORAZONES (×2): 18 justos contra 18 de Vida. Golpe exacto y victoria.
// Los Contraataques que salen (♠, ♣, ♦) son de tronos ya caídos: no hacen nada. Fuera del guion la mesa
// tampoco aprieta: Ataque 1 o 2 contra 20 de Vida.
import { Action, Card, Config, DEFAULT_CONFIG, GameEvent, GameState, PlayerView, Suit, multiplier, newTowers, standing } from './engine';

export const TUTORIAL_PLAYER = 'tu';

export const TUTORIAL_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  collapseLoss: 2,
  floorHp: { 11: 10, 12: 14, 13: 18 },
  floorThreat: { 11: 1, 12: 1, 13: 2 },
  reserveSize: 1,
};

const card = (id: string): Card => (id[0] === 'X' ? { id, suit: 'X', rank: 0 } : { id, suit: id[0] as Suit, rank: Number(id.slice(1)) });

const HAND = ['C6', 'H8', 'D9', 'S7', 'C7', 'H2', 'S3'];
/** Orden del Mazo. Los tres primeros Contraataques del guion (posiciones 0, 2 y 4) salen de tronos ya caídos. */
const DECK = ['S2', 'H3', 'C2', 'D2', 'D3', 'C3', 'S4', 'H4', 'C4', 'D4', 'S5', 'H5', 'C5', 'D5', 'S6', 'H6', 'D6', 'H7', 'D7', 'S8', 'C8', 'D8', 'S9', 'H9', 'C9', 'S10', 'H10', 'C10', 'D10', 'X1', 'S1', 'H1', 'C1', 'D1', 'X2'];
/** Un guardia por trono: Sota (10 de Vida) en PICAS y TRÉBOLES, Reina (14) en DIAMANTES, Rey (18) en CORAZONES. */
const FLOORS: Record<Suit, number[]> = { S: [11], C: [11], D: [12], H: [13] };

export function createTutorial(): GameState {
  const towers = newTowers([], TUTORIAL_CONFIG);
  for (const t of Object.values(towers)) t.floors = [...FLOORS[t.suit]];
  return {
    config: TUTORIAL_CONFIG,
    rng: 7,
    players: [{ id: TUTORIAL_PLAYER, name: 'TÚ', hand: HAND.map(card), reserve: [] }],
    deck: DECK.map(card),
    discard: [],
    towers,
    integrity: TUTORIAL_CONFIG.maxIntegrity,
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
}

/**
 * @deprecated Desde la 7.0 la partida guiada no tiene ventanas de texto: la enseñanza va en los pasos.
 * Queda vacía para que el cliente viejo compile; se retira en la V9.
 */
export const TUTORIAL_INTRO: { title: string; text: string }[] = [];

/** Qué señala el foco de un paso: las cartas del paso, el trono objetivo o una pieza de la mesa. */
export type TutorialFocus = 'cards' | 'target' | { ui: 'manga' | 'cuenta' | 'inmune' };

export interface TutorialStep {
  /** Identificador estable del paso. */
  id: 'palo' | 'inmune' | 'manga' | 'cuenta' | 'exacto';
  /** Lo que se le dice al jugador: una línea (≤ 60 caracteres), sin más HTML que un `<b>`. */
  line: string;
  focus: TutorialFocus;
  /** El paso se cumple con la jugada que acaba de pasar. Puro: solo mira la mesa de después y los eventos. */
  done(view: PlayerView, events: GameEvent[]): boolean;
  /** Título corto del paso. */
  title: string;
  /** @deprecated Igual a `line`. Se retira en la V9. */
  say: string;
  /** Jugada que sugiere el foco: cartas y trono. En `manga`, la carta que se guarda. */
  cards?: string[];
  target?: Suit;
  /** @deprecated Sin uso desde la 7.0 (la mesa ya enseña lo que pasó). */
  after?: string;
}

const played = (events: GameEvent[]) => events.find((e): e is Extract<GameEvent, { e: 'play' }> => e.e === 'play');

/** Se vio el poder de un palo: Escudo o Vida que suben, Salpica a otro trono o Perfora hasta el guardia siguiente. */
function sawPower(events: GameEvent[]): boolean {
  if (!played(events)) return false;
  return events.some(
    (e) =>
      (e.e === 'wall' && e.amount > 0) ||
      (e.e === 'repair' && e.amount > 0) ||
      (e.e === 'hit' && e.splash) ||
      (e.e === 'floorDown' && !e.towerDown && e.damage > 0),
  );
}

/** Golpe a un trono que sí recibe: ninguna carta de la jugada es Inmune contra él, y el trono de su palo sigue en pie. */
function dodgedImmune(view: PlayerView, events: GameEvent[]): boolean {
  const p = played(events);
  if (!p) return false;
  const suited = p.cards.filter((c) => c.suit !== 'X');
  if (!suited.length || suited.some((c) => multiplier(c.suit, p.target, view.config) === 0)) return false;
  return suited.some((c) => c.suit !== 'X' && standing(view.towers[c.suit as Suit]));
}

const line = (id: TutorialStep['id'], title: string, text: string, focus: TutorialFocus, done: TutorialStep['done'], cards: string[], target?: Suit): TutorialStep => ({
  id,
  line: text,
  focus,
  done,
  title,
  say: text,
  cards,
  ...(target ? { target } : {}),
});

export const TUTORIAL_STEPS: TutorialStep[] = [
  line('palo', 'El poder del palo', 'Juega el <b>6♣</b> contra PICAS: los ♣ te dan Escudo.', 'cards', (_v, ev) => sawPower(ev), ['C6'], 'S'),
  line('inmune', 'Trono Inmune', 'Tus ♥ no hacen nada a CORAZONES: <b>8♥</b> a TRÉBOLES.', { ui: 'inmune' }, dodgedImmune, ['H8'], 'C'),
  line('manga', 'La Manga', 'Guarda el <b>9♦</b> en La Manga para después.', { ui: 'manga' }, (_v, ev) => ev.some((e) => e.e === 'stash' && !!e.card), ['D9']),
  line('cuenta', 'La cuenta', 'Pareja de <b>7</b> a DIAMANTES: Daño × Multi = Golpe.', { ui: 'cuenta' }, (_v, ev) => (played(ev)?.cards.length ?? 0) >= 2 && ev.some((e) => e.e === 'impact'), ['S7', 'C7'], 'D'),
  line('exacto', 'Golpe exacto', 'El <b>9♦</b> de La Manga a CORAZONES: 18 justos.', 'target', (_v, ev) => ev.some((e) => e.e === 'floorDown' && e.clean), ['D9'], 'H'),
];

/** Acción que sugiere un paso guiado (en `manga`, guardar su carta). */
export function stepAction(step: TutorialStep): Action | null {
  if (!step.cards?.length) return null;
  if (step.id === 'manga') return { type: 'stash', card: step.cards[0] };
  if (!step.target) return null;
  if (step.cards.length === 1 && step.cards[0][0] === 'X') return { type: 'joker', card: step.cards[0], target: step.target };
  return { type: 'attack', cards: step.cards, target: step.target };
}
