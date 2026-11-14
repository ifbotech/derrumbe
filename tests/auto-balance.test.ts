// El afinador (scripts/auto-balance.ts), sin laboratorio: con un medidor de juguete que responde al instante.
// Comprueba que la búsqueda nunca pasa de ±15 %, que sin --aplicar no se escribe el archivo y que con
// --aplicar se escriben solo los campos de la propuesta.
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { Campo, Medidor, Propuesta, TOPE, aplicar, buscar, candidatos, dentro, ejecutar, sha256 } from '../scripts/auto-balance';
import { Comprobacion, avisos, revisar } from '../scripts/objetivos';
import { AFINABLES, getPath } from '../src/rules/balance-config';

const REAL = new URL('../src/rules/balance-config.json', import.meta.url);
const dir = mkdtempSync(join(tmpdir(), 'afinador-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const copia = (name: string) => {
  const p = join(dir, `${name}.json`);
  copyFileSync(REAL, p);
  return p;
};

/** Objetivo de juguete: el «Reinado 1» gana 10 × asaltos.0.hp − 10 %, y quiere entre 24 y 30 (o lo que se pida). */
function juguete(lo = 24, hi = 30, base = 3.93): { medir: Medidor; vistos: Record<string, number>[] } {
  const vistos: Record<string, number>[] = [];
  const medir: Medidor = async (patch) => {
    vistos.push(patch);
    const hp = patch['asaltos.0.hp'] ?? base;
    const v = Math.round((10 * hp - 10) * 10) / 10;
    const c: Comprobacion = { id: 'reinado1.vacio', texto: `juguete ${v}`, ok: v >= lo && v <= hi, partes: [{ valor: v, lo, hi }] };
    return [c];
  };
  return { medir, vistos };
}
const campo = (ruta: string, base: number, entero = false): Campo => ({ ruta, base, entero });

describe('candidatos y tope de ±15 %', () => {
  it('reales: cuatro valores dentro de ±15 %, sin la base', () => {
    const vs = candidatos(campo('asaltos.0.hp', 3.93));
    expect(vs).toEqual([3.35, 3.64, 4.22, 4.51]); // −15 % (3,3405) y +15 % (4,5195) se recortan hacia dentro
    for (const v of vs) expect(Math.abs(v - 3.93) / 3.93).toBeLessThanOrEqual(TOPE + 1e-9);
  });

  it('enteros: de uno en uno, y uno pequeño no se mueve (±15 % de 4 no llega a 5)', () => {
    expect(candidatos(campo('asedio.start', 8, true))).toEqual([7, 9]);
    expect(candidatos(campo('asaltos.0.threat', 4, true))).toEqual([]);
    expect(candidatos(campo('inicio.vida', 20, true))).toEqual([17, 19, 22, 23]);
    for (const a of AFINABLES) {
      const base = getPath(JSON.parse(readFileSync(REAL, 'utf8')), a.ruta);
      for (const v of candidatos({ ...a, base })) expect(dentro(base, v), `${a.ruta} = ${v}`).toBe(true);
    }
  });

  it('con un objetivo inalcanzable, la búsqueda se para en el borde: nunca pasa de ±15 %', async () => {
    // pide 60–70: haría falta hp ≈ 7, casi el doble; lo más que puede es 3,93 × 1,15
    const { medir, vistos } = juguete(60, 70);
    const r = await buscar({ campos: [campo('asaltos.0.hp', 3.93)], medir, nSondeo: 10, nConfirma: 1500, presupuesto: 60_000 });
    for (const p of vistos) for (const v of Object.values(p)) expect(dentro(3.93, v), String(v)).toBe(true);
    expect(r.cambios).toHaveLength(1);
    expect(r.cambios[0]).toMatchObject({ campo: 'asaltos.0.hp', antes: 3.93, despues: 4.51, variacion: 14.8 });
    expect(r.cambios[0].n).toEqual({ sondeo: 10, confirma: 1500 });
  });

  it('si el punto de partida cumple, la propuesta sale vacía y no se sondea nada', async () => {
    const { medir, vistos } = juguete(24, 30);
    const r = await buscar({ campos: [campo('asaltos.0.hp', 3.93)], medir, nSondeo: 10, nConfirma: 1500, presupuesto: 60_000 });
    expect(r.vacia).toBe(true);
    expect(r.cambios).toEqual([]);
    expect(vistos).toEqual([{}]);
    expect(r.base.comprobaciones[0]).toMatchObject({ id: 'reinado1.vacio', ok: true });
    expect(r.mensaje).toMatch(/vacía/);
  });

  it('un objetivo alcanzable: elige el cambio más pequeño que lo arregla', async () => {
    // 10 × 3,93 − 10 = 29,3; con 24–28 hace falta bajar a ≤ 3,8: el −7,5 % (3,64 → 26,4) basta
    const { medir } = juguete(24, 28);
    const r = await buscar({ campos: [campo('asaltos.0.hp', 3.93)], medir, nSondeo: 10, nConfirma: 1500, presupuesto: 60_000 });
    expect(r.cambios.map((c) => [c.campo, c.despues, c.arregla])).toEqual([['asaltos.0.hp', 3.64, ['reinado1.vacio']]]);
  });

  it('respeta el presupuesto: sin tiempo, no pasa del primer sondeo', async () => {
    let t = 0;
    const lento: Medidor = async (p, n) => {
      t += 1000;
      return juguete(60, 70).medir(p, n);
    };
    const r = await buscar({ campos: [campo('asaltos.0.hp', 3.93), campo('asaltos.1.hp', 2.8)], medir: lento, nSondeo: 10, nConfirma: 1500, presupuesto: 1500, ahora: () => t });
    expect(r.agotado).toBe(true);
    expect(r.sondeos.length).toBeLessThanOrEqual(1);
  });
});

describe('propone, no aplica', () => {
  const args = (...a: string[]) => [...a, '--minutos=1'];

  it('sin --aplicar, balance-config.json no cambia (misma SHA-256) y la propuesta queda escrita', async () => {
    const cfg = copia('sin-aplicar');
    const out = join(dir, 'sin-aplicar');
    const antes = sha256(cfg);
    const { medir } = juguete(24, 28);
    const p = (await ejecutar({ args: args(), configPath: cfg, outDir: out, medir, log: () => {} })) as Propuesta;
    expect(sha256(cfg)).toBe(antes);
    expect(p.config).toBe(antes);
    const escrita = JSON.parse(readFileSync(join(out, 'propuesta.json'), 'utf8')) as Propuesta;
    expect(escrita.cambios.length).toBeGreaterThan(0);
    for (const c of escrita.cambios) expect(dentro(c.antes, c.despues)).toBe(true);
    expect(readFileSync(join(out, 'propuesta.md'), 'utf8')).toMatch(/# Propuesta del afinador/);
  });

  it('con --aplicar, escribe solo los campos de la propuesta', async () => {
    const cfg = copia('aplicar');
    const out = join(dir, 'aplicar');
    const { medir } = juguete(24, 28);
    await ejecutar({ args: args(), configPath: cfg, outDir: out, medir, log: () => {} });
    const antes = JSON.parse(readFileSync(cfg, 'utf8'));
    const escritos = (await ejecutar({ args: ['--aplicar'], configPath: cfg, outDir: out, log: () => {} })) as string[];
    const despues = JSON.parse(readFileSync(cfg, 'utf8'));
    expect(escritos).toEqual(['asaltos.0.hp']);
    expect(despues.asaltos[0].hp).toBe(3.64);
    // todo lo demás, igual
    despues.asaltos[0].hp = antes.asaltos[0].hp;
    expect(despues).toEqual(antes);
  });

  it('aplicar rechaza lo que pasa de ±15 %, lo confirmado con poca muestra y lo del modo corto', () => {
    const cfg = copia('rechazos');
    const cambio = { campo: 'asaltos.0.hp', antes: 3.93, despues: 3.0, variacion: -23.7, arregla: [], toca: [], n: { sondeo: 200, confirma: 1500 } };
    expect(() => aplicar(cfg, { cambios: [cambio], corto: false })).toThrow(/15 %/);
    expect(() => aplicar(cfg, { cambios: [{ ...cambio, despues: 3.63, n: { sondeo: 20, confirma: 20 } }], corto: false })).toThrow(/n=20/);
    expect(() => aplicar(cfg, { cambios: [{ ...cambio, despues: 3.63 }], corto: true })).toThrow(/corto/);
    expect(() => aplicar(cfg, { cambios: [{ ...cambio, antes: 9, despues: 9.5 }], corto: false })).toThrow(/parte de 9/);
    expect(sha256(cfg)).toBe(sha256(copia('referencia')));
  });
});

describe('objetivos como datos', () => {
  it('el informe publicado, leído con la misma lista, no trae avisos y da los mismos que guardó', () => {
    const r = JSON.parse(readFileSync(new URL('../scripts/meta-report.json', import.meta.url), 'utf8'));
    expect(avisos(r)).toEqual(r.flags);
    expect(revisar(r).length).toBeGreaterThan(100);
  });
});
