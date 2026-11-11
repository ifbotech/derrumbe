// Cartas especiales: no son de la baraja francesa. No tienen palo ni número: se suman a cualquier
// golpe como apoyo (hasta dos por golpe) o se juegan solas, y hacen su efecto.
// Se consiguen a ciegas: compras o recibes una carta incógnita y te toca una al azar.
// Las legendarias (el Ferretero y los jefes) solo entran en el sorteo tras desbloquear su logro.

export interface Fx {
  /** Daño directo que suma al golpe. */
  flat?: number;
  /** Daño extra de cada carta de baraja del golpe. */
  flatPerCard?: number;
  /** La carta más alta del golpe cuenta dos veces. */
  highDouble?: boolean;
  /** Todas las cartas del golpe valen como la más alta. */
  allHigh?: boolean;
  /** Todas las cartas del golpe pegan con ventaja, sea cual sea la torre. */
  allAdv?: boolean;
  /** Multiplica el golpe entero. */
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
  { id: 'barreno', name: 'Barreno', desc: 'El golpe perfora y hace +8 de daño.', fx: { flat: 8, pierce: true } },
  { id: 'martillo', name: 'Martillo neumático', desc: 'La carta más alta del golpe cuenta dos veces.', fx: { highDouble: true } },
  { id: 'saboteador', name: 'Saboteador', desc: 'Desarma el piso que golpeas.', fx: { disarm: true } },
  { id: 'palanca', name: 'Palanca', desc: 'Cada carta del golpe hace +3.', fx: { flatPerCard: 3 } },
  { id: 'grua', name: 'Grúa', desc: 'Robas 2 cartas extra este turno.', fx: { draw: 2 } },
  { id: 'mordaza', name: 'Mordaza', desc: 'La sirena no suena este turno.', fx: { noSiren: true } },
  { id: 'clavos', name: 'Pistola de clavos', desc: '6 de daño a cada una de las otras torres.', fx: { splash: 6 } },
  { id: 'chatarrero', name: 'Chatarrero', desc: '+3 de oro.', fx: { gold: 3 } },
  { id: 'pico', name: 'Pico de oro', desc: 'Si el golpe tira un piso, +5 de oro.', fx: { goldOnKill: 5 } },
  { id: 'botica', name: 'Botica', desc: '+5 de integridad.', fx: { heal: 5 } },
  { id: 'gemelo', name: 'Gemelo', desc: 'Todas las cartas del golpe valen como la más alta.', fx: { allHigh: true } },
  { id: 'nitro', name: 'Nitroglicerina', desc: 'El golpe entero ×2, pero el búnker pierde 3.', fx: { strikeMult: 2, hurt: 3 } },
  { id: 'bola', name: 'Bola de demolición', desc: 'El golpe entero ×1,5.', fx: { strikeMult: 1.5 } },
  { id: 'hormigonera', name: 'Hormigonera', desc: '+5 de muro.', fx: { wall: 5 } },
  { id: 'cemento', name: 'Cemento rápido', desc: '+2 de muro por cada carta del golpe.', fx: { wallPerCard: 2 } },
  { id: 'sierra', name: 'Sierra radial', desc: 'Todo el golpe pega con ventaja, sea cual sea la torre.', fx: { allAdv: true } },
  // ── legendarias ──
  { id: 'ferretero', name: 'El Ferretero', desc: '+5 de oro y robas 2 cartas extra.', fx: { gold: 5, draw: 2 }, locked: 'ferretero' },
  { id: 'j-doble', name: 'La Sirena', desc: 'La sirena no suena y robas 2 cartas extra.', fx: { noSiren: true, draw: 2 }, locked: 'j-doble' },
  { id: 'j-escasez', name: 'El Usurero', desc: '+8 de oro.', fx: { gold: 8 }, locked: 'j-escasez' },
  { id: 'j-sequia', name: 'El Matasanos', desc: '+10 de integridad.', fx: { heal: 10 }, locked: 'j-sequia' },
  { id: 'j-intemperie', name: 'La Ventisca', desc: '+8 de muro y la sirena no suena.', fx: { wall: 8, noSiren: true }, locked: 'j-intemperie' },
  { id: 'j-blindaje', name: 'El Coloso', desc: 'El golpe entero ×2,5.', fx: { strikeMult: 2.5 }, locked: 'j-blindaje' },
  { id: 'j-furia', name: 'La Furia', desc: '+20 de daño y el golpe perfora.', fx: { flat: 20, pierce: true }, locked: 'j-furia' },
  { id: 'j-inestable', name: 'El Topo', desc: '12 de daño a cada una de las otras torres.', fx: { splash: 12 }, locked: 'j-inestable' },
];
export const SPECIAL: Record<string, Special> = Object.fromEntries(SPECIALS.map((s) => [s.id, s]));
/** Las que entran en el sorteo sin desbloquear nada. */
export const BASE_POOL = SPECIALS.filter((s) => !s.locked).map((s) => s.id);
/** Máximo de cartas especiales por golpe. */
export const MAX_SPECIALS = 2;
