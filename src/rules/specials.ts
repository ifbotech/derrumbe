// Cartas especiales: no son de la baraja francesa. No tienen palo ni número: se suman a cualquier
// golpe como apoyo (hasta dos por golpe) o se juegan solas, y hacen su efecto.
// Se consiguen a la vista (selección tras cada asalto, Sobre lacrado de la Taberna) o a ciegas
// (Sobre a ciegas). Las legendarias (el Tratante y los monarcas) solo entran en el sorteo tras su logro.
import { BALANCE, fill } from './balance-config';

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

/** Una carta especial tal como se escribe aquí: su efecto (`fx`) sale de balance-config.json. */
type SpecialDef = Omit<Special, 'fx'>;
const DEFS: SpecialDef[] = [
  { id: 'barreno', name: 'Ballesta', desc: 'El golpe Perfora y suma +{flat} de Daño.' },
  { id: 'martillo', name: 'Martillo de guerra', desc: 'La carta de mayor valor del golpe cuenta 2 veces.' },
  { id: 'saboteador', name: 'El Espía', desc: 'Desarma al guardia que golpeas.' },
  { id: 'palanca', name: 'Garfio', desc: '+{flatPerCard} de Daño por cada carta del golpe.' },
  { id: 'grua', name: 'Paloma mensajera', desc: 'Robas {draw} cartas extra este turno.' },
  { id: 'mordaza', name: 'Tregua', desc: 'No hay Contraataque este turno.' },
  { id: 'clavos', name: 'Lluvia de flechas', desc: '{splash} puntos a cada uno de los otros tronos.' },
  { id: 'chatarrero', name: 'Carterista', desc: '+{gold} de oro.' },
  { id: 'pico', name: 'Rescate', desc: 'Si el golpe abate a un guardia, +{goldOnKill} de oro.' },
  { id: 'botica', name: 'Elixir', desc: '+{heal} de Vida.' },
  { id: 'gemelo', name: 'Naipe trucado', desc: 'Todas las cartas del golpe valen lo que la de mayor valor.' },
  { id: 'nitro', name: 'Pacto oscuro', desc: '×{strikeMult} de Multi, pero pierdes {hurt} de Vida.' },
  { id: 'bola', name: 'Clarín', desc: '×{strikeMult} de Multi.' },
  { id: 'hormigonera', name: 'Puerta atrancada', desc: '+{wall} de Escudo.' },
  { id: 'cemento', name: 'Cota de malla', desc: '+{wallPerCard} de Escudo por cada carta del golpe.' },
  { id: 'embestida', name: 'Embestida', desc: '+{flat} de Daño, y +{wallForce} más por cada punto de Escudo en pie.' },
  { id: 'sierra', name: 'Pasadizo', desc: 'Todo el golpe pega con ventaja, sea cual sea el trono.' },
  // ── legendarias ──
  { id: 'ferretero', name: 'El Tratante', desc: '+{gold} de oro y robas {draw} carta extra.', locked: 'ferretero' },
  { id: 'j-doble', name: 'El Rey de Dos Caras', desc: 'No hay Contraataque y robas {draw} carta extra.', locked: 'j-doble' },
  { id: 'j-escasez', name: 'El Usurero', desc: '+{gold} de oro.', locked: 'j-escasez' },
  { id: 'j-sequia', name: 'La Dama del Cáliz', desc: '+{heal} de Vida.', locked: 'j-sequia' },
  { id: 'j-intemperie', name: 'La Reina Helada', desc: '+{wall} de Escudo y no hay Contraataque.', locked: 'j-intemperie' },
  { id: 'j-blindaje', name: 'El Inquisidor', desc: '×{strikeMult} de Multi.', locked: 'j-blindaje' },
  { id: 'j-furia', name: 'El Verdugo', desc: '+{flat} de Daño y el golpe Perfora.', locked: 'j-furia' },
  { id: 'j-inestable', name: 'El Relojero', desc: '{splash} puntos a cada uno de los otros tronos.', locked: 'j-inestable' },
];
/** Las cartas especiales con su efecto de balance-config.json (`especiales.<id>`) y su texto ya con las cifras. */
export const SPECIALS: Special[] = DEFS.map((s) => {
  const fx: Fx = BALANCE.especiales[s.id];
  if (!fx) throw new Error(`balance-config.json no tiene la especial «${s.id}»`);
  const nums = Object.fromEntries(Object.entries(fx).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
  return { ...s, desc: fill(s.desc, nums), fx };
});
export const SPECIAL: Record<string, Special> = Object.fromEntries(SPECIALS.map((s) => [s.id, s]));
/** Las que entran en el sorteo sin desbloquear nada. */
export const BASE_POOL = SPECIALS.filter((s) => !s.locked).map((s) => s.id);
/** Máximo de cartas especiales por golpe. */
export const MAX_SPECIALS = 2;
