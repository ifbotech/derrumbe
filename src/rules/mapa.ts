// V40 1e · El Mapa de caminos: el tramo entre dos asaltos es un grafo de caminos que se bifurcan y se eligen (inspirado
// en los mapas de los roguelikes de cartas; todo lo nuestro es original). Puro y determinista: sale de la semilla de la
// campaña con un azar propio (no toca `run.rng`), se guarda tal cual (es JSON) y se repite con la misma semilla.
//
// Forma (tramo t = el camino que lleva al asalto t):
//
//   tramo 1:  [asalto 1]                                   el primer asalto enseña: se entra directo
//   tramo t:  fila A  ·  3 nodos (uno por columna)         3 de {Guardia Bravo, Santuario, Fogón, Pulpería}
//             fila B  ·  3 nodos; el del centro, siempre   La Pulpería (al alcance desde cualquier nodo de la fila A)
//             asalto t (columna del centro)                Guardia, o el Rey en los asaltos de jefe (2, 4 y 5)
//
// Aristas: el asalto anterior lleva a los tres de la fila A; A0 → B0 y B1; A2 → B1 y B2; A1 → B1 y uno de los lados (al
// azar); los tres de la fila B llevan al asalto. Así cada tramo tiene seis caminos, todos llegan al asalto y todos
// pueden pasar por la Pulpería de la fila B: siempre hay una Pulpería al alcance cuando toca gastar (tramos 2 a 5).
// Cada tramo tiene al menos un Guardia Bravo. En el Trono infinito cada tramo nuevo se agrega igual (`agregaTramo`).
import type { Suit } from './engine';
import { SUITS } from './engine';

/** Los tipos de nodo. `guardia` y `rey` son los asaltos (el combate obligatorio de cada tramo). */
export type TipoNodo = 'guardia' | 'bravo' | 'pulperia' | 'santuario' | 'fogon' | 'rey';
export const TIPOS_NODO: TipoNodo[] = ['guardia', 'bravo', 'pulperia', 'santuario', 'fogon', 'rey'];
/** Los nodos de combate. */
export const COMBATE: TipoNodo[] = ['guardia', 'bravo', 'rey'];

export interface NodoMapa {
  id: number;
  tipo: TipoNodo;
  /** El asalto al que lleva este tramo (1 a 5; más en el Trono infinito). */
  tramo: number;
  /** Fila (0 abajo, la del asalto 1) y columna (0 a 2) para dibujarlo. */
  fila: number;
  col: number;
  /** Los nodos a los que se puede ir desde este. */
  hacia: number[];
  /** Es el asalto del tramo (Guardia o Rey). */
  asalto?: true;
  /** Guardia Bravo: el palo de su Casa (sale al generar el mapa, para enseñarlo antes de elegir). */
  palo?: Suit;
}

export interface Mapa {
  nodos: NodoMapa[];
  /** El nodo donde se está (-1 antes de entrar al primero). */
  en: number;
  /** Los nodos ya recorridos, en orden. */
  hechos: number[];
}

/** Columnas del mapa y la del centro (la de los asaltos y de la Pulpería de la fila B). */
export const COLUMNAS = 3;
export const CENTRO = 1;

/** Azar propio de un tramo: sale de la semilla y del tramo, nada más (el mapa no depende de lo que se juegue). */
function azarTramo(semilla: number, tramo: number): (n: number) => number {
  let s = ((semilla | 0) ^ Math.imul(tramo + 1, 0x51ed27)) >>> 0;
  return (n: number) => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0;
    s = (Math.imul(s ^ (s >>> 13), 3266489909) ^ (s >>> 16)) >>> 0;
    return s % n;
  };
}
function baraja<T>(xs: T[], azar: (n: number) => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = azar(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** La fila del asalto t: 0 para el primero, y tres filas por tramo después. */
export const filaAsalto = (t: number): number => (t <= 1 ? 0 : 3 * (t - 1));

/**
 * Agrega al mapa el tramo t (sus filas A y B y su asalto). `jefe`: el asalto lo cierra un Rey. Muta y devuelve el nodo
 * del asalto. El tramo 1 es solo su asalto.
 */
export function agregaTramo(m: Mapa, semilla: number, t: number, jefe: boolean): NodoMapa {
  const azar = azarTramo(semilla, t);
  const nuevo = (tipo: TipoNodo, fila: number, col: number): NodoMapa => {
    const n: NodoMapa = { id: m.nodos.length, tipo, tramo: t, fila, col, hacia: [] };
    if (tipo === 'bravo') n.palo = SUITS[azar(SUITS.length)];
    m.nodos.push(n);
    return n;
  };
  const tipoAsalto: TipoNodo = jefe ? 'rey' : 'guardia';
  if (t <= 1) {
    const a = nuevo(tipoAsalto, 0, CENTRO);
    a.asalto = true;
    return a;
  }
  const previo = m.nodos.find((n) => n.asalto && n.tramo === t - 1);
  const base = filaAsalto(t - 1) + 1;
  // fila A: tres de los cuatro (Bravo, Santuario, Fogón, Pulpería); fila B: la Pulpería al centro y dos lados
  const filaA = baraja(baraja<TipoNodo>(['bravo', 'santuario', 'fogon', 'pulperia'], azar).slice(0, 3), azar);
  const lados = baraja<TipoNodo>(['bravo', 'fogon', 'santuario'], azar).slice(0, 2);
  // al menos un Guardia Bravo en el tramo
  if (!filaA.includes('bravo') && !lados.includes('bravo')) lados[azar(2)] = 'bravo';
  const A = filaA.map((tipo, col) => nuevo(tipo, base, col));
  const B = [nuevo(lados[0], base + 1, 0), nuevo('pulperia', base + 1, CENTRO), nuevo(lados[1], base + 1, 2)];
  const asalto = nuevo(tipoAsalto, base + 2, CENTRO);
  asalto.asalto = true;
  if (previo) previo.hacia = A.map((n) => n.id);
  A[0].hacia = [B[0].id, B[1].id];
  A[1].hacia = [B[1].id, B[azar(2) ? 2 : 0].id].sort((a, b) => a - b);
  A[2].hacia = [B[1].id, B[2].id];
  for (const b of B) b.hacia = [asalto.id];
  return asalto;
}

/** El mapa de una campaña: los tramos 1 a `asaltos`, con los Reyes jefe donde diga `jefe(t)`. */
export function generaMapa(semilla: number, asaltos: number, jefe: (t: number) => boolean): Mapa {
  const m: Mapa = { nodos: [], en: -1, hechos: [] };
  for (let t = 1; t <= asaltos; t++) agregaTramo(m, semilla, t, jefe(t));
  return m;
}

/** Los nodos a los que se puede ir ahora: los de la fila 0 al empezar, y luego los que salen del nodo actual. */
export function alcanzables(m: Mapa): number[] {
  if (m.en < 0) return m.nodos.filter((n) => n.fila === 0).map((n) => n.id);
  return [...(m.nodos[m.en]?.hacia ?? [])];
}

/** El asalto de un tramo (null si el mapa no lo tiene). */
export const asaltoDe = (m: Mapa, t: number): NodoMapa | null => m.nodos.find((n) => n.asalto && n.tramo === t) ?? null;

/** Todos los caminos (listas de ids) que van de `desde` (sin incluirlo; -1: el comienzo) hasta el nodo `hasta` (incluido). */
export function caminos(m: Mapa, desde: number, hasta: number): number[][] {
  const out: number[][] = [];
  const sigue = (id: number, camino: number[]) => {
    if (id === hasta) return void out.push(camino);
    const n = m.nodos[id];
    if (!n || n.fila >= (m.nodos[hasta]?.fila ?? -1)) return;
    for (const h of n.hacia) sigue(h, [...camino, h]);
  };
  const inicio = desde < 0 ? m.nodos.filter((n) => n.fila === 0).map((n) => n.id) : (m.nodos[desde]?.hacia ?? []);
  for (const id of inicio) sigue(id, [id]);
  return out;
}

/** Los nodos a los que se puede llegar desde `desde` (sin incluirlo), en cualquier número de pasos. */
export function alcanceDe(m: Mapa, desde: number): Set<number> {
  const vistos = new Set<number>();
  const pila = desde < 0 ? m.nodos.filter((n) => n.fila === 0).map((n) => n.id) : [...(m.nodos[desde]?.hacia ?? [])];
  while (pila.length) {
    const id = pila.pop()!;
    if (vistos.has(id)) continue;
    vistos.add(id);
    pila.push(...(m.nodos[id]?.hacia ?? []));
  }
  return vistos;
}
