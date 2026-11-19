// V40 · fase 2b · Linter del pixel-art: el crítico que mira cada pieza celda a celda (sobre el mapa, no sobre una
// captura) y dice dónde está el error clásico. Corre solo (`npx tsx scripts/pixel-lint.ts [grupo…]`) y dentro de
// `npm run forja`, que falla si alguna pieza tiene un fallo.
//
// Adaptado de `pxl lint` (https://github.com/uilianks/pxl, src/core/lint.ts; licencia MIT, © 2026 crsolver y uilianks):
// las reglas de huérfanos, dientes de sierra (jaggies), sombreado de almohada y colores casi repetidos siguen su lógica.
// Son nuestras las de bandas concéntricas, contorno negro pesado, tamaño de paleta por pieza y rejilla entera.
//
// V40 · fase 2c («Dark Dithered & Textured»): el tramado intencional (Bayer, punteado y rayado de pixel/dither.ts) deja
// sus celdas marcadas en la máscara de trama del mapa (rejilla.ts, tramaDe). Esas celdas, y las que las tocan, no cuentan
// como huérfanos ni como dientes de sierra: son zona de trama declarada. Un píxel suelto fuera de esas zonas sigue siendo
// ruido. El contorno pesado ahora también caza la tinta abismal violácea (#0B0711, #120A24), no solo el negro neutro.
//
// Reglas:
//   huérfano      celda sin vecina de su color dentro de una masa, y casi del mismo brillo que lo de alrededor (ruido);
//                 no cuenta en la zona de trama declarada
//   jaggy         esquina en L que engorda una línea de un píxel (la línea debe escalonar en diagonal); no cuenta en la
//                 zona de trama declarada
//   almohada      el brillo sube hacia el centro por todos lados (luz sin dirección)
//   bandas        anillos concéntricos de tono que siguen la silueta, cada uno de un solo tono (bandas)
//   contorno      más de un 35 % del borde de la silueta del lado de la luz (arriba y a la izquierda) en tinta casi negra
//                 (neutra o abismal: el contorno «de Paint»); el canto de sombra puede caer al abismo, y las piezas a
//                 sangre (retratos, dorsos) no se miden
//   paleta        demasiados colores para la pieza, o dos casi iguales
//   rejilla       filas de distinto largo o celdas de letra sin tinta
//   silueta       (pintas y caras del naipe) menos del 60 % del borde de la silueta a 3:1 sobre el papel del naipe: sin
//                 contorno, la silueta la da el tono propio (WCAG 1.4.11, objetos gráficos)
import { pathToFileURL } from 'node:url';
import { catalogo, type Pieza } from '../src/client/pixel/catalogo';
import { PX, tintas } from '../src/client/pixel/paleta';
import { tramaDe } from '../src/client/pixel/rejilla';

export interface Hallazgo {
  regla: 'huérfano' | 'jaggy' | 'almohada' | 'bandas' | 'contorno' | 'paleta' | 'rejilla' | 'silueta';
  grave: boolean;
  msg: string;
  at?: [number, number][];
}

const T = tintas();
/** El color hexadecimal de una letra (las tintas de palo `var(--suit-X, #hex)` dan su respaldo). */
function hex(k: string): string | null {
  const t = T[k];
  if (!t) return null;
  const m = /#([0-9a-f]{6})/i.exec(t);
  return m ? `#${m[1].toLowerCase()}` : null;
}
const rgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const luma = (h: string) => {
  const [r, g, b] = rgb(h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function hsl(h: string): [number, number, number] {
  const [r, g, b] = rgb(h).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hh = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh * 60, s, l];
}
/** Familia de matiz (cada 40°); los neutros (poco saturados, casi negros o casi blancos) son -1. */
const familia = (h: string) => {
  const [hu, sa, li] = hsl(h);
  return sa < 0.15 || li < 0.1 || li > 0.9 ? -1 : Math.round(hu / 40) % 9;
};

const linc = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lumW = (h: string) => {
  const [r, g, b] = rgb(h);
  return 0.2126 * linc(r) + 0.7152 * linc(g) + 0.0722 * linc(b);
};
/** Contraste WCAG entre dos colores. */
export const contraste = (a: string, b: string) => {
  const [x, y] = [lumW(a), lumW(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** Lo que pide la regla «silueta»: borde a 3:1 sobre el papel del naipe, en al menos esta parte del borde. */
export const SILUETA = { contraste: 3, fraccion: 0.6, papel: PX.papel };

const N8: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const N4: [number, number][] = [[0, -1], [-1, 0], [1, 0], [0, 1]];
/** Las dos vecinas del lado de la luz (arriba y a la izquierda). */
const LUZ2: [number, number][] = [[0, -1], [-1, 0]];

/** Tope de colores por grupo (las piezas grandes llevan más materiales). */
const TOPE_PALETA: Record<string, number> = { glifos: 12, pintas: 14, naipes: 18, figuras: 26, dorsos: 22, bufon: 24, reyes: 26, amuletos: 20, trampas: 20, bendiciones: 22, nodos: 20 };

/** ¿El color es tinta casi negra? Neutra (poco saturada) u honda de cualquier matiz (la tinta abismal violácea). */
export function casiNegro(c: string): boolean {
  const [, sa, li] = hsl(c);
  return li < 0.12 || (li < 0.2 && sa < 0.3);
}

/**
 * Pasa las reglas por un mapa. `trama` es la máscara de trama declarada (de serie, la que el mapa trae de
 * pixel/dither.ts): sus celdas y sus vecinas no cuentan como huérfanos ni como dientes de sierra.
 */
export function lintMapa(m: readonly string[], grupo = 'pintas', trama: Uint8Array | null = tramaDe(m)): Hallazgo[] {
  const out: Hallazgo[] = [];
  const h = m.length;
  const w = Math.max(0, ...m.map((r) => r.length));
  /** ¿La celda está en zona de trama declarada (tramada ella o alguna vecina)? */
  const enTrama = (x: number, y: number): boolean => {
    if (!trama) return false;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && trama[ny * w + nx]) return true;
      }
    return false;
  };
  // rejilla: filas iguales y letras conocidas
  if (m.some((r) => r.length !== w)) out.push({ regla: 'rejilla', grave: true, msg: 'filas de distinto largo' });
  const raras = new Set([...m.join('')].filter((k) => k !== '.' && k !== ' ' && !hex(k)));
  if (raras.size) out.push({ regla: 'rejilla', grave: true, msg: `letras sin tinta: ${[...raras].join(' ')}` });
  const col = (x: number, y: number): string | null => {
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const k = m[y][x];
    return k === '.' || k === ' ' || k === undefined ? null : hex(k);
  };

  // huérfanos (pxl): sin vecina de su color, rodeada por las cuatro caras y de poco contraste con lo de alrededor
  const huerfanos: [number, number][] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = col(x, y);
      if (!c || enTrama(x, y)) continue;
      if (N8.some(([dx, dy]) => col(x + dx, y + dy) === c)) continue;
      if (N4.some(([dx, dy]) => !col(x + dx, y + dy))) continue;
      const vecinas = N8.map(([dx, dy]) => col(x + dx, y + dy)).filter((v): v is string => !!v);
      const alrededor = vecinas.reduce((a, v) => a + luma(v), 0) / vecinas.length;
      if (Math.abs(luma(c) - alrededor) < 48) huerfanos.push([x, y]);
    }

  // componentes del mismo color (para jaggies: solo cuentan las líneas finas de 6 o más celdas)
  const comp = new Int32Array(w * h).fill(-1);
  const tam: number[] = [];
  const fina: boolean[] = [];
  for (let y0 = 0; y0 < h; y0++)
    for (let x0 = 0; x0 < w; x0++) {
      const c = col(x0, y0);
      if (!c || comp[y0 * w + x0] >= 0) continue;
      const id = tam.length;
      const pila = [y0 * w + x0];
      comp[pila[0]] = id;
      let n = 0;
      let delgada = true;
      while (pila.length) {
        const i = pila.pop()!;
        const x = i % w;
        const y = (i / w) | 0;
        n++;
        if (col(x + 1, y) === c && col(x, y + 1) === c && col(x + 1, y + 1) === c) delgada = false;
        for (const [dx, dy] of N8) {
          const nx = x + dx;
          const ny = y + dy;
          if (col(nx, ny) !== c || comp[ny * w + nx] >= 0) continue;
          comp[ny * w + nx] = id;
          pila.push(ny * w + nx);
        }
      }
      tam.push(n);
      fina.push(delgada);
    }
  const jag: [number, number][] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = col(x, y);
      if (!c || enTrama(x, y)) continue;
      const igual = (dx: number, dy: number) => col(x + dx, y + dy) === c;
      const id = comp[y * w + x];
      if (N8.filter(([dx, dy]) => igual(dx, dy)).length !== 2 || tam[id] < 6 || !fina[id]) continue;
      for (const [hx, vy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]])
        if (igual(hx, 0) && igual(0, vy) && !igual(hx, vy) && !igual(2 * hx, 0) && !igual(0, 2 * vy)) {
          jag.push([x, y]);
          break;
        }
    }

  // distancia al borde de cada familia de matiz (para almohada y bandas)
  const fam = new Int8Array(w * h).fill(-2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = col(x, y);
    if (c) fam[y * w + x] = familia(c);
  }
  const famEn = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -2 : fam[y * w + x]);
  let almohada = 0;
  let bandas = 0;
  for (const f of new Set(fam)) {
    if (f < 0) continue;
    const dist = new Int32Array(w * h).fill(-1);
    const cola: number[] = [];
    const dentro = (x: number, y: number) => famEn(x, y) === f;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!dentro(x, y)) continue;
      if (N8.some(([dx, dy]) => !dentro(x + dx, y + dy))) {
        dist[y * w + x] = 0;
        cola.push(y * w + x);
      }
    }
    for (let k = 0; k < cola.length; k++) {
      const i = cola[k];
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of N8) {
        const nx = x + dx;
        const ny = y + dy;
        const j = ny * w + nx;
        if (!dentro(nx, ny) || dist[j] >= 0) continue;
        dist[j] = dist[i] + 1;
        cola.push(j);
      }
    }
    // almohada (pxl): el brillo correlaciona con la distancia al borde y su centro coincide con el de la masa
    let n = 0, sd = 0, sl = 0, sdd = 0, sll = 0, sdl = 0, cx = 0, cy = 0, lx = 0, ly = 0, lw = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = dist[y * w + x];
      if (d < 1) continue;
      const l = luma(col(x, y)!);
      n++; sd += d; sl += l; sdd += d * d; sll += l * l; sdl += d * l;
      cx += x; cy += y; lx += x * l; ly += y * l; lw += l;
    }
    if (n >= 40) {
      const corr = (n * sdl - sd * sl) / Math.sqrt(Math.max(1e-9, (n * sdd - sd * sd) * (n * sll - sl * sl)));
      const desvio = Math.hypot(lx / lw - cx / n, ly / lw - cy / n) / Math.sqrt(n);
      if (corr > 0.55 && desvio < 0.04) almohada++;
    }
    // bandas: los anillos 0, 1 y 2 desde el borde son cada uno de un solo tono (≥ 80 %) y distintos entre sí
    const anillo = (d: number) => {
      const cuenta = new Map<string, number>();
      let total = 0;
      for (let i = 0; i < dist.length; i++) if (dist[i] === d) {
        const c = col(i % w, (i / w) | 0)!;
        cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
        total++;
      }
      if (total < 24) return null;
      const [c, v] = [...cuenta].sort((a, b) => b[1] - a[1])[0];
      return v / total >= 0.8 ? c : null;
    };
    const a0 = anillo(0);
    const a1 = anillo(1);
    const a2 = anillo(2);
    if (a0 && a1 && a2 && a0 !== a1 && a1 !== a2) bandas++;
  }

  // contorno negro pesado: el borde de la silueta del lado de la luz (celdas pintadas con el papel arriba o a la
  // izquierda) en tinta casi negra. El canto de sombra de abajo a la derecha puede caer al abismo (claroscuro); un
  // contorno «de Paint» rodea también el lado iluminado. Una pieza a sangre (sin celdas vacías: retrato, dorso) no tiene
  // silueta: su orilla es el corte del lienzo y no se mide.
  let borde = 0;
  let negro = 0;
  let aSangre = true;
  for (let y = 0; y < h && aSangre; y++) for (let x = 0; x < w; x++) if (!col(x, y)) { aSangre = false; break; }
  if (!aSangre)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = col(x, y);
        if (!c || !LUZ2.some(([dx, dy]) => !col(x + dx, y + dy))) continue;
        borde++;
        if (casiNegro(c)) negro++;
      }

  // silueta (pintas y caras del naipe): el borde, a 3:1 sobre el papel
  let bordeOk = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = col(x, y);
      if (c && N4.some(([dx, dy]) => !col(x + dx, y + dy)) && contraste(c, SILUETA.papel) >= SILUETA.contraste) bordeOk++;
    }
  const silueta = borde ? bordeOk / borde : 1;

  // paleta: colores distintos y pares casi iguales
  const colores = new Set<string>();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = col(x, y);
    if (c) colores.add(c);
  }
  const lista = [...colores];
  const pares: string[] = [];
  for (let i = 0; i < lista.length; i++)
    for (let j = i + 1; j < lista.length; j++) {
      const [a, b] = [rgb(lista[i]), rgb(lista[j])];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d < 10) pares.push(`${lista[i]}~${lista[j]}`);
    }

  const pintadas = Math.max(1, m.join('').replace(/[. ]/g, '').length);
  if (huerfanos.length) out.push({ regla: 'huérfano', grave: huerfanos.length / pintadas > 0.01, msg: `${huerfanos.length} celdas sueltas sin vecina de su color y casi del mismo brillo (ruido)`, at: huerfanos.slice(0, 12) });
  if (jag.length) out.push({ regla: 'jaggy', grave: jag.length / pintadas > 0.01, msg: `${jag.length} esquinas en L que engordan líneas de un píxel`, at: jag.slice(0, 12) });
  if (almohada) out.push({ regla: 'almohada', grave: true, msg: `sombreado de almohada en ${almohada} masa(s): la luz no tiene dirección` });
  if (bandas) out.push({ regla: 'bandas', grave: true, msg: `bandas concéntricas en ${bandas} masa(s): anillos de un solo tono que siguen la silueta` });
  if (borde && negro / borde > 0.35) out.push({ regla: 'contorno', grave: true, msg: `contorno negro pesado: ${Math.round((100 * negro) / borde)} % del borde de la silueta en tinta casi negra` });
  if ((grupo === 'pintas' || grupo === 'naipes') && silueta < SILUETA.fraccion)
    out.push({ regla: 'silueta', grave: true, msg: `solo el ${Math.round(silueta * 100)} % del borde llega a ${SILUETA.contraste}:1 sobre el papel (mínimo ${Math.round(SILUETA.fraccion * 100)} %)` });
  const tope = TOPE_PALETA[grupo] ?? 24;
  if (colores.size > tope) out.push({ regla: 'paleta', grave: colores.size > tope + 6, msg: `${colores.size} colores (tope ${tope} para «${grupo}»)` });
  if (pares.length) out.push({ regla: 'paleta', grave: true, msg: `colores casi iguales: ${pares.join(' ')}` });
  return out;
}

export interface Informe {
  pieza: Pieza;
  hallazgos: Hallazgo[];
  colores: number;
  /** Parte del borde de la silueta a 3:1 sobre el papel del naipe. */
  silueta: number;
}

/** Parte del borde de la silueta de un mapa que llega a 3:1 sobre el papel del naipe. */
export function siluetaDe(m: readonly string[]): number {
  const h = m.length;
  const w = Math.max(0, ...m.map((r) => r.length));
  const col = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h || m[y][x] === '.' ? null : hex(m[y][x]));
  let borde = 0;
  let ok = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = col(x, y);
      if (!c || !N4.some(([dx, dy]) => !col(x + dx, y + dy))) continue;
      borde++;
      if (contraste(c, SILUETA.papel) >= SILUETA.contraste) ok++;
    }
  return borde ? ok / borde : 1;
}

/** Pasa el linter por todo el catálogo (o por los grupos pedidos). */
export function lintCatalogo(grupos: string[] = []): Informe[] {
  return catalogo()
    .filter((p) => !grupos.length || grupos.includes(p.grupo))
    .map((p) => ({ pieza: p, hallazgos: lintMapa(p.mapa, p.grupo), colores: new Set(p.mapa.join('').replace(/[. ]/g, '')).size, silueta: siluetaDe(p.mapa) }));
}

/** Resumen para la consola; devuelve cuántas piezas tienen un fallo grave. */
export function imprimir(inf: Informe[]): number {
  let graves = 0;
  const porGrupo = new Map<string, Informe[]>();
  for (const i of inf) porGrupo.set(i.pieza.grupo, [...(porGrupo.get(i.pieza.grupo) ?? []), i]);
  for (const [g, lista] of porGrupo) {
    const malas = lista.filter((i) => i.hallazgos.some((x) => x.grave));
    const avisos = lista.filter((i) => i.hallazgos.length && !i.hallazgos.some((x) => x.grave));
    graves += malas.length;
    const sil = lista.map((i) => i.silueta);
    console.log(`lint ${g.padEnd(12)} ${lista.length} piezas · ${malas.length} con fallo · ${avisos.length} con aviso · colores ${Math.min(...lista.map((i) => i.colores))}–${Math.max(...lista.map((i) => i.colores))}${g === 'pintas' || g === 'naipes' ? ` · silueta a 3:1 ${Math.round(Math.min(...sil) * 100)}–${Math.round(Math.max(...sil) * 100)} %` : ''}`);
    for (const i of lista)
      for (const x of i.hallazgos) console.log(`  ${x.grave ? '✗' : '!'} ${g}/${i.pieza.id} · ${x.regla}: ${x.msg}${x.at?.length ? ` (p. ej. ${x.at.slice(0, 4).map(([a, b]) => `${a},${b}`).join(' ')})` : ''}`);
  }
  return graves;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const grupos = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const malas = imprimir(lintCatalogo(grupos));
  console.log(malas ? `${malas} piezas con fallo` : 'Linter limpio.');
  process.exit(malas ? 1 : 0);
}
