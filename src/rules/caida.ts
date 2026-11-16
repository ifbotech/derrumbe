// Lo que cae a la mesa (V12, SPECS/V12.md apartado 1.3): monedas, Esquirlas de Corona y gotas de lacre que
// sueltan los golpes, los guardias abatidos, los Golpes exactos y los monarcas vencidos. Es la vista de lo que
// ya se cobró: `trackEvents` (run.ts) abona en el mismo instante en que ocurre el evento, y el cliente solo
// hace volar las piezas a la bolsa (nadie pierde nada por no barrer).
//
// Puro. No importa run.ts en tiempo de ejecución (run.ts importa este módulo).
import { cifraDe, rangoDe } from './arbol';
import { BALANCE } from './balance-config';
import type { GameEvent, Suit } from './engine';
import type { Run } from './run';

/** Una pieza que cae: qué es, cuánto vale, de qué trono sale (null: de la mesa) y qué la soltó. */
export interface Pieza {
  tipo: 'moneda' | 'esquirla' | 'gota';
  n: number;
  trono: Suit | null;
  de: 'golpe' | 'guardia' | 'exacto' | 'monarca' | 'oro';
}

/** Lo que cayó en el asalto en curso (`run.caida`): monedas, esquirlas y gotas. */
export interface Caida {
  oro: number;
  esquirlas: number;
  gotas: number;
}

export const caidaVacia = (): Caida => ({ oro: 0, esquirlas: 0, gotas: 0 });

const K = BALANCE.caida;
/** La cifra `n` de un nodo de la Bolsa o de la Corona de hierro en esta campaña (0 sin rangos). */
const extra = (run: Pick<Run, 'up'>, id: string): number => cifraDe(id, rangoDe(run.up, id)).n ?? 0;

/**
 * Las piezas que sueltan unos eventos de la mesa, en su orden, con los nodos del Árbol de la campaña:
 *   · cada golpe (`impact`): esquirlas (1 + Astillas de corona; + Mano llena si el golpe lleva 3 cartas o
 *     más; + Racha de sangre por eslabón de Racha)
 *   · cada guardia abatido (`floorDown`): una moneda y esquirlas (2 + Diezmo del guardia); si fue Golpe
 *     exacto, además esquirlas (5 + Corte limpio) y una gota de lacre
 *   · cualquier otro oro (`gold`: el del Golpe exacto, sellos, especiales): sus monedas, como siempre
 *   · el monarca vencido (`end` ganado con monarca): esquirlas (25 + Rescate real), y en el Trono infinito
 *     las del Pendón negro
 *   · al perder (`end` perdido): las de Ceniza del caído, por cada guardia abatido en la campaña
 * En el Trono infinito, la Corona de hierro multiplica las esquirlas. Todo entero.
 * La pieza de la derrota cuenta `run.stats.floors`: se llama después de anotar la tanda (como hace `trackEvents`).
 */
export function caidaDe(run: Pick<Run, 'up' | 'boss' | 'endless' | 'stats'>, events: GameEvent[]): Pieza[] {
  const out: Pieza[] = [];
  const corona = run.endless ? Math.max(1, extra(run, 'corona_hierro')) : 1;
  const esq = (n: number, trono: Suit | null, de: Pieza['de']) => n > 0 && out.push({ tipo: 'esquirla', n: n * corona, trono, de });
  let cartas = 0;
  let eslabones = 0;
  for (const ev of events) {
    if (ev.e === 'play') {
      cartas = ev.cards.length;
      eslabones = 0;
    } else if (ev.e === 'joker') {
      cartas = 1;
      eslabones = 0;
    } else if (ev.e === 'step' && ev.src === 'chain') eslabones = Math.round((ev.dr ?? 0) / BALANCE.golpe.racha);
    else if (ev.e === 'impact') {
      esq(K.esquirlaGolpe + extra(run, 'esq_golpe') + (cartas >= K.formacionCartas ? extra(run, 'esq_formacion') : 0) + eslabones * extra(run, 'esq_racha'), ev.tower, 'golpe');
      cartas = 0;
      eslabones = 0;
    } else if (ev.e === 'floorDown') {
      if (K.oroGuardia > 0) out.push({ tipo: 'moneda', n: K.oroGuardia, trono: ev.tower, de: 'guardia' });
      esq(K.esquirlaGuardia + extra(run, 'esq_guardia'), ev.tower, 'guardia');
      if (ev.clean) {
        esq(K.esquirlaExacto + extra(run, 'esq_exacto'), ev.tower, 'exacto');
        if (K.gotaExacto > 0) out.push({ tipo: 'gota', n: K.gotaExacto, trono: ev.tower, de: 'exacto' });
      }
    } else if (ev.e === 'gold') {
      if (ev.amount > 0) out.push({ tipo: 'moneda', n: ev.amount, trono: null, de: 'oro' });
    } else if (ev.e === 'end') {
      if (ev.result === 'won' && run.boss) {
        esq(K.esquirlaMonarca + extra(run, 'esq_monarca'), null, 'monarca');
        if (run.endless) esq(extra(run, 'pendon'), null, 'monarca');
      } else if (ev.result === 'lost') esq(extra(run, 'esq_derrota') * run.stats.floors, null, 'guardia');
    }
  }
  return out;
}

/** Suma de unas piezas por tipo. */
export function sumaPiezas(piezas: Pieza[]): Caida {
  const c = caidaVacia();
  for (const p of piezas) {
    if (p.tipo === 'moneda') c.oro += p.n;
    else if (p.tipo === 'esquirla') c.esquirlas += p.n;
    else c.gotas += p.n;
  }
  return c;
}
