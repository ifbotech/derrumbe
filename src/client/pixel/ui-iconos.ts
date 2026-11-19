// V40 · fase 3b (juice-ux) · Los iconos de los botones discretos de la barra y de la portada, en el pixel-art oscuro y
// tramado de la casa: el engranaje de Ajustes (el glifo viejo se leía como un escudo con espada), AUTO (dos flechas que
// giran en rueda), Mejor jugada (un destello de oro de cuatro puntas, distinto de la ★ de Sinergia) y Deshacer (una
// flecha que vuelve, de hueso). 16 × 16, sin contorno negro, luz arriba a la izquierda y los pasos de tono tramados con
// Bayer (dither.ts). Se leen a 20 px sobre la penumbra del HUD.
import { sombrear } from './dither';
import { tintas } from './paleta';
import { Lienzo } from './pincel';
import { medida, rects } from './rejilla';

const T = tintas();
const N = 16;
const C = 8;
const polar = (x: number, y: number): [number, number] => [Math.hypot(x - C, y - C), Math.atan2(y - C, x - C)];
const grados = (a: number) => ((a * 180) / Math.PI + 360) % 360;

/** El engranaje de Ajustes: ocho dientes de acero, el cubo de oro y el ojo hueco. */
function engranaje(): string[] {
  const l = new Lienzo(N, N);
  // el cuerpo redondo y ocho dientes: cuatro rectos (arriba, abajo y a los lados) y cuatro en diagonal
  l.pintar((x, y) => polar(x, y)[0] <= 5.3, 'c');
  l.rect(6, 0, 4, 3, 'c').rect(6, 13, 4, 3, 'c').rect(0, 6, 3, 4, 'c').rect(13, 6, 3, 4, 'c');
  for (const [x, y] of [[2, 2], [11, 2], [2, 11], [11, 11]]) l.rect(x, y, 3, 3, 'c');
  sombrear(l, 'c', 'bcC', { base: 0.55, pendiente: 1, ancho: 0.3 });
  l.pintar((x, y) => polar(x, y)[0] <= 3.2, 'y');
  sombrear(l, 'y', 'oyY', { base: 0.55, pendiente: 1, ancho: 0.3 });
  l.pintar((x, y) => polar(x, y)[0] <= 1.5, '.');
  return l.mapa();
}

/** AUTO: el avance doble de lima (dos puntas que empujan: el juego que se juega solo). */
function auto(): string[] {
  const l = new Lienzo(N, N);
  l.poli([[1, 2], [8, 8], [1, 14]], 'l');
  l.poli([[8, 2], [15, 8], [8, 14]], 'l');
  sombrear(l, 'l', 'glK', { base: 0.6, pendiente: 0.8, ancho: 0.2 });
  return l.mapa();
}

/** Mejor jugada: el destello de oro, de cuatro puntas, con su centro encendido. */
function mejor(): string[] {
  const l = new Lienzo(N, N);
  l.poli([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], 'y');
  sombrear(l, 'y', 'oyY', { base: 0.6, pendiente: 1, ancho: 0.3 });
  return l.mapa();
}

/** Deshacer: una flecha de hueso que da la vuelta hacia la izquierda. */
function deshacer(): string[] {
  const l = new Lienzo(N, N);
  // el arco: media rueda de 2 celdas de grueso que baja por la derecha; la punta, a la izquierda arriba
  l.pintar((x, y) => {
    const r = Math.hypot(x - 9, y - 9);
    return r >= 3.5 && r <= 6 && (y <= 9 || x >= 9);
  }, 'm');
  l.poli([[1, 7], [6, 2], [6, 12]], 'm');
  sombrear(l, 'm', 'hmw', { base: 0.6, pendiente: 1, ancho: 0.3 });
  return l.mapa();
}

export const UI_ICONOS = { engranaje: engranaje(), auto: auto(), mejor: mejor(), deshacer: deshacer() } as const;
export type UiIcono = keyof typeof UI_ICONOS;

/** El icono en SVG. Clases: `.px .icono .ic-ui .u-<nombre>`. */
export function uiIconoSvg(que: UiIcono, cls = ''): string {
  const m = UI_ICONOS[que];
  const [w, h] = medida(m);
  return `<svg class="px icono ic-ui u-${que}${cls ? ` ${cls}` : ''}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(m, T)}</svg>`;
}
