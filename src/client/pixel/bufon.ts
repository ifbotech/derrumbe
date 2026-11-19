// V40 · fase 2c · El Bufón, anfitrión de la mesa (constitución, apartado 3), en claroscuro tramado: una marotte —el cetro
// de bufón— en diagonal con su busto de máscara de marfil de facciones afiladas, como un muñeco de madera antiguo o una
// carta de tarot oscuro. Cuencas hondas tramadas hasta la tinta abismal, con un punto de luz que no se sabe si es
// complicidad o amenaza; cejas pintadas de teatro, la lágrima de rombo, las costuras de la mandíbula de títere y una
// sonrisa torcida. Capucha de arlequín partida en carmesí y púrpura, con sus puntas cruzadas de color, ribete de oro,
// gola de puntas y cintas que flamean. Sin contorno negro: la forma la dan sus propios tonos y la luz de arriba a la
// izquierda. Dibujo original.
//
// Cinco expresiones: reposo (respira), risa (Golpe exacto, Escoba, Envido, Chancho), burla (te contraatacan), brillo
// (apuestas y santuarios: los ojos se encienden) y sombría (último turno o poca Vida). `bufonSvg()` lo entrega por capas
// para animarlo solo con transform y opacity (pixel.css); con «Reducir movimiento» queda quieto en su cuadro.
import { hueco, sombrear } from './dither';
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
/** La máscara: frente ancha, pómulos altos y el mentón en punta (rejilla de diseño). */
const MASCARA: [number, number][] = [
  [FX - 9, FY - 10],
  [FX + 9, FY - 10],
  [FX + 10.5, FY - 3],
  [FX + 9.5, FY + 4],
  [FX + 5, FY + 10],
  [FX, FY + 14.5],
  [FX - 5, FY + 10],
  [FX - 9.5, FY + 4],
  [FX - 10.5, FY - 3],
];

/** El palo de la marotte: oro torneado en claroscuro, con su pomo y dos anillos de bronce. */
function palo(): Lienzo {
  const [L, l] = nuevo();
  l.trazo(12, 78, 32, 46, 2.1, 'y');
  for (const t of [0.3, 0.62]) {
    const x = 12 + 20 * t;
    const y = 78 - 32 * t;
    l.trazo(x - 3, y - 1.5, x + 3, y + 1.5, 1.1, 'O');
  }
  l.elipse(11.5, 77.5, 3.4, 3.4, 'y');
  sombrear(L, 'y', '9zoOyY', { base: 0.6, pendiente: 0.9, borde: 2, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.3, masa: 'yO' });
  sombrear(L, 'O', '9zoO', { base: 0.55, borde: 1, fuerzaBorde: 0.4, masa: 'yO9zoY' });
  return L;
}

/** Las cintas de carmesí y púrpura que salen de la gola y flamean a los lados. */
function cintas(): Lienzo {
  const [L, l] = nuevo();
  cintaOndulada(l, 22, 46, 2, 54, 4, 1.5, 2.3, 'r', 'v');
  cintaOndulada(l, 4, 53, 9, 72, 3, 1, 2, 'f', 'q');
  cintaOndulada(l, 46, 46, 62, 41, 4, 1.5, 2.3, 'q', 'f');
  cintaOndulada(l, 61, 42, 56, 66, 3, 1.5, 2, 'v', 'r');
  // las caras de la cinta, con su sombra tramada del lado de abajo
  sombrear(L, 'r', '9vRre', { base: 0.7, pendiente: 0.5, borde: 1, fuerzaBorde: 0.35, masa: 'rvqf' });
  sombrear(L, 'q', '9fFq', { base: 0.62, pendiente: 0.5, borde: 1, fuerzaBorde: 0.35, masa: 'rvqf' });
  return L;
}

/** Capucha de arlequín: cúpula partida (carmesí a la izquierda, púrpura a la derecha), puntas cruzadas y ribete de oro. */
function capucha(e: Expresion): Lienzo {
  const [L, l] = nuevo();
  // la cúpula y los faldones que bajan a la gola
  l.elipse(FX, FY - 4, 14, 13, 'r');
  l.poli([[FX - 14, FY - 6], [FX - 13, FY + 13], [FX - 4, FY + 16], [FX + 4, FY + 16], [FX + 13, FY + 13], [FX + 14, FY - 6]], 'r');
  l.cambiar('r', 'q', [FX, 0, 64, 80]);
  // punta izquierda (púrpura): sale de la sien, se dobla y cae con peso
  l.poli([[FX - 9, FY - 13], [FX - 16, FY - 21], [FX - 25, FY - 22], [FX - 30, FY - 15], [FX - 31, FY - 5], [FX - 27, FY - 9], [FX - 22, FY - 14], [FX - 16, FY - 10], [FX - 12, FY - 3]], 'q');
  // punta derecha (carmesí): se alza afilada y se curva hacia afuera
  l.poli([[FX + 6, FY - 14], [FX + 9, FY - 25], [FX + 16, FY - 31], [FX + 26, FY - 29], [FX + 29, FY - 20], [FX + 25, FY - 23], [FX + 19, FY - 24], [FX + 14, FY - 17], [FX + 12, FY - 6]], 'r');
  // la máscara recorta la capucha
  l.poli(MASCARA, '.', 'rq');
  const oscura = e === 'sombria';
  sombrear(L, 'r', '9vRre', { base: oscura ? 0.4 : 0.56, pendiente: 1, borde: 4, fuerzaBorde: 0.5, brillo: 1, fuerzaBrillo: 0.18, masa: 'rqvReFfQ9', ancho: 0.8 });
  sombrear(L, 'q', '9fFq', { base: oscura ? 0.36 : 0.52, pendiente: 1, borde: 4, fuerzaBorde: 0.5, brillo: 1, fuerzaBrillo: 0.18, masa: 'rqvReFfQ9', ancho: 0.8 });
  // la costura de la cúpula, al medio, en sombra
  l.rect(FX, FY - 17, 0.8, 7, 'f');
  // ribete de oro sobre la frente, con sus picos
  for (let x = FX - 10; x <= FX + 10; x += 2.5) {
    const y = FY - 11 - Math.sqrt(Math.max(0, 110 - (x - FX) ** 2)) * 0.12;
    l.poli([[x - 1.2, y + 1.6], [x, y - 0.6], [x + 1.2, y + 1.6]], x > FX + 3 ? 'o' : 'y');
  }
  l.rect(FX - 10, FY - 10.4, 20.8, 1.2, 'o');
  return L;
}

/** La máscara de marfil con su gesto. */
function cara(e: Expresion): Lienzo {
  const [L, l] = nuevo();
  l.poli(MASCARA, 'w');
  // marfil en claroscuro: la mitad derecha cae a la sombra violácea por trama
  sombrear(L, 'w', e === 'sombria' ? '9shw' : '9shPw', { base: e === 'sombria' ? 0.5 : 0.66, pendiente: 1.05, borde: 3, fuerzaBorde: 0.45, brillo: 1, fuerzaBrillo: 0.2 });
  // pómulos hundidos y el hueso de la nariz, afilada
  sombrear(L, 'P', 'shP', { caja: [Math.round((FX + 3) * K), Math.round((FY + 2) * K), Math.round((FX + 9) * K), Math.round((FY + 7) * K)], base: 0.45, pendiente: 0.3, borde: 0, brillo: 0 });
  l.poli([[FX - 0.5, FY - 2], [FX + 1.5, FY + 4.5], [FX - 0.5, FY + 4.5]], 'h');
  l.rect(FX + 0.5, FY + 3.5, 1.4, 1, 's');
  // las cuencas: hondas, tramadas hasta la tinta abismal
  const cuenca = (x: number, y: number, rx: number, ry: number) => hueco(L, x * K, y * K, rx * K, ry * K, '09sh', { curva: 1.2 });
  // cejas de teatro, finas y altas; costuras de la mandíbula de títere; la lágrima en rombo
  const ceja = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) => l.linea(x0, y0, x1, y1, 'k').linea(x1, y1, x2, y2, 'k');
  const costuras = () => l.linea(FX - 5, FY + 7, FX - 4, FY + 11, 's').linea(FX + 5, FY + 6, FX + 4, FY + 11, '9');
  const lagrima = () => l.poli([[FX + 4.5, FY + 2], [FX + 5.6, FY + 3.6], [FX + 4.5, FY + 5.6], [FX + 3.4, FY + 3.6]], 'R');
  const pupila = (x: number, y: number, k = 'Y') => l.rect(x, y, 0.8, 0.8, k);
  /** El párpado de arriba, oblicuo hacia la nariz: la mirada torva, de costado (lado -1 izquierda, 1 derecha). */
  const parpado = (lado: number, baja: number) => {
    const x0 = FX + lado * 8.2;
    const x1 = FX + lado * 1.2;
    l.poli([[x0, FY - 4.6], [x1, FY - 3.4 + baja], [x1, FY - 1.8 + baja], [x0, FY - 3.4]], 'k');
  };
  switch (e) {
    case 'reposo':
      cuenca(FX - 4.5, FY - 1.5, 3.8, 2.7);
      cuenca(FX + 4.5, FY - 1.5, 3.8, 2.7);
      parpado(-1, 0);
      parpado(1, 0);
      pupila(FX - 4, FY - 1);
      pupila(FX + 5, FY - 1);
      ceja(FX - 8.5, FY - 6.5, FX - 5, FY - 6, FX - 1.5, FY - 4);
      ceja(FX + 1.5, FY - 4.5, FX + 5, FY - 7, FX + 9, FY - 8);
      // sonrisa torcida: un lado sube más que el otro
      l.linea(FX - 5, FY + 6, FX - 2, FY + 8, 'k').linea(FX - 2, FY + 8, FX + 2, FY + 7.5, 'k').linea(FX + 2, FY + 7.5, FX + 6, FY + 4, 'k');
      l.linea(FX - 2, FY + 9, FX + 2, FY + 8.5, 's');
      costuras();
      lagrima();
      break;
    case 'risa':
      // ojos entornados en media luna, la boca abierta de oreja a oreja con su fila de dientes
      cuenca(FX - 4.5, FY - 1, 3.3, 1.7);
      cuenca(FX + 4.5, FY - 1, 3.3, 1.7);
      pupila(FX - 4, FY - 1);
      pupila(FX + 5, FY - 1);
      ceja(FX - 8.5, FY - 3.5, FX - 5, FY - 7, FX - 1.5, FY - 5.5);
      ceja(FX + 1.5, FY - 5.5, FX + 5, FY - 7, FX + 8.5, FY - 3.5);
      l.poli([[FX - 7, FY + 4], [FX - 3, FY + 6.5], [FX + 3, FY + 6.5], [FX + 7.5, FY + 3], [FX + 4, FY + 9.5], [FX, FY + 11], [FX - 4, FY + 9.5]], '0');
      l.poli([[FX - 5.5, FY + 5], [FX + 6, FY + 4.4], [FX + 5, FY + 6.2], [FX - 4.5, FY + 6.6]], 'h');
      for (const x of [FX - 3, FX, FX + 3]) l.rect(x, FY + 5, 0.8, 1.6, 's');
      l.rect(FX - 1.5, FY + 9, 3, 1, 'v');
      lagrima();
      break;
    case 'burla':
      // un ojo entrecerrado y el otro abierto de par en par, la ceja alzada y la mueca de un solo lado
      l.linea(FX - 7.5, FY - 0.5, FX - 1.5, FY - 1.5, 'k');
      l.linea(FX - 7, FY + 0.5, FX - 2, FY - 0.5, 's');
      cuenca(FX + 4.5, FY - 2, 3.6, 3);
      pupila(FX + 5, FY - 2);
      ceja(FX - 8, FY - 3.5, FX - 5, FY - 4.5, FX - 1.5, FY - 3);
      ceja(FX + 1, FY - 6.5, FX + 4.5, FY - 10, FX + 9, FY - 8.5);
      l.linea(FX - 4, FY + 7.5, FX + 1, FY + 7.5, 'k').linea(FX + 1, FY + 7.5, FX + 7, FY + 2.5, 'k');
      l.linea(FX + 2, FY + 8.5, FX + 6, FY + 5, 's');
      costuras();
      lagrima();
      break;
    case 'brillo':
      // las cuencas se encienden de oro desde el fondo
      cuenca(FX - 4.5, FY - 1.5, 3.8, 2.7);
      cuenca(FX + 4.5, FY - 1.5, 3.8, 2.7);
      for (const x of [FX - 4.5, FX + 4.5]) {
        l.elipse(x, FY - 1.5, 2, 1.4, 'y');
        l.elipse(x, FY - 1.5, 1, 0.8, 'Y');
      }
      ceja(FX - 8, FY - 4.5, FX - 5, FY - 7.5, FX - 1.5, FY - 5.5);
      ceja(FX + 1.5, FY - 5.5, FX + 5, FY - 7.5, FX + 8.5, FY - 4.5);
      l.linea(FX - 5, FY + 6, FX - 2, FY + 8, 'k').linea(FX - 2, FY + 8, FX + 2, FY + 7.5, 'k').linea(FX + 2, FY + 7.5, FX + 6, FY + 4, 'k');
      costuras();
      lagrima();
      break;
    case 'sombria':
      // las cuencas vacías, el ceño hundido y la boca que cae
      cuenca(FX - 4.5, FY - 1, 3.9, 3);
      cuenca(FX + 4.5, FY - 1, 3.9, 3);
      parpado(-1, 0.8);
      parpado(1, 0.8);
      ceja(FX - 8.5, FY - 5.5, FX - 5, FY - 4.5, FX - 1.5, FY - 2.5);
      ceja(FX + 1.5, FY - 2.5, FX + 5, FY - 4.5, FX + 8.5, FY - 5.5);
      l.linea(FX - 5, FY + 8.5, FX - 2, FY + 7, 'k').linea(FX - 2, FY + 7, FX + 2, FY + 7, 'k').linea(FX + 2, FY + 7, FX + 5, FY + 8.5, 'k');
      costuras();
      l.poli([[FX + 4.5, FY + 2], [FX + 5.6, FY + 3.6], [FX + 4.5, FY + 6.6], [FX + 3.4, FY + 3.6]], 'v');
      break;
  }
  return L;
}

/** La gola: cuello de puntas en púrpura honda, con el filo de oro y una borla en cada punta. */
function gola(): Lienzo {
  const [L, l] = nuevo();
  const cy = FY + 15;
  const puntas = 11;
  const p: [number, number][] = [];
  for (let i = 0; i <= puntas * 2; i++) {
    const a = Math.PI * (i / (puntas * 2));
    const r = i % 2 ? 17 : 12.5;
    p.push([FX - Math.cos(a) * r, cy + Math.sin(a) * r * 0.42]);
  }
  p.push([FX + 12, cy - 2.5], [FX - 12, cy - 2.5]);
  l.poli(p, 'F');
  sombrear(L, 'F', '9fFq', { base: 0.5, pendiente: 0.9, borde: 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.2 });
  l.rect(FX - 12, cy - 2.5, 24, 1, 'o');
  const borlas = 'yryqyryqyry';
  for (let i = 0; i < puntas; i++) {
    const a = Math.PI * ((2 * i + 1) / (puntas * 2));
    l.rect(Math.round(FX - Math.cos(a) * 16.8 - 0.5), Math.round(cy + Math.sin(a) * 6.6), 1.6, 1.6, borlas[i]);
  }
  return L;
}

/** Un cascabel de oro con su raja y su brillo. */
function cascabel(L: Lienzo, l: Escala, x: number, y: number): void {
  l.elipse(x, y, 2.8, 2.8, 'y');
  sombrear(L, 'y', '9zoyY', { base: 0.6, pendiente: 0.9, borde: 2, fuerzaBorde: 0.4, brillo: 1, fuerzaBrillo: 0.35 });
  l.rect(Math.round(x - 1), Math.round(y + 1), 2, 1, '9');
}
/** Dónde cuelga cada cascabel: en la punta de cada pico. */
const CASCABELES: [number, number][] = [[3.5, 28.5], [63, 13.5]];

/** Destellos de los ojos que brillan (apuestas y santuarios): estrellas de cuatro puntas, de oro. */
function destellos(): Lienzo {
  const [L, l] = nuevo();
  for (const [x, y, r] of [[16, 34, 3], [54, 36, 2], [44, 3, 2], [22, 5, 2]] as [number, number, number][]) {
    l.rect(x - r, y, 2 * r + 1, 1, 'y').rect(x, y - r, 1, 2 * r + 1, 'y').set(x, y, 'Y');
  }
  return L;
}

/** Las capas del Bufón, de atrás adelante. */
function capas(e: Expresion) {
  const bells = CASCABELES.map(([x, y]) => {
    const [L, l] = nuevo();
    cascabel(L, l, x, y);
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
