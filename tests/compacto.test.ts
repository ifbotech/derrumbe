// Notación compacta (V12, SPECS/V12.md 1.8): K, M, MM en español; K, M, B en inglés; una decimal por debajo
// de 10 de la unidad; trunca; como mucho 5 caracteres (más el signo).
import { describe, expect, it } from 'vitest';
import { compacto } from '../src/shared/compacto';
import { nextRandom, seedFrom } from '../src/rules/engine';

describe('compacto', () => {
  it('los ejemplos del apartado 1.8', () => {
    const casos: [number, string, string][] = [
      [0, '0', '0'],
      [7, '7', '7'],
      [999, '999', '999'],
      [1000, '1K', '1K'],
      [1234, '1,2K', '1.2K'],
      [1999, '1,9K', '1.9K'],
      [9999, '9,9K', '9.9K'],
      [10_000, '10K', '10K'],
      [45_678, '45K', '45K'],
      [999_999, '999K', '999K'],
      [1_000_000, '1M', '1M'],
      [1_850_000, '1,8M', '1.8M'],
      [12_345_678, '12M', '12M'],
      [1_200_000_000, '1,2MM', '1.2B'],
      [987_654_321_000, '987MM', '987B'],
      [3_000_000_000_000, '3B', '3T'],
    ];
    for (const [n, es, en] of casos) {
      expect(compacto(n, 'es'), `es ${n}`).toBe(es);
      expect(compacto(n, 'en'), `en ${n}`).toBe(en);
    }
  });

  it('trunca, nunca redondea, y los decimales por debajo de 1.000 se cortan', () => {
    expect(compacto(1099, 'es')).toBe('1K');
    expect(compacto(1100, 'es')).toBe('1,1K');
    expect(compacto(19_999, 'en')).toBe('19K');
    expect(compacto(999_999_999, 'es')).toBe('999M');
    expect(compacto(12.9, 'es')).toBe('12');
  });

  it('negativos con su signo', () => {
    expect(compacto(-5, 'es')).toBe('−5');
    expect(compacto(-1234, 'es')).toBe('−1,2K');
    expect(compacto(-1_200_000_000, 'en')).toBe('−1.2B');
  });

  it('ninguna salida pasa de 5 caracteres (más el signo) en 10.000 números al azar con semilla, y nunca enseña de más', () => {
    const azar = { rng: seedFrom('compacto-v12') };
    const rng = () => nextRandom(azar);
    const leer = (s: string, lang: 'es' | 'en') => {
      const m = /^(−?)(\d+)(?:[.,](\d))?(K|MM|M|B|T)?$/.exec(s);
      expect(m, s).not.toBeNull();
      const unidad = { es: { K: 1e3, M: 1e6, MM: 1e9, B: 1e12 }, en: { K: 1e3, M: 1e6, B: 1e9, T: 1e12 } }[lang] as Record<string, number>;
      const v = (Number(m![2]) + Number(m![3] ?? 0) / 10) * (m![4] ? unidad[m![4]] : 1);
      return m![1] ? -v : v;
    };
    for (let i = 0; i < 10_000; i++) {
      // magnitudes repartidas de 1 a 10¹⁵
      const n = Math.floor(10 ** (rng() * 15));
      for (const lang of ['es', 'en'] as const) {
        const s = compacto(n, lang);
        expect(s.length, `${lang} ${n} → ${s}`).toBeLessThanOrEqual(5);
        expect(leer(s, lang), `${lang} ${n} → ${s}`).toBeLessThanOrEqual(n);
        expect(compacto(-n, lang).length).toBeLessThanOrEqual(6);
      }
    }
  });
});
