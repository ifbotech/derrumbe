// V40 1c · Los 4 Reyes en la interfaz: su icono, las píldoras de la mesa (en texto: «Espadas 2/4», «Espadas +6») y
// lo que enseña cada opción de la oferta de Bendiciones (su Rey, su efecto, su condición de carga y el nivel que deja).
// Los datos salen de src/rules/reyes.ts: `nivelesReyes`, `bendicionesVisibles`, `infoOpcion`.
import { BENDICION, BendInst, InfoOpcion, OpcionBend, REY_IDS, ReyId, UMBRALES_REY, bendicionesVisibles, fuentesDe, infoOpcion, nivelesReyes } from '../rules/reyes';
import { t } from '../shared/i18n';
import { L } from './lengua';

/** El icono de cada Rey (el de su palo). */
export const REY_ICO: Record<ReyId, string> = { espadas: '🗡️', bastos: '🪵', oros: '🪙', copas: '🍷' };

const meta = (n: number) => UMBRALES_REY.find((u) => u > n) ?? UMBRALES_REY[UMBRALES_REY.length - 1];

/**
 * Las píldoras de la mesa: una por Rey del que llevás algo («Espadas 2/4», encendida si ya da bono) y una por Bendición
 * con cargas. V40 1d: los Amuletos cuentan como piezas de su Rey.
 */
export function reyesPills(bend: readonly BendInst[] | undefined, tools?: readonly { id: string }[]): string {
  if (!bend?.length && !tools?.length) return '';
  const nv = nivelesReyes(fuentesDe(bend, tools));
  const reyes = REY_IDS.filter((r) => nv[r].n > 0)
    .map((r) => {
      const bonos = UMBRALES_REY.map((u, i) => L('ui.mesa.rasgo.bono', { u, texto: t(`rey.${r}.bono.${i + 1}`) })).join('');
      return `<span class="rasgo r-${r}${nv[r].nivel ? ' on' : ''}" data-rasgo="${r}" data-nivel="${nv[r].nivel}" data-tip="${L('ui.mesa.rey.tip', { nombre: t(`rey.${r}.nombre`), n: nv[r].n })}${bonos}"><i class="ico" aria-hidden="true">${REY_ICO[r]}</i><b>${t(`rey.${r}.palo`)}</b><em>${nv[r].n}/${meta(nv[r].n)}</em></span>`;
    })
    .join('');
  const cargas = bendicionesVisibles(bend ?? [])
    .filter((b) => b.n > 0)
    .map((b) => `<span class="rasgo bend r-${b.rey}" data-bend="${b.id}" data-tip="${L('ui.mesa.bend.tip', { nombre: t(`bendicion.${b.id}.nombre`), carga: t(`bendicion.${b.id}.carga`), n: b.n })}"><b>${t(`rey.${b.rey}.palo`)}</b><em>+${b.total}</em></span>`)
    .join('');
  return reyes + cargas;
}

/** Lo que dice una opción de la oferta: su Rey (o sus dos), su efecto, su condición de carga y el nivel que deja. */
export function opcionTexto(bend: readonly BendInst[], o: OpcionBend, tools?: readonly { id: string }[], marca = ''): { titulo: string; desc: string; info: InfoOpcion } {
  const info = infoOpcion(bend, o, tools);
  const d = BENDICION[o.id];
  const quien = info.reyes.map((r) => `${REY_ICO[r.rey]} ${t(`rey.${r.rey}.nombre`)}`).join(' · ');
  const nivel = info.reyes
    .map((r) => `<span class="rasgo-chip r-${r.rey}${r.enciende ? ' enciende' : ''}">${L(r.enciende ? 'ui.run.bend.enciende' : 'ui.run.bend.nivel', { r: t(`rey.${r.rey}.palo`), n: r.n, m: meta(r.n - 1) })}</span>`)
    .join('');
  const desc = `<small class="bend-rey">${quien}${d?.duo ? ` · ${L('ui.run.bend.dual')}` : ''}</small><br>${t(`bendicion.${o.id}.desc`)}<br><b>${L('ui.run.bend.carga')}:</b> ${t(`bendicion.${o.id}.carga`)}<br>${nivel}${marca}`;
  return { titulo: t(`bendicion.${o.id}.nombre`), desc, info };
}
