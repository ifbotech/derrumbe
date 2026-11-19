// V40 · fase 2b — la forja pixel-art «sin línea» en código (src/client/pixel/): cada mapa es una rejilla entera, cada
// pieza del motor tiene su dibujo, el naipe guarda las reglas de la baraja española (pintas del marco, índice libre,
// pintas grandes y del mismo tamaño sin pisarse, figuras de cuerpo entero) y el linter del pixel-art (adaptado de pxl)
// no encuentra fallos. La forja (npm run forja) mide además los píxeles renderizados.
import { describe, expect, it } from 'vitest';
import { lintCatalogo, lintMapa, siluetaDe, contraste, SILUETA } from '../scripts/pixel-lint';
import { EXPRESIONES, bufonMapa, bufonSvg } from '../src/client/pixel/bufon';
import { caraMapa } from '../src/client/pixel/catalogo';
import { MAZOS, dorsoMapa, dorsoSvg } from '../src/client/pixel/dorsos';
import { figuraLienzo, figuraMapa } from '../src/client/pixel/figuras';
import { MOTIVO_AMULETO, MOTIVO_BENDICION, amuletoMapa, amuletoSvg, bendicionMapa, bendicionSvg, trampaMapa, trampaSvg } from '../src/client/pixel/iconos';
import { CORTES, NAIPE_H, NAIPE_W, ZONA_INDICE, caraComodin, caraPalo, disposicion, pintasColocadas } from '../src/client/pixel/naipes';
import { PX } from '../src/client/pixel/paleta';
import { pintaMapa, pintaNaipe, pintaSvg } from '../src/client/pixel/pintas';
import { celdas, cuadra, medida } from '../src/client/pixel/rejilla';
import { REYES_PX, esReyPx, reyMapa, reySvg } from '../src/client/pixel/reyes';
import { BENDICIONES, REY_IDS } from '../src/rules/reyes';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';

const PALOS = ['S', 'C', 'D', 'H'] as const;

/** Un mapa sano: rectangular, con dibujo. */
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

/** ¿Hay alguna celda pintada dentro de la caja [x0, y0, x1, y1] (inclusiva)? */
const pisa = (m: readonly string[], [x0, y0, x1, y1]: number[]) => m.slice(y0, y1 + 1).some((r) => [...r.slice(x0, x1 + 1)].some((k) => k !== '.'));

describe('V40 fase 2b · pintas', () => {
  it('los glifos de los cuatro palos son rejillas sanas con siluetas distintas', () => {
    const formas = new Set<string>();
    for (const s of PALOS) {
      sano(pintaMapa(s), s);
      pixel(pintaSvg(s), s);
      formas.add(pintaMapa(s).map((r) => r.replace(/[^.]/g, '#')).join('\n'));
    }
    expect(formas.size).toBe(4);
  });

  it('cada palo tiene su pinta chica (4 a 9) y grande (2 y 3), y todas las variantes miden lo mismo', () => {
    for (const s of PALOS)
      for (const t of ['chica', 'grande'] as const) {
        const base = medida(pintaNaipe(s, t, 0));
        for (const v of [0, 1, 2]) {
          sano(pintaNaipe(s, t, v), `${s} ${t} ${v}`);
          expect(medida(pintaNaipe(s, t, v)), `${s} ${t} ${v}`).toEqual(base);
        }
      }
  });

  it('las pintas son grandes: la chica mide al menos un cuarto del alto del naipe o un cuarto de su ancho', () => {
    for (const s of PALOS) {
      const [w, h] = medida(pintaNaipe(s, 'chica'));
      expect(h >= NAIPE_H / 4 || w >= NAIPE_W / 4, `${s}: ${w} × ${h}`).toBe(true);
    }
  });

  it('sin contorno, la silueta la da el tono: ≥ 60 % del borde a 3:1 sobre el papel del naipe', () => {
    for (const s of PALOS)
      for (const t of ['chica', 'grande'] as const)
        for (const v of [0, 1, 2]) expect(siluetaDe(pintaNaipe(s, t, v)), `${s} ${t} ${v}`).toBeGreaterThanOrEqual(SILUETA.fraccion);
  });

  it('las tintas de palo del índice y de las pintas del marco pasan de 7:1 sobre el papel del naipe', () => {
    for (const c of ['#1d3a66', '#34481a', '#633f06', '#8e1424']) expect(contraste(c, PX.papel), c).toBeGreaterThanOrEqual(7);
  });
});

describe('V40 fase 2b · naipes', () => {
  it('pintas del marco de la baraja española: 1 Oros, 2 Copas, 3 Espadas, 4 Bastos', () => {
    expect(CORTES).toEqual({ D: 1, H: 2, S: 3, C: 4 });
    for (const s of PALOS) expect((caraPalo(s, 5).match(/class="px-marco"[^>]*d="([^"]+)"/)?.[1].match(/M/g) ?? []).length, s).toBe(2 * CORTES[s]);
  });

  it('del 1 al 12 de cada palo hay cara pixel-art en la rejilla de 96 × 140', () => {
    for (const s of PALOS)
      for (let r = 1; r <= 12; r++) {
        const cara = caraPalo(s, r);
        pixel(cara, `${s}${r}`);
        expect(cara, `${s}${r}`).toContain('viewBox="-2 0 100 140"');
      }
    pixel(caraComodin(), 'comodín');
  });

  it('del 1 al 9, nada se dibuja en las zonas del índice (arriba a la izquierda, abajo a la derecha)', () => {
    for (const s of PALOS)
      for (let r = 1; r <= 9; r++) {
        const m = caraMapa(s, r);
        expect(medida(m), `${s}${r}`).toEqual([NAIPE_W, NAIPE_H]);
        for (const z of ZONA_INDICE) expect(pisa(m, z), `${s}${r} pisa el índice ${z}`).toBe(false);
      }
  });

  it('las pintas del 2 al 9 son del mismo tamaño dentro de cada naipe, caben y no se pisan', () => {
    for (const s of PALOS)
      for (let r = 2; r <= 9; r++) {
        const ps = pintasColocadas(s, r);
        expect(ps.length, `${s}${r}`).toBe(r);
        const cajas = ps.map((p) => {
          const [w, h] = medida(p.m);
          return [p.x, p.y, p.x + w - 1, p.y + h - 1];
        });
        const lados = new Set(ps.map((p) => medida(p.m).slice().sort((a, b) => a - b).join('×')));
        expect(lados.size, `${s}${r}: pintas de distinto tamaño`).toBe(1);
        for (const [x0, y0, x1, y1] of cajas) expect(x0 >= 0 && y0 >= 0 && x1 < NAIPE_W && y1 < NAIPE_H, `${s}${r} se sale`).toBe(true);
        // ninguna celda pintada de una cae sobre una celda pintada de otra
        const ocupado = new Set<string>();
        for (const p of ps)
          p.m.forEach((f, y) =>
            [...f].forEach((k, x) => {
              if (k === '.') return;
              const clave = `${p.x + x},${p.y + y}`;
              expect(ocupado.has(clave), `${s}${r}: pintas que se pisan en ${clave}`).toBe(false);
              ocupado.add(clave);
            }),
          );
      }
  });

  it('del 4 al 9 cada palo usa la misma pinta chica; el 2 y el 3, la grande', () => {
    for (const s of PALOS) {
      for (let r = 4; r <= 9; r++) expect(disposicion(s, r).talla, `${s}${r}`).toBe('chica');
      for (const r of [2, 3]) expect(disposicion(s, r).talla, `${s}${r}`).toBe('grande');
    }
  });

  it('la Corte es de cuerpo entero, cada figura con su silueta, y deja libre el índice de dos cifras', () => {
    for (const s of PALOS) {
      const formas = new Set(([10, 11, 12] as const).map((r) => figuraMapa(s, r).join('\n')));
      expect(formas.size, s).toBe(3);
      for (const r of [10, 11, 12] as const) {
        const m = figuraLienzo(s, r);
        sano(m, `${s}${r}`);
        expect(medida(m)).toEqual([NAIPE_W, NAIPE_H]);
        // de cuerpo entero: la figura ocupa más de tres cuartos del alto del naipe
        const filas = m.map((f, y) => (/[^.]/.test(f) ? y : -1)).filter((y) => y >= 0);
        expect(filas[filas.length - 1] - filas[0], `${s}${r}`).toBeGreaterThan(NAIPE_H * 0.75);
        expect(pisa(m, [0, 0, 27, 32]), `${s}${r} pisa el índice de arriba`).toBe(false);
        expect(pisa(m, [69, 107, 95, 139]), `${s}${r} pisa el índice de abajo`).toBe(false);
      }
    }
  });

  it('los dorsos de los cinco Mazos: cada uno con su dibujo, distinto de los demás', () => {
    expect(new Set(MAZOS.map((m) => dorsoMapa(m).join('\n'))).size).toBe(5);
    for (const m of MAZOS) pixel(dorsoSvg(m), m);
  });
});

describe('V40 fase 2b · el Bufón', () => {
  it('cinco expresiones, cada una con su cuadro distinto y sus capas para animar', () => {
    expect(EXPRESIONES).toEqual(['reposo', 'risa', 'burla', 'brillo', 'sombria']);
    const cuadros = new Set<string>();
    for (const e of EXPRESIONES) {
      sano(bufonMapa(e), e);
      cuadros.add(bufonMapa(e).join('\n'));
      const svg = bufonSvg(e, 'x');
      pixel(svg, e);
      for (const c of [`bf-${e}`, 'bf-cuerpo', 'bf-palo', 'bf-cascabel']) expect(svg, `${e}: ${c}`).toContain(c);
    }
    expect(cuadros.size).toBe(EXPRESIONES.length);
  });
});

describe('V40 fase 2b · los cuatro Reyes jefe', () => {
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

describe('V40 fase 2b · iconos de Amuletos, Trampas y Bendiciones', () => {
  it('cada Amuleto tiene icono, de la familia de su Rey', () => {
    for (const t of TOOLS) {
      sano(amuletoMapa(t.id), t.id);
      pixel(amuletoSvg(t.id), t.id);
      expect(Math.max(...medida(amuletoMapa(t.id)!)), `${t.id}: más de 48 celdas`).toBeLessThanOrEqual(48);
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

describe('V40 fase 2b · el linter del pixel-art', () => {
  it('el catálogo entero pasa sin fallos', () => {
    const malas = lintCatalogo().filter((i) => i.hallazgos.some((h) => h.grave));
    expect(malas.map((i) => `${i.pieza.grupo}/${i.pieza.id}: ${i.hallazgos.filter((h) => h.grave).map((h) => h.msg).join('; ')}`)).toEqual([]);
  });

  it('caza el contorno negro «de Paint»', () => {
    const m = ['kkkkkkkk', 'kyyyyyyk', 'kyyyyyyk', 'kyyyyyyk', 'kyyyyyyk', 'kkkkkkkk'];
    expect(lintMapa(m).map((h) => h.regla)).toContain('contorno');
  });

  it('caza el sombreado de almohada y las bandas concéntricas', () => {
    const n = 21;
    const m = Array.from({ length: n }, (_, y) =>
      Array.from({ length: n }, (_, x) => {
        const d = Math.hypot(x - 10, y - 10);
        return d > 10 ? '.' : d > 8.5 ? 'R' : d > 6.5 ? 'r' : 'e';
      }).join(''),
    );
    const reglas = lintMapa(m).map((h) => h.regla);
    expect(reglas.some((r) => r === 'almohada' || r === 'bandas')).toBe(true);
  });

  it('caza los dientes de sierra de una línea de un píxel', () => {
    const m = ['b.........', '.b........', '.bb.......', '...b......', '....b.....', '....bb....', '......b...', '.......b..'];
    expect(lintMapa(m).map((h) => h.regla)).toContain('jaggy');
  });
});
