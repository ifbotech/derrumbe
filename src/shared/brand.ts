// Marca del juego: el único sitio donde se escribe el título. Cliente, servidor,
// scripts y reglamento lo importan de aquí; nadie lo teclea a mano.

/** Título del juego. */
export const TITLE = 'CORONA ROTA';
/** Lema que acompaña al título. */
export const SUBTITLE = 'La conjura de los naipes';
/** Título y lema en una línea: «CORONA ROTA · La conjura de los naipes». */
export const FULL_TITLE = `${TITLE} · ${SUBTITLE}`;
/** Título en minúsculas con mayúscula inicial, para prosa: «Corona rota». */
export const TITLE_PROSE = 'Corona rota';
/** Nombre corto para archivos que se descargan (copias, crónicas, láminas): «corona-rota». */
export const SLUG = 'corona-rota';
/** Una frase que describe el juego (manifest, README, cabeceras). */
export const TAGLINE = 'Roguelike de conjura con baraja francesa';
/**
 * Nombre de archivo para una descarga: `fileName('cronica', 'svg')` → «corona-rota-cronica.svg».
 * `parts` vacíos se descartan; las partes se unen con guion.
 */
export function fileName(base: string, ext: string, ...parts: (string | number | undefined)[]): string {
  const trozos = [SLUG, base, ...parts.map((p) => (p === undefined ? '' : String(p)))].filter((t) => t !== '');
  return `${trozos.join('-')}.${ext.replace(/^\./, '')}`;
}
