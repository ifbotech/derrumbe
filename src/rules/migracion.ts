// Lo que llega guardado de la 10.0 (campaña de ocho asaltos) y cómo se lee en la V11 (cinco). Puro: sin
// almacenamiento ni DOM. Lo llaman `loadMeta` (run.ts), `retireOldSave` (src/client/campaign.ts) y el
// archivo de crónicas (src/client/guild.ts). Regla (SPECS/V11.md, apartado 1.9): se conserva todo el
// progreso; la campaña a medias se cierra y cobra lo superado; lo que contaba asaltos se recorta a cinco.
//
// No importa run.ts en tiempo de ejecución (run.ts importa este módulo): el número de asaltos de ahora
// llega como argumento.
import type { Meta } from './run';

/** Asaltos de una campaña de la 10.0. */
export const ASALTOS_10 = 8;

/** Coronas que cobra una campaña a medias de la 10.0 al cerrarse: las de lo superado (1 como mínimo, 8 como máximo). */
export function abonoCampanaVieja(stage: unknown): number {
  const n = Math.floor(Number(stage) || 1);
  return Math.max(1, Math.min(ASALTOS_10, n - 1));
}

/** Una Meta de la 10.0 en la V11: la mejor marca, el alcance y el Asalto diario no pasan de `ultimo` asaltos. Muta y devuelve. */
export function recortaMeta10<M extends Pick<Meta, 'best' | 'stats' | 'daily'>>(meta: M, ultimo: number): M {
  meta.best = Math.min(meta.best, ultimo);
  meta.stats.reach = Math.min(meta.stats.reach, ultimo);
  meta.daily.cleared = Math.min(meta.daily.cleared, ultimo);
  return meta;
}

/** Lo que el archivo enseña de dónde terminó una campaña: asalto n de `total`, y si la sala se nombra. */
export interface DondeActa {
  n: number;
  total: number;
  /** false en un acta de la 10.0: sus salas ya no existen. */
  sala: boolean;
}

/**
 * Dónde terminó la campaña de un acta. Las actas de la V11 guardan `de` (los asaltos de su campaña); un acta
 * sin `de` es de la 10.0: «asalto n de 8», sin nombre de sala.
 */
export function dondeActa(acta: { stage: number; de?: number }, ultimo: number): DondeActa {
  const vieja = !(Number(acta.de) > 0);
  const total = vieja ? ASALTOS_10 : Math.floor(Number(acta.de));
  const stage = Math.max(1, Math.floor(Number(acta.stage) || 1));
  return { n: Math.min(stage, total), total, sala: !vieja && total === ultimo };
}
