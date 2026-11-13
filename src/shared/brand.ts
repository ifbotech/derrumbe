// Marca del juego: el único sitio donde se escribe el título. Cliente, servidor,
// scripts y reglamento lo importan de aquí; nadie lo teclea a mano.
//
// Desde la 6.1 la marca es dual y conectada: en español se titula SANGRE Y PALO y lleva,
// de sello de lacre, BLOOD & SUITS; en inglés, al revés. Cada cara lleva siempre la otra
// para que cualquier captura enseñe los dos nombres. El resto de la interfaz sigue en
// español (el interruptor ES/EN completo llega en la V10).

export type Locale = 'es' | 'en';

/** Las dos caras de la marca: cada idioma lleva su título y, de sello, el título del otro. */
export const BRAND: Record<Locale, { title: string; seal: string; subtitle: string; tagline: string }> = {
  es: {
    title: 'SANGRE Y PALO',
    seal: 'BLOOD & SUITS',
    subtitle: 'La conjura de los naipes',
    tagline: 'Roguelike de conjura con baraja francesa',
  },
  en: {
    title: 'BLOOD & SUITS',
    seal: 'SANGRE Y PALO',
    subtitle: 'A card conspiracy against the court',
    tagline: 'A conspiracy roguelike with a French deck',
  },
};

/** 'es' si el idioma empieza por «es»; 'en' para cualquier otro. Sin idioma (pruebas, scripts, servidor): 'es'. */
export function brandLocale(lang?: string): Locale {
  if (lang === undefined || lang.trim() === '') return 'es';
  return /^es\b/i.test(lang.trim()) ? 'es' : 'en';
}

// Node 21+ también tiene `navigator.language`: solo cuenta el de un navegador de verdad
// (con `window` y `document`), para que pruebas y scripts salgan siempre en español.
const navegador =
  typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined' ? navigator.language : undefined;

/** El idioma de marca de esta sesión (navigator.language al cargar; 'es' fuera del navegador). */
export const LOCALE: Locale = brandLocale(navegador);

/** Título del juego en el idioma de la sesión: «SANGRE Y PALO» o «BLOOD & SUITS». */
export const TITLE = BRAND[LOCALE].title;
/** El otro nombre, el que va en el sello de lacre junto al título. */
export const SEAL = BRAND[LOCALE].seal;
/** Lema corto que acompaña al título. */
export const SUBTITLE = BRAND[LOCALE].subtitle;

/** Mayúscula inicial en cada palabra salvo «y»: «SANGRE Y PALO» → «Sangre y Palo». */
const prosa = (t: string) =>
  t
    .toLowerCase()
    .split(' ')
    .map((w) => (w === 'y' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

/** Título en prosa: «Sangre y Palo» (o «Blood & Suits»). */
export const TITLE_PROSE = prosa(TITLE);
/** Título y sello en una línea: «SANGRE Y PALO · Blood & Suits». */
export const FULL_TITLE = `${TITLE} · ${prosa(SEAL)}`;
/** Una frase que describe el juego (manifest, README, cabeceras). */
export const TAGLINE = BRAND[LOCALE].tagline;
/** Nombre corto y fijo para archivos que se descargan (copias, crónicas, láminas), en los dos idiomas. */
export const SLUG = 'sangre-y-palo';

/**
 * Nombre de archivo para una descarga: `fileName('cronica', 'svg')` → «sangre-y-palo-cronica.svg».
 * `parts` vacíos se descartan; las partes se unen con guion.
 */
export function fileName(base: string, ext: string, ...parts: (string | number | undefined)[]): string {
  const trozos = [SLUG, base, ...parts.map((p) => (p === undefined ? '' : String(p)))].filter((t) => t !== '');
  return `${trozos.join('-')}.${ext.replace(/^\./, '')}`;
}
