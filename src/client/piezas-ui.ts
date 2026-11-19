// V40 1d · El sello de nivel S · A · B y la ★ Sinergia de una pieza (Amuleto, Trampa del Bufón o Bendición) en la
// Pulpería, el Cofre, la oferta de los Reyes y la Colección. Los datos salen de src/rules/piezas.ts (`selloDe`,
// `sinergia`) y la etiqueta en cada idioma de `sinergiaFor` (src/rules/textos.ts).
import { ContextoSinergia, Pieza, selloDe, sinergia } from '../rules/piezas';
import type { Run } from '../rules/run';
import { sinergiaFor } from '../rules/textos';
import { L, getLang } from './lengua';

/** Lo que se lleva en la campaña, para la ★. */
export const contextoDe = (run: Pick<Run, 'deckId' | 'bendiciones' | 'tools'>): ContextoSinergia => ({ mazo: run.deckId, bendiciones: run.bendiciones, tools: run.tools });

/** «Sello S · ★ Bastos [4]» (sin contexto, solo el sello); vacío si la pieza no tiene ninguno de los dos. */
export function marcaPieza(p: Pieza, ctx?: ContextoSinergia): string {
  const s = selloDe(p);
  const sin = ctx ? sinergia(p, ctx) : null;
  const partes = [s ? `<b class="sello-nivel s-${s}" data-sello="${s}">${L('ui.pieza.sello', { s })}</b>` : '', sin ? `<span class="sinergia" data-sinergia="${sin.tipo}">${sinergiaFor(getLang(), sin)}</span>` : ''].filter(Boolean);
  return partes.length ? ` <small class="pieza-marca">${partes.join(' · ')}</small>` : '';
}
