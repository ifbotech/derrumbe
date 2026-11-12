// Partida guiada: un asalto pequeño con el mazo preparado para enseñar cada regla en orden.
// Corre entera en el cliente con el mismo motor; un test la juega de principio a fin.
import { Action, Card, Config, DEFAULT_CONFIG, GameState, Suit, Treatment, newTowers } from './engine';

export const TUTORIAL_PLAYER = 'tu';

export const TUTORIAL_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  collapseLoss: 2,
  floorHp: { 11: 10, 12: 14, 13: 18 },
  floorThreat: { 11: 1, 12: 2, 13: 2 },
  reserveSize: 0,
};

const TREATED: Record<string, Treatment> = { S10: 'forjado' };
const card = (id: string): Card => {
  if (id[0] === 'X') return { id, suit: 'X', rank: 0 };
  const c: Card = { id, suit: id[0] as Suit, rank: Number(id.slice(1)) };
  if (TREATED[id]) c.tr = TREATED[id];
  return c;
};

const HAND = ['S4', 'H6', 'C6', 'D3', 'D4', 'D5', 'C5'];
/** Orden del Mazo: Contraataques y robos de cada paso, ya calculados. */
const DECK = ['H2', 'S5', 'C2', 'C3', 'X1', 'S2', 'S10', 'C7', 'H3', 'D9', 'H8', 'D7', 'H9', 'C4', 'D2', 'S6', 'D8', 'H7', 'C9', 'S3', 'D6', 'H10', 'C10', 'S7', 'D10', 'H5', 'C8', 'S8', 'H4', 'S9', 'D1', 'H1', 'C1', 'S1', 'X2'];
const FLOORS: Record<Suit, number[]> = { S: [11, 12, 13], D: [11, 12], H: [11], C: [11] };

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

export const TUTORIAL_INTRO: { title: string; text: string }[] = [
  {
    title: 'Los cuatro tronos',
    text: 'Arriba están <b>los cuatro tronos</b>, uno por palo. Cada trono tiene su <b>guardia</b>: Sota, Reina y Rey, cada uno con su <b>Vida</b> (la barra roja) y su <b>Ataque</b>. Tu misión: abatirlos a todos. En este asalto de prácticas ya quedan pocos.',
  },
  {
    title: 'Tu Vida',
    text: 'A la derecha está <b>tu Vida</b>. Después de cada jugada llega el <b>Contraataque</b>: un trono te ataca. Si tu Vida llega a 0, la conjura se deshace.',
  },
  {
    title: 'Daño × Multi',
    text: 'Cada golpe se calcula igual: <b>Daño × Multi = Golpe</b>. Las cartas ponen el <b>Daño</b> (su número) y la <b>formación</b> con que las juegas pone el <b>Multi</b>. Antes de golpear verás la cuenta en el marcador. Vamos paso a paso.',
  },
];

export interface TutorialStep {
  title: string;
  /** Qué hacer. */
  say: string;
  /** Cartas y torre obligatorias; sin ellas el paso es de juego libre. */
  cards?: string[];
  target?: Suit;
  /** Qué acaba de pasar. */
  after?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Golpea con ventaja',
    say: 'Pulsa el <b>4♠</b> de tu mano y luego el trono de <b>DIAMANTES</b>. Cada trono es débil a un palo: ♠ corta ♦, así que tu 4 suma <b>8 de Daño</b>. Una carta sola lleva Multi ×1: <b>Golpe de 8</b>.',
    cards: ['S4'],
    target: 'D',
    after: 'Tu Golpe fue de 8. Después llegó el <b>Contraataque</b>: salió un ♥, así que el trono de CORAZONES te atacó con su Ataque (1). Al final robaste hasta completar la mano.',
  },
  {
    title: 'Grupos y poderes',
    say: 'Un <b>grupo</b> son cartas del mismo número: pone 2 de Daño y lleva Multi <b>×1,2</b>. Elige <b>6♥</b> y <b>6♣</b> y golpea a <b>TRÉBOLES</b>. ♥ doblega ♣ (×2), pero un palo no hace nada a su propio trono: es <b>Inmune</b>.',
    cards: ['H6', 'C6'],
    target: 'C',
    after: '2 + 12 = 14 de Daño × 1,2 = <b>17</b>: cayó la Sota y TRÉBOLES es un <b>trono caído</b>. El 6♣ no sumó Daño, pero su poder te dio <b>Escudo</b> (+2), y el ♥ te <b>curó</b>. El Contraataque sacó un ♣, y un trono caído ya no ataca.',
  },
  {
    title: 'Escaleras y Salpica',
    say: 'Una <b>escalera</b> son 3 o más números seguidos; si además son del mismo palo es <b>escalera de color</b>: 10 de Daño y Multi <b>×2</b>. Juega <b>3♦ 4♦ 5♦</b> contra <b>CORAZONES</b>. ♦ compra ♥ y, además, los diamantes <b>salpican</b> a los otros tronos.',
    cards: ['D3', 'D4', 'D5'],
    target: 'H',
    after: '(10 + 24) × 2 = <b>68</b>: CORAZONES ha caído. La Salpica (un tercio de tus ♦, o sea 4) abatió a la Sota de DIAMANTES e hirió a PICAS. El Contraataque señaló a PICAS, pero tu <b>Escudo</b> lo paró entero.',
  },
  {
    title: 'Perfora',
    say: 'PICAS es débil a ♣. Juega el grupo <b>5♣ 5♠</b> contra <b>PICAS</b>. El 5♠ no suma Daño contra su trono, pero las picas <b>perforan</b>: lo que sobra pasa al guardia siguiente.',
    cards: ['C5', 'S5'],
    target: 'S',
    after: '(2 + 10) × 1,2 = <b>14</b>: cayó la Sota y los 8 que sobraban perforaron hasta la Reina. Sin una ♠ en la jugada, eso se habría perdido. Tu Escudo volvió a parar el Contraataque.',
  },
  {
    title: 'Golpe exacto',
    say: 'A la Reina de PICAS le quedan justo <b>6</b> de Vida. Juega el <b>3♣</b> (3 × 2 = 6). Abatir a un guardia con el Golpe justo es un <b>Golpe exacto</b>.',
    cards: ['C3'],
    target: 'S',
    after: '¡EXACTO! <b>No hubo Contraataque</b> y el <b>Impulso</b> le quitó un cuarto de Vida al guardia siguiente. Además empiezas una <b>Racha</b>: tu próximo golpe lleva +0,5 de Multi.',
  },
  {
    title: 'Motín',
    say: 'El Rey de PICAS es el guardia más peligroso que queda. Elige el <b>Comodín</b> y púlsalo: declaras un <b>Motín</b>.',
    cards: ['X1'],
    target: 'S',
    after: 'El Rey quedó <b>Desarmado</b> (Ataque 0 hasta que caiga) y no hubo Contraataque. El Comodín sale del juego.',
  },
  {
    title: 'Remata el asalto',
    say: 'Ahora juegas libre. Tu <b>10♠</b> lleva <b>Filo de plata</b> (+6 de Daño): contra DIAMANTES son 26 de Daño × 1,5 de la Racha. Después, el <b>7♣</b> basta para el Rey de PICAS. Recuerda: también puedes <b>descartar</b> cartas que no te sirvan.',
  },
];

/** Acción que corresponde a un paso guiado. */
export function stepAction(step: TutorialStep): Action | null {
  if (!step.cards || !step.target) return null;
  if (step.cards.length === 1 && step.cards[0][0] === 'X') return { type: 'joker', card: step.cards[0], target: step.target };
  return { type: 'attack', cards: step.cards, target: step.target };
}
