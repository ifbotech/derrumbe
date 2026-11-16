// V12 · cifras en notación compacta (SPECS/V12.md 1.8): todo contador que pueda pasar de 999 se pinta corto
// (1,2K · 45K · 1,8M en español; 1.2K · 45K · 1.8M en inglés) con `compacto` de src/shared/compacto.ts,
// y el número entero va en su `aria-label`. La marca `data-cifra` (el número entero) y `data-cifra-k` (qué
// cifra es: oro, golpe, vida…) las lee la regla «compacto» de la QA visual.
import { compacto } from '../shared/compacto';
import { getLang } from '../shared/i18n';

/** La cifra tal como se pinta: corta desde 1.000. */
export const cifra = (n: number): string => compacto(n, getLang());

/**
 * La cifra dentro de su etiqueta, con el número entero para lectores de pantalla cuando se abrevia.
 * `tag` es la etiqueta (b, span…); `attrs`, lo demás que lleve (clase, id).
 */
export function cifraEl(n: number, k: string, tag = 'span', attrs = ''): string {
  const entero = Math.trunc(n);
  const aria = Math.abs(entero) >= 1000 ? ` aria-label="${entero}"` : '';
  return `<${tag}${attrs ? ` ${attrs}` : ''} data-cifra="${entero}" data-cifra-k="${k}"${aria}>${cifra(n)}</${tag}>`;
}

/** Pone una cifra compacta en un elemento ya pintado (contadores que se actualizan solos). */
export function ponCifra(el: Element, n: number, k: string): void {
  el.textContent = cifra(n);
  marcaCifra(el, n, k);
}

/** Solo las marcas (número entero en `aria-label`, `data-cifra`): el texto ya lo puso otro. */
export function marcaCifra(el: Element | null, n: number, k: string): void {
  if (!el) return;
  const entero = Math.trunc(n);
  el.setAttribute('data-cifra', String(entero));
  el.setAttribute('data-cifra-k', k);
  if (Math.abs(entero) >= 1000) el.setAttribute('aria-label', String(entero));
  else el.removeAttribute('aria-label');
}
