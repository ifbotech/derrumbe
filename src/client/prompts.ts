// Indicaciones de control. Cada acción lleva su tecla y su botón de mando; cuál de los dos se ve lo
// decide <html data-input="…"> (nav.ts): con el mando, el botón; con el teclado, la tecla; con el
// ratón o el dedo, ninguna.
export type Act = 'choose' | 'strike' | 'stash' | 'undo' | 'back' | 'deck' | 'lupa' | 'speed' | 'settings' | 'discard' | 'restart';

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
  discard: ['Supr', ''],
  restart: ['R', 'Select'],
};

/** Las insignias de una acción (tecla y botón); el CSS enseña la que toca. */
export function hint(act: Act): string {
  const [key, pad] = CONTROLS[act];
  return `${key ? `<kbd class="kh kb">${key}</kbd>` : ''}${pad ? `<kbd class="kh pd b-${pad.toLowerCase()}">${pad}</kbd>` : ''}`;
}
