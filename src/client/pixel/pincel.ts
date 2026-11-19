// V40 · fase 2b · El pincel del pixel-art: un lienzo de celdas y primitivas (rectángulo, elipse, polígono, trazo grueso,
// línea de un píxel) que rasterizan en coordenadas enteras, más el sombreado direccional por masas planas. Así los
// dibujos grandes (el naipe de 96 × 140, la Corte, el Bufón, los Reyes) se componen con formas y no con rejillas
// escritas a mano, y la luz viene siempre del mismo lado (arriba a la izquierda): nada de sombreado de almohada.
//
// Ideas adaptadas de pxl (https://github.com/uilianks/pxl, licencia MIT, © 2026 crsolver y uilianks): dibujar con
// primitivas en vez de rejillas grandes, la mitad de lo simétrico más su espejo, rampas de tono por material y la luz de
// un solo lado. El código es nuestro.
import { heredar, marcarTrama, tramaDe, type Mapa } from './rejilla';

const VACIO = '.';

/** Un lienzo de celdas: cada celda guarda la letra de su tinta ('.' es papel). */
export class Lienzo {
  readonly w: number;
  readonly h: number;
  private c: string[][];
  /** Celdas puestas por el tramado (pixel/dither.ts): el linter no las cuenta como ruido. */
  private t: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.c = Array.from({ length: h }, () => Array.from({ length: w }, () => VACIO));
    this.t = new Uint8Array(w * h);
  }

  /** Marca una celda como tramada (la pone el tramado; cualquier otra pincelada la desmarca). */
  marcar(x: number, y: number): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.t[y * this.w + x] = 1;
    return this;
  }
  /** ¿La celda la puso el tramado? */
  tramada(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.t[y * this.w + x] === 1;
  }

  /** Un lienzo a partir de un mapa ya hecho. */
  static de(m: Mapa): Lienzo {
    const w = Math.max(0, ...m.map((r) => r.length));
    const l = new Lienzo(w, m.length);
    m.forEach((r, y) => [...r].forEach((k, x) => l.set(x, y, k === ' ' ? VACIO : k)));
    const t = tramaDe(m);
    if (t && t.length === l.t.length) l.t.set(t);
    return l;
  }

  get(x: number, y: number): string {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? VACIO : this.c[y][x];
  }

  set(x: number, y: number, k: string): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) {
      this.c[y][x] = k;
      this.t[y * this.w + x] = 0;
    }
    return this;
  }

  /** ¿La celda está pintada (y, si se dan `claves`, con una de ellas)? */
  lleno(x: number, y: number, claves?: string): boolean {
    const k = this.get(x, y);
    return k !== VACIO && (!claves || claves.includes(k));
  }

  /** Pinta cada celda cuyo centro cumple `dentro`. `solo` limita a celdas que ya tengan una de esas letras. */
  pintar(dentro: (cx: number, cy: number) => boolean, k: string, solo?: string): this {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (solo !== undefined && !solo.includes(this.c[y][x])) continue;
        if (dentro(x + 0.5, y + 0.5)) {
          this.c[y][x] = k;
          this.t[y * this.w + x] = 0;
        }
      }
    return this;
  }

  rect(x: number, y: number, w: number, h: number, k: string): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, k);
    return this;
  }

  /** Elipse llena con centro (cx, cy) y radios rx, ry (el centro puede caer entre celdas: x.5). */
  elipse(cx: number, cy: number, rx: number, ry: number, k: string, solo?: string): this {
    return this.pintar((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, k, solo);
  }

  /** Polígono lleno (par-impar), con los vértices en coordenadas de borde de celda. */
  poli(p: readonly (readonly [number, number])[], k: string, solo?: string): this {
    return this.pintar((x, y) => {
      let dentro = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i];
        const [xj, yj] = p[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
      }
      return dentro;
    }, k, solo);
  }

  /** Trazo grueso (cápsula) de (x0, y0) a (x1, y1) con radio r. */
  trazo(x0: number, y0: number, x1: number, y1: number, r: number, k: string, solo?: string): this {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    return this.pintar((x, y) => {
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2));
      return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= r;
    }, k, solo);
  }

  /** Línea de un píxel (Bresenham) entre centros de celda: los escalones salen regulares. */
  linea(x0: number, y0: number, x1: number, y1: number, k: string): this {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, k);
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** Cambia unas letras por otras dentro de una caja (o en todo el lienzo). */
  cambiar(de: string, a: string, caja?: [number, number, number, number]): this {
    const [x0, y0, x1, y1] = caja ?? [0, 0, this.w, this.h];
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++)
      for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x++) if (de.includes(this.c[y][x])) this.c[y][x] = a;
    return this;
  }

  /**
   * Sombreado direccional de una masa plana: las celdas con letra de `claves` cuya vecina a (dx, dy) —a 1..n pasos—
   * cae fuera de la masa toman la tinta `k`. Con (1, 1) da la media luna de sombra abajo a la derecha; con (-1, -1),
   * el brillo de arriba a la izquierda. `masa` (por defecto, las mismas `claves`) dice qué cuenta como «dentro».
   */
  sombra(claves: string, k: string, dx: number, dy: number, n = 1, masa = claves): this {
    const marca: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!claves.includes(this.c[y][x])) continue;
        for (let i = 1; i <= n; i++)
          if (!this.lleno(x + dx * i, y + dy * i, masa)) {
            marca.push([x, y]);
            break;
          }
      }
    for (const [x, y] of marca) {
      this.c[y][x] = k;
      this.t[y * this.w + x] = 0;
    }
    return this;
  }

  /**
   * El canto de una masa: las celdas de `claros` que tocan el papel (vecindad de 4) toman la tinta `k`. Así un tono
   * claro de la rampa (brillo, lima, oro solar) no queda en el borde y la silueta llega a 3:1 sobre el papel.
   */
  canto(claros: string, k: string, masa?: string): this {
    const marca: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!claros.includes(this.c[y][x])) continue;
        const fuera = (dx: number, dy: number) => (masa ? !this.lleno(x + dx, y + dy, masa) : !this.lleno(x + dx, y + dy));
        if (fuera(1, 0) || fuera(-1, 0) || fuera(0, 1) || fuera(0, -1)) marca.push([x, y]);
      }
    for (const [x, y] of marca) {
      this.c[y][x] = k;
      this.t[y * this.w + x] = 0;
    }
    return this;
  }

  /** Copia la mitad izquierda sobre la derecha, en espejo (eje entre columnas: ancho par). */
  espejoX(): this {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w >> 1; x++) {
        this.c[y][this.w - 1 - x] = this.c[y][x];
        this.t[y * this.w + this.w - 1 - x] = this.t[y * this.w + x];
      }
    return this;
  }

  /** Pega un mapa con su esquina en (x, y); el papel del mapa no tapa. */
  pegar(m: Mapa | Lienzo, x: number, y: number): this {
    const filas = m instanceof Lienzo ? m.mapa() : m;
    const t = tramaDe(filas);
    const [w] = [Math.max(0, ...filas.map((r) => r.length))];
    filas.forEach((r, dy) =>
      [...r].forEach((k, dx) => {
        if (k === VACIO || k === ' ') return;
        this.set(x + dx, y + dy, k);
        if (t?.[dy * w + dx]) this.marcar(x + dx, y + dy);
      }),
    );
    return this;
  }

  /** El dibujo como mapa de caracteres. */
  mapa(): string[] {
    return marcarTrama(
      this.c.map((r) => r.join('')),
      this.t.slice(),
    );
  }
}

/** Gira un mapa 90° en sentido horario. */
export function girar(m: Mapa): string[] {
  const h = m.length;
  const w = Math.max(0, ...m.map((r) => r.length));
  return heredar(
    Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) => m[h - 1 - y][x] ?? VACIO).join('')),
    m,
    (x, y) => [y, h - 1 - x],
  );
}

/** Recorta un mapa a la caja de lo pintado. */
export function recortar(m: Mapa): string[] {
  let x0 = Infinity;
  let x1 = -1;
  let y0 = Infinity;
  let y1 = -1;
  m.forEach((r, y) =>
    [...r].forEach((k, x) => {
      if (k === VACIO || k === ' ') return;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }),
  );
  if (x1 < 0) return [VACIO];
  return heredar(
    m.slice(y0, y1 + 1).map((r) => r.padEnd(x1 + 1, VACIO).slice(x0, x1 + 1)),
    m,
    (x, y) => [x + x0, y + y0],
  );
}

/**
 * El mismo pincel con las coordenadas multiplicadas por `k`: un dibujo pensado en una rejilla se rehace más grande (o
 * más chico) sin perder nitidez, porque se vuelve a rasterizar en vez de estirar los píxeles.
 */
export class Escala {
  constructor(
    readonly l: Lienzo,
    readonly k: number,
  ) {}
  private n = (v: number) => v * this.k;
  elipse(cx: number, cy: number, rx: number, ry: number, c: string, solo?: string): this {
    this.l.elipse(this.n(cx), this.n(cy), this.n(rx), this.n(ry), c, solo);
    return this;
  }
  poli(p: readonly (readonly [number, number])[], c: string, solo?: string): this {
    this.l.poli(p.map(([x, y]) => [this.n(x), this.n(y)] as const), c, solo);
    return this;
  }
  trazo(x0: number, y0: number, x1: number, y1: number, r: number, c: string, solo?: string): this {
    this.l.trazo(this.n(x0), this.n(y0), this.n(x1), this.n(y1), this.n(r), c, solo);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: string): this {
    const x0 = Math.round(this.n(x));
    const y0 = Math.round(this.n(y));
    this.l.rect(x0, y0, Math.max(1, Math.round(this.n(x + w)) - x0), Math.max(1, Math.round(this.n(y + h)) - y0), c);
    return this;
  }
  set(x: number, y: number, c: string): this {
    return this.rect(x, y, 1, 1, c);
  }
  linea(x0: number, y0: number, x1: number, y1: number, c: string): this {
    this.l.linea(this.n(x0), this.n(y0), this.n(x1), this.n(y1), c);
    return this;
  }
  /** Sombreado en celdas reales (n no se escala: es el ancho de la banda en píxeles). */
  sombra(claves: string, c: string, dx: number, dy: number, n = 1, masa = claves): this {
    this.l.sombra(claves, c, dx, dy, n, masa);
    return this;
  }
  cambiar(de: string, a: string, caja?: [number, number, number, number]): this {
    this.l.cambiar(de, a, caja?.map((v) => Math.round(this.n(v))) as [number, number, number, number] | undefined);
    return this;
  }
}

/**
 * Una cinta que flamea: banda que sigue una onda de (x0, y0) a (x1, y1), con `ondas` medias vueltas de amplitud `a` y
 * ancho `r`. Donde la cinta se da vuelta se afina y muestra el revés (`reves`); de frente, la cara (`cara`).
 */
export function cintaOndulada(l: Lienzo | Escala, x0: number, y0: number, x1: number, y1: number, a: number, ondas: number, r: number, cara: string, reves: string): void {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const px = -(y1 - y0) / len;
  const py = (x1 - x0) / len;
  const pasos = Math.ceil(len * 2);
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const fase = t * ondas * Math.PI;
    const off = Math.sin(fase) * a * Math.min(1, t * 3);
    const giro = Math.cos(fase * 1.5 + 0.6);
    const ancho = r * (0.45 + 0.55 * Math.abs(giro));
    const cx = x0 + (x1 - x0) * t + px * off;
    const cy = y0 + (y1 - y0) * t + py * off;
    l.elipse(cx, cy, ancho, ancho, giro >= 0 ? cara : reves);
  }
}
