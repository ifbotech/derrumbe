// Idioma en el cliente (V10). Arranca el idioma con el guardado del `platform`, pone `lang` en <html>
// y da a las pantallas dos cosas:
//   · `L(clave, valores?)`: un texto de pantalla (`ui.*`, src/shared/i18n/ui-arte.ts), con la clave tipada;
//   · accesos a los textos de reglas en el idioma actual (`relN`, `espD`, `paloN`…), que en español
//     devuelven letra por letra lo que dicen los datos de src/rules.
// El repintado al cambiar de idioma lo hace router.ts (`onLangChange`).
import { getLang, initLang, numFor, t, type Lang } from '../shared/i18n';
import type { ClaveUi } from '../shared/i18n/es';
import { brandFor } from '../shared/brand';
import { CABALLO, RANK_LABEL, REY, SOTA, cardLabel, type Card, type Formation, type Suit } from '../rules/engine';
import { LAST_STAGE, tiranoKey } from '../rules/run';
import { platform } from './platform';

initLang(platform);
document.documentElement.lang = getLang();

export { getLang };
export type { Lang };

type Valores = Record<string, number | string>;

/** Un texto de pantalla en el idioma actual. */
export const L = (clave: ClaveUi, valores?: Valores): string => t(clave, valores);
/** Singular o plural según `n` (que también va como `{n}`). */
export const Ln = (n: number, uno: ClaveUi, varios: ClaveUi, valores: Valores = {}): string => t(n === 1 ? uno : varios, { n, ...valores });
/** Una cifra como la lee el jugador: «1,5» en español, «1.5» en inglés. */
export const numL = (n: number): string => numFor(getLang(), n);
/** La cara de la marca del idioma actual. */
export const marca = () => brandFor(getLang());
/** ¿Estamos en inglés? */
export const enIngles = () => getLang() === 'en';

// ───────────── textos de reglas, por su clave estable ─────────────

export const relN = (id: string) => t(`reliquia.${id}.nombre`);
export const relD = (id: string) => t(`reliquia.${id}.desc`);
export const rarN = (r: string) => t(`rareza.${r}`);
export const archN = (a: string) => t(`arquetipo.${a}`);
export const espN = (id: string) => t(`especial.${id}.nombre`);
export const espD = (id: string) => t(`especial.${id}.desc`);
/** Quién es el monarca: «El Usurero». */
export const monN = (id: string) => t(`monarca.${id}.nombre`);
/** Su decreto: «Escasez». */
export const monDec = (id: string) => t(`monarca.${id}.decreto`);
export const monD = (id: string) => t(`monarca.${id}.desc`);
export const monBadge = (id: string) => t(`monarca.${id}.badge`);
/** Nombre del asalto `n` (más allá del último, el Trono infinito con su profundidad). */
/** V11: el título del monarca del Salón del Trono, según su género («Rey Tirano» / «Reina Tirana»). */
export const tiranoN = (bossId: string | null) => t(bossId ? tiranoKey(bossId) : 'asalto.tirano.m');
export const asaltoN = (n: number) => (n <= LAST_STAGE ? t(`asalto.${n}.nombre`) : t('asalto.infinito.nombre', { n: n - LAST_STAGE }));
/** Reinado por su índice (0 = el primero). */
export const reinN = (i: number) => t(`reinado.${i + 1}.nombre`);
export const reinD = (i: number) => t(`reinado.${i + 1}.desc`);
export const barN = (id: string) => t(`baraja.${id}.nombre`);
export const barD = (id: string) => t(`baraja.${id}.desc`);
/** V40 · el lema de un Mazo («Mesa barrida»). */
export const barL = (id: string) => t(`baraja.${id}.lema`);
export const secN = (id: string) => t(`secreto.${id}.nombre`);
export const secT = (id: string) => t(`secreto.${id}.texto`);
/** Una opción de un secreto: `campo` = etiqueta, desc, gana o cuesta. */
export const secO = (id: string, i: number, campo: 'etiqueta' | 'desc' | 'gana' | 'cuesta') => t(`secreto.${id}.${i}.${campo}`);
export const mejN = (id: string) => t(`mejora.${id}.nombre`);
export const mejD = (id: string) => t(`mejora.${id}.desc`);
export const logN = (id: string) => t(`logro.${id}.nombre`);
export const logD = (id: string) => t(`logro.${id}.desc`);
export const logDes = (id: string) => t(`logro.${id}.desbloquea`);
export const palabraN = (id: string) => t(`palabra.${id}.nombre`);
export const palabraD = (id: string) => t(`palabra.${id}.desc`);
export const formN = (f: Formation) => t(`formacion.${f}`);
export const selloN = (id: string) => t(`sello.${id}.nombre`);
export const selloD = (id: string) => t(`sello.${id}.desc`);
export const acabN = (id: string) => t(`acabado.${id}.nombre`);
export const acabD = (id: string) => t(`acabado.${id}.desc`);
export const fxN = (id: string) => t(`estado.${id}.nombre`);
export const fxD = (id: string) => t(`estado.${id}.desc`);
/** El palo en versales, como en la mesa: «ESPADAS» / «SWORDS». */
export const palo = (s: Suit) => t(`palo.${s}`);
/** El palo en caja baja con mayúscula inicial: «Espadas» / «Swords». */
export const paloN = (s: Suit) => t(`palo.${s}.nombre`);
/** Cómo se nombra una carta: la especial por su nombre, la de baraja por su número y palo («7 de Espadas» / «7 of Swords»). */
const FIGURA_UI: Record<number, string> = { [SOTA]: 'ui.carta.sota', [CABALLO]: 'ui.carta.caballo', [REY]: 'ui.carta.rey' };
/** V40 · un guardia por su figura: «Sota de Espadas», «Knave of Swords» (las cartas de número, como cartaN). */
export const guardiaN = (c: Card): string => {
  const k = FIGURA_UI[c.rank];
  if (!k || c.sp || c.suit === 'X') return cartaN(c);
  const f = t(k);
  return t('carta.etiqueta', { n: f.charAt(0) + f.slice(1).toLowerCase(), palo: paloN(c.suit) });
};
export const cartaN = (c: Card) => (c.sp ? espN(c.sp) : c.suit === 'X' ? t('carta.comodin') : t('carta.etiqueta', { n: RANK_LABEL[c.rank], palo: paloN(c.suit) }));
