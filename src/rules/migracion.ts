// Lo que llega guardado de la 10.0 (campaña de ocho asaltos) y cómo se lee en la V11 (cinco). Puro: sin
// almacenamiento ni DOM. Lo llaman `loadMeta` (run.ts), `retireOldSave` (src/client/campaign.ts) y el
// archivo de crónicas (src/client/guild.ts). Regla (SPECS/V11.md, apartado 1.9): se conserva todo el
// progreso; la campaña a medias se cierra y cobra lo superado; lo que contaba asaltos se recorta a cinco.
//
// No importa run.ts en tiempo de ejecución (run.ts importa este módulo): el número de asaltos de ahora
// llega como argumento.
import type { Meta } from './run';
import { MAZO_INICIAL, esMazo } from './mazos';
import type { MazoId } from './mazos';

/** Asaltos de una campaña de la 10.0. */
export const ASALTOS_10 = 8;

/** Coronas que cobra una campaña a medias de la 10.0 al cerrarse: las de lo superado (1 como mínimo, 8 como máximo). */
export function abonoCampanaVieja(stage: unknown): number {
  const n = Math.floor(Number(stage) || 1);
  return Math.max(1, Math.min(ASALTOS_10, n - 1));
}

/** Una Meta de la 10.0 en la V11: la mejor marca y el alcance no pasan de `ultimo` asaltos. Muta y devuelve. */
export function recortaMeta10<M extends Pick<Meta, 'best' | 'stats'>>(meta: M, ultimo: number): M {
  meta.best = Math.min(meta.best, ultimo);
  meta.stats.reach = Math.min(meta.stats.reach, ultimo);
  return meta;
}

/** Lo que el archivo enseña de dónde terminó una campaña: asalto n de `total`, y si la sala se nombra. */
export interface DondeActa {
  n: number;
  total: number;
  /** false en un acta de la 10.0: sus salas ya no existen. */
  sala: boolean;
}

/**
 * Dónde terminó la campaña de un acta. Las actas de la V11 guardan `de` (los asaltos de su campaña); un acta
 * sin `de` es de la 10.0: «asalto n de 8», sin nombre de sala.
 */
export function dondeActa(acta: { stage: number; de?: number }, ultimo: number): DondeActa {
  const vieja = !(Number(acta.de) > 0);
  const total = vieja ? ASALTOS_10 : Math.floor(Number(acta.de));
  const stage = Math.max(1, Math.floor(Number(acta.stage) || 1));
  return { n: Math.min(stage, total), total, sala: !vieja && total === ultimo };
}

// ───────────────────────── V12: de La Orden al Árbol de la Conjura ─────────────────────────
// SPECS/V12.md, apartado 1.11. Una sola moneda permanente: las Esquirlas de Corona (en el campo de siempre,
// `meta.renown`). Cada Corona de la 11.0 vale 100 esquirlas; las mejoras de La Orden siguen dentro del Arsenal
// con el mismo `id` y ninguna pierde rangos (el tope de la Bolsa sube de 2 a 5). La campaña a medias de la
// 11.0 se sigue jugando: los campos nuevos nacen a cero.

/** Esquirlas de Corona por cada Corona de la 11.0 (también lo que paga cada Corona de `renownFor` y de los logros). */
export const ESQUIRLAS_POR_CORONA = 100;
/** Versión de Meta de la 11.0 y de campaña guardada de la 11.0. */
export const META_11 = 3;
export const RUN_11 = 4;

/** El aviso que el Árbol enseña una vez tras migrar («Tus 37 Coronas son ahora 3.700 Esquirlas de Corona…»). */
export interface AvisoArbol {
  id: 'arbol-v12';
  coronas: number;
  esquirlas: number;
  rangos: number;
}

/** Coronas que costaba cada rango de La Orden en la 11.0: si un nodo tuviera menos rangos, se devuelve lo gastado. */
export const COSTES_ORDEN_11: Record<string, number[]> = {
  caja_precision: [4],
  caja_sismo: [4],
  caja_alquimia: [4],
  caja_limite: [4],
  caja_trituradora: [4],
  caja_aguante: [4],
  tampones: [5],
  bronce: [6],
  vale: [4, 8],
  tienda: [8, 12],
  caja: [3, 6],
  rutas: [6],
};

/**
 * Una Meta de la 11.0 (v 3, o una anterior ya pasada por sus migraciones) en la V12: Coronas × 100; cada
 * rango se conserva hasta el tope de su nodo (`topes`: rangos por `id`), y lo que pase del tope se devuelve
 * en esquirlas; deja `aviso` si había algo que contar. Muta y devuelve.
 */
export function migraMeta11<M extends Pick<Meta, 'renown' | 'up'> & { aviso?: AvisoArbol }>(meta: M, topes: Record<string, number>): M {
  const coronas = Math.max(0, Math.floor(Number(meta.renown) || 0));
  meta.renown = coronas * ESQUIRLAS_POR_CORONA;
  let rangos = 0;
  for (const [id, raw] of Object.entries(meta.up)) {
    const level = Math.max(0, Math.floor(Number(raw) || 0));
    const tope = topes[id] ?? 0;
    const keep = Math.min(level, tope);
    for (let i = keep; i < level; i++) meta.renown += (COSTES_ORDEN_11[id]?.[i] ?? 0) * ESQUIRLAS_POR_CORONA;
    if (keep > 0) meta.up[id] = keep;
    else delete meta.up[id];
    rangos += keep;
  }
  if (coronas > 0 || rangos > 0) meta.aviso = { id: 'arbol-v12', coronas, esquirlas: meta.renown, rangos };
  return meta;
}

// ───────────────────────── V40: de la baraja francesa a la española ─────────────────────────
// SPECS/V40-REFUNDACION.md, apartado 9. Las cartas pasan a 1 a 9 y las figuras a 10, 11 y 12: una campaña a medias
// de antes no se puede seguir y se descarta con un aviso corto. El perfil sigue entero (Altar, logros, Colección y
// maestría); solo se va el Asalto diario. Los ajustes viven en sus propias claves y no se tocan.

/** Versión de Meta de la 12.0 a la 38.0 (la última con Asalto diario). */
export const META_38 = 4;
/** La última versión de campaña guardada de la baraja francesa (de la 12.0 a la 38.0). */
export const RUN_38 = 5;

/** Una Meta de la 38.0 (o anterior, ya pasada por sus migraciones) en la V40: sin Asalto diario. Muta y devuelve. */
export function migraMeta38<M extends object>(meta: M): M {
  const m = meta as M & { daily?: unknown; stats?: Record<string, unknown> };
  delete m.daily;
  if (m.stats) delete m.stats.dailies;
  return meta;
}

/**
 * ¿Es una campaña guardada de la baraja francesa (de antes de la V40)? Lo es cualquier campaña con número de versión
 * por debajo de `version` (la primera de la baraja española: `RUN_40`). Sin versión o sin forma de campaña, no se
 * reconoce: false.
 */
export function campanaFrancesa(raw: unknown, version: number): boolean {
  const v = (raw as { v?: unknown } | null)?.v;
  return typeof v === 'number' && Number.isFinite(v) && v < version;
}

/**
 * Esquirlas que se abonan al descartar una campaña francesa a medias: las que ya había juntado y aún no se habían
 * cobrado (las de `run.esquirlas`). Una campaña ya cerrada (ganada o perdida) ya cobró: 0.
 */
export function abonoFrancesa(raw: unknown): number {
  const r = raw as { phase?: unknown; esquirlas?: unknown } | null;
  if (!r || r.phase === 'won' || r.phase === 'lost') return 0;
  return Math.max(0, Math.floor(Number(r.esquirlas) || 0));
}

/**
 * Una campaña guardada de la 11.0 (`v` = RUN_11) puesta al día: esquirlas, gotas y lo que cayó a cero, sin
 * tirada, sin esquirlas de corte y con los contadores nuevos a cero. Muta y devuelve; `v` pasa a `version`.
 */
export function migraRun11<R extends { v: number; stats: object }>(run: R, version: number): R {
  const r = run as R & { esquirlas?: number; gotas?: number; caida?: unknown; ritual?: unknown; esquirlasCorte?: number; stats: Record<string, unknown> };
  r.esquirlas ??= 0;
  r.gotas ??= 0;
  r.caida ??= { oro: 0, esquirlas: 0, gotas: 0 };
  r.ritual ??= null;
  r.esquirlasCorte ??= 0;
  r.stats.esquirlas ??= 0;
  r.stats.gotas ??= 0;
  r.stats.sellosGratis ??= 0;
  r.v = version;
  return run;
}

// ───────────────────────── V40 (tramo 1b): de las barajas de inicio a los 5 Mazos ─────────────────────────
// Las seis barajas de inicio (Conjura, Negra, Prestamista, Ases, Corta, Caos) pasan a los 5 Mazos. Cada baraja va al
// Mazo que se desbloquea con su mismo logro; la del Caos (su logro ya no desbloquea nada) va a la Escoba, la inicial.
// Lo que guardaba ids de baraja (la maestría del perfil, la preferida, la campaña en curso, las actas y el registro
// de partidas) se lee con `mazoDe`.

/** Versión de Meta y de campaña guardada del tramo 1a de la V40 (baraja española, aún con las barajas viejas). */
export const META_40 = 5;
export const RUN_40 = 6;
/** Cada baraja de inicio vieja y el Mazo que la sustituye. */
export const MAZO_DE_BARAJA: Record<string, MazoId> = { obra: 'escoba', acero: 'truco', prestamista: 'chinchon', ases: 'mentiroso', corta: 'chancho', caos: 'escoba' };
/** El Mazo de un id guardado: el mismo si ya es un Mazo, el que sustituye a una baraja vieja, o el inicial. */
export const mazoDe = (id: unknown): MazoId => (esMazo(id) ? id : typeof id === 'string' && MAZO_DE_BARAJA[id] ? MAZO_DE_BARAJA[id] : MAZO_INICIAL);

/** Una Meta del tramo 1a (o anterior) con los 5 Mazos: la maestría de cada baraja pasa a su Mazo (la más alta). Muta y devuelve. */
export function migraMeta40<M extends { mastery?: { decks?: Record<string, number> } }>(meta: M): M {
  const decks = meta.mastery?.decks;
  if (!decks) return meta;
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(decks)) {
    const level = Math.max(0, Math.floor(Number(n) || 0));
    const m = mazoDe(id);
    out[m] = Math.max(out[m] ?? 0, level);
  }
  meta.mastery!.decks = out;
  return meta;
}

// ───────────────────────── V40 (tramo 1c): de los siete monarcas a los 4 Reyes ─────────────────────────
// Los siete monarcas sueltos se van y los Reyes ocupan su sitio: cada trofeo (`j-<monarca>`) y cada monarca visto en
// la Colección pasan al Rey de su palo (el mismo reparto que `MONARCAS_VIEJOS` de run.ts, que se pasa como argumento:
// este módulo no importa run.ts). Las campañas de los tramos 1a y 1b (con rasgos y monarcas viejos) no se siguen.

/** Versión de Meta y de campaña guardada del tramo 1b de la V40 (los 5 Mazos, aún con rasgos y monarcas viejos). */
export const META_40B = 6;
export const RUN_40B = 7;

/** ¿Es una campaña de los tramos 1a o 1b de la V40 (baraja española, con rasgos y monarcas viejos)? */
export function campanaSinReyes(raw: unknown): boolean {
  const v = (raw as { v?: unknown } | null)?.v;
  return v === RUN_40 || v === RUN_40B;
}

/**
 * Una Meta del tramo 1b (o anterior) con los 4 Reyes: el trofeo de cada monarca viejo pasa al de su Rey, y los
 * monarcas vistos, a sus Reyes. Las cartas legendarias guardan su `id` (solo cambia el logro que las abre). Muta y devuelve.
 */
export function migraMeta40c<M extends { ach?: Record<string, boolean>; seen?: { bosses?: string[] } }>(meta: M, viejos: Record<string, string>): M {
  if (meta.ach)
    for (const [id, rey] of Object.entries(viejos))
      if (meta.ach[`j-${id}`]) {
        meta.ach[`j-${rey}`] = true;
        delete meta.ach[`j-${id}`];
      }
  if (meta.seen?.bosses) meta.seen.bosses = [...new Set(meta.seen.bosses.map((b) => viejos[b] ?? b))];
  return meta;
}

/** Una campaña del tramo 1a (`v` = RUN_40) con los 5 Mazos: su baraja pasa a su Mazo y las cargas nacen a cero. Muta y devuelve. */
export function migraRun40<R extends { v: number; deckId?: string; cargas?: unknown }>(run: R, version: number): R {
  run.deckId = mazoDe(run.deckId);
  run.cargas ??= {};
  run.v = version;
  return run;
}

// ───────────────────────── V40 (tramo 1d): de las Reliquias a los Amuletos ─────────────────────────
// Las 52 Reliquias pasan a 22 Amuletos en cuatro familias (una por Rey) y las 25 especiales a 8 Trampas del Bufón. Los
// Amuletos y las Trampas reusan el `id` de la pieza de antes con la misma mecánica: lo que la Colección y la maestría
// guardaban de esos `id` sigue valiendo; el resto se va (no hay equivalente). Los seis arcones del Altar (uno por
// arquetipo) pasan a cuatro (uno por Rey): los rangos de los viejos se devuelven en esquirlas. Las campañas del tramo
// 1c (con Reliquias) no se siguen: se cierran y se abonan las esquirlas juntadas, como en la 1c.

/** Versión de Meta y de campaña guardada del tramo 1c de la V40 (los 4 Reyes, aún con Reliquias). */
export const META_40C = 7;
export const RUN_40C = 8;
/** Los seis arcones de arquetipo del Altar hasta el tramo 1c y lo que costaba cada uno (esquirlas). */
export const ARCONES_40C: Record<string, number> = { caja_precision: 400, caja_sismo: 400, caja_alquimia: 400, caja_limite: 400, caja_trituradora: 400, caja_aguante: 400 };

/** ¿Es una campaña del tramo 1c de la V40 (con Reliquias)? */
export function campanaConReliquias(raw: unknown): boolean {
  return (raw as { v?: unknown } | null)?.v === RUN_40C;
}

/** El aviso que el Altar enseña una vez tras migrar: cuántos arcones viejos se devolvieron y cuántas esquirlas. */
export interface AvisoAmuletos {
  id: 'amuletos-v40';
  arcones: number;
  esquirlas: number;
}

/**
 * Una Meta del tramo 1c (o anterior) con los Amuletos: la Colección y la maestría guardan solo los `id` que siguen
 * (`amuletos`, `trampas`: los que existen ahora) y los arcones viejos se devuelven en esquirlas. Muta y devuelve.
 */
export function migraMeta40d<M extends { renown: number; up: Record<string, number>; seen?: { tools?: string[]; specials?: string[] }; mastery?: { tools?: Record<string, number> }; avisoAmuletos?: AvisoAmuletos }>(
  meta: M,
  amuletos: (id: string) => boolean,
  trampas: (id: string) => boolean,
): M {
  if (meta.seen?.tools) meta.seen.tools = meta.seen.tools.filter(amuletos);
  if (meta.seen?.specials) meta.seen.specials = meta.seen.specials.filter(trampas);
  if (meta.mastery?.tools) meta.mastery.tools = Object.fromEntries(Object.entries(meta.mastery.tools).filter(([id]) => amuletos(id)));
  let arcones = 0;
  let esquirlas = 0;
  for (const [id, coste] of Object.entries(ARCONES_40C)) {
    if (Math.floor(Number(meta.up[id]) || 0) > 0) {
      arcones++;
      esquirlas += coste;
    }
    delete meta.up[id];
  }
  if (arcones) {
    meta.renown = Math.max(0, Math.floor(Number(meta.renown) || 0)) + esquirlas;
    meta.avisoAmuletos = { id: 'amuletos-v40', arcones, esquirlas };
  }
  return meta;
}

// ───────────── V40 tramo 1e · el Mapa de caminos ─────────────
// La campaña ya no es una fila de asaltos con Juramentos y Atajos: cada tramo es un Mapa de caminos con Guardias
// Bravos, Santuarios del Bufón, Fogones y La Pulpería, y el Botín se cobra por partes. Una campaña del tramo 1d (sin
// Mapa) no se sigue: se cierra y se abonan las esquirlas juntadas, como en la 1c y la 1d.

/** Versión de campaña guardada del tramo 1d de la V40 (los Amuletos, aún sin Mapa de caminos). */
export const RUN_40D = 9;

/** ¿Es una campaña del tramo 1d de la V40 (sin Mapa de caminos)? */
export function campanaSinMapa(raw: unknown): boolean {
  const r = raw as { v?: unknown; mapa?: unknown } | null;
  return r?.v === RUN_40D || (r?.v === RUN_40D + 1 && !r?.mapa);
}
