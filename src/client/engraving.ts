// Taller de grabado: utilidades de estampación para todo el arte del juego.
//
//  · Grano horneado. El papel y la tinta llevan grano, pero no se calcula con filtros en vivo: se
//    pinta una sola vez en un lienzo, se guarda como imagen y se reparte por variables CSS. Mover
//    una carta o temblar una torre ya no vuelve a pasar ningún filtro.
//  · Tramas de buril. Rayados, contrarrayados y semitonos como patrones SVG, para sombrear a la
//    manera de una xilografía: la sombra es tinta tallada, no un degradado.
//  · Piezas. Paños de los guardias de cada trono, marcos de chapa según la rareza y remaches de maestría.
import type { Suit } from '../rules/engine';

const INK = '#181614';
const PAPER = '#eae0ce';

// ───────────────────────── Grano horneado ─────────────────────────

/** Ruido con semilla: el grano es el mismo en cada arranque (y en las capturas de control de calidad). */
function noise(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), x | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Una tesela de grano: motas de `rgb` con opacidad irregular y alguna fibra suelta. */
function tile(size: number, rgb: [number, number, number], density: number, strength: number, seed: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return '';
  const img = g.createImageData(size, size);
  const rnd = noise(seed);
  for (let i = 0; i < size * size; i++) {
    const hit = rnd() < density;
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = hit ? Math.floor(255 * strength * (0.35 + 0.65 * rnd())) : 0;
  }
  g.putImageData(img, 0, 0);
  // fibras: trazos cortos, casi horizontales, como en el papel de trapo
  g.strokeStyle = `rgba(${rgb.join(',')},${strength * 0.5})`;
  g.lineWidth = 1;
  for (let i = 0; i < size / 6; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 6 + rnd() * 14, y + (rnd() - 0.5) * 3);
    g.stroke();
  }
  return canvas.toDataURL('image/png');
}

let baked = false;
/** Hornea las teselas de grano y las deja en variables CSS (--grain-paper, --grain-ink, --grain-table). */
export function bakeGrain(): void {
  if (baked) return;
  baked = true;
  const root = document.documentElement.style;
  const set = (name: string, url: string) => url && root.setProperty(name, `url(${url})`);
  set('--grain-paper', tile(192, [60, 44, 26], 0.13, 0.2, 11)); // motas sepia sobre el papel
  set('--grain-ink', tile(192, [234, 224, 206], 0.1, 0.22, 23)); // calvas de papel sobre la tinta
  set('--grain-table', tile(256, [255, 236, 200], 0.06, 0.07, 37)); // polvo claro sobre la mesa oscura
  // las cifras de los títulos góticos salen de su propia fuente (theme.css): se carga ya, antes del primer título
  void document.fonts?.load("800 16px 'Corona Cifras'", '0123456789').catch(() => undefined);
}

// ───────────────────────── Tramas de palo ─────────────────────────

/**
 * Las cuatro tramas de material, una por palo, que distinguen el palo sin mirar el color (daltonismo):
 *   ♠ PICAS rayado diagonal · ♦ DIAMANTES punteado · ♥ CORAZONES aparejo en hiladas · ♣ TRÉBOLES rayado cruzado.
 * Cada una en dos tiradas que comparten el dibujo:
 *   pat-X    tinta del material con el dibujo tallado en papel (ropajes, fachadas, rótulos, rueda)
 *   trama-X  el mismo dibujo en tinta del palo sobre el papel de la carta (el marco de la carta)
 * Periodo de 12 unidades: a tamaño de mano no baja de 6 px, y a 24 px se sigue leyendo.
 */
const WEAVE: Record<Suit, (ink: string) => string> = {
  // rayado diagonal a 45°: una sola dirección
  S: (c) => `<path d="M0,6 H12" style="stroke:${c}" stroke-width="3.6"/>`,
  // punteado al tresbolillo: puntos sueltos, sin líneas
  D: (c) => `<circle cx="3" cy="3" r="2.3" style="fill:${c}"/><circle cx="9" cy="9" r="2.3" style="fill:${c}"/>`,
  // aparejo de ladrillo: hiladas horizontales con juntas a matajunta
  H: (c) => `<path d="M0,1 H24 M0,7 H24 M6,1 V7 M18,7 V13" style="stroke:${c}" stroke-width="2"/>`,
  // rayado cruzado: retícula en dos direcciones
  C: (c) => `<path d="M0,0 L12,12 M12,0 L0,12 M-3,9 L3,15 M9,-3 L15,3 M9,15 L15,9 M-3,3 L3,-3" style="stroke:${c}" stroke-width="1.9"/>`,
};
const WEAVE_BOX: Record<Suit, [number, number, string]> = { S: [12, 12, ' patternTransform="rotate(45)"'], D: [12, 12, ''], H: [24, 12, ''], C: [12, 12, ''] };
export function suitWeaves(): string {
  return (['S', 'D', 'H', 'C'] as Suit[])
    .map((s) => {
      const [w, h, tr] = WEAVE_BOX[s];
      return `<pattern id="pat-${s}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${tr}><rect width="${w}" height="${h}" style="fill:var(--mat-${s})"/>${WEAVE[s](PAPER)}</pattern>` +
        `<pattern id="trama-${s}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${tr}>${WEAVE[s](`var(--suit-${s})`)}</pattern>`;
    })
    .join('');
}

// ───────────────────────── Tramas de buril ─────────────────────────

/** Patrones compartidos por todo el arte. Van una sola vez en el <defs> global. */
export function engravingDefs(): string {
  const hatch = (id: string, gap: number, width: number, angle: number, color: string) =>
    `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><path d="M0,${gap / 2} H${gap}" stroke="${color}" stroke-width="${width}"/></pattern>`;
  const dots = (id: string, gap: number, r: number, color: string) =>
    `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${color}"/></pattern>`;
  return [
    hatch('hatch-ink', 5, 1.5, 38, INK), // sombra tallada sobre papel
    hatch('hatch-fine', 3.4, 0.9, 38, INK),
    hatch('hatch-paper', 5, 1.3, -38, PAPER), // luz tallada sobre tinta
    hatch('hatch-cross', 5, 1.2, -52, INK),
    dots('tone-ink', 5, 1.15, INK), // semitono: el sangrado de la tinta
    dots('tone-paper', 5, 1.05, PAPER),
    dots('tone-heavy', 4, 1.45, INK),
    // mitades de un paño de guardia: se rasgan y caen por separado al abatirlo
    '<clipPath id="half-l" clipPathUnits="objectBoundingBox"><rect width="0.5" height="1"/></clipPath><clipPath id="half-r" clipPathUnits="objectBoundingBox"><rect x="0.5" width="0.5" height="1"/></clipPath>',
    // chapas de los marcos de herramienta, una por rareza
    `<pattern id="plate-comun" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#6f6a62"/><path d="M0,16 L16,0" stroke="#55514b" stroke-width="2.4"/><path d="M0,4 H16 M0,12 H16" stroke="#857f76" stroke-width="0.8"/></pattern>`,
    `<pattern id="plate-oficio" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#2f6f63"/><circle cx="5" cy="6" r="3.4" fill="#3f8b7b"/><circle cx="13" cy="13" r="2.6" fill="#255a50"/><path d="M0,9 H18" stroke="#8a5a2b" stroke-width="1.2" opacity="0.7"/></pattern>`,
    `<pattern id="plate-capataz" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#c08a2c"/><path d="M0,0 L14,14 M14,0 L0,14" stroke="#9a6a1c" stroke-width="1.1"/><circle cx="7" cy="7" r="1.5" fill="#e3b458"/></pattern>`,
    `<pattern id="plate-reliquia" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#7d1d17"/><path d="M10,1 L19,10 L10,19 L1,10 Z" fill="none" stroke="#e0a43a" stroke-width="1.6"/><circle cx="10" cy="10" r="2.2" fill="#e0a43a"/></pattern>`,
  ].join('');
}

/** Sombra de buril: la misma silueta, recortada y rellena de rayado. `d` es el contorno de la zona en sombra. */
export const shade = (d: string, pattern = 'hatch-ink', opacity = 0.9) => `<path d="${d}" fill="url(#${pattern})" opacity="${opacity}"/>`;

// ───────────────────────── Tronos ─────────────────────────

/** Tinta de cada palo (va por variable CSS para poder cambiar a «2 tintas clásicas»). */
export const SUIT_INK: Record<Suit, string> = { S: 'var(--suit-S)', D: 'var(--suit-D)', H: 'var(--suit-H)', C: 'var(--suit-C)' };

/** Tocado de cada guardia, en una caja de 46 × 46: gorra con pluma (Sota), diadema (Reina) y corona (Rey). */
const HEADWEAR: Record<number, string> = {
  11: `<path d="M9,31 C10,21 16,16 24,16 C32,16 37,21 38,31 Z" fill="${INK}"/><path d="M8,31 H39 V36 H8 Z" fill="${INK}"/><path d="M29,17 C33,8 39,5 43,6 C40,10 36,15 33,21" fill="${INK}"/><path d="M13,26 H34" stroke="${PAPER}" stroke-width="2"/>`,
  12: `<path d="M7,34 C8,18 15,12 23,12 C31,12 38,18 39,34 Z" fill="${INK}"/><circle cx="23" cy="9" r="4.2" fill="${INK}"/><path d="M12,30 C14,22 18,19 23,19 C28,19 32,22 34,30" fill="none" stroke="${PAPER}" stroke-width="2"/><circle cx="23" cy="25" r="2.6" fill="${PAPER}"/>`,
  13: `<path d="M7,35 V15 L15,23 L23,9 L31,23 L39,15 V35 Z" fill="${INK}"/><path d="M10,29 H36" stroke="${PAPER}" stroke-width="2.2"/><circle cx="16" cy="32" r="1.6" fill="${PAPER}"/><circle cx="23" cy="32" r="1.6" fill="${PAPER}"/><circle cx="30" cy="32" r="1.6" fill="${PAPER}"/>`,
};

/**
 * El paño de un guardia: una franja de estandarte con la trama de su casa y, en una rodela de papel,
 * el tocado del guardia (Sota, Reina o Rey). Sirve para el guardia en pie (bajo su carta) y para los
 * que esperan apilados debajo. Se dibuja sin deformar a cualquier ancho: la trama va en unidades de
 * pantalla y la rodela se centra con su propio viewBox. Las dos mitades (.hl y .hr) se rasgan y caen
 * por separado cuando el guardia es abatido; los desgarros (.crk) se enseñan según el daño (data-level).
 */
export function storeySvg(suit: Suit, rank: number): string {
  const label = 'JQK'[rank - 11] ?? '?';
  const field = `<rect width="100%" height="100%" fill="url(#pat-${suit})"/>
      <rect width="100%" height="5" fill="${INK}"/><rect y="100%" width="100%" height="5" transform="translate(0 -5)" fill="${INK}"/>
      <svg width="100%" height="100%" viewBox="0 0 46 46" preserveAspectRatio="xMidYMid meet" overflow="visible">
        <path d="M-30,23 H-4 M50,23 H76" stroke="${PAPER}" stroke-width="2.5" stroke-dasharray="4 4"/>
        <circle cx="23" cy="23" r="20" fill="${PAPER}" stroke="${INK}" stroke-width="3.5"/>
        ${HEADWEAR[rank] ?? ''}
      </svg>`;
  return `<svg class="storey-art" width="100%" height="100%" aria-hidden="true">
    <g class="hl" clip-path="url(#half-l)">${field}</g>
    <g class="hr" clip-path="url(#half-r)">${field}</g>
    <svg class="crk" width="100%" height="100%" viewBox="0 0 200 46" preserveAspectRatio="none" fill="none" stroke-linejoin="bevel">
      ${[
        ['c1', 'M62,5 L56,20 L66,27 L58,41'],
        ['c2', 'M138,5 L146,18 L134,30 L142,41 M134,30 L118,34'],
        ['c3', 'M24,5 L30,22 L18,41 M176,5 L170,24 L182,41 M96,5 L104,26 L94,41'],
      ]
        .map(([c, d]) => `<path class="${c}" d="${d}"/><path class="${c} in" d="${d}"/>`)
        .join('')}
    </svg>
    <text class="storey-rank" x="50%" y="70%" text-anchor="middle">${label}</text>
  </svg>`;
}

// ───────────────────────── Marcos y remaches ─────────────────────────

/** Marco de chapa estampada para las fichas de herramienta, según su rareza (lienzo 250 × 350). */
export function plateFrame(rarity: string): string {
  const rivets = [
    [22, 22],
    [228, 22],
    [22, 328],
    [228, 328],
    [125, 18],
    [125, 332],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2" fill="${INK}"/><circle cx="${x - 1.2}" cy="${y - 1.2}" r="2" fill="${PAPER}" opacity="0.75"/>`)
    .join('');
  return `<rect x="10" y="10" width="230" height="330" fill="url(#plate-${rarity})"/>
    <path d="M10,10 H240 V340 H10 Z M30,30 V320 H220 V30 Z" fill="${INK}" fill-rule="evenodd" opacity="0.28"/>
    <rect x="30" y="30" width="190" height="290" fill="none" stroke="${INK}" stroke-width="3"/>${rivets}`;
}

/** Nivel de obra → metal del sello de maestría. */
export const masteryMetal = (level: number) => (level >= 7 ? 'oro' : level >= 4 ? 'hierro' : level >= 1 ? 'bronce' : '');
/** Remache de maestría: el nivel de obra más alto ganado con esa pieza. */
export function masteryBadge(level: number): string {
  const metal = masteryMetal(level);
  if (!metal) return '';
  return `<span class="mastery m-${metal}" data-tip="<b>Sello de maestría</b>Ganaste una campaña en el Reinado ${level} con esto. Bronce: Reinados 1–3 · hierro: 4–6 · oro: 7–8."><i>${level}</i></span>`;
}
