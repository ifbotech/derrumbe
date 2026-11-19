// V40 · fase 2b · El Bufón, anfitrión de la mesa (constitución, apartado 3): una marotte —el cetro de bufón— en diagonal,
// con su busto de máscara de marfil, capucha carmesí de dos puntas con cascabeles de oro, gola negra con borlas de
// colores y cintas azules que flamean. Pixel-art «sin línea» (sin contorno negro), luz de arriba a la izquierda. Dibujo
// original.
//
// Cinco expresiones: reposo (respira), risa (Golpe exacto, Escoba, Envido, Chancho), burla (te contraatacan), brillo
// (apuestas y santuarios: los ojos se encienden) y sombría (último turno o poca Vida). `bufonSvg()` lo entrega por capas
// para animarlo solo con transform y opacity (pixel.css); con «Reducir movimiento» queda quieto en su cuadro.
import { tintas } from './paleta';
import { Escala, Lienzo, cintaOndulada } from './pincel';
import { rects } from './rejilla';

export type Expresion = 'reposo' | 'risa' | 'burla' | 'brillo' | 'sombria';
export const EXPRESIONES: Expresion[] = ['reposo', 'risa', 'burla', 'brillo', 'sombria'];

const T = tintas();
/** Lienzo del Bufón, en celdas: el dibujo se piensa en 64 × 80 y se rasteriza a escala K (80 × 100). */
const K = 1.25;
export const BUFON_W = 80;
export const BUFON_H = 100;
const nuevo = (): [Lienzo, Escala] => {
  const l = new Lienzo(BUFON_W, BUFON_H);
  return [l, new Escala(l, K)];
};

/** Centro de la cara (en la rejilla de diseño). */
const FX = 34;
const FY = 31;

/** El palo de la marotte: oro torneado, con su pomo y dos anillos. */
function palo(): Lienzo {
  const [L, l] = nuevo();
  l.trazo(12, 78, 32, 46, 2.1, 'y');
  l.sombra('y', 'o', 1, 0, 1);
  for (const t of [0.3, 0.62]) {
    const x = 12 + 20 * t;
    const y = 78 - 32 * t;
    l.trazo(x - 3, y - 1.5, x + 3, y + 1.5, 1.1, 'z');
  }
  l.elipse(11.5, 77.5, 3.2, 3.2, 'y');
  l.sombra('y', 'o', 1, 1, 1, 'yo');
  l.set(10, 76, 'Y').set(11, 75, 'Y');
  return L;
}

/** Las cintas azules que salen de la gola y flamean a los lados. */
function cintas(): Lienzo {
  const [L, l] = nuevo();
  // dos cintas largas que caen en curvas amplias (pocas ondas: fluyen, no tiemblan)
  cintaOndulada(l, 22, 45, 3, 52, 4, 1.5, 2.4, 't', 'T');
  cintaOndulada(l, 4, 52, 10, 70, 3, 1, 2.1, 'T', 't');
  cintaOndulada(l, 46, 45, 62, 41, 4, 1.5, 2.4, 't', 'T');
  cintaOndulada(l, 61, 42, 56, 64, 3, 1.5, 2.1, 't', 'T');
  l.sombra('t', 'c', -1, -1, 1, 'tT');
  return L;
}

/** Capucha carmesí de dos puntas (la izquierda cae, la derecha se alza y se curva), con su ribete de oro. */
function capucha(e: Expresion): Lienzo {
  const [L, l] = nuevo();
  l.elipse(FX, FY - 3, 13, 12, 'r');
  // punta izquierda: sale de la sien y cae hacia afuera
  l.poli([[24, 22], [20, 14], [12, 12], [6, 16], [4, 24], [8, 22], [13, 18], [18, 22], [22, 30]], 'r');
  // punta derecha: se alza, se curva y cae
  l.poli([[40, 20], [44, 10], [52, 4], [60, 6], [62, 14], [58, 12], [53, 11], [48, 16], [46, 26]], 'r');
  // la cara la recorta: queda el óvalo de la máscara
  l.elipse(FX, FY + 2, 9, 10, '.', 'r');
  l.sombra('r', 'R', 1, 1, 3);
  l.sombra('r', 'e', -1, -1, 1, 'rR');
  // ribete de oro sobre la frente con sus botones
  for (let x = FX - 9; x <= FX + 9; x += 3) {
    const y = Math.round(FY - 8 - Math.sqrt(Math.max(0, 81 - (x - FX) ** 2)) * 0.25);
    l.rect(x, y, 2, 2, x > FX + 3 ? 'o' : 'y');
  }
  if (e === 'sombria') l.cambiar('e', 'r').cambiar('r', 'R', [0, 0, 64, FY]);
  return L;
}

/** La máscara de marfil con su gesto. */
function cara(e: Expresion): Lienzo {
  const [L, l] = nuevo();
  l.elipse(FX, FY + 2, 9, 10, 'P');
  l.sombra('P', 'p', 1, 0, 3);
  l.sombra('P', 's', 1, 1, 1, 'Pp');
  // nariz en punta y mejillas
  l.rect(FX - 1, FY + 1, 2, 4, 'p').set(FX + 1, FY + 4, 's');
  if (e !== 'sombria') l.rect(FX - 7, FY + 5, 3, 2, 'e').rect(FX + 5, FY + 5, 2, 2, 'e');
  const ojo = (x: number, y: number) => l.rect(x, y, 2, 3, 'k').set(x, y, 'w');
  switch (e) {
    case 'reposo':
      ojo(FX - 5, FY - 2);
      ojo(FX + 3, FY - 2);
      l.rect(FX - 5, FY - 5, 3, 1, 'z').rect(FX + 3, FY - 5, 3, 1, 'z');
      l.rect(FX - 3, FY + 7, 6, 1, 'v').set(FX - 4, FY + 6, 'v').set(FX + 3, FY + 6, 'v');
      break;
    case 'risa':
      // ojos en arco, boca abierta con la lengua
      l.rect(FX - 6, FY - 1, 4, 1, 'k').set(FX - 6, FY, 'k').set(FX - 3, FY, 'k');
      l.rect(FX + 2, FY - 1, 4, 1, 'k').set(FX + 2, FY, 'k').set(FX + 5, FY, 'k');
      l.poli([[FX - 5, FY + 6], [FX + 5, FY + 6], [FX + 3, FY + 10], [FX - 3, FY + 10]], 'v');
      l.rect(FX - 2, FY + 9, 4, 1, 'e').rect(FX - 4, FY + 6, 8, 1, 'w');
      break;
    case 'burla':
      // un guiño, la ceja alzada y la lengua afuera
      l.rect(FX - 6, FY, 4, 1, 'k');
      ojo(FX + 3, FY - 3);
      l.rect(FX + 2, FY - 7, 4, 1, 'z').set(FX + 6, FY - 8, 'z');
      l.rect(FX - 4, FY + 7, 8, 1, 'v').set(FX + 4, FY + 6, 'v');
      l.rect(FX, FY + 8, 3, 3, 'e').set(FX + 2, FY + 10, 'r');
      break;
    case 'brillo':
      // los ojos encendidos de oro
      for (const x of [FX - 5, FX + 3]) l.rect(x, FY - 3, 2, 4, 'Y').rect(x - 1, FY - 2, 4, 2, 'Y').set(x, FY - 2, 'w');
      l.rect(FX - 3, FY + 7, 6, 1, 'v').set(FX - 4, FY + 6, 'v').set(FX + 3, FY + 6, 'v');
      break;
    case 'sombria':
      // párpados caídos, ceño y boca hacia abajo
      l.rect(FX - 6, FY - 1, 4, 2, 'k').rect(FX + 2, FY - 1, 4, 2, 'k');
      l.rect(FX - 6, FY - 2, 4, 1, 's').rect(FX + 2, FY - 2, 4, 1, 's');
      l.linea(FX - 6, FY - 5, FX - 2, FY - 3, 'z').linea(FX + 6, FY - 5, FX + 2, FY - 3, 'z');
      l.rect(FX - 2, FY + 7, 4, 1, 'v').set(FX - 3, FY + 8, 'v').set(FX + 2, FY + 8, 'v');
      break;
  }
  return L;
}

/** La gola: cuello fruncido oscuro con el filo de oro y una fila de borlas de colores. */
function gola(): Lienzo {
  const [L, l] = nuevo();
  l.elipse(FX, FY + 13, 15, 4.5, 'k');
  for (let x = FX - 14; x <= FX + 14; x += 2) l.set(x, Math.round(FY + 13 - Math.sqrt(Math.max(0, 1 - ((x - FX) / 15) ** 2)) * 4.5), 'y');
  const borlas = 'yrlyrlyrlyrly';
  for (let i = 0; i < borlas.length; i++) {
    const x = FX - 13 + i * 2.2;
    const y = FY + 17 + Math.round(Math.sin(i * 1.3));
    l.rect(Math.round(x), y, 2, 2, borlas[i]);
  }
  return L;
}

/** Un cascabel de oro con su raja y su brillo. */
function cascabel(l: Escala, x: number, y: number): void {
  l.elipse(x, y, 2.8, 2.8, 'y');
  l.sombra('y', 'o', 1, 1, 1, 'yo');
  l.set(Math.round(x - 1), Math.round(y - 1), 'Y');
  l.rect(Math.round(x - 1), Math.round(y + 1), 2, 1, 'z');
}
/** Dónde cuelga cada cascabel: en la punta de cada pico y uno en la nuca. */
const CASCABELES: [number, number][] = [[5.5, 26], [61, 16.5]];

/** Destellos de los ojos que brillan (apuestas y santuarios). */
function destellos(): Lienzo {
  const [L, l] = nuevo();
  for (const [x, y, r] of [[16, 30, 3], [54, 34, 2], [46, 4, 2], [20, 6, 2]] as [number, number, number][]) {
    l.rect(x - r, y, 2 * r + 1, 1, 'Y').rect(x, y - r, 1, 2 * r + 1, 'Y').set(x, y, 'w');
  }
  return L;
}

/** Las capas del Bufón, de atrás adelante. */
function capas(e: Expresion) {
  const bells = CASCABELES.map(([x, y]) => {
    const [L, l] = nuevo();
    cascabel(l, x, y);
    return { l: L, x: x * K, y: y * K };
  });
  return { palo: palo(), cuerpo: [cintas(), gola(), capucha(e), cara(e)], bells, brillo: e === 'brillo' ? destellos() : null };
}

/** El Bufón entero en un solo mapa (para el Comodín, la forja y las pruebas). */
export function bufonMapa(e: Expresion = 'reposo'): string[] {
  const c = capas(e);
  const l = new Lienzo(BUFON_W, BUFON_H);
  for (const p of [c.palo, ...c.cuerpo, ...c.bells.map((b) => b.l), ...(c.brillo ? [c.brillo] : [])]) l.pegar(p, 0, 0);
  return l.mapa();
}

/**
 * El Bufón en SVG por capas, listo para la mesa. Clases para pixel.css: `.bufon` y `.bf-<expresión>` en la raíz;
 * `.bf-cuerpo` (respira: translateY de una celda), `.bf-cascabel` (se mece), `.bf-brillo` (parpadea: opacity),
 * `.bf-palo` (quieto). Con «Reducir movimiento» (`.calm` o `prefers-reduced-motion`) nada se anima.
 */
export function bufonSvg(e: Expresion = 'reposo', cls = ''): string {
  const c = capas(e);
  const g = (l: Lienzo) => rects(l.mapa(), T);
  const cascabeles = c.bells.map((b, i) => `<g class="bf-cascabel" style="--i:${i};transform-origin:${b.x}px ${b.y - 3}px">${g(b.l)}</g>`);
  return `<svg class="px bufon bf-${e}${cls ? ` ${cls}` : ''}" viewBox="0 0 ${BUFON_W} ${BUFON_H}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <g class="bf-palo">${g(c.palo)}</g>
    <g class="bf-cuerpo">${c.cuerpo.map(g).join('')}${cascabeles.join('')}${c.brillo ? `<g class="bf-brillo">${g(c.brillo)}</g>` : ''}</g>
  </svg>`;
}
