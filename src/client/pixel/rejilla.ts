// V40 · fase 2 · La rejilla del pixel-art. Cada dibujo es un mapa de caracteres (una fila por línea, un carácter
// por celda; '.' o ' ' es papel) y una tabla de tintas que dice qué color lleva cada carácter. De ahí salen
// rectángulos de coordenadas enteras con `shape-rendering="crispEdges"`: sin antialias, sin degradados y sin
// filtros. Funciones puras (sin DOM): las usan el naipe, los iconos, los Reyes, el Bufón, la forja y las pruebas.

/** Un dibujo: filas de caracteres de igual ancho. */
export type Mapa = readonly string[];
/** Qué tinta lleva cada carácter (un color hexadecimal o un `var(--…)`). */
export type Tintas = Readonly<Record<string, string>>;

const VACIO = new Set(['.', ' ']);

// ───────────── zonas de trama declaradas ─────────────
// V40 · fase 2c: las celdas que pone el tramado (pixel/dither.ts) quedan marcadas en una máscara pegada al mapa, para
// que el linter no confunda el dithering intencional con ruido (huérfanos) ni con dientes de sierra. La máscara viaja
// con el mapa por las transformaciones de este archivo y de pincel.ts (espejo, volteo, giro, recorte, pegado).
const TRAMAS = new WeakMap<object, Uint8Array>();
/** Asocia a un mapa su máscara de trama (1 = celda tramada), de ancho × alto del mapa. */
export function marcarTrama<M extends readonly string[]>(m: M, mascara: Uint8Array | null): M {
  if (mascara && mascara.some((v) => v)) TRAMAS.set(m, mascara);
  return m;
}
/** La máscara de trama de un mapa (o null si no tiene celdas tramadas). */
export const tramaDe = (m: Mapa): Uint8Array | null => TRAMAS.get(m) ?? null;
/**
 * Copia al mapa `nuevo` la trama de `viejo`, con una función que lleva cada celda (x, y) del nuevo a la del viejo (o
 * null). Sin función, celda a celda.
 */
export function heredar<M extends readonly string[]>(nuevo: M, viejo: Mapa, desde?: (x: number, y: number) => [number, number] | null): M {
  const t = tramaDe(viejo);
  if (!t) return nuevo;
  const [w, h] = medida(nuevo);
  const [wv, hv] = medida(viejo);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = desde ? desde(x, y) : [x, y];
      if (!o || o[0] < 0 || o[1] < 0 || o[0] >= wv || o[1] >= hv) continue;
      out[y * w + x] = t[o[1] * wv + o[0]];
    }
  return marcarTrama(nuevo, out);
}

/** Ancho y alto de un mapa. */
export const medida = (m: Mapa): [number, number] => [Math.max(0, ...m.map((r) => r.length)), m.length];

/**
 * Los rectángulos del mapa, un `<path>` por tinta: une las corridas horizontales del mismo carácter y, si la fila de
 * abajo repite la misma corrida, la alarga hacia abajo. `ox`/`oy` desplazan y `k` escala (todo entero si lo son).
 */
export function rects(m: Mapa, t: Tintas, ox = 0, oy = 0, k = 1): string {
  interface Caja { x: number; y: number; w: number; h: number; c: string }
  const hechas: Caja[] = [];
  let abiertas = new Map<string, Caja>();
  m.forEach((fila, y) => {
    const nuevas = new Map<string, Caja>();
    let x = 0;
    while (x < fila.length) {
      const c = fila[x];
      if (VACIO.has(c)) {
        x++;
        continue;
      }
      let x1 = x;
      while (x1 < fila.length && fila[x1] === c) x1++;
      const clave = `${x},${x1 - x},${c}`;
      const previa = abiertas.get(clave);
      if (previa) {
        previa.h++;
        nuevas.set(clave, previa);
        abiertas.delete(clave);
      } else nuevas.set(clave, { x, y, w: x1 - x, h: 1, c });
      x = x1;
    }
    for (const c of abiertas.values()) hechas.push(c);
    abiertas = nuevas;
  });
  for (const c of abiertas.values()) hechas.push(c);
  const porTinta = new Map<string, string[]>();
  for (const c of hechas) {
    const color = t[c.c];
    if (!color) continue;
    const d = `M${ox + c.x * k},${oy + c.y * k}h${c.w * k}v${c.h * k}h${-c.w * k}z`;
    const lista = porTinta.get(color);
    if (lista) lista.push(d);
    else porTinta.set(color, [d]);
  }
  return [...porTinta].map(([color, ds]) => `<path fill="${color}" d="${ds.join('')}"/>`).join('');
}

/** El SVG suelto de un mapa: su `viewBox` es el de la rejilla y cada celda es un píxel del dibujo. */
export function svgDe(m: Mapa, t: Tintas, cls = '', extra = ''): string {
  const [w, h] = medida(m);
  return `<svg class="px ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(m, t)}${extra}</svg>`;
}

/** Simetría con eje entre columnas: cada fila se completa con su reflejo (ancho par). */
export const simetrico = (filas: string[]): string[] => filas.map((r) => r + [...r].reverse().join(''));
/** Simetría con eje en la última columna de cada fila (ancho impar). */
export const simetricoC = (filas: string[]): string[] => filas.map((r) => r + [...r.slice(0, -1)].reverse().join(''));
/** El mapa reflejado de izquierda a derecha. */
export const espejo = (m: Mapa): string[] => {
  const [w] = medida(m);
  return heredar(m.map((r) => [...r.padEnd(w, '.')].reverse().join('')), m, (x, y) => [w - 1 - x, y]);
};
/** El mapa vuelto del revés (de arriba abajo). */
export const volteo = (m: Mapa): string[] => heredar([...m].reverse(), m, (x, y) => [x, m.length - 1 - y]);

/** Un lienzo vacío de `w` × `h` celdas. */
export const lienzo = (w: number, h: number): string[] => Array.from({ length: h }, () => '.'.repeat(w));

/** Pega `capa` sobre `base` con su esquina en (x, y): lo que no es papel en la capa tapa la base. */
export function pegar(base: Mapa, capa: Mapa, x: number, y: number): string[] {
  const out = base.map((r) => [...r]);
  capa.forEach((fila, dy) => {
    const yy = y + dy;
    if (yy < 0 || yy >= out.length) return;
    [...fila].forEach((c, dx) => {
      const xx = x + dx;
      if (VACIO.has(c) || xx < 0 || xx >= out[yy].length) return;
      out[yy][xx] = c;
    });
  });
  return out.map((r) => r.join(''));
}

/** Cambia caracteres del mapa (por ejemplo, la tinta de un palo por la de otro). */
export const recolor = (m: Mapa, cambios: Readonly<Record<string, string>>): string[] =>
  heredar(m.map((r) => [...r].map((c) => cambios[c] ?? c).join('')), m);

/**
 * Contorno de un píxel: rodea con `borde` (vecindad de 4) toda celda pintada que no sea ya `borde`. El mapa crece
 * una celda por cada lado. Así cada masa lleva su línea de tinta que la separa del papel.
 */
export function contorno(m: Mapa, borde = 'k'): string[] {
  const [w, h] = medida(m);
  const lleno = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !VACIO.has(m[y][x] ?? '.');
  return Array.from({ length: h + 2 }, (_, yy) =>
    Array.from({ length: w + 2 }, (_, xx) => {
      const x = xx - 1;
      const y = yy - 1;
      if (lleno(x, y)) return m[y][x];
      return lleno(x - 1, y) || lleno(x + 1, y) || lleno(x, y - 1) || lleno(x, y + 1) ? borde : '.';
    }).join(''),
  );
}

/** Cuenta las celdas pintadas (para las pruebas: ninguna pieza en blanco). */
export const celdas = (m: Mapa): number => m.reduce((n, r) => n + [...r].filter((c) => !VACIO.has(c)).length, 0);

/** Comprueba que todas las filas miden lo mismo (las pruebas lo exigen a cada dibujo). */
export const cuadra = (m: Mapa): boolean => m.every((r) => r.length === m[0].length);
