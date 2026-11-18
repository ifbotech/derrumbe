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

/** Una campaña del tramo 1a (`v` = RUN_40) con los 5 Mazos: su baraja pasa a su Mazo y las cargas nacen a cero. Muta y devuelve. */
export function migraRun40<R extends { v: number; deckId?: string; cargas?: unknown }>(run: R, version: number): R {
  run.deckId = mazoDe(run.deckId);
  run.cargas ??= {};
  run.v = version;
  return run;
}
