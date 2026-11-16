// El Árbol de la Conjura (V12, SPECS/V12.md apartado 1.5): sustituye a La Orden. Treinta nodos y una raíz,
// en cuatro ramas. El Arsenal (13 nodos, poder de combate) lleva las 12 mejoras de La Orden con su mismo `id`,
// sus rangos y su efecto, y una nueva (Ojo del tasador). Las otras tres ramas (la Bolsa, los Huesos y la Corona
// de hierro) no cambian la campaña de cinco asaltos: solo las esquirlas que caen y los dados de hueso, y en el
// Trono infinito, además, Manga honda y Buen ojo (V12-C: en la campaña sumaban ~20 puntos al Árbol lleno y no
// cabían en el presupuesto del Arsenal). Lo comprueba tests/arbol.test.ts.
//
// Puro y sin importar run.ts en tiempo de ejecución (run.ts importa este módulo). Los costes y las cifras
// salen de la sección `arbol` de balance-config.json. Los textos que lee el jugador viven aquí en español
// (`name`, `desc`, `plantilla`) y en src/shared/i18n/en.ts en inglés, con las claves `mejora.<id>.*`.
import { BALANCE, fill } from './balance-config';
import type { Meta } from './run';
import { Arch, TOOL } from './tools';

export type Rama = 'arsenal' | 'bolsa' | 'huesos' | 'corona';

export interface Nodo {
  id: string;
  rama: Rama;
  /** Nodo que hay que tener (al menos un rango) para comprar este; null: cuelga de la raíz. */
  padre: string | null;
  rangos: number;
  /** Esquirlas de cada rango (enteros, crecientes). */
  costs: number[];
  /** Poder de combate en la campaña de cinco asaltos (puede mover el balance que mide el laboratorio). */
  combate: boolean;
  /** Solo actúa en el combate del Trono infinito (Manga honda, Buen ojo): neutral en los cinco asaltos. */
  infinito: boolean;
  /** Emblema con que se dibuja (GLYPH de src/client/glyphs.ts). */
  glyph: string;
  /** Sitio en el pergamino, en unidades de nodo (la raíz en 0,0). */
  pos: { x: number; y: number };
  /** Nombre (español). */
  name: string;
  /** Efecto (español) con la cifra del primer rango: la clave `mejora.<id>.desc`. */
  desc: string;
  /** El efecto con `{campo}`, para rellenar con `cifraDe(id, rango)`; vacío si no tiene cifra que cambie. */
  plantilla: string;
}

/** Cifras por rango (balance-config.json, `arbol.cifras`). */
const C = BALANCE.arbol.cifras;

/** Dos cifras significativas: 1.350 → 1.400, 4.050 → 4.100, 150 → 150. Entero. */
export function dosCifras(n: number): number {
  if (n < 100) return Math.round(n);
  const p = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

/** Costes de un nodo incremental: base × crece^(rango − 1), a dos cifras significativas. */
const incremental = (id: string, rangos: number): number[] => Array.from({ length: rangos }, (_, r) => dosCifras(BALANCE.arbol.bases[id] * BALANCE.arbol.crece ** r));

type Def = Omit<Nodo, 'costs' | 'desc' | 'combate' | 'infinito' | 'plantilla'> & { plantilla?: string; texto?: string; infinito?: true };

/** Los seis arcones: añaden reliquias al surtido de La Taberna. */
const arcon = (arch: Arch, name: string, glyph: string, pos: { x: number; y: number }): Def => ({
  id: `caja_${arch}`,
  rama: 'arsenal',
  padre: 'tienda',
  rangos: 1,
  name,
  glyph,
  pos,
  texto: `Añade al surtido: ${Object.values(TOOL)
    .filter((t) => t.box === arch)
    .map((t) => t.name)
    .join(', ')}.`,
});

const ARSENAL: Def[] = [
  { id: 'caja', rama: 'arsenal', padre: null, rangos: 5, name: 'Bolsa de la conjura', glyph: 'hucha', pos: { x: -1, y: 0 }, plantilla: '+{oro} de oro inicial por rango.' },
  { id: 'vale', rama: 'arsenal', padre: 'caja', rangos: 2, name: 'Favor del Tratante', glyph: 'cinta', pos: { x: -2, y: -1 }, texto: 'Un «Renovar mesa» gratis en cada Taberna, por nivel.' },
  { id: 'tienda', rama: 'arsenal', padre: 'caja', rangos: 2, name: 'Puesto grande', glyph: 'andamio', pos: { x: -2, y: 0 }, texto: '+1 reliquia en oferta en cada Taberna, por nivel.' },
  { id: 'rutas', rama: 'arsenal', padre: 'caja', rangos: 1, name: 'Cartógrafo', glyph: 'plano', pos: { x: -2, y: 1 }, texto: 'Cada asalto sin monarca ofrece 3 rutas con Juramento en vez de 2.' },
  { id: 'tasador', rama: 'arsenal', padre: 'tienda', rangos: 3, name: 'Ojo del tasador', glyph: 'oro', pos: { x: -3, y: -1.5 }, plantilla: 'Las reliquias de La Taberna cuestan {n} de oro menos (mínimo 1).' },
  arcon('precision', 'Arcón de precisión', 'calibre', { x: -3, y: -0.5 }),
  arcon('sismo', 'Arcón del eco', 'diapason', { x: -3, y: 0.5 }),
  arcon('alquimia', 'Arcón de alquimia', 'crisol', { x: -4, y: -1 }),
  arcon('limite', 'Arcón del filo', 'megafono', { x: -4, y: 0 }),
  arcon('trituradora', 'Arcón de cenizas', 'prensa', { x: -4, y: 1 }),
  arcon('aguante', 'Arcón del escudo', 'ariete', { x: -3, y: 1.5 }),
  { id: 'tampones', rama: 'arsenal', padre: null, rangos: 1, name: 'Lacres nuevos', glyph: 'sello', pos: { x: -0.6, y: 1.5 }, texto: 'La Mesa de lacre también ofrece los sellos de pólvora y de la manga.' },
  { id: 'bronce', rama: 'arsenal', padre: 'tampones', rangos: 1, name: 'Cristalero real', glyph: 'forja', pos: { x: -1.3, y: 2.4 }, texto: 'La Mesa de lacre también ofrece Lacre policromo y Cristal maldito.' },
];

const BOLSA: Def[] = [
  { id: 'piedra_iman', rama: 'bolsa', padre: null, rangos: 5, name: 'Piedra imán', glyph: 'herradura', pos: { x: 1, y: -1.2 }, plantilla: 'El imán llega un {pct} % más lejos y recoge {s} s antes.' },
  { id: 'esq_golpe', rama: 'bolsa', padre: null, rangos: 5, name: 'Astillas de corona', glyph: 'corona_rota', pos: { x: 1, y: 0 }, plantilla: '+{n} esquirlas por cada golpe.' },
  { id: 'esq_guardia', rama: 'bolsa', padre: 'esq_golpe', rangos: 5, name: 'Diezmo del guardia', glyph: 'coronas', pos: { x: 2, y: 0 }, plantilla: '+{n} esquirlas por cada guardia abatido.' },
  { id: 'esq_exacto', rama: 'bolsa', padre: 'esq_guardia', rangos: 5, name: 'Corte limpio', glyph: 'rayo', pos: { x: 3, y: 0.5 }, plantilla: '+{n} esquirlas por cada Golpe exacto.' },
  { id: 'esq_monarca', rama: 'bolsa', padre: 'esq_guardia', rangos: 5, name: 'Rescate real', glyph: 'jefe', pos: { x: 3, y: -0.5 }, plantilla: '+{n} esquirlas por cada monarca vencido.' },
  { id: 'esq_derrota', rama: 'bolsa', padre: 'esq_golpe', rangos: 5, name: 'Ceniza del caído', glyph: 'luna', pos: { x: 2, y: -1 }, plantilla: 'Al perder, +{n} esquirlas por cada guardia que abatiste.' },
  { id: 'esq_formacion', rama: 'bolsa', padre: 'esq_golpe', rangos: 5, name: 'Mano llena', glyph: 'abanico', pos: { x: 2, y: 1 }, plantilla: '+{n} esquirlas por cada golpe de 3 cartas o más.' },
  { id: 'esq_racha', rama: 'bolsa', padre: 'esq_exacto', rangos: 5, name: 'Racha de sangre', glyph: 'cometa', pos: { x: 4, y: 0.5 }, plantilla: '+{n} esquirlas por cada eslabón de Racha al golpear.' },
];

const HUESOS: Def[] = [
  { id: 'hueso_tallado', rama: 'huesos', padre: null, rangos: 5, name: 'Hueso tallado', glyph: 'dados', pos: { x: 0.4, y: -1.8 }, plantilla: 'Mejoras de +1 a la cara más baja del Dado de la Corona: {n}.' },
  { id: 'cara_rey', rama: 'huesos', padre: 'hueso_tallado', rangos: 5, name: 'Cara del rey', glyph: 'estandarte', pos: { x: 0.4, y: -2.8 }, plantilla: 'La cara más alta del Dado de la Corona vale ×{n}.' },
  { id: 'segundo_hueso', rama: 'huesos', padre: 'cara_rey', rangos: 1, name: 'Segundo hueso', glyph: 'naipes_par', pos: { x: 0.4, y: -3.8 }, texto: 'Tiras dos Dados de la Corona y sus caras se multiplican.' },
];

const CORONA: Def[] = [
  { id: 'corona_hierro', rama: 'corona', padre: 'esq_monarca', rangos: 5, name: 'Corona de hierro', glyph: 'abismo', pos: { x: 4, y: -1.2 }, plantilla: 'En el Trono infinito, las esquirlas de la mesa valen ×{n}.' },
  { id: 'pendon', rama: 'corona', padre: 'corona_hierro', rangos: 5, name: 'Pendón negro', glyph: 'cajones', pos: { x: 5, y: -1.8 }, plantilla: '+{n} esquirlas por cada Trono infinito que superas.' },
  { id: 'sangre_real', rama: 'corona', padre: 'corona_hierro', rangos: 5, name: 'Sangre real', glyph: 'corazon', pos: { x: 5, y: -0.6 }, plantilla: 'En el Trono infinito, cada cara del Dado de la Corona sube {n}.' },
  { id: 'trono_huesos', rama: 'corona', padre: 'sangre_real', rangos: 1, name: 'Trono de huesos', glyph: 'relicario', pos: { x: 6, y: -0.6 }, texto: 'En el Trono infinito tiras un Dado de la Corona más.' },
  // combate solo en el Trono infinito: costes fijos de `arbol.costes`, como los del Arsenal
  { id: 'manga', rama: 'corona', padre: 'corona_hierro', rangos: 1, name: 'Manga honda', glyph: 'pasarela', pos: { x: 4, y: -2.4 }, texto: 'En el Trono infinito, La Manga guarda 2 cartas en vez de 1.', infinito: true },
  { id: 'gracia', rama: 'corona', padre: 'manga', rangos: 2, name: 'Buen ojo', glyph: 'nivel', pos: { x: 5, y: -3 }, plantilla: 'En el Trono infinito, Golpe exacto también si te pasas por {n} o menos.', infinito: true },
];

/**
 * La cifra de un nodo en un rango (1 en adelante), para rellenar su `plantilla`. Vacío si no tiene cifra.
 *   caja {oro} · tasador {n} · gracia {n} · piedra_iman {pct, s} · esq_* {n} · hueso_tallado {n} (veces) ·
 *   cara_rey {n} (×) · corona_hierro {n} (×) · pendon {n} · sangre_real {n}
 */
export function cifraDe(id: string, rango: number): Record<string, number> {
  const r = Math.max(0, Math.floor(rango));
  switch (id) {
    case 'caja':
      return { oro: BALANCE.arbol.oroPorNivel };
    case 'piedra_iman':
      return { pct: C.piedra_iman * r, s: Math.round(C.piedra_iman_s * r * 100) / 100 };
    case 'cara_rey':
      return { n: C.cara_rey_base + C.cara_rey * r };
    case 'corona_hierro':
      return { n: C.corona_hierro_base + C.corona_hierro * r };
    default:
      return C[id] !== undefined ? { n: C[id] * r } : {};
  }
}

function build(d: Def, combate: boolean): Nodo {
  const fijos = BALANCE.arbol.costes[d.id];
  const costs = fijos ? [...fijos] : incremental(d.id, d.rangos);
  if (costs.length !== d.rangos) throw new Error(`árbol: ${d.id} tiene ${d.rangos} rangos y ${costs.length} costes`);
  const plantilla = d.plantilla ?? '';
  const desc = d.texto ?? fill(plantilla, cifraDe(d.id, 1));
  const { texto: _t, plantilla: _p, infinito, ...rest } = d;
  return { ...rest, costs, combate, infinito: infinito === true, desc, plantilla };
}

/** Los 30 nodos comprables: 13 del Arsenal (combate) y 17 que no cambian la campaña (2 de ellos, combate del Trono infinito). */
export const ARBOL: Nodo[] = [...ARSENAL.map((d) => build(d, true)), ...[...BOLSA, ...HUESOS, ...CORONA].map((d) => build(d, false))];

/** La raíz, «La corona quebrada» (el anexo A decía «La corona rota», que es un título viejo prohibido por tests/vocabulario.test.ts): no se compra, enseña el saldo. */
export const RAIZ = { id: 'raiz', name: 'La corona quebrada', desc: 'Aquí ves tus esquirlas.', glyph: 'corona_rota', pos: { x: 0, y: 0 } } as const;

/** Las cuatro ramas, con su nombre y su línea (anexo A de SPECS/V12.md). Claves `rama.<id>.nombre` / `.desc`. */
export const RAMAS: { id: Rama; name: string; desc: string }[] = [
  { id: 'arsenal', name: 'El Arsenal', desc: 'Mejoras que te ayudan a ganar.' },
  { id: 'bolsa', name: 'La Bolsa', desc: 'Más esquirlas con cada golpe.' },
  { id: 'huesos', name: 'Los Huesos', desc: 'Dados que multiplican tus esquirlas.' },
  { id: 'corona', name: 'La Corona de hierro', desc: 'Más esquirlas y más poder en el Trono infinito.' },
];

const POR_ID: Record<string, Nodo> = Object.fromEntries(ARBOL.map((n) => [n.id, n]));

/** Un nodo por su `id` (undefined si no existe; la raíz no es un nodo comprable). */
export const nodo = (id: string): Nodo | undefined => POR_ID[id];

/** Rango de un nodo en un perfil (o en el `up` de una campaña). */
export const rangoDe = (up: Record<string, number> | undefined, id: string): number => Math.max(0, Math.floor(Number(up?.[id]) || 0));

/** Esquirlas que cuesta el rango siguiente de un nodo; null si está lleno o no existe. */
export function costeDe(meta: Pick<Meta, 'up'>, id: string): number | null {
  const n = POR_ID[id];
  if (!n) return null;
  return n.costs[rangoDe(meta.up, id)] ?? null;
}

/** Por qué no se puede comprar el rango siguiente: null (se puede), 'tope' (lleno o no existe), 'padre' (falta su padre) o 'saldo'. */
export function puedeComprar(meta: Pick<Meta, 'up' | 'renown'>, id: string): null | 'saldo' | 'padre' | 'tope' {
  const cost = costeDe(meta, id);
  if (cost === null) return 'tope';
  const padre = POR_ID[id].padre;
  if (padre && rangoDe(meta.up, padre) < 1) return 'padre';
  if (meta.renown < cost) return 'saldo';
  return null;
}

/** Compra el rango siguiente de un nodo si se puede (gasta sus esquirlas). Devuelve si lo compró. */
export function comprarNodo(meta: Pick<Meta, 'up' | 'renown'>, id: string): boolean {
  if (puedeComprar(meta, id) !== null) return false;
  meta.renown -= costeDe(meta, id)!;
  meta.up[id] = rangoDe(meta.up, id) + 1;
  return true;
}

/** Rangos válidos de cada nodo (lo que llega de un cliente o de un guardado se recorta a su tope). */
export function cleanUp(up: unknown): Record<string, number> {
  const src = (up && typeof up === 'object' ? up : {}) as Record<string, unknown>;
  return Object.fromEntries(ARBOL.map((n) => [n.id, Math.max(0, Math.min(n.rangos, Math.floor(Number(src[n.id]) || 0)))]));
}

/**
 * Todos los nodos al máximo, o solo una parte: 'combate' (el Arsenal), 'incremental' (los que no cambian la
 * campaña, también Manga honda y Buen ojo), 'puro' (los 15 que no cambian ningún combate, ni en el Trono infinito).
 */
export function arbolLleno(cual: 'todo' | 'combate' | 'incremental' | 'puro' = 'todo'): Record<string, number> {
  const entra = (n: Nodo) => cual === 'todo' || (cual === 'combate' ? n.combate : cual === 'incremental' ? !n.combate : !n.combate && !n.infinito);
  return Object.fromEntries(ARBOL.map((n) => [n.id, entra(n) ? n.rangos : 0]));
}

/** El imán de lo que cae (cliente): cuánto más lejos llega (factor, 1 = de serie) y a los cuántos segundos recoge solo. */
export function imanDe(up: Record<string, number> | undefined): { radio: number; espera: number } {
  const c = cifraDe('piedra_iman', rangoDe(up, 'piedra_iman'));
  return { radio: 1 + c.pct / 100, espera: Math.max(0, Math.round((BALANCE.caida.imanSegundos - c.s) * 100) / 100) };
}
