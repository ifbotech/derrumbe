// Cartas especiales: no son de la baraja francesa. No tienen palo ni número: se suman a cualquier
// golpe como apoyo (hasta dos por golpe) o se juegan solas, y hacen su efecto.
// Se consiguen a la vista (selección tras cada asalto, Sobre lacrado del Mercado clandestino) o a ciegas
// (Sobre a ciegas). Las legendarias (el Tratante y los monarcas) solo entran en el sorteo tras su logro.

export interface Fx {
  /** Fuerza que suma al golpe. */
  flat?: number;
  /** Fuerza extra por cada carta de baraja del golpe. */
  flatPerCard?: number;
  /** Fuerza por cada punto de muro en pie (no lo gasta). */
  wallForce?: number;
  /** La carta más alta del golpe cuenta dos veces. */
  highDouble?: boolean;
  /** Todas las cartas del golpe valen como la más alta. */
  allHigh?: boolean;
  /** Todas las cartas del golpe pegan con ventaja, sea cual sea la torre. */
  allAdv?: boolean;
  /** Multiplica la Resonancia del golpe. */
  strikeMult?: number;
  pierce?: boolean;
  wall?: number;
  wallPerCard?: number;
  heal?: number;
  /** El búnker pierde integridad. */
  hurt?: number;
  /** Daño directo a cada una de las otras torres. */
  splash?: number;
  noSiren?: boolean;
  /** Cartas extra que robas este turno. */
  draw?: number;
  /** Desarma el piso golpeado. */
  disarm?: boolean;
  gold?: number;
  goldOnKill?: number;
}

export interface Special {
  id: string;
  name: string;
  desc: string;
  fx: Fx;
  /** Legendaria: logro que la mete en el sorteo. */
  locked?: string;
}

export const SPECIALS: Special[] = [
  { id: 'barreno', name: 'Ballesta', desc: 'El golpe Perfora y suma +12 de Daño.', fx: { flat: 12, pierce: true } },
  { id: 'martillo', name: 'Martillo de guerra', desc: 'La carta de mayor valor del golpe cuenta 2 veces.', fx: { highDouble: true } },
  { id: 'saboteador', name: 'El Espía', desc: 'Desarma al guardia que golpeas.', fx: { disarm: true } },
  { id: 'palanca', name: 'Garfio', desc: '+4 de Daño por cada carta del golpe.', fx: { flatPerCard: 4 } },
  { id: 'grua', name: 'Paloma mensajera', desc: 'Robas 2 cartas extra este turno.', fx: { draw: 2 } },
  { id: 'mordaza', name: 'Tregua', desc: 'No hay Contraataque este turno.', fx: { noSiren: true } },
  { id: 'clavos', name: 'Lluvia de flechas', desc: '9 puntos a cada uno de los otros tronos.', fx: { splash: 9 } },
  { id: 'chatarrero', name: 'Carterista', desc: '+3 de oro.', fx: { gold: 3 } },
  { id: 'pico', name: 'Rescate', desc: 'Si el golpe abate a un guardia, +5 de oro.', fx: { goldOnKill: 5 } },
  { id: 'botica', name: 'Elixir', desc: '+5 de Vida.', fx: { heal: 5 } },
  { id: 'gemelo', name: 'Naipe trucado', desc: 'Todas las cartas del golpe valen lo que la de mayor valor.', fx: { allHigh: true } },
  { id: 'nitro', name: 'Pacto oscuro', desc: '×2 de Multi, pero pierdes 2 de Vida.', fx: { strikeMult: 2, hurt: 2 } },
  { id: 'bola', name: 'Clarín', desc: '×1,5 de Multi.', fx: { strikeMult: 1.5 } },
  { id: 'hormigonera', name: 'Puerta atrancada', desc: '+5 de Escudo.', fx: { wall: 5 } },
  { id: 'cemento', name: 'Cota de malla', desc: '+2 de Escudo por cada carta del golpe.', fx: { wallPerCard: 2 } },
  { id: 'embestida', name: 'Embestida', desc: '+4 de Daño, y +3 más por cada punto de Escudo en pie.', fx: { flat: 4, wallForce: 3 } },
  { id: 'sierra', name: 'Pasadizo', desc: 'Todo el golpe pega con ventaja, sea cual sea el trono.', fx: { allAdv: true } },
  // ── legendarias ──
  { id: 'ferretero', name: 'El Tratante', desc: '+4 de oro y robas 1 carta extra.', fx: { gold: 4, draw: 1 }, locked: 'ferretero' },
  { id: 'j-doble', name: 'El Rey de Dos Caras', desc: 'No hay Contraataque y robas 1 carta extra.', fx: { noSiren: true, draw: 1 }, locked: 'j-doble' },
  { id: 'j-escasez', name: 'El Usurero', desc: '+6 de oro.', fx: { gold: 6 }, locked: 'j-escasez' },
  { id: 'j-sequia', name: 'La Dama del Cáliz', desc: '+7 de Vida.', fx: { heal: 7 }, locked: 'j-sequia' },
  { id: 'j-intemperie', name: 'La Reina Helada', desc: '+3 de Escudo y no hay Contraataque.', fx: { wall: 3, noSiren: true }, locked: 'j-intemperie' },
  { id: 'j-blindaje', name: 'El Inquisidor', desc: '×1,75 de Multi.', fx: { strikeMult: 1.75 }, locked: 'j-blindaje' },
  { id: 'j-furia', name: 'El Verdugo', desc: '+14 de Daño y el golpe Perfora.', fx: { flat: 14, pierce: true }, locked: 'j-furia' },
  { id: 'j-inestable', name: 'El Relojero', desc: '14 puntos a cada uno de los otros tronos.', fx: { splash: 14 }, locked: 'j-inestable' },
];
export const SPECIAL: Record<string, Special> = Object.fromEntries(SPECIALS.map((s) => [s.id, s]));
/** Las que entran en el sorteo sin desbloquear nada. */
export const BASE_POOL = SPECIALS.filter((s) => !s.locked).map((s) => s.id);
/** Máximo de cartas especiales por golpe. */
export const MAX_SPECIALS = 2;
