// Notación compacta de cifras (V12, SPECS/V12.md 1.8): todo lo que pasa de 999 se escribe corto para que
// una cifra de siete dígitos ocupe en la mesa lo mismo que una de tres.
//
//   · español: 1K · 1,2K · 45K · 1,8M · 1,2MM · 3B (billón) — inglés: 1K · 1.2K · 45K · 1.8M · 1.2B · 3T
//   · una decimal solo por debajo de 10 de su unidad (1,2K pero 45K), y sin «,0» (1K, no 1,0K)
//   · se TRUNCA, nunca se redondea: no enseña más de lo que tienes (1.999 → 1,9K)
//   · como mucho 5 caracteres, más el signo si es negativo (−1,2K)
//   · por debajo de 1.000, el entero tal cual (también truncado: 12,7 → 12)
// El número entero va aparte, en el `aria-label` del sitio que lo pinta: esto es solo la vista.

export type LangCompacto = 'es' | 'en';

/** Unidades de mayor a menor. El billón español (10¹²) es la «B»; el inglés llama «B» a 10⁹. */
const UNIDADES: Record<LangCompacto, [number, string][]> = {
  es: [
    [1e12, 'B'],
    [1e9, 'MM'],
    [1e6, 'M'],
    [1e3, 'K'],
  ],
  en: [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ],
};
const COMA: Record<LangCompacto, string> = { es: ',', en: '.' };
/** El signo menos tipográfico, el mismo que usan los textos del juego («−5 de Vida»). */
const MENOS = '−';

/** `n` en notación compacta para `lang`. Acepta cualquier número; NaN e infinitos salen como «0» y «∞». */
export function compacto(n: number, lang: LangCompacto): string {
  if (Number.isNaN(n)) return '0';
  if (!Number.isFinite(n)) return n < 0 ? `${MENOS}∞` : '∞';
  const signo = n < 0 ? MENOS : '';
  const a = Math.abs(n);
  if (a < 1000) {
    const e = Math.trunc(a);
    return e === 0 ? '0' : `${signo}${e}`;
  }
  const unidades = UNIDADES[lang];
  for (let i = 0; i < unidades.length; i++) {
    const [u, letra] = unidades[i];
    if (a < u) continue;
    // décimas truncadas de la unidad. u / 10 es una potencia de diez exacta: con un entero, el cociente
    // redondeado nunca llega al entero siguiente, así que floor no se pasa (nunca enseña de más)
    const decimas = Math.floor(a / (u / 10));
    const entero = Math.floor(decimas / 10);
    // por encima de la unidad mayor (más de 999 billones) se queda en 999: nunca pasa de 5 caracteres
    if (entero >= 1000) return `${signo}999${letra}`;
    const resto = decimas % 10;
    const cuerpo = entero < 10 && resto > 0 ? `${entero}${COMA[lang]}${resto}` : `${entero}`;
    return `${signo}${cuerpo}${letra}`;
  }
  return `${signo}${Math.trunc(a)}`;
}
