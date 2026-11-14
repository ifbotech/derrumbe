// Indicaciones de control. Cada acción lleva su tecla y su botón de mando; cuál de los dos se ve lo
// decide <html data-input="…"> (nav.ts): con el mando, el botón; con el teclado, la tecla; con el
// ratón o el dedo, ninguna.
//
// Aquí vive también la tabla de controles entera (`controlRows(lang)`): la leen Ajustes (widgets.ts, en el
// idioma de la mesa), el README y REGLAS.md (scripts/reglas.ts, `CONTROL_ROWS`, siempre en español) y la
// prueba de humo. Este módulo no toca el DOM: se puede importar desde un script de Node.
// V10: los nombres de las teclas que cambian con el idioma (Espacio / Space, Supr / Delete, Mayús / Shift) y
// las filas de la tabla salen de las claves `ui.tecla.*` y `ui.ctl.*` (src/shared/i18n/ui-juice.ts).
import { getLang, tFor, type Lang } from '../shared/i18n';

export type Act = 'choose' | 'strike' | 'stash' | 'undo' | 'back' | 'deck' | 'lupa' | 'speed' | 'settings' | 'discard' | 'restart' | 'beltLeft' | 'beltRight' | 'fullscreen';

/** [tecla, botón del mando] (la tecla con su nombre español). Vacío: esa acción no tiene atajo ahí. */
export const CONTROLS: Record<Act, [string, string]> = {
  choose: ['Enter', 'A'],
  strike: ['Espacio', 'X'],
  stash: ['Y', 'Y'],
  undo: ['Z', 'LT'],
  back: ['Esc', 'B'],
  deck: ['Tab', 'LB'],
  lupa: ['L', 'RB'],
  speed: ['', 'RT'],
  settings: ['', 'Start'],
  // L3 = pulsar la palanca izquierda. Botón propio: una pulsación corta de X golpea y nunca descarta
  discard: ['Supr', 'L3'],
  restart: ['R', 'Select'],
  // con el foco en una reliquia; fuera de ellas, LB abre el mazo y RB la lupa
  beltLeft: ['Mayús ←', 'LB'],
  beltRight: ['Mayús →', 'RB'],
  // R3 = pulsar la palanca derecha
  fullscreen: ['F', 'R3'],
};

/** Las teclas cuyo nombre cambia con el idioma. */
const KEY_NAMES: Record<string, string> = { Espacio: 'ui.tecla.espacio', Supr: 'ui.tecla.supr', Mayús: 'ui.tecla.mayus' };
/** El nombre de una tecla en `lang` («Espacio» → «Space», «Mayús ←» → «Shift ←»). */
export function keyName(lang: Lang, key: string): string {
  return key.replace(/Espacio|Supr|Mayús/g, (k) => tFor(lang, KEY_NAMES[k]));
}

/** Las insignias de una acción (tecla y botón) en el idioma de la mesa; el CSS enseña la que toca. */
export function hint(act: Act): string {
  const [key, pad] = CONTROLS[act];
  return `${key ? `<kbd class="kh kb">${keyName(getLang(), key)}</kbd>` : ''}${pad ? `<kbd class="kh pd b-${pad.toLowerCase()}">${pad}</kbd>` : ''}`;
}

/**
 * La tabla de controles en `lang`: [acción, teclado y ratón, mando]. Sale de CONTROLS, así que no puede
 * decir una cosa distinta de la que enseñan las insignias. Ninguna fila se queda sin mando. Con `kbd`,
 * cada tecla y botón va en un <kbd class="kt"> (Ajustes: «Y» es un botón, no la conjunción española).
 */
export function controlRows(lang: Lang, kbd = false): [string, string, string][] {
  const T = (k: string, v?: Record<string, string>) => tFor(lang, k, v);
  const box = (s: string) => (kbd && s ? `<kbd class="kt">${s}</kbd>` : s);
  const key = (act: Act) => box(keyName(lang, CONTROLS[act][0]));
  const pad = (act: Act) => box(CONTROLS[act][1]);
  return [
    [T('ui.ctl.mover'), T('ui.ctl.mover.k'), T('ui.ctl.mover.p')],
    [T('ui.ctl.elegir'), T('ui.ctl.elegir.k', { k: key('choose') }), pad('choose')],
    [T('ui.ctl.golpear'), T('ui.ctl.golpear.k', { k: key('strike') }), pad('strike')],
    [T('ui.ctl.manga'), key('stash'), pad('stash')],
    [T('ui.ctl.rebobinar'), key('undo'), pad('undo')],
    [T('ui.ctl.descartar'), key('discard'), T('ui.ctl.descartar.p', { p: pad('discard') })],
    [T('ui.ctl.atras'), key('back'), pad('back')],
    [T('ui.ctl.saltar'), key('back'), pad('back')],
    [T('ui.ctl.mazo'), key('deck'), pad('deck')],
    [T('ui.ctl.lupa'), T('ui.ctl.lupa.k', { k: key('lupa') }), pad('lupa')],
    [T('ui.ctl.reliquias'), T('ui.ctl.reliquias.k', { mayus: box(T('ui.tecla.mayus')) }), T('ui.ctl.reliquias.p', { a: pad('beltLeft'), b: pad('beltRight') })],
    [T('ui.ctl.velocidad'), T('ui.ctl.barra'), pad('speed')],
    [T('ui.ctl.pantalla'), key('fullscreen'), T('ui.ctl.pantalla.p', { p: pad('fullscreen') })],
    [T('ui.ctl.reiniciar'), T('ui.ctl.mantener', { k: key('restart') }), T('ui.ctl.mantener', { k: pad('restart') })],
    [T('ui.ctl.ajustes'), T('ui.ctl.barra'), pad('settings')],
  ];
}

/** La tabla en español, en texto llano: la del README y REGLAS.md (`npm run docs`). */
export const CONTROL_ROWS: [string, string, string][] = controlRows('es');
