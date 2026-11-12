// Taller de grabado: utilidades de estampación para todo el arte del juego.
//
//  · Grano horneado. El papel y la tinta llevan grano, pero no se calcula con filtros en vivo: se
//    pinta una sola vez en un lienzo, se guarda como imagen y se reparte por variables CSS. Mover
//    una carta o temblar una torre ya no vuelve a pasar ningún filtro.
//  · Tramas de buril. Rayados, contrarrayados y semitonos como patrones SVG, para sombrear a la
//    manera de una xilografía: la sombra es tinta tallada, no un degradado.
//  · Piezas. Fachadas de las torres, marcos de chapa según la rareza y remaches de maestría.
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
    // chapas de los marcos de herramienta, una por rareza
    `<pattern id="plate-comun" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#6f6a62"/><path d="M0,16 L16,0" stroke="#55514b" stroke-width="2.4"/><path d="M0,4 H16 M0,12 H16" stroke="#857f76" stroke-width="0.8"/></pattern>`,
    `<pattern id="plate-oficio" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#2f6f63"/><circle cx="5" cy="6" r="3.4" fill="#3f8b7b"/><circle cx="13" cy="13" r="2.6" fill="#255a50"/><path d="M0,9 H18" stroke="#8a5a2b" stroke-width="1.2" opacity="0.7"/></pattern>`,
    `<pattern id="plate-capataz" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#c08a2c"/><path d="M0,0 L14,14 M14,0 L0,14" stroke="#9a6a1c" stroke-width="1.1"/><circle cx="7" cy="7" r="1.5" fill="#e3b458"/></pattern>`,
    `<pattern id="plate-reliquia" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#7d1d17"/><path d="M10,1 L19,10 L10,19 L1,10 Z" fill="none" stroke="#e0a43a" stroke-width="1.6"/><circle cx="10" cy="10" r="2.2" fill="#e0a43a"/></pattern>`,
  ].join('');
}

/** Sombra de buril: la misma silueta, recortada y rellena de rayado. `d` es el contorno de la zona en sombra. */
export const shade = (d: string, pattern = 'hatch-ink', opacity = 0.9) => `<path d="${d}" fill="url(#${pattern})" opacity="${opacity}"/>`;

// ───────────────────────── Torres ─────────────────────────

/** Tinta de cada material (va por variable CSS para poder cambiar a «2 tintas clásicas»). */
export const SUIT_INK: Record<Suit, string> = { S: 'var(--suit-S)', D: 'var(--suit-D)', H: 'var(--suit-H)', C: 'var(--suit-C)' };

/**
 * Un piso de torre visto en alzado: losa, pilares, huecos tallados y viguería, cada material con
 * su manera de construir. Lienzo 200 × 46. Las grietas (.crk) se enseñan según el daño (data-level).
 */
export function storeySvg(suit: Suit, rank: number): string {
  const label = 'JQK'[rank - 11] ?? '?';
  const body: Record<Suit, string> = {
    // acero: celosía de vigas roblonadas
    S: `<rect x="2" y="6" width="196" height="36" fill="url(#pat-S)"/><path d="M2,6 L50,42 M50,6 L2,42 M50,6 L98,42 M98,6 L50,42 M102,6 L150,42 M150,6 L102,42 M150,6 L198,42 M198,6 L150,42" stroke="${PAPER}" stroke-width="1.8" fill="none" opacity="0.5"/><path d="M50,6 V42 M100,6 V42 M150,6 V42" stroke="${INK}" stroke-width="5"/>${[8, 50, 100, 150, 192].map((x) => `<circle cx="${x}" cy="10" r="2" fill="${PAPER}"/><circle cx="${x}" cy="38" r="2" fill="${PAPER}"/>`).join('')}`,
    // vidrio: muro cortina de paños ámbar con montantes
    D: `<rect x="2" y="6" width="196" height="36" fill="url(#pat-D)"/>${[2, 35, 68, 101, 134, 167].map((x, i) => `<rect x="${x + 3}" y="10" width="27" height="28" fill="${PAPER}" opacity="${0.18 + (i % 3) * 0.12}"/><path d="M${x + 6},34 L${x + 26},13" stroke="${PAPER}" stroke-width="1.4" opacity="0.7"/>`).join('')}<path d="M35,6 V42 M68,6 V42 M101,6 V42 M134,6 V42 M167,6 V42" stroke="${INK}" stroke-width="3"/>`,
    // ladrillo: fábrica con arcos de medio punto
    H: `<rect x="2" y="6" width="196" height="36" fill="url(#pat-H)"/>${[22, 66, 110, 154].map((x) => `<path d="M${x},42 V24 a12,12 0 0 1 24,0 V42 Z" fill="${INK}"/><path d="M${x + 4},42 V25 a8,8 0 0 1 16,0 V42" fill="none" stroke="${PAPER}" stroke-width="1.3" opacity="0.6"/>`).join('')}`,
    // hormigón: pantallas ciegas, ventanas rasgadas y huella de encofrado
    C: `<rect x="2" y="6" width="196" height="36" fill="url(#pat-C)"/><path d="M14,16 H86 V24 H14 Z M114,16 H186 V24 H114 Z M30,30 H70 V36 H30 Z M130,30 H170 V36 H130 Z" fill="${INK}"/><path d="M100,6 V42" stroke="${INK}" stroke-width="7"/><path d="M2,14 H198 M2,28 H198" stroke="${PAPER}" stroke-width="0.8" opacity="0.35"/>`,
  };
  return `<svg class="storey-art" viewBox="0 0 200 46" preserveAspectRatio="none" aria-hidden="true">
    ${body[suit]}
    <rect x="0" y="0" width="200" height="7" fill="${INK}"/><rect x="0" y="41" width="200" height="5" fill="${INK}"/>
    <path d="M0,7 H200" stroke="${PAPER}" stroke-width="1" opacity="0.5"/>
    <g class="crk" fill="none" stroke-linejoin="bevel">
      ${[
        ['c1', 'M62,7 L56,20 L66,27 L58,41'],
        ['c2', 'M138,7 L146,18 L134,30 L142,41 M134,30 L118,34'],
        ['c3', 'M24,7 L30,22 L18,41 M176,7 L170,24 L182,41 M96,7 L104,26 L94,41'],
      ]
        .map(([c, d]) => `<path class="${c}" d="${d}"/><path class="${c} in" d="${d}"/>`)
        .join('')}
    </g>
    <text class="storey-rank" x="100" y="33" text-anchor="middle">${label}</text>
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
  return `<span class="mastery m-${metal}" data-tip="<b>Sello de maestría</b>Ganaste una campaña en el nivel de obra ${level} con esto. Bronce: niveles 1–3 · hierro: 4–6 · oro: 7–8."><i>${level}</i></span>`;
}
