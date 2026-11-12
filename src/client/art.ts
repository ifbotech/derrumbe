// Ilustraciones de interfaz en el mismo linograbado que la baraja:
// tinta, papel, tramas de palo y borde irregular (filtro #rough de card.ts).
// CORONA ROTA: la sala del trono de una corte de naipes, vista por los conjurados.
import type { Suit } from '../rules/engine';
import { pipPath } from './card';

const SUITS: Suit[] = ['S', 'D', 'H', 'C'];
const crow = (x: number, y: number, s = 1) => `<path class="cut" transform="translate(${x} ${y}) scale(${s})" d="M-12,2 q6,-9 12,0 q6,-9 12,0"/>`;

// ── la sala del trono: se dibuja por capas para poder animarlas por separado en la portada ──

const VIEW = 'viewBox="0 -200 640 620" preserveAspectRatio="xMidYMax slice"';
const RAYS = Array.from({ length: 27 }, (_, i) => `<path d="M0,-124 L${i % 2 ? 5 : 9},-620 L${i % 2 ? -5 : -9},-620 Z" transform="rotate(${-91 + i * 7})"/>`).join('');

/** Muro de la sala: sillares tallados apenas sobre la tinta y dos arcos ojivales. */
const WALL = Array.from({ length: 11 }, (_, r) => {
  const y = -170 + r * 52;
  const off = r % 2 ? 0 : 40;
  const joints = Array.from({ length: 9 }, (_, c) => `M${off + c * 80},${y} V${y + 52}`).join(' ');
  return `M0,${y} H640 ${joints}`;
}).join(' ');
const SKY = `<rect class="ink" x="-400" y="-200" width="1440" height="620"/>
    <path d="${WALL}" fill="none" stroke="#2c2823" stroke-width="3"/>
    <path d="M40,330 V40 Q40,-60 96,-110 Q152,-60 152,40 V330 M488,330 V40 Q488,-60 544,-110 Q600,-60 600,40 V330" fill="none" stroke="#3a342c" stroke-width="7"/>`;

/** Antorcha de pared: soporte de hierro y llama en tres tintas (lacre, ámbar y papel). */
const torch = (x: number, y: number) => `<g transform="translate(${x} ${y})">
    <path class="ink" d="M-7,0 H7 L4,46 H-4 Z" stroke="#eae0ce" stroke-width="2.5"/>
    <path class="ink" d="M-14,-2 H14 V6 H-14 Z" stroke="#eae0ce" stroke-width="2.5"/>
    <path class="rd" d="M0,-58 C10,-40 20,-26 14,-10 C11,-3 6,-1 0,-1 C-6,-1 -11,-3 -14,-10 C-20,-26 -8,-36 0,-58 Z"/>
    <path d="M0,-40 C6,-30 10,-20 7,-11 C5,-6 3,-5 0,-5 C-3,-5 -6,-7 -7,-11 C-9,-20 -4,-28 0,-40 Z" style="fill:var(--hazard)"/>
    <path class="pp" d="M0,-24 C3,-18 4,-13 2,-9 C1,-8 -1,-8 -2,-9 C-4,-13 -2,-18 0,-24 Z"/>
  </g>`;

/** Luz de antorcha: un halo de lacre detrás de la corona y los rayos que talla el buril. */
const SUN = `<g transform="translate(320 176)" class="pp" opacity="0.92">${RAYS}</g>
    <circle class="rd" cx="320" cy="176" r="118"/>
    <circle cx="320" cy="176" r="100" fill="none" stroke="#eae0ce" stroke-width="3" stroke-dasharray="3 9"/>`;
const CROWS = `${crow(470, -10)}${crow(500, 18, 0.7)}${crow(120, -30, 0.8)}${crow(214, -2, 0.6)}`;

/**
 * Los cuatro estandartes de las casas: asta con punta de lanza, travesaño y paño de cola de golondrina
 * con la trama de su palo. La pinta va en una rodela de papel con contorno de tinta, fuera del filtro.
 */
// [x, arriba, abajo, centro de la rodela]. Las rodelas van en la mitad baja del paño, por debajo de la
// franja del título de la portada (que en escritorio llega hasta y ≈ 100 de este lienzo), para que las
// cuatro pintas se vean enteras en todas las ventanas.
const BANNERS: [number, number, number, number][] = [
  [72, -70, 222, 150],
  [186, -30, 240, 166],
  [454, -30, 240, 166],
  [568, -70, 222, 150],
];
function banner(i: number): [string, string] {
  const s = SUITS[i];
  const [x, top, bot, mid] = BANNERS[i];
  const w = 40;
  const body = `<path class="pp" d="M${x - 3},420 V${top - 74} H${x + 3} V420 Z" stroke="#181614" stroke-width="1.5"/>
    <path class="pp" d="M${x},${top - 104} L${x + 9},${top - 76} L${x},${top - 68} L${x - 9},${top - 76} Z" stroke="#181614" stroke-width="2"/>
    <path class="ink" d="M${x - w - 8},${top - 6} H${x + w + 8} V${top + 4} H${x - w - 8} Z" stroke="#eae0ce" stroke-width="2.5"/>
    <path d="M${x - w},${top + 4} H${x + w} V${bot} L${x + w / 2},${bot - 22} L${x},${bot + 4} L${x - w / 2},${bot - 22} L${x - w},${bot} Z" fill="url(#pat-${s})" stroke="#eae0ce" stroke-width="4" stroke-linejoin="round"/>
    <path d="M${x - w + 6},${top + 14} H${x + w - 6} M${x - w + 6},${bot - 40} H${x + w - 6}" fill="none" stroke="#eae0ce" stroke-width="3"/>
    <circle class="pp" cx="${x}" cy="${mid}" r="27" stroke="#181614" stroke-width="4"/>`;
  const live = `<g transform="translate(${x} ${mid}) scale(1.95)" class="k${s}" stroke="#181614" stroke-width="1.1" paint-order="stroke">${pipPath(s)}</g>`;
  return [body, live];
}

/**
 * La gran corona de piedra, partida en dos: la mitad derecha se abre y la punta central yace en el escalón.
 * `whole` la dibuja entera (la corte que aún resiste).
 */
const CROWN_L = 'M222,372 L214,236 L240,300 L266,212 L293,300 L312,224 L318,240 L312,250 L328,290 L310,330 L324,372 Z';
const CROWN_R = 'M324,372 L310,330 L328,290 L312,250 L318,240 L330,232 L347,300 L374,212 L400,300 L426,236 L418,372 Z';
const CROWN_WHOLE = 'M222,372 L214,236 L240,300 L266,212 L293,300 L320,192 L347,300 L374,212 L400,300 L426,236 L418,372 Z';
const STONE = 'fill:var(--paper-3)';
const crownBand = (x1: number, x2: number) =>
  `<path d="M${x1},336 H${x2} M${x1},352 H${x2}" fill="none" stroke="#181614" stroke-width="3"/>`;
const sockets = (xs: number[]) => xs.map((x, i) => `<circle cx="${x}" cy="344" r="${i % 2 ? 5 : 7}" class="${i % 2 ? 'ink' : 'rd'}" stroke="#181614" stroke-width="2.5"/>`).join('');
const balls = (pts: [number, number][]) => pts.map(([x, y]) => `<circle class="pp" cx="${x}" cy="${y}" r="7" stroke="#181614" stroke-width="3"/>`).join('');
function crown(whole: boolean): string {
  if (whole) {
    return `<g><path d="${CROWN_WHOLE}" style="${STONE}" stroke="#181614" stroke-width="5" stroke-linejoin="round"/>
      <path d="M347,300 L374,212 L400,300 Z M400,300 L426,236 L418,372 H400 Z M293,300 L320,192 L330,300 Z" fill="url(#hatch-ink)" opacity="0.85"/>
      ${crownBand(222, 418)}${sockets([252, 290, 320, 350, 388])}${balls([[214, 236], [266, 212], [320, 192], [374, 212], [426, 236]])}</g>`;
  }
  return `<g transform="translate(-6 0) rotate(-5 222 372)"><path d="${CROWN_L}" style="${STONE}" stroke="#181614" stroke-width="5" stroke-linejoin="round"/>
      <path d="M266,212 L293,300 L280,300 Z M240,300 L214,236 L226,300 Z" fill="url(#hatch-ink)" opacity="0.85"/>
      ${crownBand(222, 314)}${sockets([252, 290])}${balls([[214, 236], [266, 212]])}</g>
    <g transform="translate(24 0) rotate(9 418 372)"><path d="${CROWN_R}" style="${STONE}" stroke="#181614" stroke-width="5" stroke-linejoin="round"/>
      <path d="M347,300 L374,212 L400,300 Z M400,300 L426,236 L418,372 H400 Z" fill="url(#hatch-ink)" opacity="0.85"/>
      ${crownBand(320, 418)}${sockets([350, 388])}${balls([[374, 212], [426, 236]])}</g>
    <path d="M466,372 L478,340 L500,372 Z" style="${STONE}" stroke="#181614" stroke-width="4" stroke-linejoin="round"/>
    <circle class="pp" cx="492" cy="338" r="6" stroke="#181614" stroke-width="3"/>
    <path class="ink" d="M150,372 l8,-10 l12,4 l2,6 Z M520,372 l-6,-8 l-10,2 l-3,6 Z"/>`;
}

/** Daga en alzado, con el puño en (0,0) y la hoja hacia arriba: hoja de papel, guarda y pomo de oro. */
const DAGGER = `<path class="pp" d="M-10,0 V-224 L0,-262 L10,-224 V0 Z" stroke="#181614" stroke-width="4" stroke-linejoin="round"/>
    <path d="M0,-6 V-236" fill="none" stroke="#181614" stroke-width="3"/>
    <path d="M0,0 H10 V-224 L0,-262 Z" fill="url(#hatch-ink)" opacity="0.8"/>
    <path class="gd" d="M-34,0 Q0,-12 34,0 V10 Q0,0 -34,10 Z" stroke="#181614" stroke-width="3.5" stroke-linejoin="round"/>
    <path class="ink" d="M-7,10 H7 V46 H-7 Z"/>
    <path class="cut" d="M-6,18 L6,22 M-6,28 L6,32 M-6,38 L6,42"/>
    <circle class="gd" cx="0" cy="56" r="11" stroke="#181614" stroke-width="3.5"/>`;
const DAGGERS = `<g transform="translate(250 110) rotate(142)">${DAGGER}</g><g transform="translate(390 110) rotate(-142)">${DAGGER}</g>`;

/** Sello de lacre con una corona en relieve, colgado de dos cintas. */
const SEAL = `<path d="M306,392 L290,420 H304 L312,404 Z M334,392 L350,420 H336 L328,404 Z" class="ink" stroke="#eae0ce" stroke-width="2.5"/>
    <path class="rd" d="M320,358 l7,4 8,-1 4,7 7,4 -1,8 4,7 -4,7 1,8 -7,4 -4,7 -8,-1 -7,4 -7,-4 -8,1 -4,-7 -7,-4 1,-8 -4,-7 4,-7 -1,-8 7,-4 4,-7 8,1 Z" stroke="#181614" stroke-width="3"/>
    <circle cx="320" cy="390" r="21" fill="none" stroke="#eae0ce" stroke-width="2"/>
    <path d="M307,398 L305,382 L313,389 L320,378 L327,389 L335,382 L333,398 Z" class="pp" stroke="#181614" stroke-width="2"/>`;

/** Gradas del trono, a contraluz. */
const DAIS = `<path class="ink" d="M-400,392 H1040 V420 H-400 Z" stroke="#eae0ce" stroke-width="3"/>
    <path class="ink" d="M120,372 H520 V392 H120 Z" stroke="#eae0ce" stroke-width="3"/>
    <path class="cut" d="M150,382 h40 M240,382 h30 M380,382 h50 M460,382 h30 M40,406 h60 M560,406 h50"/>`;

const RIDGE = (whole: boolean) => `${DAIS}${DAGGERS}${crown(whole)}${SEAL}`;
const TORCHES = `${torch(129, 300)}${torch(511, 300)}`;

/**
 * La sala del trono quieta (pantallas finales): estandartes, antorchas y la corona.
 * Si `whole`, la corona está entera: la corte resiste.
 */
export function skyline(cls = '', whole = true): string {
  const parts = SUITS.map((_, i) => banner(i));
  return `<svg class="art lino ${cls}" ${VIEW} aria-hidden="true">
  <g filter="url(#rough)">
    ${SKY}${SUN}${CROWS}
    ${parts.map(([body]) => body).join('')}
    ${TORCHES}${RIDGE(whole)}
  </g>
  ${parts.map(([, live]) => live).join('')}
  </svg>`;
}

/**
 * La misma sala para la portada, pero viva: cada estandarte es una capa propia que se mece,
 * la luz de antorcha barre el muro y flota ceniza. La corona, partida, preside.
 * Cada capa se pinta una sola vez y solo se mueve con transformaciones (barato para el navegador).
 */
export function hero(): string {
  const layer = (cls: string, body: string, live = '') => `<svg class="art lino hero-ly ${cls}" ${VIEW} aria-hidden="true"><g filter="url(#rough)">${body}</g>${live}</svg>`;
  const dust = Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 53 + 7) % 100}%;--s:${3 + ((i * 7) % 6)}px;--t:${9 + ((i * 5) % 9)}s;--d:${-((i * 37) % 17)}s;--w:${((i * 29) % 60) - 30}px"></i>`).join('');
  return `<div class="hero-art" aria-hidden="true">
    ${layer('h-sky', SKY)}
    <svg class="art lino hero-ly h-sun" ${VIEW}><g filter="url(#rough)"><g class="sun-rays">${SUN}</g>${CROWS}</g></svg>
    <svg class="hero-ly h-beam" ${VIEW}><g transform="translate(320 300)"><path class="beam" d="M0,0 L-80,-640 L80,-640 Z"><animateTransform attributeName="transform" type="rotate" values="-16;16;-16" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="15s" repeatCount="indefinite"/></path></g></svg>
    ${SUITS.map((_, i) => {
      const [body, live] = banner(i);
      return layer(`mono m${i}`, body, live);
    }).join('')}
    ${layer('h-ridge', TORCHES + RIDGE(false))}
    <div class="hero-dust">${dust}</div>
  </div>`;
}

/** Trono caído: un estandarte rasgado en el suelo, con la trama de su casa, y la corona partida encima. */
export function rubble(s: Suit, cls = ''): string {
  return `<svg class="art lino ${cls}" viewBox="0 0 200 150" aria-hidden="true"><g filter="url(#rough)">
    <path d="M14,146 L30,104 L96,96 L84,118 L112,110 L104,134 L150,122 L186,146 Z" fill="url(#pat-${s})" class="ol"/>
    <path class="cut" d="M40,120 L60,138 M120,126 L132,140"/>
    <path class="ink" d="M22,104 L176,58 L180,66 L26,112 Z"/>
    <path class="pp ol" d="M176,58 l12,-8 l-2,14 Z"/>
    <path class="ink" d="M0,146 H200 V150 H0 Z"/>
  </g>
  <g transform="translate(96 94) rotate(-14)">
    <g class="crn-l"><path d="M-40,22 L-46,-18 L-30,2 L-16,-24 L-4,2 L2,-12 L-2,22 Z" style="fill:var(--paper-3)" class="ol"/>
      <path d="M-40,10 H-4" fill="none" stroke="#181614" stroke-width="3"/>
      <circle class="rd" cx="-22" cy="16" r="4" stroke="#181614" stroke-width="2"/></g>
    <g class="crn-r"><g transform="rotate(12 40 22)"><path d="M6,22 L4,-6 L12,4 L24,-24 L32,2 L46,-18 L40,22 Z" style="fill:var(--paper-3)" class="ol"/>
      <path d="M8,10 H40" fill="none" stroke="#181614" stroke-width="3"/></g></g>
  </g></svg>`;
}

/**
 * Tu escondite de conjurado: el Escudo a la izquierda, tu estandarte de conjura en medio y la Vida
 * a la derecha. Se rasga a medida que pierdes Vida (data-level 0-3).
 */
export function bunkerArt(): string {
  return `<svg class="art lino bunker-art" viewBox="0 0 260 66" data-level="0" aria-hidden="true"><g filter="url(#rough)">
    <path class="ink" d="M10,8 H50 V30 C50,46 40,56 30,62 C20,56 10,46 10,30 Z"/>
    <path class="cut heavy" d="M30,14 V54 M16,28 H44"/>
    <path class="ink" d="M64,10 H196 L186,30 L196,50 H64 L74,30 Z"/>
    <path class="cut" d="M80,16 H180 M80,44 H180"/>
    <path class="pp" d="M108,38 L105,22 L115,29 L124,18 L130,26 L136,20 L146,29 L156,22 L152,38 Z" stroke="#181614" stroke-width="1.5"/>
    <path class="k k1" d="M150,10 L142,24 L154,32 L146,50"/>
    <path class="k k2" d="M92,10 L100,22 L90,34 L100,50"/>
    <path class="k k3" d="M176,12 L168,28 L180,36 L172,50 M124,40 L118,50"/>
    <g transform="translate(230 34) scale(2.3)" class="kH" stroke="#181614" stroke-width="1.6" paint-order="stroke">${pipPath('H')}</g>
    <path class="ink" d="M0,63 H260 V66 H0 Z"/>
  </g></svg>`;
}

/** Franja con la trama del palo de un trono. */
export const strip = (s: Suit) => `<svg class="strip" width="100%" height="12" aria-hidden="true"><rect width="100%" height="12" fill="url(#pat-${s})"/></svg>`;
