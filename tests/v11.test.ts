// V11 · la cuenta nueva (SPECS/V11.md, 1.11): Multi siempre entero, cinco palabras clave y ni rastro
// de las palabras retiradas (ventaja de palo, Brecha, En guardia, Desarmado) en los textos de reglas.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/rules/balance-config';
import { GameEvent, SEALS, TREATMENTS, applyAction, currentPlayer } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';
import { KEYWORDS } from '../src/rules/keywords';
import { addSpecial, newRun, startStage } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS, TOOL_SLOTS } from '../src/rules/tools';
import { ES } from '../src/shared/i18n/es';
import { EN } from '../src/shared/i18n/en';

/** Generador con semilla propia del test (el motor no usa Math.random; el test tampoco). */
function lcg(seed: number) {
  let s = seed >>> 0;
  return (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % n;
  };
}

describe('V11 · Multi siempre entero', () => {
  it('todos los números de Multi de la configuración son enteros', () => {
    const multis: [string, number][] = [
      ...Object.entries(BALANCE.formaciones).map(([k, v]): [string, number] => [`formación ${k}`, v.r]),
      ['golpe.racha', BALANCE.golpe.racha],
      ['golpe.rachaTope', BALANCE.golpe.rachaTope],
      ['golpe.expuesto', BALANCE.golpe.expuesto],
      ['acabados.templado', BALANCE.acabados.templado],
      ['acabados.policromado', BALANCE.acabados.policromado],
      ['acabados.agrietado', BALANCE.acabados.agrietado],
    ];
    const conMulti = (grupo: string, o: Record<string, Record<string, unknown>>) => {
      for (const [id, v] of Object.entries(o)) for (const k of ['multi', 'strikeMult']) if (typeof v[k] === 'number') multis.push([`${grupo} ${id}.${k}`, v[k] as number]);
    };
    conMulti('reliquia', BALANCE.reliquias as unknown as Record<string, Record<string, unknown>>);
    conMulti('especial', BALANCE.especiales as unknown as Record<string, Record<string, unknown>>);
    expect(multis.length).toBeGreaterThan(30);
    for (const [id, n] of multis) expect(Number.isInteger(n), `${id} = ${n}`).toBe(true);
  });

  it('5.000 golpes al azar con semilla fija: cada paso y cada impacto con Daño y Multi enteros, y Golpe = Daño × Multi', { timeout: 240_000 }, () => {
    const rnd = lcg(11);
    const players = [{ id: 'a', name: 'A' }];
    let golpes = 0;
    let pasos = 0;
    for (let seed = 1; golpes < 5000; seed++) {
      if (seed > 4000) throw new Error(`solo ${golpes} golpes en 4000 asaltos`);
      const run = newRun({ up: {}, pool: SPECIALS.map((s) => s.id), ascension: rnd(8) }, seed * 104729);
      run.stage = 1 + rnd(8);
      // reliquias, especiales, acabados y sellos al azar: que pasen por la cuenta todos los caminos de Multi
      const ids = new Set<string>();
      while (ids.size < TOOL_SLOTS) ids.add(TOOLS[rnd(TOOLS.length)].id);
      run.tools = [...ids].map((id) => ({ id, n: 0 }));
      for (let i = 0; i < 3; i++) addSpecial(run, SPECIALS[rnd(SPECIALS.length)].id);
      for (const c of run.deck) {
        const r = rnd(10);
        if (r === 0) c.tr = TREATMENTS[rnd(TREATMENTS.length)];
        else if (r === 1) c.seal = SEALS[rnd(SEALS.length)];
      }
      let state = startStage(run, players);
      for (let guard = 0; state.phase === 'playing' && guard < 400; guard++) {
        const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
        for (const ev of res.events as GameEvent[]) {
          if (ev.e === 'step') {
            pasos++;
            expect(Number.isInteger(ev.fuerza) && Number.isInteger(ev.res), `paso «${ev.label}»: ${ev.fuerza} × ${ev.res}`).toBe(true);
            for (const d of [ev.df, ev.dr, ev.mr]) if (d !== undefined) expect(Number.isInteger(d), `paso «${ev.label}»: ${d}`).toBe(true);
          } else if (ev.e === 'impact') {
            golpes++;
            expect(Number.isInteger(ev.fuerza) && Number.isInteger(ev.res), `impacto ${ev.fuerza} × ${ev.res}`).toBe(true);
            expect(ev.total, `impacto ${ev.fuerza} × ${ev.res}`).toBe(Math.max(0, ev.fuerza * ev.res));
          }
        }
        state = res.state;
      }
    }
    expect(golpes).toBeGreaterThanOrEqual(5000);
    expect(pasos).toBeGreaterThan(golpes);
  });
});

describe('V11 · cinco palabras clave', () => {
  it('exactamente cinco: Daño, Multi, Golpe exacto, Expuesto y Aturdido', () => {
    expect(KEYWORDS.map((k) => k.id)).toEqual(['fuerza', 'resonancia', 'limpio', 'fractura', 'desarmada']);
    expect(KEYWORDS.map((k) => k.name)).toEqual(['Daño', 'Multi', 'Golpe exacto', 'Expuesto', 'Aturdido']);
    expect(EN['palabra.fractura.nombre']).toBe('Exposed');
    expect(EN['palabra.desarmada.nombre']).toBe('Stunned');
  });
});

describe('V11 · sin restos de la cuenta vieja', () => {
  const reglas = (d: Record<string, string>) => Object.entries(d).filter(([k]) => !k.startsWith('ui.'));
  // sensible a mayúsculas y con límites de palabra: «Cien guardias» o «Iron Guard» no son la regla vieja
  const viejas = /\b(?:[Vv]entaja|Brecha|En guardia\b|Desarmad|[Aa]dvantage|Breach|On Guard\b|Disarm)/;
  const multiDecimal = /×\d+[,.]\d|\+\d+[,.]\d+ (?:de Multi|Mult)\b/;

  it('ningún texto de reglas, en español ni en inglés, nombra la rueda, la Brecha, En guardia ni Desarmado', () => {
    const malas = [...reglas(ES).map(([k, v]) => [`es ${k}`, v]), ...reglas(EN).map(([k, v]) => [`en ${k}`, v])].filter(([, v]) => viejas.test(v));
    expect(malas).toEqual([]);
  });

  it('ningún texto de reglas da un Multi con decimales', () => {
    const malas = [...reglas(ES).map(([k, v]) => [`es ${k}`, v]), ...reglas(EN).map(([k, v]) => [`en ${k}`, v])].filter(([, v]) => multiDecimal.test(v));
    expect(malas).toEqual([]);
  });
});
