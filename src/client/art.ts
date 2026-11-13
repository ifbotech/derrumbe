// Ilustraciones de interfaz en el mismo linograbado que la baraja:
// tinta, papel, tramas de palo y borde irregular (filtro #rough de card.ts).
// La sala del trono de una corte de naipes, vista por los conjurados.
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

/**
 * El mismo sello de lacre, suelto y sin cintas: lo que cierra la cinta grabada del candado de la
 * portada (el título y, sellado junto a él, el nombre del otro idioma).
 */
export const waxSeal = (cls = ''): string =>
  `<svg class="art wax ${cls}" viewBox="284 354 72 72" aria-hidden="true" focusable="false">${SEAL.slice(SEAL.indexOf('<path class="rd"'))}</svg>`;

const RIDGE = (whole: boolean) =>`${DAIS}${DAGGERS}${crown(whole)}${SEAL}`;
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

// ───────────────────────── V7 · los siete monarcas, en busto ─────────────────────────
// Retratos de grabado para la mesa, la placa del decreto y la galería: cada uno se reconoce a 24 px por
// su silueta, su tocado y su objeto (biblia de nombres), nunca por rasgos de la cara. Dos caras:
// `calma` (erguido, el objeto en la mano) y `vencido` (el busto se ladea, los ojos se cierran en aspa
// y el objeto cae o se parte). Lienzo de 100 × 100 y sin filtros: se puede mover con transform sin coste.
// Los trazos van con clases de guia.css (.o contorno de tinta, .o-pp contorno de papel, .o-thin, .m-x…).

export type MonarchMood = 'calma' | 'vencido';
export const MONARCH_IDS = ['doble', 'escasez', 'sequia', 'intemperie', 'blindaje', 'furia', 'inestable'] as const;

/** Ojos: almendra de tinta en calma, aspa en la derrota. */
const eyes = (pts: [number, number][], down: boolean) =>
  pts
    .map(([x, y]) => (down ? `<path class="m-x" d="M${x - 3},${y - 3} L${x + 3},${y + 3} M${x + 3},${y - 3} L${x - 3},${y + 3}"/>` : `<path class="ink" d="M${x - 3.6},${y} Q${x},${y - 3.2} ${x + 3.6},${y} Q${x},${y + 2.6} ${x - 3.6},${y} Z"/>`))
    .join('');

/** Hombros con manto: la base común de los bustos. */
const mantle = (fill: string, d = 'M12,100 C14,82 30,72 50,72 C70,72 86,82 88,100 Z') => `<path class="${fill} o" d="${d}"/>`;

interface Bust {
  /** El fondo del medallón. */
  bg: string;
  /** Lo que se ladea con la derrota (cabeza, tocado y manto). */
  body: (down: boolean) => string;
  /** El objeto, en la mano o caído. */
  item: (down: boolean) => string;
}

const BUSTS: Record<string, Bust> = {
  // El Rey de Dos Caras: rey de naipe partido en diagonal, una cara arriba mirando a un lado y otra
  // abajo mirando al otro, con su corona en cada punta. La silueta es la de la carta alta.
  doble: {
    bg: 'm-bg-rd',
    body: (down) => {
      const half = (flip: boolean) => `<g${flip ? ' transform="rotate(180 50 50)"' : ''}>
        <path class="gd o" d="M33,27 L34,11 L41,19 L46,8 L51,19 L58,11 L59,27 Z"/>
        <path class="pp o" d="M34,27 H58 V36 C58,44 52,47 46,47 C40,47 34,44 34,36 Z"/>
        <path class="ink" d="M57,31 L64,35 L57,38 Z"/>
        ${eyes([[51, 33]], down)}
      </g>`;
      return `<path class="pp o" d="M24,4 H76 V96 H24 Z"/><path class="o-thin" d="M24,96 L76,4"/>${half(false)}${half(true)}`;
    },
    item: (down) => (down ? '<path class="m-crack" d="M30,8 L44,40 L36,58 L52,92"/>' : ''),
  },
  // El Usurero: flaco, gorro de terciopelo caído hacia un lado, cuello de armiño y balanza de mano con monedas
  escasez: {
    bg: 'm-bg-pp',
    body: (down) => `${mantle('ink', 'M24,100 C26,84 36,76 48,76 C60,76 70,84 72,100 Z')}
      <path class="pp o" d="M30,80 C36,72 60,72 66,80 C60,86 36,86 30,80 Z"/>
      <path class="ink" d="M38,78 h3 v3 h-3 Z M47,77 h3 v3 h-3 Z M56,78 h3 v3 h-3 Z"/>
      <path class="pp o" d="M40,40 C40,30 56,30 56,40 V58 C56,68 52,74 48,74 C44,74 40,68 40,58 Z"/>
      <path class="rd o" d="M36,41 C33,26 44,13 58,15 C71,17 77,26 75,37 L66,35 C64,29 60,27 56,29 L57,41 Z"/>
      ${eyes([[44.5, 50], [52, 50]], down)}`,
    item: (down) =>
      down
        ? '<g transform="translate(70 92) rotate(64)"><path class="o-thin" d="M-14,0 H14"/></g><circle class="gd o" cx="86" cy="88" r="5"/><circle class="gd o" cx="66" cy="91" r="5"/>'
        : // La balanza va en la mano, a la altura del hombro y fuera de la cara: nada sobresale del rostro.
          `<g transform="translate(76 71) scale(0.86)"><path class="o-thin" d="M0,-18 V-2 M-17,-2 H17"/><path class="ink" d="M-3,-21 h6 v4 h-6 Z"/>
          <path class="gd o" d="M-21,-2 H-11 L-12,9 C-14,13 -18,13 -20,9 Z"/><path class="pp o" d="M11,-2 H21 L21,5 C19,9 13,9 11,5 Z"/></g>`,
  },
  // La Dama del Cáliz: velo largo en triángulo desde lo alto de la cabeza y un cáliz ofrecido del que sube humo verde
  sequia: {
    bg: 'm-bg-vd',
    body: (down) => `<path class="ink o-pp" d="M50,10 C30,24 18,60 12,100 H88 C82,60 70,24 50,10 Z"/>
      <path class="pp o" d="M41,40 C41,30 59,30 59,40 V54 C59,64 55,68 50,68 C45,68 41,64 41,54 Z"/>
      ${eyes([[45.5, 48], [54.5, 48]], down)}`,
    item: (down) =>
      down
        ? '<g transform="translate(72 90) rotate(100)"><path class="gd o" d="M-10,-12 H10 C10,-2 6,4 0,4 C-6,4 -10,-2 -10,-12 Z"/><path class="gd o" d="M-2,4 H2 V12 H-2 Z M-7,12 H7 V15 H-7 Z"/></g><path class="m-veneno o" d="M54,95 C62,90 74,92 84,96 C74,99 62,99 54,95 Z"/>'
        : `<path class="m-humo" d="M45,74 C41,68 49,64 45,58 M55,74 C59,68 51,64 55,58"/>
          <g transform="translate(50 86)"><path class="gd o" d="M-12,-12 H12 C12,-2 6,4 0,4 C-6,4 -12,-2 -12,-12 Z"/><path class="gd o" d="M-2,4 H2 V8 H-2 Z M-8,8 H8 V11 H-8 Z"/></g>`,
  },
  // La Reina Helada: corona de carámbanos altos y desiguales, capa ancha de armiño
  intemperie: {
    bg: 'm-bg-gl',
    body: (down) => `${mantle('pp', 'M4,100 C6,80 28,70 50,70 C72,70 94,80 96,100 Z')}
      <path class="ink" d="M20,86 h3 v4 h-3 Z M34,80 h3 v4 h-3 Z M62,80 h3 v4 h-3 Z M76,86 h3 v4 h-3 Z M48,92 h3 v4 h-3 Z"/>
      <path class="pp o" d="M40,42 C40,32 60,32 60,42 V56 C60,66 55,70 50,70 C45,70 40,66 40,56 Z"/>
      <path class="gl o" d="M35,41 L28,6 L40,30 L44,2 L50,28 L56,0 L60,30 L72,6 L65,41 Z"/>
      ${eyes([[45.5, 50], [54.5, 50]], down)}`,
    item: (down) => (down ? '<path class="gl o" d="M14,97 L19,84 L24,97 Z M76,97 L82,86 L87,97 Z"/>' : ''),
  },
  // El Inquisidor: capucha puntiaguda muy alta, ojos en sombra y una gran llave al cuello
  blindaje: {
    bg: 'm-bg-pp',
    body: (down) => `${mantle('ink', 'M14,100 C16,82 30,74 50,74 C70,74 84,82 86,100 Z')}
      <path class="rd o" d="M50,2 L72,70 C72,78 62,82 50,82 C38,82 28,78 28,70 Z"/>
      <path class="ink" d="M39,45 h10 v8 h-10 Z M51,45 h10 v8 h-10 Z"/>
      ${down ? '<path class="m-x" d="M41,46 L47,52 M47,46 L41,52 M53,46 L59,52 M59,46 L53,52"/>' : '<path class="pp" d="M42,48 h4 v2.5 h-4 Z M54,48 h4 v2.5 h-4 Z"/>'}`,
    item: (down) =>
      down
        ? '<g transform="translate(74 88) rotate(-80)"><circle class="gd o" cx="0" cy="-8" r="6"/><path class="gd o" d="M-2,-2 H2 V16 H-2 Z M2,8 H8 V12 H2 Z"/></g>'
        : '<path class="o-thin m-paper" d="M36,78 Q50,90 64,78"/><circle class="gd o" cx="50" cy="86" r="8"/><circle class="ink" cx="50" cy="86" r="3"/><path class="gd o" d="M47.5,93 H52.5 V100 H47.5 Z M52.5,96 H58 V99 H52.5 Z"/>',
  },
  // El Verdugo: capucha redonda con dos rendijas y el hacha al hombro, con la hoja ancha a la vista
  furia: {
    bg: 'm-bg-gd',
    body: (down) => `${mantle('ink', 'M8,100 C10,80 28,72 50,72 C72,72 90,80 92,100 Z')}
      <path class="ink o-pp" d="M30,76 C26,46 32,18 50,16 C68,18 74,46 70,76 Z"/>
      ${down ? '<path class="m-x" d="M39,40 L45,46 M45,40 L39,46 M55,40 L61,46 M61,40 L55,46"/>' : '<path class="rd" d="M36,42 C39,37 45,37 47,43 C43,45 40,45 36,42 Z M53,43 C55,37 61,37 64,42 C60,45 57,45 53,43 Z"/>'}`,
    item: (down) =>
      down
        ? '<g transform="translate(80 96) rotate(-90)"><path class="ink o-pp" d="M-2,-30 H2 V10 H-2 Z"/><path class="pp o" d="M2,-28 C12,-30 18,-36 20,-42 C26,-32 26,-18 20,-8 C16,-14 10,-16 2,-16 Z"/></g>'
        : '<g transform="translate(66 56) rotate(16)"><path class="ink o-pp" d="M-2.5,-38 H2.5 V44 H-2.5 Z"/><path class="pp o" d="M2,-36 C12,-38 20,-44 22,-50 C30,-38 30,-20 22,-8 C18,-14 10,-18 2,-18 Z"/></g>',
  },
  // El Relojero: anciano con lupa al ojo y un reloj de arena con engranaje alzado en la mano
  inestable: {
    bg: 'm-bg-vd',
    body: (down) => `${mantle('ink')}
      <path class="pp o" d="M38,40 C38,28 62,28 62,40 V56 C62,68 56,74 50,74 C44,74 38,68 38,56 Z"/>
      <path class="ink o" d="M36,40 C35,22 65,22 64,40 L60,35 C56,31 44,31 40,35 Z"/>
      <path class="pp o" d="M42,60 C42,74 46,84 50,86 C54,84 58,74 58,60 C54,64 46,64 42,60 Z"/>
      ${eyes([[45, 47]], down)}
      ${down ? '<circle class="o-thin" cx="56" cy="47" r="6"/><path class="m-crack" d="M51,42 L61,52"/>' : '<circle class="gl o" cx="55" cy="47" r="6"/>'}`,
    item: (down) =>
      down
        ? '<g transform="translate(78 84) rotate(90)"><path class="gd o" d="M-10,-14 H10 V-11 H-10 Z M-10,11 H10 V14 H-10 Z"/><path class="pp o" d="M-8,-11 H8 C8,-4 2,-2 2,0 C2,2 8,4 8,11 H-8 C-8,4 -2,2 -2,0 C-2,-2 -8,-4 -8,-11 Z"/></g>'
        : `<g transform="translate(79 56)"><circle class="gd o" cx="-6" cy="-21" r="5"/><path class="o-thin" d="M-6,-28 V-14 M-13,-21 H1"/>
          <path class="gd o" d="M-11,-15 H11 V-11 H-11 Z M-11,11 H11 V15 H-11 Z"/><path class="pp o" d="M-8,-11 H8 C8,-3 2,-2 2,0 C2,2 8,3 8,11 H-8 C-8,3 -2,2 -2,0 C-2,-2 -8,-3 -8,-11 Z"/><path class="gd" d="M-6,10 C-4,5 4,5 6,10 Z"/></g>`,
  },
};

/** El busto de un monarca (`id` de BOSSES) en calma o vencido. Clases: .monarca, .m-<id>, .calma / .vencido. */
export function monarchSvg(id: string, mood: MonarchMood = 'calma', cls = ''): string {
  const b = BUSTS[id];
  if (!b) return '';
  const down = mood === 'vencido';
  return `<svg class="art monarca m-${id} ${mood}${cls ? ` ${cls}` : ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <rect class="${b.bg}" x="1.5" y="1.5" width="97" height="97" rx="3"/>
    <g class="m-bust"${down ? ' transform="rotate(-12 50 100) translate(0 5)"' : ''}>${b.body(down)}</g>
    ${b.item(down)}
    ${down ? '<path class="m-tacha" d="M8,92 L92,8"/>' : ''}
    <rect class="m-frame" x="1.5" y="1.5" width="97" height="97" rx="3"/>
  </svg>`;
}
