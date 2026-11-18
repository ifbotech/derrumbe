// Partida guiada: un asalto pequeño con la mano y el Mazo preparados para enseñar, jugando, en tres jugadas:
// el poder de un palo y el enemigo Inmune, la cuenta Daño × Multi = Golpe y el Golpe exacto (V37: eran cinco;
// La Manga se queda para el Susurro de la mesa).
// Corre entera en el cliente con el mismo motor; tests/tutorial.test.ts la juega de principio a fin.
//
// Dos Casas, como el asalto 1 de la campaña: PICAS (una Sota) y, detrás, CORAZONES (una Reina).
// DIAMANTES y TRÉBOLES no están en esta mesa. V35: se combate a un enemigo cada vez (primero la Sota de PICAS) y en
// la partida guiada nadie contraataca (`sirenCount: 0`): no se puede perder. El guion (3 acciones; la última gana):
//   1 · palo    6♣ a PICAS (Sota, Vida 20): 6 × 1 = 6, queda en 14; los ♣ dan +2 de Escudo. Un ♠ no le haría
//               nada: PICAS es Inmune a su palo.
//   2 · cuenta  pareja 7♦ 7♣ a PICAS: (2 + 14) × 2 = 32, cae la Sota y PICAS cae; +2 de Escudo. El 7♦ salpica 2
//               a CORAZONES, que espera en la fila: su Reina pasa de 11 a 9.
//   3 · exacto  el 9♦ a CORAZONES (Reina, Vida 9): 9 × 1 = 9 justos. Golpe exacto y victoria.
// Fuera del guion la mesa tampoco aprieta: no hay Contraataques.
import { Action, Card, Config, DEFAULT_CONFIG, GameEvent, GameState, PlayerView, Suit, multiplier, newTowers } from './engine';

export const TUTORIAL_PLAYER = 'tu';

export const TUTORIAL_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  floorHp: { 11: 20, 12: 11, 13: 20 },
  floorThreat: { 11: 1, 12: 1, 13: 2 },
  reserveSize: 1,
  // en la partida guiada nadie contraataca
  sirenCount: 0,
};

const card = (id: string): Card => (id[0] === 'X' ? { id, suit: 'X', rank: 0 } : { id, suit: id[0] as Suit, rank: Number(id.slice(1)) });

const HAND = ['C6', 'H8', 'D9', 'D7', 'C7', 'H2', 'S3'];
/** Orden del Mazo (de aquí se roba para reponer la mano). */
const DECK = ['C2', 'H3', 'S2', 'D2', 'D3', 'C3', 'S4', 'H4', 'C4', 'D4', 'S5', 'H5', 'C5', 'D5', 'S6', 'H6', 'D6', 'H7', 'S7', 'S8', 'C8', 'D8', 'S9', 'H9', 'C9', 'S10', 'H10', 'C10', 'D10', 'X1', 'S1', 'H1', 'C1', 'D1', 'X2'];
/** Los dos tronos de la mesa: una Sota (20 de Vida) en PICAS y una Reina (11) en CORAZONES. */
const FLOORS: Partial<Record<Suit, number[]>> = { S: [11], H: [12] };

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

/** Golpe en el que ninguna carta es Inmune contra el enemigo golpeado (ninguna es de su palo). */
function noImmune(view: PlayerView, events: GameEvent[]): boolean {
  const p = played(events);
  if (!p) return false;
  const suited = p.cards.filter((c) => c.suit !== 'X');
  return suited.length > 0 && suited.every((c) => multiplier(c.suit, p.target, view.config) > 0);
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
  line('palo', 'Palo e Inmune', 'PICAS es Inmune a ♠. Juega el <b>6♣</b>: ♣ te da Escudo.', 'cards', (v, ev) => sawPower(ev) && noImmune(v, ev), ['C6'], 'S'),
  line('cuenta', 'La cuenta', 'Pareja de <b>7</b> a PICAS: Daño × Multi = Golpe.', { ui: 'cuenta' }, (_v, ev) => (played(ev)?.cards.length ?? 0) >= 2 && ev.some((e) => e.e === 'impact'), ['D7', 'C7'], 'S'),
  line('exacto', 'Golpe exacto', 'El <b>9♦</b> a CORAZONES: 9 justos.', 'target', (_v, ev) => ev.some((e) => e.e === 'floorDown' && e.clean), ['D9'], 'H'),
];

/** Acción que sugiere un paso guiado (en `manga`, guardar su carta). */
export function stepAction(step: TutorialStep): Action | null {
  if (!step.cards?.length) return null;
  if (step.id === 'manga') return { type: 'stash', card: step.cards[0] };
  if (!step.target) return null;
  if (step.cards.length === 1 && step.cards[0][0] === 'X') return { type: 'joker', card: step.cards[0], target: step.target };
  return { type: 'attack', cards: step.cards, target: step.target };
}
