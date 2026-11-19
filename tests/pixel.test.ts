// V40 · fase 2 — la forja pixel-art en código (src/client/pixel/): cada mapa es una rejilla entera, cada pieza del
// motor tiene su dibujo y el naipe guarda las reglas de la baraja española (pintas del marco, figuras de cuerpo entero).
// La forja (npm run forja) mide los píxeles; esta prueba vigila que nada se quede sin dibujar ni salga torcido.
import { describe, expect, it } from 'vitest';
import { EXPRESIONES, bufonMapa, bufonSvg } from '../src/client/pixel/bufon';
import { figuraMapa } from '../src/client/pixel/figuras';
import { MOTIVO_AMULETO, MOTIVO_BENDICION, amuletoMapa, amuletoSvg, bendicionMapa, bendicionSvg, trampaMapa, trampaSvg } from '../src/client/pixel/iconos';
import { CORTES, caraComodin, caraPalo, dorsoSvg } from '../src/client/pixel/naipes';
import { CAJA, pintaEnCaja, pintaMapa, pintaSvg } from '../src/client/pixel/pintas';
import { celdas, cuadra, medida } from '../src/client/pixel/rejilla';
import { REYES_PX, esReyPx, reyMapa, reySvg } from '../src/client/pixel/reyes';
import { BENDICIONES, REY_IDS } from '../src/rules/reyes';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';

const PALOS = ['S', 'C', 'D', 'H'] as const;

/** Un mapa sano: rectangular, con dibujo y sin celdas de letra desconocida (la paleta las pinta transparentes). */
function sano(m: readonly string[] | null, quien: string) {
  expect(m, quien).not.toBeNull();
  expect(cuadra(m!), `${quien}: filas de distinto largo`).toBe(true);
  expect(celdas(m!), `${quien}: sin dibujo`).toBeGreaterThan(0);
}

/** El SVG es pixel-art: crispEdges, coordenadas enteras y nada de texto ni filtros. */
function pixel(svg: string, quien: string) {
  expect(svg, quien).toContain('crispEdges');
  expect(svg, `${quien}: lleva <text>`).not.toMatch(/<text\b/);
  expect(svg, `${quien}: lleva filtros`).not.toMatch(/<filter\b|blur/);
  const d = [...svg.matchAll(/\sd="([^"]+)"/g)].map((x) => x[1]).join(' ');
  expect(d, `${quien}: coordenada no entera`).not.toMatch(/\d\.\d/);
}

describe('V40 fase 2 · pintas', () => {
  it('las cuatro pintas son rejillas sanas que caben en la caja del naipe', () => {
    for (const s of PALOS) {
      sano(pintaMapa(s), s);
      const [w, h] = medida(pintaMapa(s));
      expect(w, s).toBeLessThanOrEqual(CAJA[0]);
      expect(h, s).toBeLessThanOrEqual(CAJA[1]);
      expect(medida(pintaEnCaja(s)), s).toEqual(CAJA);
      pixel(pintaSvg(s), s);
    }
  });

  it('las siluetas son distintas entre sí (no se distinguen solo por el color)', () => {
    const forma = (s: (typeof PALOS)[number]) => pintaEnCaja(s).map((r) => r.replace(/[^.]/g, '#')).join('\n');
    const vistas = new Set(PALOS.map(forma));
    expect(vistas.size).toBe(4);
  });

  it('pintas del marco de la baraja española: 1 Oros, 2 Copas, 3 Espadas, 4 Bastos', () => {
    expect(CORTES).toEqual({ D: 1, H: 2, S: 3, C: 4 });
  });
});

describe('V40 fase 2 · naipes', () => {
  it('del 1 al 12 de cada palo hay cara pixel-art, y las figuras son de cuerpo entero', () => {
    for (const s of PALOS)
      for (let r = 1; r <= 12; r++) {
        const cara = caraPalo(s, r);
        pixel(cara, `${s}${r}`);
        expect(cara, `${s}${r}`).toContain('viewBox="0 0 250 350"');
        if (r >= 10) sano(figuraMapa(s, r as 10 | 11 | 12), `${s}${r}`);
      }
  });

  it('cada figura tiene su silueta: la Sota, el Caballo y el Rey no son el mismo dibujo', () => {
    for (const s of PALOS) {
      const formas = new Set(([10, 11, 12] as const).map((r) => figuraMapa(s, r).join('\n')));
      expect(formas.size, s).toBe(3);
    }
  });

  it('el Comodín y los dorsos de los cinco Mazos', () => {
    pixel(caraComodin(), 'comodín');
    for (const m of ['escoba', 'truco', 'chinchon', 'mentiroso', 'chancho']) pixel(dorsoSvg(m), m);
  });
});

describe('V40 fase 2 · el Bufón', () => {
  it('cinco expresiones, cada una con su cuadro distinto', () => {
    expect(EXPRESIONES).toEqual(['reposo', 'risa', 'burla', 'brillo', 'sombria']);
    const cuadros = new Set<string>();
    for (const e of EXPRESIONES) {
      sano(bufonMapa(e), e);
      cuadros.add(bufonMapa(e).join('\n'));
      const svg = bufonSvg(e, 'x');
      pixel(svg, e);
      expect(svg).toContain(`bf-${e}`);
      expect(svg).toContain('bf-cuerpo');
    }
    expect(cuadros.size).toBe(EXPRESIONES.length);
  });
});

describe('V40 fase 2 · los cuatro Reyes jefe', () => {
  it('cada Rey del motor tiene retrato en calma y vencido', () => {
    expect([...REYES_PX].sort()).toEqual([...REY_IDS].sort());
    for (const id of REY_IDS) {
      expect(esReyPx(id)).toBe(true);
      sano(reyMapa(id, 'calma'), id);
      sano(reyMapa(id, 'vencido'), id);
      expect(reyMapa(id, 'calma').join('\n')).not.toBe(reyMapa(id, 'vencido').join('\n'));
      pixel(reySvg(id, 'calma'), id);
    }
    expect(new Set(REY_IDS.map((id) => reyMapa(id).join('\n'))).size).toBe(4);
  });
});

describe('V40 fase 2 · iconos de Amuletos, Trampas y Bendiciones', () => {
  it('cada Amuleto tiene icono, de la familia de su Rey', () => {
    for (const t of TOOLS) {
      sano(amuletoMapa(t.id), t.id);
      pixel(amuletoSvg(t.id), t.id);
      const lado = medida(amuletoMapa(t.id)!);
      expect(Math.max(...lado), `${t.id}: más de 24 celdas`).toBeLessThanOrEqual(24);
      if (t.arch && (REY_IDS as string[]).includes(t.arch)) expect(MOTIVO_AMULETO[t.id].fam, t.id).toBe(t.arch);
    }
  });

  it('cada Trampa del Bufón tiene icono', () => {
    for (const s of SPECIALS) {
      sano(trampaMapa(s.id), s.id);
      pixel(trampaSvg(s.id), s.id);
    }
  });

  it('cada Bendición tiene medallón, del color de su Rey', () => {
    for (const b of BENDICIONES) {
      sano(bendicionMapa(b.id), b.id);
      pixel(bendicionSvg(b.id), b.id);
      expect((REY_IDS as string[]).includes(MOTIVO_BENDICION[b.id].fam), b.id).toBe(true);
    }
  });

  it('un id desconocido no inventa dibujo', () => {
    expect(amuletoSvg('no-existe')).toBe('');
    expect(trampaSvg('no-existe')).toBe('');
    expect(bendicionSvg('no-existe')).toBe('');
  });
});
