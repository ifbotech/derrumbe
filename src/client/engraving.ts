// Taller de grabado: utilidades de estampación para todo el arte del juego.
//
//  · Grano horneado. El papel y la tinta llevan grano, pero no se calcula con filtros en vivo: se
//    pinta una sola vez en un lienzo, se guarda como imagen y se reparte por variables CSS. Mover
//    una carta o temblar una torre ya no vuelve a pasar ningún filtro.
//  · Tramas de buril. Rayados, contrarrayados y semitonos como patrones SVG, para sombrear a la
//    manera de una xilografía: la sombra es tinta tallada, no un degradado.
//  · Piezas. Paños de los guardias de cada trono, marcos de chapa según la rareza y remaches de maestría.
import type { Seal, Suit } from '../rules/engine';

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

// ───────────────────────── V8 · Piezas de la caída ─────────────────────────
// Esquirlas de corona, naipe cortado, sello de lacre y monedas. Se pintan una vez, en linograbado plano
// (tinta, papel y la trama de su palo, sin filtros ni degradados animados), y se mueven SOLO con transform
// y opacity: juice-ux las guarda en una reserva y las reutiliza. Cada pieza lleva su origen en variables
// CSS (--x, --y, --r, y --w para el ancho), que el CSS de reposo (theme.css) aplica con las propiedades
// sueltas `translate`/`rotate`/`left`/`top`; la coreografía anima `transform` encima, sin pisarlas.
// Con «Reducir movimiento» las piezas se quedan en su origen (la corona entera, el naipe en su sitio).

const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (html: string): SVGSVGElement => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as SVGSVGElement;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/** El tampón de cada sello (centrado en 0,0, radio ≈ 28): lo comparten la carta (card.ts) y el lacre. */
export const SEAL_ICON: Record<Seal, string> = {
  dinamita: '<path d="M-9,-2 H9 V16 H-9 Z"/><path d="M0,-2 C0,-12 9,-8 10,-17" fill="none" stroke-width="3.4"/><path d="M10,-24 l3,5 l6,-1 l-4,5 l3,5 l-6,-1 l-3,5 l-2,-6 l-6,-1 l5,-4 Z"/>',
  eco: '<circle r="4.5"/><path d="M-11,-11 C-17,-4 -17,4 -11,11 M11,-11 C17,-4 17,4 11,11 M-19,-17 C-28,-6 -28,6 -19,17 M19,-17 C28,-6 28,6 19,17" fill="none" stroke-width="3.4"/>',
  jornal: '<circle r="15" fill="none" stroke-width="4"/><path d="M-5,-8 V8 M0,-8 V8 M5,-8 V8 M-9,5 L9,-5" fill="none" stroke-width="3"/>',
  sindical: '<path d="M-11,16 V-2 C-11,-8 -6,-8 -6,-3 V-12 C-6,-17 -1,-17 -1,-12 V-14 C-1,-19 4,-19 4,-14 V-11 C4,-16 9,-16 9,-11 V4 C9,12 6,16 2,16 Z"/>',
};

/**
 * La corona de un trono, en una caja de 100 × 64, partida en diez esquirlas que encajan. Cada una es un
 * polígono; las grietas son sus bordes compartidos.
 */
const CROWN = 'M6,60 L4,22 L20,38 L34,8 L50,30 L66,8 L80,38 L96,22 L94,60 Z';
const SHARDS: number[][] = [
  [4, 22, 20, 38, 18, 46, 5, 46],
  [5, 46, 18, 46, 16, 60, 6, 60],
  [20, 38, 27, 23, 30, 40, 18, 46],
  [27, 23, 34, 8, 42, 19, 44, 30, 30, 40],
  [18, 46, 30, 40, 42, 48, 36, 60, 16, 60],
  [42, 19, 50, 30, 58, 19, 60, 32, 50, 40, 44, 30],
  [30, 40, 44, 30, 50, 40, 60, 46, 52, 60, 36, 60, 42, 48],
  [58, 19, 66, 8, 73, 23, 70, 40, 60, 32],
  [50, 40, 60, 32, 70, 40, 82, 48, 84, 60, 52, 60, 60, 46],
  [73, 23, 80, 38, 96, 22, 94, 60, 84, 60, 82, 48, 70, 40],
];
/** Lo grabado de la corona entera (se recorta a cada esquirla): banda, perlas y la gema del centro. */
const CROWN_BODY = `<path d="${CROWN}" class="esq-papel"/><path d="${CROWN}" class="tr"/>
  <path d="M5,46 H95 M5,52 H95" fill="none" stroke="${INK}" stroke-width="2.4"/>
  <circle cx="20" cy="38" r="3.2" fill="${INK}"/><circle cx="80" cy="38" r="3.2" fill="${INK}"/>
  <path d="M50,33 L56,40 L50,46 L44,40 Z" fill="${PAPER}" stroke="${INK}" stroke-width="2.4"/>
  <circle cx="34" cy="8" r="3.4" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><circle cx="66" cy="8" r="3.4" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>`;

/**
 * Esquirlas de la corona de un trono: de 6 a 10 piezas `svg.pieza.esquirla` (aquí, 10) que juntas forman la
 * corona, con la trama del palo (`data-suit` → `url(#trama-X)`), papel y contorno de tinta de 3.
 * Origen en % de su caja `.esquirlas` (100 × 64): --x, --y (esquina) y --w (ancho); --r 0deg. Además, para
 * la coreografía: --vx y --vy (dirección de salida desde el centro, unitaria) y --giro (giro sugerido).
 * `reuse`: las de una reserva se repintan con el palo nuevo en vez de crear nodos.
 */
export function crownShards(suit: Suit, reuse?: SVGSVGElement[]): SVGSVGElement[] {
  if (reuse && reuse.length === SHARDS.length) {
    for (const s of reuse) s.dataset.suit = suit;
    return reuse;
  }
  return SHARDS.map((pts, i) => {
    const xs = pts.filter((_, k) => k % 2 === 0);
    const ys = pts.filter((_, k) => k % 2 === 1);
    const [x0, x1, y0, y1] = [Math.min(...xs) - 2, Math.max(...xs) + 2, Math.min(...ys) - 2, Math.max(...ys) + 2];
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const len = Math.hypot(cx - 50, cy - 40) || 1;
    const poly = pts.join(' ');
    const s = svgEl(`<svg xmlns="${SVGNS}" class="pieza esquirla" data-suit="${suit}" data-i="${i}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" aria-hidden="true">
      <defs><clipPath id="esq-c${i}"><polygon points="${poly}"/></clipPath></defs>
      <g clip-path="url(#esq-c${i})">${CROWN_BODY}</g>
      <polygon points="${poly}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    </svg>`);
    s.style.cssText = `--x:${r1(x0)}%;--y:${r1((y0 / 64) * 100)}%;--w:${r1(x1 - x0)}%;--r:0deg;--vx:${r1((cx - 50) / len)};--vy:${r1((cy - 40) / len)};--giro:${(i % 2 ? 1 : -1) * (24 + ((i * 17) % 40))}deg`;
    return s;
  });
}

/** La caja de la corona (`.esquirlas`, 100 × 64) con sus esquirlas en reposo dentro: la corona entera. */
export function crownShardsHost(suit: Suit): HTMLDivElement {
  const host = document.createElement('div');
  host.className = 'esquirlas';
  host.dataset.suit = suit;
  host.append(...crownShards(suit));
  return host;
}

/** Diagonal del tajo, en fracción del alto de la carta: entra por la izquierda al 56,6 % y sale por la derecha al 43,4 %. */
const CUT: [number, number] = [0.566, 0.434];
/** Astillas de papel del tajo: [posición a lo largo del corte (0–1), ancho relativo al naipe, polígono en 0 0 30 12]. */
const SPLINTERS: [number, number, string][] = [
  [0.18, 0.2, '0,6 9,1 22,3 30,7 18,10 6,11'],
  [0.52, 0.16, '0,5 12,0 30,4 20,9 8,12'],
  [0.84, 0.22, '0,7 8,2 20,0 30,5 24,11 10,10'],
];

/**
 * El naipe cortado en diagonal: dos mitades (`div.pieza.mitad.mitad-a` arriba y `.mitad-b` abajo, cada una
 * con un clon del naipe recortado y el filo de tinta del tajo) y tres astillas de papel (`div.pieza.astilla`)
 * a lo largo del corte. Origen en píxeles de la ventana (van con position: fixed): --x, --y y --w (ancho del
 * naipe o de la astilla), --r 0deg; además --vx/--vy (hacia dónde caen) y --giro.
 * `reuse`: las cinco piezas de una reserva se rellenan con el naipe nuevo en vez de crear nodos.
 */
export function slashPieces(card: HTMLElement, reuse?: HTMLElement[]): HTMLElement[] {
  const r = card.getBoundingClientRect();
  const pieces = reuse && reuse.length === 2 + SPLINTERS.length ? reuse : [
    ...(['a', 'b'] as const).map((h) => {
      const d = document.createElement('div');
      d.className = `pieza mitad mitad-${h}`;
      return d;
    }),
    ...SPLINTERS.map(([, , pts]) => {
      const d = document.createElement('div');
      d.className = 'pieza astilla';
      d.innerHTML = `<svg viewBox="-2 -2 34 16" aria-hidden="true"><polygon points="${pts}" fill="${PAPER}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M4,6 L20,4" stroke="${INK}" stroke-width="1.6"/></svg>`;
      return d;
    }),
  ];
  const filo = `<svg class="tajo-filo" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M-2,${CUT[0] * 100 + 1} L100,${CUT[1] * 100 + 1}" stroke="${INK}" stroke-width="5" vector-effect="non-scaling-stroke"/><path d="M-2,${CUT[0] * 100} L100,${CUT[1] * 100}" stroke="${PAPER}" stroke-width="1.5" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/></svg>`;
  (['a', 'b'] as const).forEach((h, i) => {
    const half = pieces[i];
    const clone = card.cloneNode(true) as HTMLElement;
    clone.classList.remove('deal', 'attack', 'sel', 'hint', 'fly', 'pop', 'tilting', 'guia-target');
    clone.removeAttribute('id');
    clone.removeAttribute('data-foco');
    clone.removeAttribute('tabindex');
    clone.removeAttribute('data-n');
    clone.removeAttribute('data-key');
    clone.removeAttribute('data-tip');
    clone.style.cssText = `--w:${r.width}px;visibility:visible;`;
    // lo que vuela no lleva filtros ni mezclas: fuera la tinta rugosa (filter) y el reflejo (mix-blend-mode)
    clone.querySelectorAll('[filter]').forEach((n) => n.removeAttribute('filter'));
    clone.querySelectorAll('.ly.glare').forEach((n) => n.remove());
    half.replaceChildren(clone);
    half.insertAdjacentHTML('beforeend', filo);
    half.style.cssText = `--x:${r1(r.left)}px;--y:${r1(r.top)}px;--w:${r1(r.width)}px;--r:0deg;--vx:${h === 'a' ? -0.45 : 0.4};--vy:${h === 'a' ? -0.25 : 0.6};--giro:${h === 'a' ? -34 : 28}deg`;
  });
  SPLINTERS.forEach(([t, w], k) => {
    const s = pieces[2 + k];
    const x = r.left + t * r.width;
    const y = r.top + (CUT[0] + (CUT[1] - CUT[0]) * t) * r.height;
    const pw = Math.max(14, w * r.width);
    s.style.cssText = `--x:${r1(x - pw / 2)}px;--y:${r1(y - pw * 0.2)}px;--w:${r1(pw)}px;--r:${(k - 1) * 14}deg;--vx:${r1(t - 0.5)};--vy:-0.8;--giro:${(k % 2 ? 1 : -1) * 120}deg`;
  });
  return pieces;
}

/** Lacre de cada sello: [frío, caliente, brillo, relieve]. Pólvora, eco, oro real y la manga. */
const WAX: Record<Seal, [string, string, string, string]> = {
  dinamita: ['#8a2219', '#cf3b26', '#ffc09a', '#5a140e'],
  eco: ['#183f51', '#2b7592', '#b5e6f2', '#0c2733'],
  jornal: ['#8a5a0c', '#d39a24', '#ffe7a3', '#5c3b05'],
  sindical: ['#24201d', '#5a4434', '#e3b27c', '#0e0c0b'],
};
/** Gota de lacre aplastada: borde irregular y tres lágrimas, en 0 0 100 100. */
const WAX_BLOB = 'M50,8 C62,7 70,14 79,16 C90,19 94,32 92,43 C91,52 96,58 93,67 C89,79 80,84 71,89 C66,92 64,99 58,97 C53,95 49,92 42,92 C30,92 19,88 13,78 C7,69 3,62 6,52 C8,44 3,37 8,28 C13,18 24,15 32,11 C38,8 44,9 50,8 Z';

/**
 * El sello de lacre caliente que se estampa en la cuenta: `svg.lacre` con dos capas superpuestas del mismo
 * dibujo, `.lacre-frio` (mate, el reposo) y `.lacre-caliente` (brillo pintado, sin filtro). Enfriarse es
 * solo bajar la opacidad de la caliente: con la clase `.caliente` en el svg, la capa caliente se ve.
 */
export function waxStamp(seal: Seal): SVGSVGElement {
  const [cold, hot, shine, deep] = WAX[seal];
  const icon = (fill: string) => `<g transform="translate(50 52) scale(1.05)" fill="${fill}" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round" stroke-width="0">${SEAL_ICON[seal]}</g>`;
  const face = (body: string, ring: string, top: string) => `<path d="${WAX_BLOB}" fill="${body}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
    <circle cx="50" cy="52" r="31" fill="none" stroke="${ring}" stroke-width="5"/>
    <circle cx="50" cy="52" r="24" fill="none" stroke="${ring}" stroke-width="1.8" stroke-dasharray="3 3.6"/>
    <g transform="translate(1.4 1.6)">${icon(ring)}</g>${icon(top)}`;
  return svgEl(`<svg xmlns="${SVGNS}" class="pieza lacre" data-sello="${seal}" viewBox="0 0 100 100" aria-hidden="true">
    <g class="lacre-frio">${face(cold, deep, deep)}</g>
    <g class="lacre-caliente">${face(hot, cold, shine)}
      <path d="M22,36 C26,24 36,17 48,15" fill="none" stroke="${shine}" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M78,64 C76,72 71,78 64,82" fill="none" stroke="${shine}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
      <circle cx="28" cy="46" r="2.6" fill="${shine}"/>
    </g>
  </svg>`);
}

/**
 * Monedas grabadas para el vuelo del oro (combate y La Taberna): `i.pieza.moneda`, cada una con su canto
 * estriado y su cara con la corona de tres puntas. Origen: --x, --y en px (0 si no se dice) y --r, un
 * giro distinto por moneda para que no salgan iguales.
 */
export function coinPieces(n: number): HTMLElement[] {
  const face = `<svg viewBox="0 0 40 40" aria-hidden="true">
    <ellipse cx="20" cy="23.5" rx="16" ry="14.5" fill="#7a5208" stroke="${INK}" stroke-width="2.6"/>
    <path d="M8,27 V31 M12,30 V34 M16,31.5 V36 M20,32 V36.5 M24,31.5 V36 M28,30 V34 M32,27 V31" stroke="${INK}" stroke-width="1.6"/>
    <ellipse cx="20" cy="19" rx="16" ry="14.5" fill="#d9a43a" stroke="${INK}" stroke-width="2.6"/>
    <ellipse cx="20" cy="19" rx="11.5" ry="10.2" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="2 2.4"/>
    <path d="M13,24 L12.5,14 L16.5,18 L20,11 L23.5,18 L27.5,14 L27,24 Z" fill="${INK}"/>
    <path d="M9.5,13 C11.5,9 15,7 19,6.5" fill="none" stroke="#fff1c4" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  return Array.from({ length: Math.max(1, n) }, (_, i) => {
    const c = document.createElement('i');
    c.className = 'pieza moneda';
    c.innerHTML = face;
    c.style.cssText = `--x:0px;--y:0px;--r:${((i * 47) % 70) - 35}deg`;
    return c;
  });
}
