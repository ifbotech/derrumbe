// V12 · cifras en notación compacta (SPECS/V12.md 1.8): todo contador que pueda pasar de 999 se pinta corto
// (1,2K · 45K · 1,8M en español; 1.2K · 45K · 1.8M en inglés) con `compacto` de src/shared/compacto.ts,
// y el número entero va en su `aria-label`. La marca `data-cifra` (el número entero) y `data-cifra-k` (qué
// cifra es: oro, golpe, vida…) las lee la regla «compacto» de la QA visual.
import { compacto } from '../shared/compacto';
import { getLang } from '../shared/i18n';

/** La cifra tal como se pinta: corta desde 1.000. */
export const cifra = (n: number): string => compacto(n, getLang());

/**
 * V18 · la cuenta que cuadra: el Golpe, el Daño, el aviso del trono y la pólvora se pintan con todas sus cifras
 * mientras sean menores que 100.000 («148 × 7 = 1.036», no «1K»). De ahí en adelante, y en todo lo demás
 * (bolsa, Árbol, Vida de los guardias, récords), la notación compacta de la V12.
 */
const EXACTAS = new Set(['golpe', 'dano', 'aviso', 'polvora']);
const TOPE_EXACTA = 100_000;
const entera = (n: number): string => {
  const e = Math.trunc(n);
  const cuerpo = String(Math.abs(e)).replace(/\B(?=(\d{3})+(?!\d))/g, getLang() === 'en' ? ',' : '.');
  return `${e < 0 ? '−' : ''}${cuerpo}`;
};
/** La cifra `n` de la clase `k` tal como se pinta. */
export const cifraDe = (n: number, k: string): string => (EXACTAS.has(k) && Math.abs(n) < TOPE_EXACTA ? entera(n) : cifra(n));

/**
 * La cifra dentro de su etiqueta, con el número entero para lectores de pantalla cuando se abrevia.
 * `tag` es la etiqueta (b, span…); `attrs`, lo demás que lleve (clase, id).
 */
export function cifraEl(n: number, k: string, tag = 'span', attrs = ''): string {
  const entero = Math.trunc(n);
  const texto = cifraDe(n, k);
  const aria = /[KMBT]$/.test(texto) ? ` aria-label="${entero}"` : '';
  return `<${tag}${attrs ? ` ${attrs}` : ''} data-cifra="${entero}" data-cifra-k="${k}"${aria}>${texto}</${tag}>`;
}

/** Pone una cifra compacta en un elemento ya pintado (contadores que se actualizan solos). */
export function ponCifra(el: Element, n: number, k: string): void {
  el.textContent = cifraDe(n, k);
  marcaCifra(el, n, k);
}

/** Solo las marcas (número entero en `aria-label`, `data-cifra`): el texto ya lo puso otro. */
export function marcaCifra(el: Element | null, n: number, k: string): void {
  if (!el) return;
  const entero = Math.trunc(n);
  el.setAttribute('data-cifra', String(entero));
  el.setAttribute('data-cifra-k', k);
  if (/[KMBT]$/.test(cifraDe(n, k))) el.setAttribute('aria-label', String(entero));
  else el.removeAttribute('aria-label');
}
