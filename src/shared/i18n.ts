// Idioma del juego (V10): un diccionario ligero y con tipos, español por defecto.
//
//   getLang()            el idioma de esta sesión: lo guardado en `derrumbe:idioma`; si no hay nada, el del
//                        navegador (`brandLocale(navigator.language)`); fuera del navegador (pruebas,
//                        scripts, servidor), siempre 'es'.
//   initLang(almacen)    lo llama el cliente al arrancar con su almacén (`platform`, con `load`/`save`):
//                        lee la elección guardada. src/shared no importa nada de src/client.
//   setLang(lang)        cambia al instante, lo guarda y avisa a quien escuche con onLangChange(fn). Sin recargar.
//   t(clave, valores?)   el texto en el idioma actual, con `{campo}` sustituido (cifras con numFor).
//   tFor(lang, …)        lo mismo en un idioma dado.
//   numFor(lang, n)      «1,5» en español, «1.5» en inglés.
//
// Los diccionarios viven en src/shared/i18n/es.ts y en.ts. La prueba de paridad (tests/i18n.test.ts)
// exige las mismas claves en los dos, los mismos `{campo}`, las mismas cifras y ningún resto de español
// en el inglés (RESTOS_ES, con las excepciones de PERMITIDOS_EN; la QA visual usa las mismas).
import { BRAND, brandLocale, type Locale } from './brand';
import { EN } from './i18n/en';
import { ES } from './i18n/es';
import { numFor as numForReglas } from '../rules/balance-config';

export type Lang = Locale;
export const LANGS: readonly Lang[] = ['es', 'en'];
/** Clave de guardado del idioma (valor 'es' o 'en'). */
export const CLAVE_IDIOMA = 'derrumbe:idioma';

/** Los dos diccionarios, por idioma. */
export const DICCIONARIOS: Record<Lang, Record<string, string>> = { es: ES, en: EN };

/** Dónde se guarda la elección: el `platform` del cliente cumple esta forma. */
export interface AlmacenIdioma {
  load(key: string): string | null;
  save(key: string, value: string): void;
}

export const isLang = (x: unknown): x is Lang => x === 'es' || x === 'en';

let almacen: AlmacenIdioma | null = null;
let actual: Lang | null = null;
const oyentes = new Set<(lang: Lang) => void>();

/** El idioma del navegador, solo si de verdad hay uno (con `window` y `document`): Node 21+ también tiene `navigator`. */
function idiomaNavegador(): string | undefined {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined' ? navigator.language : undefined;
}

/** El idioma de partida: lo guardado, si vale; si no, el del navegador; sin navegador, 'es'. Pura. */
export function idiomaInicial(guardado: string | null | undefined, navegador?: string): Lang {
  if (isLang(guardado)) return guardado;
  return brandLocale(navegador);
}

/** Arranque del cliente: recuerda el almacén y lee la elección guardada. Devuelve el idioma resultante. */
export function initLang(store: AlmacenIdioma | null): Lang {
  almacen = store;
  let guardado: string | null = null;
  try {
    guardado = store?.load(CLAVE_IDIOMA) ?? null;
  } catch {
    guardado = null;
  }
  actual = idiomaInicial(guardado, idiomaNavegador());
  return actual;
}

/** El idioma de esta sesión. */
export function getLang(): Lang {
  return actual ?? idiomaInicial(null, idiomaNavegador());
}

/** Cambia de idioma al instante: lo guarda (si hay almacén) y avisa a los oyentes si de verdad cambió. */
export function setLang(lang: Lang): void {
  if (!isLang(lang)) throw new Error(`idioma desconocido: ${String(lang)}`);
  const antes = getLang();
  actual = lang;
  try {
    almacen?.save(CLAVE_IDIOMA, lang);
  } catch {
    // sin almacenamiento (ventana privada): el cambio vale para esta sesión
  }
  if (antes !== lang) for (const fn of [...oyentes]) fn(lang);
}

/** Escucha los cambios de idioma. Devuelve la función que deja de escuchar. */
export function onLangChange(fn: (lang: Lang) => void): () => void {
  oyentes.add(fn);
  return () => void oyentes.delete(fn);
}

/** Un número como lo lee el jugador en ese idioma: coma decimal en español, punto en inglés. */
export const numFor: (lang: Lang, n: number) => string = numForReglas;

/** Sustituye cada `{campo}`; las cifras con `numFor`. Un campo sin valor se deja tal cual (se ve y la prueba lo pilla). */
export function sustituir(lang: Lang, texto: string, valores?: Record<string, number | string>): string {
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = valores[k];
    return v === undefined ? m : typeof v === 'number' ? numFor(lang, v) : v;
  });
}

/** ¿Existe la clave en ese idioma? */
export const hasKey = (lang: Lang, clave: string): boolean => clave in DICCIONARIOS[lang];

/**
 * El texto de una clave en un idioma. Si el idioma no la tiene, cae al español (el texto de los datos);
 * si tampoco existe, devuelve la clave tal cual, para que se vea en la QA.
 */
export function tFor(lang: Lang, clave: string, valores?: Record<string, number | string>): string {
  const texto = DICCIONARIOS[lang][clave] ?? ES[clave] ?? clave;
  return sustituir(lang, texto, valores);
}

/** El texto de una clave en el idioma actual. */
export function t(clave: string, valores?: Record<string, number | string>): string {
  return tFor(getLang(), clave, valores);
}

/** La cara de la marca de ese idioma (ver brand.ts: `brandFor`). */
export const brandOf = (lang: Lang) => BRAND[lang];

// ───────────── restos de español en el inglés ─────────────

/**
 * Lo que delata un texto español: tildes, eñes, «¿», «¡» y palabras sueltas muy españolas. Sin la bandera
 * global, para usarlo con `.test()` sin estado. `restosEs(texto)` devuelve cada resto encontrado.
 */
export const RESTOS_ES = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]|(?<![\p{L}\p{N}])(?:de|del|la|las|el|los|y|con|que|por|para|una|tu|tus|es|en|al|se|lo|su|sus|más|menos|carta|cartas|oro|golpe|trono|tronos|guardia|guardias|vida|escudo|mazo)(?![\p{L}\p{N}])/iu;

/**
 * Nombres propios españoles que pueden ir en un texto inglés sin ser una fuga: la marca de origen (el sello
 * de lacre de la cara inglesa). arte-ui y juice-ux pueden AÑADIR entradas (con el motivo en su bitácora).
 */
export const PERMITIDOS_EN: string[] = [BRAND.es.title];

/** Los restos de español de un texto inglés (vacío si está limpio). Quita antes las etiquetas HTML, los `{campo}` y lo permitido. */
export function restosEs(texto: string): string[] {
  let limpio = texto.replace(/<[^>]*>/g, ' ').replace(/\{\w+\}/g, ' ');
  for (const p of PERMITIDOS_EN) limpio = limpio.split(p).join(' ');
  const re = new RegExp(RESTOS_ES.source, 'giu');
  return [...limpio.matchAll(re)].map((m) => m[0]);
}
