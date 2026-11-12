// Indicaciones de control. Cada acción lleva su tecla y su botón de mando; cuál de los dos se ve lo
// decide <html data-input="…"> (nav.ts): con el mando, el botón; con el teclado, la tecla; con el
// ratón o el dedo, ninguna.
//
// Aquí vive también la tabla de controles entera (CONTROL_ROWS): la leen Ajustes (widgets.ts), el
// README y REGLAS.md (scripts/reglas.ts, con `npm run docs`) y la prueba de humo. Este módulo no toca
// el DOM: se puede importar desde un script de Node.
export type Act = 'choose' | 'strike' | 'stash' | 'undo' | 'back' | 'deck' | 'lupa' | 'speed' | 'settings' | 'discard' | 'restart' | 'beltLeft' | 'beltRight' | 'fullscreen';

/** [tecla, botón del mando]. Vacío: esa acción no tiene atajo ahí. */
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
  // con el foco en una herramienta del cinturón; fuera de él, LB abre el mazo y RB la lupa
  beltLeft: ['Mayús ←', 'LB'],
  beltRight: ['Mayús →', 'RB'],
  // R3 = pulsar la palanca derecha
  fullscreen: ['F', 'R3'],
};

/** Las insignias de una acción (tecla y botón); el CSS enseña la que toca. */
export function hint(act: Act): string {
  const [key, pad] = CONTROLS[act];
  return `${key ? `<kbd class="kh kb">${key}</kbd>` : ''}${pad ? `<kbd class="kh pd b-${pad.toLowerCase()}">${pad}</kbd>` : ''}`;
}

const [K, P] = [0, 1] as const;
const key = (act: Act) => CONTROLS[act][K];
const pad = (act: Act) => CONTROLS[act][P];

/**
 * La tabla de controles: [acción, teclado y ratón, mando]. Sale de CONTROLS, así que no puede
 * decir una cosa distinta de la que enseñan las insignias. Ninguna fila se queda sin mando.
 */
export const CONTROL_ROWS: [string, string, string][] = [
  ['Mover el foco', 'Flechas', 'Cruceta o palanca izquierda'],
  ['Elegir', `${key('choose')} · 1–9 en la mano · clic`, pad('choose')],
  ['Golpear la torre apuntada', `${key('strike')} · clic en la torre`, pad('strike')],
  ['Guardar en el andamio', key('stash'), pad('stash')],
  ['Tiza de replanteo (deshacer)', key('undo'), pad('undo')],
  ['Descartar lo elegido', key('discard'), `${pad('discard')} (pulsar la palanca izquierda)`],
  ['Atrás / soltar la selección', key('back'), pad('back')],
  ['Mazo (cantera y escombrera)', key('deck'), pad('deck')],
  ['Lupa de grabador', `${key('lupa')} · clic derecho · pulsación larga`, pad('lupa')],
  ['Reordenar el cinturón', 'Arrastrar · Mayús + flechas', `${pad('beltLeft')} / ${pad('beltRight')} con el foco en la herramienta`],
  ['Cambiar la velocidad (1× → 2× → 4×)', 'botón de la barra', pad('speed')],
  ['Pantalla completa', key('fullscreen'), `${pad('fullscreen')} (pulsar la palanca derecha)`],
  ['Reiniciar la campaña', `Mantener ${key('restart')}`, `Mantener ${pad('restart')}`],
  ['Ajustes', 'botón de la barra', pad('settings')],
];
