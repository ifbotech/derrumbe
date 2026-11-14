// Resumen del estado para el cooperativo: el servidor lo manda con cada estado y el cliente lo compara con
// el de la vista que tiene; si no coinciden, pide el estado entero. Puro y determinista: el mismo objeto da
// siempre el mismo resumen, en cualquier máquina (sin Date, sin Math.random, sin depender del orden en que
// se escribieron las claves).
import type { PlayerView } from './engine';

/** JSON canónico: claves ordenadas, sin `undefined` ni funciones (como JSON.stringify, pero estable). */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return 'null';
    return value === undefined || typeof value === 'function' ? 'null' : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined || typeof v === 'function' ? 'null' : canonical(v))).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined && typeof obj[k] !== 'function')
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

/** FNV-1a de 32 bits sobre las unidades UTF-16 del texto, con una semilla distinta para cada mitad. */
function fnv1a(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Resumen de 16 cifras hexadecimales de un texto (dos FNV-1a de 32 bits encadenados). */
export function hashText(text: string): string {
  const a = fnv1a(text, 0x811c9dc5);
  const b = fnv1a(text, a ^ 0x9e3779b9);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/**
 * Resumen de la vista de un jugador (`viewFor`): cambia si cambia cualquier cosa que esa vista enseña, también
 * su mano. Dos vistas iguales dan el mismo resumen aunque sus claves estén en otro orden. Es de un asiento:
 * dos jugadores de la misma mesa tienen resúmenes distintos (cada uno ve su mano).
 */
export function stateHash(view: PlayerView): string {
  return hashText(canonical(view));
}

/** Lo que una vista tiene de propio de su asiento: fuera de `tableHash`. */
const OWN: (keyof PlayerView)[] = ['you', 'hand', 'reserve', 'unseen', 'stashed', 'chalk', 'canUndo'];

/**
 * Resumen de la mesa común (tronos, Vida, Escudo, Mazo, Descarte, turno, reliquias…), sin lo que solo ve un
 * asiento: es el mismo en todos los asientos de una sala con el mismo estado.
 */
export function tableHash(view: PlayerView): string {
  const shared = Object.fromEntries(Object.entries(view).filter(([k]) => !OWN.includes(k as keyof PlayerView)));
  return hashText(canonical(shared));
}
