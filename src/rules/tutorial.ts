// Partida guiada: una obra pequeña con el mazo preparado para enseñar cada regla en orden.
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
/** Orden de la cantera: sirenas y robos de cada paso, ya calculados. */
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
  };
}

export const TUTORIAL_INTRO: { title: string; text: string }[] = [
  {
    title: 'Las torres',
    text: 'Arriba hay <b>cuatro torres</b>, una por palo. Cada piso es una figura con una <b>resistencia</b> (la barra roja) y una <b>amenaza</b>. Tu trabajo es demolerlas todas. En esta obra de prácticas ya quedan pocos pisos.',
  },
  {
    title: 'El búnker',
    text: 'A la derecha está vuestro <b>búnker</b>. Después de cada jugada suena la <b>sirena</b> y una torre lo golpea. Si su <b>integridad</b> llega a 0, perdéis.',
  },
  {
    title: 'Fuerza × Resonancia',
    text: 'Cada golpe se calcula igual: <b>Fuerza × Resonancia</b>. Las cartas ponen la <b>Fuerza</b> (su número) y la <b>formación</b> con que las juegas pone la <b>Resonancia</b>. Antes de golpear verás la cuenta en el marcador. Vamos paso a paso.',
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
    say: 'Pulsa el <b>4♠</b> de tu mano y luego la torre de <b>VIDRIO</b>. Cada torre es débil a un palo: ♠ rompe ♦, así que tu 4 suma <b>8 de Fuerza</b>. Una carta sola resuena ×1: <b>8 de daño</b>.',
    cards: ['S4'],
    target: 'D',
    after: 'Hiciste 8 de daño. Después sonó la <b>sirena</b>: salió un ♥, así que la torre de LADRILLO golpeó al búnker con su amenaza (1). Al final robaste hasta completar la mano.',
  },
  {
    title: 'Grupos y poderes',
    say: 'Un <b>grupo</b> son cartas del mismo número: pone 2 de Fuerza y resuena <b>×1,2</b>. Selecciona <b>6♥</b> y <b>6♣</b> y golpea <b>HORMIGÓN</b>. ♥ agrieta ♣ (×2), pero un palo nunca daña a su propia torre.',
    cards: ['H6', 'C6'],
    target: 'C',
    after: '2 + 12 = 14 de Fuerza × 1,2 = <b>17</b>: cayó la J y HORMIGÓN ya es <b>ruina</b>. El 6♣ no sumó Fuerza, pero su poder levantó <b>muro</b> (+2), y el ♥ <b>reparó</b> el búnker. La sirena sacó un ♣, y una torre en ruinas ya no golpea.',
  },
  {
    title: 'Escaleras y esquirlas',
    say: 'Una <b>escalera</b> son 3 o más números seguidos; si además son del mismo palo es <b>escalera de color</b>: 10 de Fuerza y <b>×2</b>. Juega <b>3♦ 4♦ 5♦</b> contra <b>LADRILLO</b>. ♦ corta ♥ y, además, los diamantes lanzan <b>esquirlas</b> a las otras torres.',
    cards: ['D3', 'D4', 'D5'],
    target: 'H',
    after: '(10 + 24) × 2 = <b>68</b>: LADRILLO en ruinas. Las esquirlas (un tercio de tus ♦, o sea 4) remataron la J de VIDRIO y dañaron ACERO. La sirena señaló a ACERO, pero el <b>muro</b> absorbió el golpe.',
  },
  {
    title: 'Perforar',
    say: 'ACERO es débil a ♣. Juega el grupo <b>5♣ 5♠</b> contra <b>ACERO</b>. El 5♠ no suma Fuerza contra su torre, pero las picas <b>perforan</b>: el daño que sobre pasa al piso siguiente.',
    cards: ['C5', 'S5'],
    target: 'S',
    after: '(2 + 10) × 1,2 = <b>14</b>: cayó la J y los 8 sobrantes perforaron hasta la Q. Sin una ♠ en la jugada, ese exceso se habría perdido. El muro frenó a la sirena otra vez.',
  },
  {
    title: 'Golpe limpio',
    say: 'A la Q de ACERO le quedan exactamente <b>6</b>. Juega el <b>3♣</b> (3 × 2 = 6). Tirar un piso con el daño exacto es un <b>golpe limpio</b>.',
    cards: ['C3'],
    target: 'S',
    after: '¡Golpe limpio! <b>La sirena no sonó</b> y la <b>onda sísmica</b> le quitó un cuarto de resistencia al piso de abajo. Además empiezas una <b>racha</b>: tu próximo golpe resuena +0,5.',
  },
  {
    title: 'Huelga',
    say: 'La K de ACERO es el piso más peligroso que queda. Selecciona el <b>comodín</b> y púlsala: declaras <b>huelga</b>.',
    cards: ['X1'],
    target: 'S',
    after: 'El piso quedó <b>desarmado</b> (amenaza 0 hasta que caiga) y la sirena calló. El comodín sale del juego.',
  },
  {
    title: 'Remata la obra',
    say: 'Ahora juegas libre. Tu <b>10♠</b> está <b>forjado</b> (+6 de Fuerza): contra VIDRIO son 26 de Fuerza × 1,5 de la racha. Después, el <b>7♣</b> basta para la K de ACERO. Recuerda: también puedes <b>descartar</b> cartas que no te sirvan.',
  },
];

/** Acción que corresponde a un paso guiado. */
export function stepAction(step: TutorialStep): Action | null {
  if (!step.cards || !step.target) return null;
  if (step.cards.length === 1 && step.cards[0][0] === 'X') return { type: 'joker', card: step.cards[0], target: step.target };
  return { type: 'attack', cards: step.cards, target: step.target };
}
