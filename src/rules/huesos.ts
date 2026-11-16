// La tirada de huesos (V12, SPECS/V12.md apartado 1.4): tras cada asalto ganado, un Dado de oro multiplica las
// monedas que cayeron a la mesa en ese asalto y uno o más Dados de la Corona multiplican sus esquirlas. Caras
// enteras. El resultado sale de un azar propio, sembrado con la campaña, el asalto y el dado: no toca
// `run.rng`, así que el resto de la campaña sale igual con o sin dados (solo cambia el oro que tienes).
//
// Puro. No importa run.ts en tiempo de ejecución (run.ts importa este módulo).
import { cifraDe, rangoDe } from './arbol';
import { BALANCE } from './balance-config';
import { nextRandom, seedFrom } from './engine';
import type { Run } from './run';

/** Un dado tirado: sus caras (enteras, de menor a mayor) y el índice de la cara que salió (`caras[sale]` multiplica). */
export interface Hueso {
  tipo: 'oro' | 'corona';
  caras: number[];
  sale: number;
}
/** La tirada de un asalto: los dados y lo que multiplicaron (base: lo que cayó; extra: lo que suman los dados). */
export interface Tirada {
  asalto: number;
  huesos: Hueso[];
  oro: { base: number; extra: number };
  esquirlas: { base: number; extra: number };
}

type RunHuesos = Pick<Run, 'up' | 'endless' | 'id' | 'stage' | 'caida'>;

/**
 * Las caras de los dados de esta campaña y cuántos Dados de la Corona se tiran:
 *   · Dado de oro: las de balance-config (×1 ×1 ×1 ×1 ×2 ×2); no lo mejora nada (es combate)
 *   · Dado de la Corona: ×1 ×1 ×1 ×2 ×2 ×3; Hueso tallado sube 1 la cara más baja, una vez por rango; Cara del
 *     rey pone la más alta en ×(3 + rango); en el Trono infinito, Sangre real sube todas por rango
 *   · dados de la Corona: 1, +1 con Segundo hueso y +1 en el Trono infinito con Trono de huesos
 */
export function carasDe(run: Pick<Run, 'up' | 'endless'>): { oro: number[]; corona: number[]; coronas: number } {
  const corona = [...BALANCE.huesos.corona].sort((a, b) => a - b);
  for (let i = 0; i < rangoDe(run.up, 'hueso_tallado'); i++) {
    corona[0]++;
    corona.sort((a, b) => a - b);
  }
  if (rangoDe(run.up, 'cara_rey') > 0) corona[corona.length - 1] = Math.max(corona[corona.length - 1], cifraDe('cara_rey', rangoDe(run.up, 'cara_rey')).n);
  if (run.endless && rangoDe(run.up, 'sangre_real') > 0) {
    const n = cifraDe('sangre_real', rangoDe(run.up, 'sangre_real')).n;
    for (let i = 0; i < corona.length; i++) corona[i] += n;
  }
  const coronas = 1 + (rangoDe(run.up, 'segundo_hueso') > 0 ? 1 : 0) + (run.endless && rangoDe(run.up, 'trono_huesos') > 0 ? 1 : 0);
  return { oro: [...BALANCE.huesos.oro].sort((a, b) => a - b), corona, coronas };
}

/** La cara que sale en el dado n de la tirada de este asalto: azar propio, sin tocar `run.rng`. */
export function caraQueSale(run: Pick<Run, 'id' | 'stage'>, n: number, caras: number): number {
  const st = { rng: seedFrom(`${run.id}|huesos|${run.stage}|${n}`) };
  return Math.min(caras - 1, Math.floor(nextRandom(st) * caras));
}

/**
 * La tirada del asalto que se acaba de ganar, sobre lo que cayó en él (`run.caida`). No cambia la campaña:
 * la abona `finishBattle`. El dado 0 es el de oro; del 1 en adelante, los de la Corona (sus caras se multiplican).
 */
export function tirarHuesos(run: RunHuesos): Tirada {
  const { oro, corona, coronas } = carasDe(run);
  const huesos: Hueso[] = [{ tipo: 'oro', caras: oro, sale: caraQueSale(run, 0, oro.length) }];
  for (let k = 1; k <= coronas; k++) huesos.push({ tipo: 'corona', caras: [...corona], sale: caraQueSale(run, k, corona.length) });
  const multOro = huesos[0].caras[huesos[0].sale];
  const multCorona = huesos.slice(1).reduce((a, h) => a * h.caras[h.sale], 1);
  const base = { oro: run.caida?.oro ?? 0, esquirlas: run.caida?.esquirlas ?? 0 };
  return {
    asalto: run.stage,
    huesos,
    oro: { base: base.oro, extra: base.oro * (multOro - 1) },
    esquirlas: { base: base.esquirlas, extra: base.esquirlas * (multCorona - 1) },
  };
}

/** Lo que multiplica una tirada: el Dado de oro y el producto de los de la Corona. */
export function multiplicadores(t: Tirada): { oro: number; corona: number } {
  const oro = t.huesos.find((h) => h.tipo === 'oro');
  return { oro: oro ? oro.caras[oro.sale] : 1, corona: t.huesos.filter((h) => h.tipo === 'corona').reduce((a, h) => a * h.caras[h.sale], 1) };
}
