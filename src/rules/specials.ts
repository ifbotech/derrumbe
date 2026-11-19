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
  /** Este golpe no respeta Inmune: las cartas hacen su Daño contra cualquier trono. */
  noImmune?: boolean;
  /** Multiplica el Multi del golpe (entero). */
  strikeMult?: number;
  /** Suma al Multi del golpe (entero). */
  multi?: number;
  pierce?: boolean;
  wall?: number;
  wallPerCard?: number;
  heal?: number;
  /** El búnker pierde integridad. */
  hurt?: number;
  /** Daño directo a cada una de las otras torres. */
  splash?: number;
  noSiren?: boolean;
  /** Cartas extra que robás este turno. */
  draw?: number;
  /** Deja Aturdido al trono golpeado. */
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
  { id: 'saboteador', name: 'El Espía', desc: 'El trono que golpeás queda Aturdido.' },
  { id: 'palanca', name: 'Garfio', desc: '+{flatPerCard} de Daño por cada carta del golpe.' },
  { id: 'grua', name: 'Paloma mensajera', desc: 'Robás {draw} cartas extra este turno.' },
  { id: 'mordaza', name: 'Tregua', desc: 'No hay Contraataque este turno.' },
  { id: 'clavos', name: 'Lluvia de flechas', desc: '{splash} puntos a cada uno de los otros tronos.' },
  { id: 'chatarrero', name: 'Carterista', desc: '+{gold} de oro.' },
  { id: 'pico', name: 'Rescate', desc: 'Si el golpe abate a un guardia, +{goldOnKill} de oro.' },
  { id: 'botica', name: 'Elixir', desc: '+{heal} de Vida.' },
  { id: 'gemelo', name: 'Naipe trucado', desc: 'Todas las cartas del golpe valen lo que la de mayor valor.' },
  { id: 'nitro', name: 'Pacto oscuro', desc: '×{strikeMult} de Multi, pero perdés {hurt} de Vida.' },
  { id: 'bola', name: 'Clarín', desc: '+{multi} de Multi.' },
  { id: 'hormigonera', name: 'Puerta atrancada', desc: '+{wall} de Escudo.' },
  { id: 'cemento', name: 'Cota de malla', desc: '+{wallPerCard} de Escudo por cada carta del golpe.' },
  { id: 'embestida', name: 'Embestida', desc: '+{flat} de Daño, y +{wallForce} más por cada punto de Escudo en pie.' },
  { id: 'sierra', name: 'Pasadizo', desc: 'Este golpe no respeta Inmune: tus cartas hacen su Daño contra cualquier trono.' },
  // ── legendarias ──
  { id: 'ferretero', name: 'El Tratante', desc: '+{gold} de oro y robás {draw} carta extra.', locked: 'ferretero' },
  // V40 1c · las legendarias de los monarcas viejos guardan su `id`; ahora las abre el trofeo de un Rey
  { id: 'j-doble', name: 'La Jarra del Rey', desc: 'No hay Contraataque y robás {draw} carta extra.', locked: 'j-copas' },
  { id: 'j-escasez', name: 'La Bolsa del Rey', desc: '+{gold} de oro.', locked: 'j-oros' },
  { id: 'j-sequia', name: 'La Copa del Rey', desc: '+{heal} de Vida.', locked: 'j-copas' },
  { id: 'j-intemperie', name: 'El Garrote del Rey', desc: '+{wall} de Escudo y no hay Contraataque.', locked: 'j-bastos' },
  { id: 'j-blindaje', name: 'La Corona de Espadas', desc: '×{strikeMult} de Multi.', locked: 'j-espadas' },
  { id: 'j-furia', name: 'La Espada del Rey', desc: '+{flat} de Daño y el golpe Perfora.', locked: 'j-espadas' },
  { id: 'j-inestable', name: 'La Lluvia de Oros', desc: '{splash} puntos a cada uno de los otros tronos.', locked: 'j-oros' },
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
