// Ilustraciones de interfaz en el mismo linograbado que la baraja:
// tinta, papel, tramas de material y borde irregular (filtro #rough de card.ts).
import type { Suit } from '../rules/engine';

const eye = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><g class="lid"><ellipse class="pp" rx="14" ry="9.5" stroke="#181614" stroke-width="3"/><g class="iris"><circle class="rd" r="6"/><circle class="ink" r="2.6"/></g></g></g>`;

const crew = (x: number, y: number, flip = false) =>
  `<g transform="translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}" class="crew"><circle cy="-25" r="5"/><path d="M0,-20 V-6 M0,-6 L-6,7 M0,-6 L6,7 M0,-16 L9,-26 L13,-40"/><rect x="5" y="-50" width="17" height="10" transform="rotate(16 13 -45)"/></g>`;

// ── la ciudad: se dibuja por piezas para poder animarlas por separado en la portada ──

const VIEW = 'viewBox="0 -200 640 620" preserveAspectRatio="xMidYMax slice"';
const floors = (x1: number, x2: number, ys: number[]) => ys.map((y) => `M${x1},${y} H${x2}`).join(' ');
const crow = (x: number, y: number, s = 1) => `<path class="cut" transform="translate(${x} ${y}) scale(${s})" d="M-12,2 q6,-9 12,0 q6,-9 12,0"/>`;
const RAYS = Array.from({ length: 27 }, (_, i) => `<path d="M0,-118 L${i % 2 ? 5 : 9},-620 L${i % 2 ? -5 : -9},-620 Z" transform="rotate(${-91 + i * 7})"/>`).join('');

const SKY = `<rect class="ink" x="-400" y="-200" width="1440" height="620"/>`;
const SUN = `<g transform="translate(280 276)" class="pp">${RAYS}</g>
    <circle class="rd" cx="280" cy="276" r="110"/>
    <circle cx="280" cy="276" r="92" fill="none" stroke="#eae0ce" stroke-width="3" stroke-dasharray="3 9"/>`;
const CROWS = `${crow(420, 58)}${crow(456, 84, 0.7)}${crow(96, 44, 0.8)}${crow(250, 70, 0.6)}`;

/** Las cuatro torres: [tinta tallada, ojo vivo]. */
const MONOLITHS: [string, string][] = [
  // ACERO: aguja de vigas
  [
    `<path class="pp" d="M72,132 L80,34 L88,132 Z M66,74 H94 V80 H66 Z"/>
    <path d="M26,420 L44,130 H116 L134,420 Z" fill="url(#pat-S)" stroke="#eae0ce" stroke-width="4" stroke-linejoin="round"/>
    <path class="ink" d="M100,130 H116 L134,420 H110 Z"/>
    <path d="${floors(50, 96, [206, 238, 270, 302, 334])}" fill="none" stroke="#eae0ce" stroke-width="7" stroke-dasharray="9 8"/>`,
    eye(80, 168),
  ],
  // VIDRIO: esquirla
  [
    `<path d="M140,420 L156,84 L200,30 L228,420 Z" fill="url(#pat-D)" stroke="#eae0ce" stroke-width="4" stroke-linejoin="round"/>
    <path class="ink" d="M200,30 L228,420 H206 Z"/>
    <path class="crack" d="M200,30 L184,150 L204,196 L174,262 L196,318 L182,420 M156,84 L186,150 M204,196 L226,236"/>`,
    eye(184, 124, 0.9),
  ],
  // LADRILLO: torre del homenaje
  [
    `<path class="thin" style="stroke:#eae0ce" d="M394,152 V84"/>
    <path class="rd" d="M394,84 L442,98 L394,114 Z" stroke="#eae0ce" stroke-width="3" stroke-linejoin="round"/>
    <path d="M328,420 L338,182 H322 V150 H344 V165 H364 V150 H384 V165 H404 V150 H424 V165 H444 V150 H466 V182 H450 L460,420 Z" fill="url(#pat-H)" stroke="#eae0ce" stroke-width="4" stroke-linejoin="round"/>
    <path class="ink" d="M436,182 H450 L460,420 H440 Z"/>
    <path class="ink" d="M372,420 V352 a20,24 0 0 1 40,0 V420 Z" stroke="#eae0ce" stroke-width="3"/>
    <path class="cut" d="M382,350 V420 M392,340 V420 M402,350 V420"/>
    <path class="ink" d="M350,246 h8 v30 h-8 Z M426,246 h8 v30 h-8 Z M388,280 h8 v30 h-8 Z"/>`,
    eye(394, 212, 1.05),
  ],
  // HORMIGÓN: bloques en voladizo
  [
    `<path d="M486,420 V314 H472 V240 H494 V172 H476 V92 H502 V58 H584 V92 H608 V172 H590 V240 H612 V314 H598 V420 Z" fill="url(#pat-C)" stroke="#eae0ce" stroke-width="4" stroke-linejoin="round"/>
    <path class="ink" d="M584,58 V92 H608 V172 H590 V240 H612 V314 H598 V420 H574 V58 Z" opacity="0.92"/>
    <path class="ink" d="M490,196 h70 v13 h-70 Z M484,262 h78 v13 h-78 Z M496,336 h66 v13 h-66 Z"/>
    <path class="pp" d="M520,58 V34 h10 V46 h12 V30 h10 V46 h12 V34 h10 V58 Z"/>`,
    eye(528, 132, 1.15),
  ],
];

/** Cresta, búnker y cuadrilla a contraluz. */
const RIDGE = `<path class="ink" d="M0,420 V384 C100,362 190,374 280,356 C372,338 520,378 640,360 V420 Z" stroke="#eae0ce" stroke-width="3.5"/>
    <path class="ink" d="M-400,384 H0 V420 H-400 Z M640,360 H1040 V420 H640 Z"/>
    <path class="ink" d="M206,366 C206,326 272,326 272,358 Z"/>
    <path d="M222,348 H258" fill="none" stroke="#ae2d24" stroke-width="5"/>
    ${crew(294, 357)}${crew(318, 352, true)}
    <path class="ink" d="M150,378 l10,-18 l18,5 l5,13 Z M470,372 l-8,-14 l-16,3 l-7,11 Z"/>`;

/**
 * Las cuatro torres, colosales y despiertas, contra un sol de sangre en un cielo de tinta.
 * En la cresta, a contraluz, el búnker y la cuadrilla con los mazos en alto.
 * Los ojos de las torres siguen al puntero (los mueve bindEyes, igual que en las cartas).
 */
export function skyline(cls = ''): string {
  return `<svg class="art lino ${cls}" ${VIEW} aria-hidden="true">
  <g filter="url(#rough)">
    ${SKY}${SUN}${CROWS}
    ${MONOLITHS.map(([body]) => body).join('')}
    ${RIDGE}
  </g>
  ${MONOLITHS.map(([, live]) => live).join('')}
  </svg>`;
}

/**
 * La misma ciudad para la portada, pero viva: cada monolito es una capa propia que se mece,
 * el sol gira despacio, un reflector barre el cielo desde el búnker y flota polvo de tinta.
 * Cada capa se pinta una sola vez y solo se mueve con transformaciones (barato para el navegador).
 */
export function hero(): string {
  const layer = (cls: string, body: string, live = '') => `<svg class="art lino hero-ly ${cls}" ${VIEW} aria-hidden="true"><g filter="url(#rough)">${body}</g>${live}</svg>`;
  const dust = Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 53 + 7) % 100}%;--s:${3 + ((i * 7) % 6)}px;--t:${9 + ((i * 5) % 9)}s;--d:${-((i * 37) % 17)}s;--w:${((i * 29) % 60) - 30}px"></i>`).join('');
  return `<div class="hero-art" aria-hidden="true">
    ${layer('h-sky', SKY)}
    <svg class="art lino hero-ly h-sun" ${VIEW}><g filter="url(#rough)"><g class="sun-rays">${SUN}</g>${CROWS}</g></svg>
    <svg class="hero-ly h-beam" ${VIEW}><g transform="translate(239 344)"><path class="beam" d="M0,0 L-70,-640 L70,-640 Z"><animateTransform attributeName="transform" type="rotate" values="-42;36;-42" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="15s" repeatCount="indefinite"/></path></g></svg>
    ${MONOLITHS.map(([body, live], i) => layer(`mono m${i}`, body, live)).join('')}
    ${layer('h-ridge', RIDGE)}
    <div class="hero-dust">${dust}</div>
  </div>`;
}

/** Montón de escombros de una torre demolida, con su corona rota encima. */
export function rubble(s: Suit, cls = ''): string {
  return `<svg class="art lino ${cls}" viewBox="0 0 200 150" aria-hidden="true"><g filter="url(#rough)">
    <path class="thin" d="M58,96 L50,58 M132,70 L146,34 M150,36 l8,-6 M104,64 L100,30"/>
    <path d="M16,150 L32,104 L80,94 L96,150 Z" fill="url(#pat-${s})" class="ol"/>
    <path class="ink" d="M66,150 L86,72 L130,62 L154,150 Z"/>
    <path class="cut" d="M92,82 L104,150 M118,70 L126,112 L112,150 M86,110 L100,116"/>
    <path d="M128,150 L140,110 L180,118 L188,150 Z" fill="url(#pat-${s})" class="ol"/>
    <rect class="ink" x="20" y="82" width="16" height="12" transform="rotate(-24 28 88)"/>
    <rect class="pp ol" x="160" y="84" width="18" height="13" transform="rotate(18 169 90)"/>
    <rect class="ink" x="176" y="60" width="9" height="9" transform="rotate(40 180 64)"/>
    <g transform="translate(108 50) rotate(-20)"><path class="gd ol" d="M-26,14 L-30,-2 V-12 H-20 V-3 H-11 V-16 H-1 V-3 H8 V-16 H18 V-3 H27 V-12 H37 V-2 L33,14 Z"/></g>
    <path class="ink" d="M0,146 H200 V150 H0 Z"/>
  </g></svg>`;
}

/** El búnker: se agrieta a medida que pierde integridad (data-level 0-3). */
export function bunkerArt(): string {
  return `<svg class="art lino bunker-art" viewBox="0 0 260 66" data-level="0" aria-hidden="true"><g filter="url(#rough)">
    <path d="M8,62 V40 H42 V62 Z M218,62 V40 H252 V62 Z" fill="url(#pat-C)" class="ol"/>
    <path class="ink" d="M38,62 C38,8 222,8 222,62 Z"/>
    <path class="cut heavy" d="M96,36 H164"/>
    <path class="cut" d="M60,54 h5 M82,54 h5 M173,54 h5 M195,54 h5 M130,18 v8"/>
    <path class="pp" d="M120,62 V48 h20 V62 Z"/>
    <path class="k k1" d="M150,12 L142,26 L156,34 L146,46"/>
    <path class="k k2" d="M70,28 L84,38 L74,48 L88,58"/>
    <path class="k k3" d="M196,24 L184,34 L198,44 L186,60 M184,34 L170,30"/>
    <path class="ink" d="M0,60 H260 V66 H0 Z"/>
  </g></svg>`;
}

/** Franja con la trama del material de una torre. */
export const strip = (s: Suit) => `<svg class="strip" width="100%" height="12" aria-hidden="true"><rect width="100%" height="12" fill="url(#pat-${s})"/></svg>`;
