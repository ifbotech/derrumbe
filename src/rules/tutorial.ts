// Partida guiada: una obra pequeña con el mazo preparado para enseñar cada regla en orden.
// Corre entera en el cliente con el mismo motor; un test la juega de principio a fin.
import { Action, Card, Config, DEFAULT_CONFIG, GameState, SUITS, Suit } from './engine';

export const TUTORIAL_PLAYER = 'tu';

export const TUTORIAL_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  collapseLoss: 2,
  floorHp: { 11: 10, 12: 14, 13: 18 },
  floorThreat: { 11: 1, 12: 2, 13: 2 },
};

const card = (id: string): Card => (id[0] === 'X' ? { id, suit: 'X', rank: 0 } : { id, suit: id[0] as Suit, rank: Number(id.slice(1)) });

const HAND = ['S4', 'H6', 'C6', 'D3', 'D4', 'D5', 'C8'];
/** Orden de la cantera: sirenas y robos de cada paso, ya calculados. */
const DECK = ['H2', 'S8', 'C2', 'C4', 'X1', 'S2', 'S10', 'S9', 'H3', 'D9', 'H8', 'D7', 'H9', 'C3', 'D2', 'H4', 'C7', 'S6', 'D8', 'H7', 'C9', 'S3', 'D6', 'H10', 'C10', 'S7', 'D10', 'H5', 'C5', 'S5', 'D1', 'H1', 'C1', 'S1', 'X2'];

export function createTutorial(): GameState {
  const floors: Record<Suit, number[]> = { S: [11, 13], D: [11, 12], H: [11], C: [11] };
  return {
    config: TUTORIAL_CONFIG,
    rng: 7,
    players: [{ id: TUTORIAL_PLAYER, name: 'TÚ', hand: HAND.map(card) }],
    deck: DECK.map(card),
    discard: [],
    towers: Object.fromEntries(SUITS.map((s) => [s, { suit: s, floors: floors[s], damage: 0, disarmed: false }])) as GameState['towers'],
    integrity: TUTORIAL_CONFIG.maxIntegrity,
    wall: 0,
    turn: 0,
    turnCount: 0,
    collapses: 0,
    phase: 'playing',
    lastSiren: null,
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
    title: 'Tu mano',
    text: 'Abajo están tus cartas. En tu turno golpeas una torre con <b>una carta</b>, un <b>grupo</b> o una <b>escalera</b>. Cada carta hace tanto daño como su número. Vamos paso a paso.',
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
    say: 'Pulsa el <b>4♠</b> de tu mano y luego la torre de <b>VIDRIO</b>. Cada torre es débil a un palo: ♠ rompe ♦, así que tu 4 hará <b>8</b> de daño.',
    cards: ['S4'],
    target: 'D',
    after: 'Hiciste 8 de daño y la carta empezó a agrietarse. Después sonó la <b>sirena</b>: salió un ♥, así que la torre de LADRILLO golpeó al búnker con su amenaza (1). Al final robaste hasta completar la mano.',
  },
  {
    title: 'Grupos y poderes',
    say: 'Un <b>grupo</b> son cartas del mismo número. Selecciona <b>6♥</b> y <b>6♣</b> y golpea <b>HORMIGÓN</b>. ♥ agrieta ♣ (×2), pero un palo nunca daña a su propia torre (×0).',
    cards: ['H6', 'C6'],
    target: 'C',
    after: 'El 6♥ hizo 12 y tiró la J: HORMIGÓN ya es <b>ruina</b>. El 6♣ no hizo daño, pero su poder levantó <b>muro</b> (+2), y el ♥ <b>reparó</b> el búnker. La sirena sacó un ♣, y una torre en ruinas ya no golpea.',
  },
  {
    title: 'Escaleras y esquirlas',
    say: 'Una <b>escalera</b> son 3 o más números seguidos. Juega <b>3♦ 4♦ 5♦</b> contra <b>LADRILLO</b>. ♦ corta ♥ (×2) y, además, los diamantes lanzan <b>esquirlas</b> a las otras torres.',
    cards: ['D3', 'D4', 'D5'],
    target: 'H',
    after: '24 de daño: LADRILLO en ruinas. Las esquirlas (un tercio de tus ♦, o sea 4) remataron la J de VIDRIO y dañaron ACERO. La sirena señaló a ACERO, pero el <b>muro</b> absorbió el golpe.',
  },
  {
    title: 'Perforar',
    say: 'ACERO es débil a ♣. Juega el grupo <b>8♣ 8♠</b> contra <b>ACERO</b>. El 8♠ no daña a su torre, pero las picas <b>perforan</b>: el daño que sobre pasa al piso siguiente.',
    cards: ['C8', 'S8'],
    target: 'S',
    after: 'El 8♣ hizo 16: cayó la J y los 10 sobrantes perforaron hasta la K. Sin una ♠ en la jugada, ese exceso se habría perdido. El muro frenó a la sirena otra vez.',
  },
  {
    title: 'Golpe limpio',
    say: 'A la K de ACERO le quedan exactamente <b>8</b>. Juega el <b>4♣</b> (×2 = 8). Tirar un piso con el daño exacto es un <b>golpe limpio</b>.',
    cards: ['C4'],
    target: 'S',
    after: '¡Golpe limpio! ACERO es ruina y, de premio, <b>la sirena no sonó</b> este turno.',
  },
  {
    title: 'Huelga',
    say: 'Solo queda la Q de VIDRIO. Selecciona el <b>comodín</b> y púlsala: declaras <b>huelga</b>.',
    cards: ['X1'],
    target: 'D',
    after: 'El piso quedó <b>desarmado</b> (amenaza 0 hasta que caiga) y la sirena calló. El comodín sale del juego.',
  },
  {
    title: 'Remata la obra',
    say: 'Ahora juegas libre. A VIDRIO le quedan 14 y es débil a ♠: el <b>10♠</b> basta (×2 = 20). Recuerda: también puedes <b>descartar</b> cartas que no te sirvan.',
  },
];

/** Acción que corresponde a un paso guiado. */
export function stepAction(step: TutorialStep): Action | null {
  if (!step.cards || !step.target) return null;
  if (step.cards.length === 1 && step.cards[0][0] === 'X') return { type: 'joker', card: step.cards[0], target: step.target };
  return { type: 'attack', cards: step.cards, target: step.target };
}
