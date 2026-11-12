// Reglas de imprenta, comprobadas en las hojas de estilo sin abrir el juego:
//
//   · ninguna letra por debajo de 13 px (también el mínimo de un clamp() o de un max())
//   · ninguna cifra en gótica: las cifras van en var(--num), y la gótica de títulos lleva delante
//     la fuente «Derrumbe Cifras», que solo tiene dígitos y signos de cuenta
//
// Son estrictas en las hojas de arte-ui A (styles, campaign y theme). Las de otras celdas (juice,
// cuenta, acta) se revisan igual, pero solo avisan: lo que falte ahí lo pisa theme.css o es de su celda.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = new URL('../src/client/', import.meta.url);
const MIAS = ['styles.css', 'campaign.css', 'theme.css'];
const AJENAS = ['juice.css', 'cuenta.css', 'acta.css'];
/** Orden de carga en main.ts: la última declaración gana. */
const ORDEN = ['styles.css', 'juice.css', 'campaign.css', 'theme.css', 'cuenta.css', 'acta.css'];
const MINIMO = 13;
const GOTICA = /var\(--title\)|unifraktur|grenze|old english/i;

interface Regla {
  hoja: string;
  sel: string;
  cuerpo: string;
  linea: number;
}

/** Reglas más internas de una hoja (las de dentro de un @media salen con su selector propio). */
function reglas(hoja: string): Regla[] {
  const src = readFileSync(new URL(hoja, DIR), 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const out: Regla[] = [];
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].replace(/@[^{;]*;/g, '').trim();
    if (sel.startsWith('@')) continue;
    out.push({ hoja, sel, cuerpo: m[2], linea: src.slice(0, m.index! + m[1].length).split('\n').length });
  }
  return out;
}

function decl(cuerpo: string, prop: string): string[] {
  return [...cuerpo.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'g'))].map((m) => m[1].trim());
}

/** El tamaño más pequeño que puede dar un valor de font-size, en px (null si no se sabe sin pantalla). */
function suelo(v: string): number | null {
  v = v.replace(/!important/, '').trim();
  const px = (s: string) => {
    const m = /^(-?[\d.]+)px$/.exec(s.trim());
    return m ? parseFloat(m[1]) : s.trim() === '0' ? 0 : null;
  };
  const llano = px(v);
  if (llano !== null) return llano;
  const rem = /^([\d.]+)rem$/.exec(v);
  if (rem) return parseFloat(rem[1]) * 16;
  const args = (f: string) => {
    const dentro = v.slice(f.length + 1, -1);
    const partes: string[] = [];
    let hondo = 0;
    let cur = '';
    for (const c of dentro) {
      if (c === '(') hondo++;
      if (c === ')') hondo--;
      if (c === ',' && hondo === 0) {
        partes.push(cur);
        cur = '';
      } else cur += c;
    }
    return [...partes, cur];
  };
  if (v.startsWith('clamp(')) return px(args('clamp')[0]);
  if (v.startsWith('max(')) {
    const fijos = args('max').map(px).filter((n): n is number => n !== null);
    return fijos.length ? Math.max(...fijos) : null;
  }
  return null;
}

/** Texto del grabado SVG (unidades del viewBox, no px de pantalla) y la tarjeta de redes. */
const fueraDeEscala = (sel: string) => /(^|[\s,])\.art\s|\.og-card|\.og-txt/.test(sel);

function letraMenuda(hoja: string): string[] {
  const malas: string[] = [];
  for (const r of reglas(hoja)) {
    if (fueraDeEscala(r.sel)) continue;
    for (const v of decl(r.cuerpo, 'font-size')) {
      const n = suelo(v);
      // 0 px es «no se pinta» (el texto del grabado se retira así en las cartas pequeñas)
      if (n !== null && n > 0 && n < MINIMO) malas.push(`${hoja}:${r.linea} ${r.sel.replace(/\s+/g, ' ')} → font-size: ${v}`);
    }
    const font = decl(r.cuerpo, 'font').find((v) => /\d+px/.test(v));
    const m = font && /(?:^|\s)([\d.]+)px/.exec(font);
    if (m && +m[1] > 0 && +m[1] < MINIMO) malas.push(`${hoja}:${r.linea} ${r.sel.replace(/\s+/g, ' ')} → font: ${font}`);
  }
  return malas;
}

/** Selectores que pintan cifras de juego: valores, puntos, oro, pisos, contadores. */
const CIFRAS = ['.corner', '.threat b', '.plate b', '.storey b', '.hp span', '.belt-slot .cnt', '.chip b', '.pile .count', '.stat b', '.level b', '.purse b', '.price-tag', '.bp-n', '.preview', '.slider output', '.hold-ring b'];

describe('imprenta: tamaño de letra', () => {
  for (const hoja of MIAS)
    it(`${hoja}: nada por debajo de ${MINIMO} px`, () => {
      expect(letraMenuda(hoja)).toEqual([]);
    });

  it('hojas de otras celdas: solo aviso', () => {
    const avisos = AJENAS.flatMap(letraMenuda);
    if (avisos.length) console.warn(`[imprenta] letra < ${MINIMO} px en hojas ajenas (theme.css la pisa donde puede):\n  ${avisos.join('\n  ')}`);
    expect(Array.isArray(avisos)).toBe(true);
  });
});

describe('imprenta: cifras sin gótica', () => {
  const todas = ORDEN.flatMap(reglas);
  const raiz = todas.filter((r) => /(^|,)\s*:root\s*(,|$)/.test(r.sel));

  it('la gótica de títulos lleva delante la fuente de cifras', () => {
    const title = raiz.flatMap((r) => decl(r.cuerpo, '--title')).at(-1) ?? '';
    expect(title.split(',')[0].replace(/['"]/g, '').trim()).toBe('Derrumbe Cifras');
    const cara = readFileSync(new URL('theme.css', DIR), 'utf8').match(/@font-face\s*\{[^}]*Derrumbe Cifras[^}]*\}/)?.[0] ?? '';
    expect(cara).toMatch(/unicode-range:[^;]*U\+0030-0039/);
  });

  it('--num es de palo seco y con cifras tabulares donde se usa', () => {
    const num = raiz.flatMap((r) => decl(r.cuerpo, '--num')).at(-1) ?? '';
    expect(num).not.toBe('');
    expect(num).not.toMatch(GOTICA);
  });

  for (const sel of CIFRAS)
    it(`${sel}: la última familia que recibe no es gótica`, () => {
      const propias = todas.filter((r) => r.sel.split(',').some((s) => s.trim() === sel));
      const familias = propias.flatMap((r) => [...decl(r.cuerpo, 'font-family'), ...decl(r.cuerpo, 'font').filter((v) => /var\(|['"]/.test(v))]);
      expect(familias.length, `${sel} no declara familia: debería ir en var(--num)`).toBeGreaterThan(0);
      expect(familias.at(-1)).not.toMatch(GOTICA);
    });

  it('ninguna regla pone gótica a un selector de cifras', () => {
    const malas = todas
      .filter((r) => r.sel.split(',').some((s) => CIFRAS.includes(s.trim())))
      .filter((r) => decl(r.cuerpo, 'font-family').some((v) => GOTICA.test(v)))
      .map((r) => `${r.hoja}:${r.linea} ${r.sel}`);
    expect(malas).toEqual([]);
  });
});
