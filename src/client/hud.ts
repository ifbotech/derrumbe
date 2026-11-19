// V40 · fase 3a · El HUD único: una sola barra arriba, la misma en Combate, Mapa, Botín, «Elegí una», La Pulpería y el
// Fogón. En este orden: Vida (y el Escudo en la mesa) · Oro · Mazo (su dorso chico y el contador) · la tira de Amuletos y
// Bendiciones con sus cargas. A la derecha, discretos, lo que cada pantalla pida (Rebobinar, AUTO, Ajustes, Salir).
// Todo se inspecciona al pasar el ratón o el foco (data-tip, foco de teclado y mando): en pantalla, solo iconos y cifras.
import { BENDICION, bendicionesVisibles, type BendInst } from '../rules/reyes';
import { TOOL, type ToolInst } from '../rules/tools';
import { t } from '../shared/i18n';
import { bolsaHtml } from './caida';
import { cifraEl } from './cifra';
import { L } from './lengua';
import { bendicionSvg } from './pixel/iconos';
import { dorsoSvg } from './pixel/dorsos';
import { fondoTramado } from './pixel/dither';
import { hudSvg } from './pixel/nodos';
import { beltEl } from './widgets';

/**
 * Cuelga las tres penumbras tramadas del arte (`fondoTramado()` de pixel/dither.ts) en `:root` como `--trama-mesa`,
 * `--trama-mapa` y `--trama-pulperia`; cada pantalla elige la suya en campana40.css con el gancho `--fondo-trama`.
 * Se hace una vez, al cargar el módulo (fuera del navegador, en las pruebas, no hace nada).
 */
function colgarTramas(): void {
  if (typeof document === 'undefined') return;
  const raiz = document.documentElement.style;
  for (const v of ['mesa', 'mapa', 'pulperia'] as const) raiz.setProperty(`--trama-${v}`, fondoTramado(v).url);
}
colgarTramas();

export interface HudDatos {
  vida: number;
  vidaMax: number;
  /** Solo en la mesa: el Escudo y su tope. */
  escudo?: { v: number; max: number };
  oro: number;
  esquirlas: number;
  gotas: number;
  /** Cartas del mazo (en la mesa, las que quedan por robar). */
  mazo: number;
  mazoId: string;
  tools: ToolInst[];
  slots?: number;
  bendiciones?: readonly BendInst[];
}

export interface HudOpts {
  /** id del botón del Mazo: `btn-deck` en la mesa, `deck-view` en las pantallas de campaña. */
  mazoId?: string;
  /** Lo de la derecha (botones discretos). */
  derecha?: string;
  /** Lo de la izquierda del todo (en la mesa, el asalto). */
  antes?: string;
  /** En la mesa, la tira la pinta renderBelt dentro de #beltbar. */
  tiraId?: string;
}

/** Las Bendiciones de la tira: su icono y, si ya tiene, el contador de cargas. */
export function bendTira(bend: readonly BendInst[] | undefined): string {
  return bendicionesVisibles(bend ?? [])
    .map((b) => {
      const nombre = t(`bendicion.${b.id}.nombre`);
      const tip = L('ui.hud.bend.tip', { nombre, desc: t(`bendicion.${b.id}.desc`), carga: `${t(`bendicion.${b.id}.carga`)}${b.n ? ` · ${L('ui.hud.cargas', { n: b.total })}` : ''}` });
      return `<span class="hud-bend r-${b.rey}${BENDICION[b.id]?.duo ? ' dual' : ''}" tabindex="0" data-bend="${b.id}" data-tip="${tip.replace(/"/g, '&quot;')}" aria-label="${nombre.replace(/"/g, '&quot;')}">${bendicionSvg(b.id)}${b.total ? `<b class="hud-carga">+${b.total}</b>` : ''}</span>`;
    })
    .join('');
}

/** La tira entera (Amuletos con sus huecos y Bendiciones), como nodo: los Amuletos conservan su Lupa y su venta. */
export function tiraEl(tools: ToolInst[], slots: number | undefined, bend: readonly BendInst[] | undefined, belt = beltEl(tools, { slots })): HTMLElement {
  const el = document.createElement('div');
  el.className = 'hud-tira-in';
  // los huecos cerrados no se pintan en el HUD: solo los abiertos (el resto se ve en el Altar)
  el.appendChild(belt);
  el.insertAdjacentHTML('beforeend', `<span class="hud-bends">${bendTira(bend)}</span>`);
  return el;
}

/** El HUD: Vida · (Escudo) · Oro · Mazo · tira · derecha. La tira se cuelga después con `montaTira`. */
export function hudHtml(d: HudDatos, o: HudOpts = {}): string {
  const vida = `<span class="hud-c hud-vida${d.vida <= Math.max(3, Math.round(d.vidaMax * 0.3)) ? ' baja' : ''}" tabindex="0" role="group" aria-label="${L('ui.hud.vida')} ${d.vida}/${d.vidaMax}" data-tip="${L('ui.hud.vida.tip', { v: d.vida, max: d.vidaMax })}">${hudSvg('vida')}${cifraEl(d.vida, 'vida-hud', 'b', 'id="int-num"')}<small>/${d.vidaMax}</small></span>`;
  const escudo = d.escudo ? `<span class="hud-c hud-escudo${d.escudo.v ? '' : ' cero'}" tabindex="0" aria-label="${d.escudo.v}/${d.escudo.max}" data-tip="${L('ui.hud.escudo.tip', { v: d.escudo.v, max: d.escudo.max })}">${hudSvg('escudo')}<b id="wall-num">${d.escudo.v}</b></span>` : '';
  const mazo = `<button type="button" class="hud-c hud-mazo" id="${o.mazoId ?? 'deck-view'}" aria-label="${L('ui.hud.mazo')} ${d.mazo}" data-tip="${L('ui.hud.mazo.tip', { n: d.mazo })}"><span class="hud-dorso">${dorsoSvg(d.mazoId)}</span><b id="deck-n">${d.mazo}</b></button>`;
  return `<header class="hud" role="group" aria-label="${L('ui.hud')}">
    <div class="hud-izq">${o.antes ?? ''}${vida}${escudo}${bolsaCeros(bolsaHtml(d.oro, d.esquirlas, d.gotas), d.esquirlas, d.gotas)}${mazo}</div>
    <div class="hud-tira" id="${o.tiraId ?? 'hud-tira'}" role="group" aria-label="${L('ui.hud.tira')}"></div>
    <div class="hud-der">${o.derecha ?? ''}</div>
  </header>`;
}

/** Cuelga la tira en el HUD ya pintado (fuera de la mesa). */
export function montaTira(root: ParentNode, d: HudDatos, belt?: HTMLElement): void {
  const host = root.querySelector<HTMLElement>('.hud-tira');
  if (!host) return;
  host.replaceChildren(tiraEl(d.tools, d.slots, d.bendiciones, belt as HTMLDivElement | undefined));
  marcaCeros(root);
}

/** La bolsa ya escrita con sus ceros marcados (esquirlas y gotas a 0 no se ven), sin esperar al DOM. */
const bolsaCeros = (html: string, esquirlas: number, gotas: number): string =>
  html.replace('class="bolsa-c bolsa-esquirla"', `class="bolsa-c bolsa-esquirla${esquirlas ? '' : ' cero'}"`).replace('class="bolsa-c bolsa-gota"', `class="bolsa-c bolsa-gota${gotas ? '' : ' cero'}"`);

/** Esquirlas y gotas solo se ven cuando hay: el HUD no enseña ceros que no dicen nada. */
export function marcaCeros(root: ParentNode = document): void {
  for (const c of root.querySelectorAll<HTMLElement>('.hud .bolsa-esquirla, .hud .bolsa-gota')) c.classList.toggle('cero', (c.querySelector('b')?.textContent ?? '0').trim() === '0');
}

/** ¿Un Amuleto tiene contador propio? (para la QA y la tira). */
export const conCuenta = (t_: ToolInst) => String(TOOL[t_.id]?.count?.(t_) ?? '') !== '';
