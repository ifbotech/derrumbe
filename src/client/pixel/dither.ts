// V40 · fase 2c · El motor de tramado («Dark Dithered & Textured»): dithering ordenado de Bayer (2 × 2 y 4 × 4),
// punteado direccional y rayado de grabado, siempre a celda entera. Nada de degradados, alpha ni desenfoque: el paso de
// un tono a otro de una rampa se hace alternando píxeles de los dos según la matriz, y la luz llega de arriba a la
// izquierda. Cada celda que pone el tramado queda marcada en el lienzo (Lienzo.marcar) para que el linter
// (scripts/pixel-lint.ts) la trate como trama declarada y no como ruido.
//
// API:
//   umbral(x, y, n)                     el umbral de Bayer de una celda, en [0, 1)
//   tonoTramado(rampa, v, x, y, o)      el tono de una rampa (oscuro → claro) para una luz v ∈ [0, 1], tramado
//   sombrear(lienzo, claves, rampa, o)  sombrea una masa entre 2–6 tonos según la luz (arriba a la izquierda)
//   franja(lienzo, caja, tono, o)       trama un tono sobre una caja con una densidad que cambia a lo largo de un eje
//   punteado(lienzo, claves, tono, o)   stipple direccional: puntos sueltos cuya densidad crece hacia un lado
//   rayado(lienzo, claves, tono, o)     rayas de grabado (horizontales, verticales o en diagonal), a celda entera
//   fondoTramado(variante)              la penumbra de la interfaz (mesa, Mapa, Pulpería) como SVG, url() y CSS
import type { Lienzo } from './pincel';

export type Matriz = 2 | 4;

/** Matriz de Bayer 2 × 2 (valores 0..3). */
export const BAYER2: readonly (readonly number[])[] = [
  [0, 2],
  [3, 1],
];
/** Matriz de Bayer 4 × 4 (valores 0..15). */
export const BAYER4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** El umbral de Bayer de la celda (x, y), en [0, 1). */
export function umbral(x: number, y: number, n: Matriz = 4): number {
  const m = n === 2 ? BAYER2 : BAYER4;
  return (m[mod(y, n)][mod(x, n)] + 0.5) / (n * n);
}

export interface OpcionesTono {
  /** Matriz de Bayer (4 de serie; 2 da una trama más gruesa y regular, de ajedrez). */
  matriz?: Matriz;
  /**
   * Qué parte de cada escalón de la rampa se trama (0–1). El resto queda liso: con 0,5 cada tono tiene su meseta plana
   * y la mitad del camino al siguiente es trama. 1 = tramado continuo (pesado); 0 = bandas planas.
   */
  ancho?: number;
}

/**
 * El tono de una rampa (oscuro → claro) para una luz `v` en la celda (x, y), con trama ordenada entre los dos tonos
 * vecinos. Devuelve la letra y si la celda quedó en zona de trama.
 */
export function tonoTramado(rampa: string, v: number, x: number, y: number, o: OpcionesTono = {}): [string, boolean] {
  const n = rampa.length - 1;
  if (n <= 0) return [rampa, false];
  const p = clamp(v) * n;
  const i = Math.min(n - 1, Math.floor(p));
  const f = p - i;
  const ancho = clamp(o.ancho ?? 0.6, 0.001, 1);
  // la meseta: la parte de abajo del escalón es el tono i liso, la de arriba el i + 1 liso, y en medio la trama
  const g = clamp((f - (1 - ancho) / 2) / ancho);
  if (g <= 0) return [rampa[i], false];
  if (g >= 1) return [rampa[i + 1], false];
  const sube = g > umbral(x, y, o.matriz ?? 4);
  return [rampa[sube ? i + 1 : i], true];
}

export interface Luz extends OpcionesTono {
  /** Hacia dónde está la luz (de serie, arriba a la izquierda: [-1, -1]). */
  luz?: [number, number];
  /** La caja en la que corre la luz [x0, y0, x1, y1] (inclusiva); de serie, la de la masa. */
  caja?: [number, number, number, number];
  /** Luz media de la masa (0–1). */
  base?: number;
  /** Cuánto cambia la luz de la esquina iluminada a la de sombra (0–1). */
  pendiente?: number;
  /** Ancho, en celdas, de la sombra que se pega al canto de sombra (abajo a la derecha). */
  borde?: number;
  /** Cuánto oscurece ese canto (0–1). */
  fuerzaBorde?: number;
  /** Ancho, en celdas, del brillo pegado al canto de luz. */
  brillo?: number;
  /** Cuánto aclara ese brillo (0–1). */
  fuerzaBrillo?: number;
  /** Qué letras cuentan como «dentro» de la masa para buscar sus cantos (de serie, las claves). */
  masa?: string;
  /** Un foco de luz puntual opcional [x, y, radio, fuerza] (velas, ojos que brillan, el centro de un retrato). */
  foco?: [number, number, number, number];
}

/** Pasos hasta salir de la masa yendo en (dx, dy), con tope `max`. */
function hastaFuera(l: Lienzo, x: number, y: number, dx: number, dy: number, masa: string, max: number): number {
  for (let i = 1; i <= max; i++) if (!l.lleno(x + dx * i, y + dy * i, masa)) return i;
  return max + 1;
}

/**
 * Sombrea una masa (las celdas con letra de `claves`) entre los tonos de `rampa` (de oscuro a claro), con la luz de un
 * solo lado: el valor de luz baja de la esquina iluminada a la de sombra, se hunde junto al canto de sombra y sube en
 * un filo junto al canto de luz. Los pasos entre tonos se traman con Bayer y quedan marcados en el lienzo.
 */
export function sombrear(l: Lienzo, claves: string, rampa: string, o: Luz = {}): Lienzo {
  const masa = o.masa ?? claves;
  const [lx, ly] = o.luz ?? [-1, -1];
  // la caja de la masa
  let [x0, y0, x1, y1] = o.caja ?? [Infinity, Infinity, -1, -1];
  if (!o.caja)
    for (let y = 0; y < l.h; y++)
      for (let x = 0; x < l.w; x++)
        if (l.lleno(x, y, claves)) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
  if (x1 < 0) return l;
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const norma = Math.abs(lx) + Math.abs(ly) || 1;
  const base = o.base ?? 0.55;
  const pend = o.pendiente ?? 0.7;
  const borde = o.borde ?? 3;
  const fb = o.fuerzaBorde ?? 0.35;
  const brillo = o.brillo ?? 1;
  const fl = o.fuerzaBrillo ?? 0.2;
  const sdx = -Math.sign(lx);
  const sdy = -Math.sign(ly);
  const out: [number, number, string, boolean][] = [];
  for (let y = 0; y < l.h; y++)
    for (let x = 0; x < l.w; x++) {
      if (!l.lleno(x, y, claves)) continue;
      if (o.caja && (x < x0 || x > x1 || y < y0 || y > y1)) continue;
      // posición a lo largo de la luz: +0,5 en la esquina iluminada, -0,5 en la de sombra
      const u = ((x - x0) / w - 0.5) * lx + ((y - y0) / h - 0.5) * ly;
      let v = base + (pend * u) / (norma / 2) / 2;
      // el canto de sombra (abajo a la derecha) se hunde
      if (borde > 0 && fb > 0) {
        const d = Math.min(hastaFuera(l, x, y, sdx, sdy, masa, borde), hastaFuera(l, x, y, sdx, 0, masa, borde), hastaFuera(l, x, y, 0, sdy, masa, borde));
        if (d <= borde) v -= fb * (1 - (d - 1) / borde);
      }
      // el filo de luz (arriba a la izquierda) se aclara
      if (brillo > 0 && fl > 0) {
        const d = Math.min(hastaFuera(l, x, y, -sdx, -sdy, masa, brillo), hastaFuera(l, x, y, -sdx, 0, masa, brillo), hastaFuera(l, x, y, 0, -sdy, masa, brillo));
        if (d <= brillo) v += fl * (1 - (d - 1) / brillo);
      }
      if (o.foco) {
        const [fx, fy, fr, ff] = o.foco;
        v += ff * Math.max(0, 1 - Math.hypot(x + 0.5 - fx, y + 0.5 - fy) / fr);
      }
      const [k, t] = tonoTramado(rampa, v, x, y, o);
      out.push([x, y, k, t]);
    }
  for (const [x, y, k, t] of out) {
    l.set(x, y, k);
    if (t) l.marcar(x, y);
  }
  return l;
}

/**
 * Un hueco tramado (cuencas de ojos, el hueco de una copa, la boca de una caverna): elipse de centro (cx, cy) y radios
 * rx, ry cuyo fondo cae al tono más hondo de la rampa y sube tramado hacia el canto. El fondo se corre hacia arriba a la
 * izquierda: con la luz de ese lado, la pared de arriba queda en sombra y la de abajo recibe la luz.
 */
export function hueco(l: Lienzo, cx: number, cy: number, rx: number, ry: number, rampa: string, o: OpcionesTono & { solo?: string; curva?: number } = {}): Lienzo {
  const ox = cx - rx * 0.25;
  const oy = cy - ry * 0.3;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 > 1) continue;
      if (o.solo !== undefined && !o.solo.includes(l.get(x, y))) continue;
      const d = clamp(Math.hypot((px - ox) / (rx * 1.15), (py - oy) / (ry * 1.15)));
      const [k, t] = tonoTramado(rampa, d ** (o.curva ?? 1.6), x, y, o);
      l.set(x, y, k);
      if (t) l.marcar(x, y);
    }
  return l;
}

export interface OpcionesFranja {
  /** Eje de la densidad: 'x' (de izquierda a derecha), 'y' (de arriba abajo) o una dirección [dx, dy]. */
  eje?: 'x' | 'y' | [number, number];
  /** Densidad al principio y al final del eje (0–1). */
  desde?: number;
  hasta?: number;
  /** Solo sobre celdas con estas letras (de serie, cualquiera, también el papel). */
  solo?: string;
  matriz?: Matriz;
}

/**
 * Trama un tono sobre la caja [x0, y0, x1, y1] (inclusiva) con una densidad que va de `desde` a `hasta` a lo largo del
 * eje: la sombra de borde del papel, una penumbra que sube, una veladura.
 */
export function franja(l: Lienzo, caja: [number, number, number, number], tono: string, o: OpcionesFranja = {}): Lienzo {
  const [x0, y0, x1, y1] = caja;
  const [ex, ey] = o.eje === 'x' || !o.eje ? [1, 0] : o.eje === 'y' ? [0, 1] : o.eje;
  const a = o.desde ?? 0;
  const b = o.hasta ?? 1;
  const largo = Math.abs(ex) * (x1 - x0) + Math.abs(ey) * (y1 - y0) || 1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (o.solo !== undefined && !o.solo.includes(l.get(x, y))) continue;
      const t = ((ex >= 0 ? x - x0 : x1 - x) * Math.abs(ex) + (ey >= 0 ? y - y0 : y1 - y) * Math.abs(ey)) / largo;
      const d = a + (b - a) * clamp(t);
      if (d > umbral(x, y, o.matriz ?? 4)) l.set(x, y, tono).marcar(x, y);
    }
  return l;
}

export interface OpcionesPunteado {
  /** Hacia dónde crece la densidad (de serie, hacia la sombra: abajo a la derecha). */
  dir?: [number, number];
  /** Densidad en el lado claro y en el oscuro (0–1, sobre la rejilla de puntos). */
  desde?: number;
  hasta?: number;
  /** Separación de la rejilla de puntos (2 o más: a 2 los puntos son de ajedrez, a 3 quedan sueltos). */
  paso?: number;
  caja?: [number, number, number, number];
}

/**
 * Punteado direccional (stipple): puntos sueltos de `tono` sobre la masa, en una rejilla escalonada, cuya densidad crece
 * hacia `dir`. Da la textura de piedra, de corteza o de piel curtida sin ensuciar el contorno.
 */
export function punteado(l: Lienzo, claves: string, tono: string, o: OpcionesPunteado = {}): Lienzo {
  const [dx, dy] = o.dir ?? [1, 1];
  const paso = Math.max(2, o.paso ?? 3);
  let [x0, y0, x1, y1] = o.caja ?? [Infinity, Infinity, -1, -1];
  if (!o.caja)
    for (let y = 0; y < l.h; y++)
      for (let x = 0; x < l.w; x++)
        if (l.lleno(x, y, claves)) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
  if (x1 < 0) return l;
  const n = Math.abs(dx) + Math.abs(dy) || 1;
  const a = o.desde ?? 0;
  const b = o.hasta ?? 0.8;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!l.lleno(x, y, claves)) continue;
      // rejilla escalonada: una fila de cada `paso`, desplazada media rejilla en filas alternas
      const fila = Math.floor((y - y0) / paso);
      if (mod(y - y0, paso) !== 0 || mod(x - x0 + (fila % 2 ? Math.floor(paso / 2) : 0), paso) !== 0) continue;
      const t = (((x - x0) / Math.max(1, x1 - x0) - 0.5) * dx + ((y - y0) / Math.max(1, y1 - y0) - 0.5) * dy) / n + 0.5;
      if (a + (b - a) * clamp(t) > umbral(Math.floor(x / paso), Math.floor(y / paso), 4)) l.set(x, y, tono).marcar(x, y);
    }
  return l;
}

export interface OpcionesRayado {
  /** Dirección de las rayas: '-' horizontal, '|' vertical, '\\' o '/' diagonal. */
  angulo?: '-' | '|' | '\\' | '/';
  /** Separación entre rayas (celdas). */
  paso?: number;
  /** Solo rayar donde la luz (0 = sombra, 1 = luz) quede por debajo de esto, según la posición en la caja. */
  hasta?: number;
  /** Dirección de la sombra para el corte de `hasta` (de serie, abajo a la derecha). */
  dir?: [number, number];
  caja?: [number, number, number, number];
}

/** Rayado de grabado a celda entera: rayas paralelas de `tono` que cubren la parte en sombra de la masa. */
export function rayado(l: Lienzo, claves: string, tono: string, o: OpcionesRayado = {}): Lienzo {
  const ang = o.angulo ?? '\\';
  const paso = Math.max(2, o.paso ?? 3);
  const [dx, dy] = o.dir ?? [1, 1];
  let [x0, y0, x1, y1] = o.caja ?? [Infinity, Infinity, -1, -1];
  if (!o.caja)
    for (let y = 0; y < l.h; y++)
      for (let x = 0; x < l.w; x++)
        if (l.lleno(x, y, claves)) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
  if (x1 < 0) return l;
  const n = Math.abs(dx) + Math.abs(dy) || 1;
  const corte = o.hasta ?? 1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!l.lleno(x, y, claves)) continue;
      const k = ang === '-' ? y : ang === '|' ? x : ang === '\\' ? x - y : x + y;
      if (mod(k, paso) !== 0) continue;
      const t = (((x - x0) / Math.max(1, x1 - x0) - 0.5) * dx + ((y - y0) / Math.max(1, y1 - y0) - 0.5) * dy) / n + 0.5;
      if (1 - t <= corte) l.set(x, y, tono).marcar(x, y);
    }
  return l;
}

// ───────────── la penumbra de la interfaz ─────────────

export type VarianteFondo = 'mesa' | 'mapa' | 'pulperia';

/** Tonos de cada penumbra, de lo más hondo (los bordes) a la luz de vela (el centro), y dónde está la vela. */
const FONDO: Record<VarianteFondo, { tonos: string[]; foco: [number, number]; radio: [number, number] }> = {
  // la mesa: violeta abismal con una vela tibia sobre el centro del paño
  mesa: { tonos: ['#09070f', '#120a24', '#1c0f2c', '#2a1533', '#3a1a34'], foco: [0.5, 0.46], radio: [0.62, 0.7] },
  // el Mapa: índigo de noche, la luz arriba como de luna
  mapa: { tonos: ['#07070f', '#0c0f26', '#141a3a', '#1e2450', '#2a2c5c'], foco: [0.5, 0.3], radio: [0.7, 0.85] },
  // La Pulpería: vino y ámbar, el farol del mostrador
  pulperia: { tonos: ['#0b0711', '#1a0b16', '#2a1018', '#40191a', '#5a2a1c'], foco: [0.5, 0.4], radio: [0.6, 0.72] },
};

/** Ancho y alto del fondo en unidades de trama (cada unidad, un punto de la trama: ~4 px a 1920 × 1080). */
const FW = 480;
const FH = 272;
/** Lado de cada región de luz (múltiplo de 4: las tramas de 4 × 4 casan en todas). */
const REG = 8;

export interface Fondo {
  /** El SVG del fondo (viewBox 480 × 272, se recorta para cubrir: `preserveAspectRatio="xMidYMid slice"`). */
  svg: string;
  /** `url("data:image/svg+xml,…")`, para `background-image` o para `--fondo-trama`. */
  url: string;
  /** La declaración entera para `background`: tinta de respaldo, la trama, centrada y cubriendo. */
  css: string;
}

const cacheFondo = new Map<VarianteFondo, Fondo>();

/** Codifica un SVG para una url() de CSS (comillas simples dentro, lo mínimo escapado). */
const dataUrl = (svg: string) =>
  `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ')}")`;

/**
 * La penumbra de la interfaz como trama de Bayer de luz de vela: el centro, tibio, y los bordes, abismales, en escalones
 * de densidad de a cuarto de tono (nada de degradado). Cada punto de la trama es una unidad entera del SVG; las regiones
 * de luz son bloques de 8 × 8 unidades. Para CSS: `background: ${fondoTramado('mesa').css}` o
 * `--fondo-trama: ${fondoTramado('mesa').url}`.
 */
export function fondoTramado(variante: VarianteFondo = 'mesa'): Fondo {
  const hecho = cacheFondo.get(variante);
  if (hecho) return hecho;
  const { tonos, foco, radio } = FONDO[variante] ?? FONDO.mesa;
  const pasos = (tonos.length - 1) * 4; // niveles de a cuarto de tono
  // patrones: el nivel j es el tono floor(j/4) con la fracción (j % 4)/4 de puntos del siguiente (Bayer 4 × 4)
  const defs: string[] = [];
  const relleno = (j: number): string => {
    const i = Math.floor(j / 4);
    const f = (j % 4) / 4;
    if (f === 0 || i >= tonos.length - 1) return tonos[Math.min(i, tonos.length - 1)];
    const id = `${variante[0]}${j}`;
    if (!defs.some((d) => d.includes(`id="${id}"`))) {
      let pts = '';
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (umbral(x, y) < f) pts += `M${x},${y}h1v1h-1z`;
      defs.push(`<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${tonos[i]}"/><path fill="${tonos[i + 1]}" d="${pts}"/></pattern>`);
    }
    return `url(#${id})`;
  };
  // el nivel de cada región: la luz cae con la distancia elíptica a la vela
  const cols = FW / REG;
  const filas = FH / REG;
  const nivel: number[][] = [];
  for (let ry = 0; ry < filas; ry++) {
    nivel.push([]);
    for (let rx = 0; rx < cols; rx++) {
      const cx = (rx + 0.5) / cols;
      const cy = (ry + 0.5) / filas;
      const d = Math.hypot((cx - foco[0]) / radio[0], (cy - foco[1]) / radio[1]);
      const v = clamp(1 - d) ** 1.4;
      nivel[ry].push(Math.round(v * pasos));
    }
  }
  // una caja por corrida de regiones del mismo nivel, juntando las filas iguales
  const porRelleno = new Map<string, string[]>();
  let abiertas = new Map<string, { x: number; y: number; w: number; h: number; j: number }>();
  const cerrar = (c: { x: number; y: number; w: number; h: number; j: number }) => {
    const f = relleno(c.j);
    const d = `M${c.x * REG},${c.y * REG}h${c.w * REG}v${c.h * REG}h${-c.w * REG}z`;
    porRelleno.set(f, [...(porRelleno.get(f) ?? []), d]);
  };
  for (let ry = 0; ry <= filas; ry++) {
    const nuevas = new Map<string, { x: number; y: number; w: number; h: number; j: number }>();
    if (ry < filas) {
      let rx = 0;
      while (rx < cols) {
        const j = nivel[ry][rx];
        let r1 = rx;
        while (r1 < cols && nivel[ry][r1] === j) r1++;
        const clave = `${rx},${r1},${j}`;
        const previa = abiertas.get(clave);
        if (previa) {
          previa.h++;
          nuevas.set(clave, previa);
          abiertas.delete(clave);
        } else nuevas.set(clave, { x: rx, y: ry, w: r1 - rx, h: 1, j });
        rx = r1;
      }
    }
    for (const c of abiertas.values()) cerrar(c);
    abiertas = nuevas;
  }
  const cuerpo = [...porRelleno].map(([f, ds]) => `<path fill="${f}" d="${ds.join('')}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FW} ${FH}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges"><defs>${defs.join('')}</defs>${cuerpo}</svg>`;
  const url = dataUrl(svg);
  const fondo: Fondo = { svg, url, css: `${tonos[0]} ${url} center / cover no-repeat` };
  cacheFondo.set(variante, fondo);
  return fondo;
}
