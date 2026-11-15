// Partida guiada: un asalto pequeño con la mano y el Mazo preparados para enseñar, jugando, cinco cosas:
// el poder de un palo, el trono Inmune, La Manga, la cuenta Daño × Multi = Golpe y el Golpe exacto.
// Corre entera en el cliente con el mismo motor; tests/tutorial.test.ts la juega de principio a fin.
//
// Dos tronos, como el asalto 1 de la campaña: PICAS (una Sota) y CORAZONES (un Rey y detrás una Reina).
// DIAMANTES y TRÉBOLES no están en esta mesa. El guion, siguiendo el foco (5 acciones; la última gana):
//   1 · palo    6♣ a PICAS (Sota, Vida 13): 6 × 1 = 6, queda en 7; los ♣ dan +2 de Escudo.
//   2 · inmune  8♥ a PICAS: 8 × 1 = 8, cae la Sota y PICAS cae. Los ♥ no harían nada a CORAZONES.
//   3 · manga   el 9♦ a La Manga (no gasta el turno).
//   4 · cuenta  pareja 7♦ 7♣ a CORAZONES (Rey, Vida 20): (2 + 14) × 2 = 32, cae el Rey; +2 de Escudo.
//               Los ♦ salpican a otro trono en pie, y no queda ninguno (con un ♠ el sobrante Perforaría).
//   5 · exacto  el 9♦ de La Manga a CORAZONES (Reina, Vida 9): 9 × 1 = 9 justos. Golpe exacto y victoria.
// Los Contraataques del guion sacan palos de tronos ausentes o caídos: no hacen nada. Fuera del guion la
// mesa tampoco aprieta: Ataque 1 o 2 contra 20 de Vida.
import { Action, Card, Config, DEFAULT_CONFIG, GameEvent, GameState, PlayerView, Suit, multiplier, newTowers, standing } from './engine';

export const TUTORIAL_PLAYER = 'tu';

export const TUTORIAL_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  collapseLoss: 2,
  floorHp: { 11: 13, 12: 9, 13: 20 },
  floorThreat: { 11: 1, 12: 1, 13: 2 },
  reserveSize: 1,
};

const card = (id: string): Card => (id[0] === 'X' ? { id, suit: 'X', rank: 0 } : { id, suit: id[0] as Suit, rank: Number(id.slice(1)) });

const HAND = ['C6', 'H8', 'D9', 'D7', 'C7', 'H2', 'S3'];
/** Orden del Mazo. Los tres Contraataques del guion (posiciones 0, 2 y 4) sacan ♣, ♠ y ♦: tronos ausentes o ya caídos. */
const DECK = ['C2', 'H3', 'S2', 'D2', 'D3', 'C3', 'S4', 'H4', 'C4', 'D4', 'S5', 'H5', 'C5', 'D5', 'S6', 'H6', 'D6', 'H7', 'S7', 'S8', 'C8', 'D8', 'S9', 'H9', 'C9', 'S10', 'H10', 'C10', 'D10', 'X1', 'S1', 'H1', 'C1', 'D1', 'X2'];
/** Los dos tronos de la mesa: una Sota (13 de Vida) en PICAS; un Rey (20) y detrás una Reina (9) en CORAZONES. */
const FLOORS: Partial<Record<Suit, number[]>> = { S: [11], H: [13, 12] };

export function createTutorial(): GameState {
  const towers = newTowers([], TUTORIAL_CONFIG, ['S', 'H']);
  for (const t of Object.values(towers)) t.floors = [...(FLOORS[t.suit] ?? [])];
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
  /** Jugada que sugiere el foco: cartas y trono. En `manga`, la carta que se guarda. */
  cards?: string[];
  target?: Suit;
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
  cards,
  ...(target ? { target } : {}),
});

export const TUTORIAL_STEPS: TutorialStep[] = [
  line('palo', 'El poder del palo', 'Juega el <b>6♣</b> contra PICAS: los ♣ te dan Escudo.', 'cards', (_v, ev) => sawPower(ev), ['C6'], 'S'),
  line('inmune', 'Trono Inmune', 'Tus ♥ no hacen nada a CORAZONES: <b>8♥</b> a PICAS.', { ui: 'inmune' }, dodgedImmune, ['H8'], 'S'),
  line('manga', 'La Manga', 'Guarda el <b>9♦</b> en La Manga para después.', { ui: 'manga' }, (_v, ev) => ev.some((e) => e.e === 'stash' && !!e.card), ['D9']),
  line('cuenta', 'La cuenta', 'Pareja de <b>7</b> a CORAZONES: Daño 16 × Multi 2 = 32.', { ui: 'cuenta' }, (_v, ev) => (played(ev)?.cards.length ?? 0) >= 2 && ev.some((e) => e.e === 'impact'), ['D7', 'C7'], 'H'),
  line('exacto', 'Golpe exacto', 'El <b>9♦</b> de La Manga a CORAZONES: 9 justos.', 'target', (_v, ev) => ev.some((e) => e.e === 'floorDown' && e.clean), ['D9'], 'H'),
];

/** Acción que sugiere un paso guiado (en `manga`, guardar su carta). */
export function stepAction(step: TutorialStep): Action | null {
  if (!step.cards?.length) return null;
  if (step.id === 'manga') return { type: 'stash', card: step.cards[0] };
  if (!step.target) return null;
  if (step.cards.length === 1 && step.cards[0][0] === 'X') return { type: 'joker', card: step.cards[0], target: step.target };
  return { type: 'attack', cards: step.cards, target: step.target };
}
