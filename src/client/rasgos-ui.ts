// V35 · Rasgos de build en la interfaz: su icono y el chip que dice cuánto acerca una Reliquia al siguiente bono.
import { Rasgo, TOOL, UMBRALES, ToolInst, rasgosDe } from '../rules/tools';
import { t } from '../shared/i18n';
import { L } from './lengua';

const U: readonly number[] = UMBRALES;

/** El icono de cada rasgo (el mismo en la mesa, La Taberna, el Cofre y la lupa). */
export const RASGO_ICO: Record<Rasgo, string> = { sangre: '🩸', tahur: '🎲', verdugo: '🗡️', bastion: '🛡️', horda: '🔥' };

/** Cuántas Reliquias del rasgo tendrías con esta y si con ella se enciende un bono (2, 4 o 6). */
export function rasgoCon(tools: ToolInst[], id: string): { rasgo: Rasgo; n: number; meta: number; enciende: boolean } | null {
  const rasgo = TOOL[id]?.rasgo;
  if (!rasgo) return null;
  const n = rasgosDe(tools)[rasgo] + 1;
  return { rasgo, n, meta: UMBRALES.find((u) => u >= n) ?? UMBRALES[UMBRALES.length - 1], enciende: U.includes(n) };
}

/** El chip de rasgo de una Reliquia que puedes llevarte: «🩸 Sangre 3/4» o, si enciende un bono, «¡🩸 SANGRE 4/4!». */
export function rasgoChip(tools: ToolInst[], id: string): string {
  const r = rasgoCon(tools, id);
  if (!r) return '';
  const nombre = t(`rasgo.${r.rasgo}.nombre`);
  return `<span class="rasgo-chip r-${r.rasgo}${r.enciende ? ' enciende' : ''}"><i aria-hidden="true">${RASGO_ICO[r.rasgo]}</i>${L(r.enciende ? 'ui.run.rasgo.enciende' : 'ui.run.rasgo.cuenta', { r: r.enciende ? nombre.toUpperCase() : nombre, n: r.n, m: r.meta })}</span>`;
}
