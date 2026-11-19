// V40 · fase 2 · El Bufón, anfitrión de la mesa (constitución, apartado 3): una marotte —el cetro de bufón— con máscara
// pálida, capucha roja de tres puntas con cascabeles de oro, gola de oro y azul y cintas azules, sobre su palo de madera.
// Dibujo original en pixel-art.
//
// Cinco expresiones: reposo (respira), risa (Golpe exacto, Escoba, Envido, Chancho), burla (te contraatacan), brillo
// (apuestas y santuarios: los ojos se encienden) y sombría (último turno o poca Vida). `bufonSvg()` lo entrega por capas
// para animarlo solo con transform y opacity (pixel.css); con «Reducir movimiento» queda quieto en su cuadro.
import { tintas } from './paleta';
import { contorno, lienzo, medida, pegar, rects, simetrico, type Mapa } from './rejilla';

export type Expresion = 'reposo' | 'risa' | 'burla' | 'brillo' | 'sombria';
export const EXPRESIONES: Expresion[] = ['reposo', 'risa', 'burla', 'brillo', 'sombria'];

const T = tintas();
/** Lienzo del Bufón, en celdas. */
const W = 32;
const H = 54;
/** Esquina de la cara (16 × 10 celdas) en el lienzo. */
const CARA: [number, number] = [8, 17];

// la capucha de tres puntas, la cara pálida y la gola: simétricas
const CABEZA = simetrico([
  '................',
  '................',
  '................',
  '................',
  '...............R',
  '...............R',
  '..............RR',
  '..............RR',
  '.............RRR',
  '........rrrrRRRR',
  '.....rrrrrrrRRRR',
  '...rrrrrrrrrRRRR',
  '..rrrrrrrrrrrRRR',
  '.rrrr..rrrrrrrrr',
  '.rrr...rrrrrrrrr',
  'rrr....rryyyyyyy',
  'rr.....ryyyppppp',
  'r......ryppppppp',
  '.......ryppppppp',
  '.......ryppppppp',
  '.......ryppppppp',
  '.......ryppppppp',
  '.......ryppppppp',
  '.......ryspppppp',
  '.......ryspppppp',
  '........rysspppp',
  '........ryyssspp',
  '.........yyyyyss',
  '.......yyyyyyyyy',
  '.....ytytytytyty',
  '....yytyytyytyyt',
  '.....y.y.y.y.y.y',
]);

// las cintas azules que cuelgan de la gola
const CINTAS = simetrico([
  '.....tt.........',
  '.....tt.........',
  '......tt........',
  '......tt........',
  '.....tt.........',
  '.....tt.........',
  '......tt........',
  '......TT........',
  '.....T..T.......',
]);

// el palo de la marotte: madera con dos anillos y el pomo de oro
const PALO = [
  '..Nn..',
  '..Nn..',
  '.yyyy.',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '.yyyy.',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '..Nn..',
  '.yyyy.',
  'yYYyyy',
  'yyyyyy',
  '.yyyy.',
];

/** Un cascabel de oro con su raja. */
const CASCABEL = ['.yy.', 'yYYy', 'yYyy', 'ykky'];
/** Dónde cuelga cada cascabel (esquina, en celdas). */
const CASCABELES: [number, number][] = [[14, 0], [0, 18], [28, 18]];

/** Las cinco caras, sobre la cara pálida (16 × 10 celdas). */
const GESTO: Record<Expresion, Mapa> = {
  reposo: simetrico(['........', '.kkk....', '........', '..kkk...', '..kwk...', '.ee.....', '........', '...k....', '....kkkk', '........']),
  risa: simetrico(['........', '.kkk....', '........', '...k....', '..k.k...', '.ee.....', '..k.....', '...kkkkk', '...kRRRR', '....kkkk']),
  burla: [
    '..........kkk...',
    '..kkk...........',
    '................',
    '..kkk.....kkk...',
    '..........kwk...',
    '.ee..........ee.',
    '................',
    '....kkkkkkkk....',
    '........kRRk....',
    '.........RR.....',
  ],
  brillo: simetrico(['........', '.kkk....', '..yyy...', '.yYYYy..', '..yyy...', '.ee.....', '........', '...k....', '....kkkk', '........']),
  sombria: simetrico(['ssssssss', 'skkkssss', 'sssskkss', '..kkk...', '..kRk...', '........', '........', '....kkkk', '...k....', '........']),
};

/** Destellos de los ojos que brillan (apuestas y santuarios). */
const DESTELLO = ['.Y.', 'YwY', '.Y.'];
const DESTELLOS: [number, number][] = [[4, 24], [26, 26], [22, 6]];

/** Las capas del Bufón, cada una con su contorno de tinta. */
function capas(e: Expresion) {
  const cabeza = contorno(pegar(pegar(lienzo(W, 32), CABEZA, 0, 0), GESTO[e], CARA[0], CARA[1]));
  const cintas = contorno(pegar(lienzo(W, 9), CINTAS, 0, 0));
  const palo = contorno(PALO);
  const cascabeles = CASCABELES.map(([x, y]) => ({ m: contorno(CASCABEL), x: x - 1, y: y - 1 }));
  const brillo = e === 'brillo' ? DESTELLOS.map(([x, y]) => ({ m: contorno(DESTELLO), x: x - 1, y: y - 1 })) : [];
  return {
    palo: { m: palo, x: 12, y: 31 },
    cintas: { m: cintas, x: -1, y: 31 },
    cabeza: { m: cabeza, x: -1, y: -1 },
    cascabeles,
    brillo,
  };
}

/** El Bufón entero en un solo mapa (para el Comodín, la forja y las pruebas). */
export function bufonMapa(e: Expresion = 'reposo'): string[] {
  const c = capas(e);
  let m = lienzo(W + 2, H + 2);
  for (const p of [c.palo, c.cintas, c.cabeza, ...c.cascabeles, ...c.brillo]) m = pegar(m, p.m, p.x + 1, p.y + 1);
  return m;
}

/**
 * El Bufón en SVG por capas, listo para la mesa. Clases para pixel.css: `.bufon` y `.bf-<expresión>` en la raíz;
 * `.bf-cuerpo` (respira: translateY de una celda), `.bf-cascabel` (se mece: rotate), `.bf-brillo` (parpadea:
 * opacity), `.bf-palo` (quieto). Con «Reducir movimiento» (`.calm` o `prefers-reduced-motion`) nada se anima.
 */
export function bufonSvg(e: Expresion = 'reposo', cls = ''): string {
  const c = capas(e);
  const g = (p: { m: Mapa; x: number; y: number }) => rects(p.m, T, p.x + 1, p.y + 1);
  const cascabeles = c.cascabeles.map((p, i) => {
    const [w] = medida(p.m);
    const ox = p.x + 1 + w / 2;
    const oy = p.y + 1;
    return `<g class="bf-cascabel" style="--i:${i};transform-origin:${ox}px ${oy}px">${g(p)}</g>`;
  });
  return `<svg class="px bufon bf-${e}${cls ? ` ${cls}` : ''}" viewBox="0 0 ${W + 2} ${H + 2}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <g class="bf-palo">${g(c.palo)}</g>
    <g class="bf-cuerpo">${g(c.cintas)}${g(c.cabeza)}${cascabeles.join('')}${c.brillo.length ? `<g class="bf-brillo">${c.brillo.map(g).join('')}</g>` : ''}</g>
  </svg>`;
}
