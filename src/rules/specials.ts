// V40 1d · Las Trampas del Bufón (en el código, «cartas especiales»): 8 en lugar de las 25 de antes. No tienen palo
// ni número: se suman a cualquier golpe como apoyo (hasta dos por golpe) o se juegan solas, y hacen su efecto, una
// línea con su cifra. Se consiguen a la vista (selección tras cada asalto, Sobre lacrado de La Pulpería) o a ciegas
// (Sobre a ciegas). Ya no hay legendarias: las 8 entran en el sorteo desde la primera campaña. Los `id` son los de
// las especiales de antes con el mismo efecto (no se renombran).
import { BALANCE, fill } from './balance-config';
import type { MazoId } from './mazos';

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
  /** Legendaria: logro que la mete en el sorteo (V40 1d: ninguna lo es). */
  locked?: string;
  /** Los Mazos con los que encaja (★ Para Truco…; ver `sinergia` en piezas.ts). */
  mazos?: MazoId[];
}

/** Una Trampa tal como se escribe aquí: su efecto (`fx`) sale de balance-config.json. */
type SpecialDef = Omit<Special, 'fx'>;
const DEFS: SpecialDef[] = [
  { id: 'gemelo', name: 'Cuento del tío', desc: 'Cada carta del golpe vale lo que la de mayor número.' },
  { id: 'mordaza', name: 'Zancadilla', desc: 'Este turno no hay Contraataque.' },
  { id: 'nitro', name: 'Mano negra', desc: '×{strikeMult} de Multi, pero perdés {hurt} de Vida.' },
  { id: 'sierra', name: 'Disfraz', desc: 'Este golpe no respeta Inmune: tus cartas hacen su Daño contra cualquiera.', mazos: ['mentiroso'] },
  { id: 'grua', name: 'Pase mágico', desc: 'Robás {draw} cartas más este turno.', mazos: ['chancho'] },
  { id: 'pico', name: 'Mordida', desc: 'Si el golpe abate a un guardia, +{goldOnKill} de oro.' },
  { id: 'barreno', name: 'Puñal oculto', desc: 'El golpe Perfora y suma +{flat} de Daño.' },
  { id: 'bola', name: '¡Retruco!', desc: '+{multi} de Multi.', mazos: ['truco'] },
];
/** Las Trampas con su efecto de balance-config.json (`especiales.<id>`) y su texto ya con las cifras. */
export const SPECIALS: Special[] = DEFS.map((s) => {
  const fx: Fx = BALANCE.especiales[s.id];
  if (!fx) throw new Error(`balance-config.json no tiene la Trampa «${s.id}»`);
  const nums = Object.fromEntries(Object.entries(fx).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
  return { ...s, desc: fill(s.desc, nums), fx };
});
export const SPECIAL: Record<string, Special> = Object.fromEntries(SPECIALS.map((s) => [s.id, s]));
/** Las que entran en el sorteo sin desbloquear nada. */
export const BASE_POOL = SPECIALS.filter((s) => !s.locked).map((s) => s.id);
/** Máximo de cartas especiales por golpe. */
export const MAX_SPECIALS = 2;
