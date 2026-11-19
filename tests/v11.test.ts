// V11 (SPECS/V11.md, 1.11): Multi siempre entero, cinco palabras clave, ni rastro de las palabras retiradas
// (ventaja de palo, Brecha, En guardia, Desarmado) en los textos de reglas, la campaña de cinco asaltos y
// los 36 logros de la 10.0.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/rules/balance-config';
import { GameEvent, SEALS, SUITS, TREATMENTS, activo, applyAction, currentPlayer } from '../src/rules/engine';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { ACHIEVEMENTS } from '../src/rules/achievements';
import { KEYWORDS } from '../src/rules/keywords';
import { BOSSES, LAST_STAGE, MONARCAS_VIEJOS, Run, STAGES, UPGRADES, addSpecial, finishBattle, newMeta, newRun, ordenCasas, runAction, stageConfig, stageDef, startStage, tiranoKey, trackEvents } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS, TOOL_SLOTS } from '../src/rules/tools';
import { ES } from '../src/shared/i18n/es';
import { EN } from '../src/shared/i18n/en';
import { muestra } from './muestra';

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
    expect(multis.length).toBeGreaterThan(15);
    for (const [id, n] of multis) expect(Number.isInteger(n), `${id} = ${n}`).toBe(true);
  });

  it('golpes al azar con semilla fija (5.000 en la pasada completa, 1.200 en la rápida): cada paso y cada impacto con Daño y Multi enteros, y Golpe = Daño × Multi', { timeout: 240_000 }, () => {
    const rnd = lcg(11);
    const players = [{ id: 'a', name: 'A' }];
    let golpes = 0;
    let pasos = 0;
    for (let seed = 1; golpes < muestra(5000, 1200); seed++) {
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
    expect(golpes).toBeGreaterThanOrEqual(muestra(5000, 1200));
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

// (3) la campaña de cinco asaltos (SPECS/V11.md, 1.6) y (4) los 36 logros de siempre (Steam los usa)
describe('V11 · la campaña de cinco asaltos', () => {
  it('cinco asaltos: tronos 2 / 3 / 4 / 4 / 4, monarca en 2, 4 y 5, Rey Tirano solo en el 5, ', () => {
    expect(STAGES.length).toBe(5);
    expect(LAST_STAGE).toBe(5);
    expect(STAGES.map((s) => s.thrones)).toEqual([2, 3, 4, 4, 4]);
    expect(STAGES.flatMap((s, i) => (s.boss ? [i + 1] : []))).toEqual([2, 4, 5]);
    expect(STAGES.flatMap((s, i) => (s.tirano ? [i + 1] : []))).toEqual([5]);
    expect(STAGES.map((s) => s.floors.length)).toEqual([1, 2, 2, 3, 3]);
    // salas con nombre en los dos idiomas, y el título de Tirano con su género
    STAGES.forEach((s, i) => {
      expect(ES[`asalto.${i + 1}.nombre`]).toBe(s.name);
      expect(EN[`asalto.${i + 1}.nombre`]).toBeTruthy();
    });
    expect([ES['asalto.tirano.m'], ES['asalto.tirano.f'], EN['asalto.tirano.m'], EN['asalto.tirano.f']]).toEqual(['Rey Tirano', 'Reina Tirana', 'Tyrant King', 'Tyrant Queen']);
    // V40 1c · los 4 Reyes jefe son Reyes: siempre «Rey Tirano»
    expect(BOSSES.filter((b) => b.fem).map((b) => b.id)).toEqual([]);
    for (const b of BOSSES) expect(tiranoKey(b.id)).toBe('asalto.tirano.m');
    // el Trono infinito empieza tras el asalto 5, sobre él: cuatro tronos y siempre con monarca
    expect(stageDef(6)).toMatchObject({ thrones: 4, boss: true, floors: [10, 11, 12] });
  });

  it('los tronos que faltan se crean sin guardias y con away; la Vida de cada guardia es múltiplo de 5', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const run = newRun({}, seed);
      for (const n of [1, 2]) {
        expect(run.palos[n]).toHaveLength(STAGES[n - 1].thrones);
        const state = startStage(Object.assign(structuredClone(run), { stage: n, phase: 'battle' as const }), [{ id: 'a', name: 'A' }]);
        const present = Object.values(state.towers).filter((t) => !t.away);
        expect(present.map((t) => t.suit)).toEqual(run.palos[n]);
        // V40 1c · en el asalto con monarca, la Casa de su palo acaba en el Rey (12) en vez de en su último guardia
        const jefe = STAGES[n - 1].boss ? state.config.jefe?.suit : undefined;
        for (const t of present) expect(t.floors).toEqual(t.suit === jefe ? [...STAGES[n - 1].floors.slice(0, -1), 12] : STAGES[n - 1].floors);
        for (const t of Object.values(state.towers).filter((x) => x.away)) expect(t.floors).toEqual([]);
      }
      // en los cinco asaltos y en el Trono infinito, con 1 a 4 jugadores
      for (let n = 1; n <= 7; n++)
        for (const players of [1, 2, 3, 4])
          for (const r of [10, 11, 12]) {
            const hp = stageConfig(Object.assign(structuredClone(run), { stage: n }), players).floorHp[r];
            expect(hp % 5, `asalto ${n}, ${players} jugadores, rango ${r}`).toBe(0);
            expect(hp).toBeGreaterThanOrEqual(5);
          }
    }
  });

  it('V35 · se combate Casa por Casa: solo se golpea a la primera en pie, y es ella la que contraataca', () => {
    const run = newRun({}, 3);
    const state = startStage(Object.assign(run, { phase: 'battle' as const }), [{ id: 'a', name: 'A' }]);
    const frente = activo(state)!;
    expect(frente.away).toBeFalsy();
    expect(state.config.orden).toEqual(ordenCasas(run));
    expect(frente.suit).toBe(state.config.orden![0]);
    const otra = SUITS.find((s) => !state.towers[s].away && s !== frente.suit)!;
    // una carta que no mata al guardia (sin Golpe exacto): contraataca el que tienes delante
    state.players[0].hand = [{ id: 'mano-1', suit: otra, rank: 1 }, ...state.players[0].hand.slice(1)];
    expect(() => applyAction(state, 'a', { type: 'attack', cards: ['mano-1'], target: otra })).toThrow(/enemigo que tenés delante/);
    const res = applyAction(state, 'a', { type: 'attack', cards: ['mano-1'], target: frente.suit });
    const siren = res.events.find((e): e is Extract<GameEvent, { e: 'siren' }> => e.e === 'siren')!;
    expect(siren).toMatchObject({ tower: frente.suit, reason: 'strike' });
    expect(res.state.integrity).toBe(state.integrity - siren.taken);
  });

  it('el asalto 2 se gana derribando los tres tronos que hay', () => {
    let state = startStage(Object.assign(newRun({}, 9), { stage: 2, phase: 'battle' as const }), [{ id: 'a', name: 'A' }]);
    expect(Object.values(state.towers).filter((t) => t.away)).toHaveLength(1);
    for (const s of SUITS) if (!state.towers[s].away) state.towers[s].floors = state.towers[s].floors.slice(0, 1);
    for (let i = 0; i < 400 && state.phase === 'playing'; i++) state = applyAction(state, currentPlayer(state).id, chooseAction(state)).state;
    if (state.phase === 'won') expect(Object.values(state.towers).filter((t) => t.floors.length)).toEqual([]);
  });

  it('una campaña del bot de principio a fin, con tres monarcas distintos', { timeout: 120_000 }, () => {
    let won: Run | null = null;
    for (let seed = 1; seed <= 60 && !won; seed++) {
      const run = newRun({ up: Object.fromEntries(UPGRADES.map((u) => [u.id, u.costs.length])) }, seed * 7919);
      expect(new Set(Object.values(run.bosses)).size).toBe(3);
      expect(Object.keys(run.bosses).map(Number)).toEqual([2, 4, 5]);
      const faced: string[] = [];
      for (let guard = 0; guard < 5000 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
        if (run.phase === 'battle') {
          if (run.boss) faced.push(run.boss);
          let state = startStage(run, [{ id: 'a', name: 'A' }]);
          while (state.phase === 'playing') {
            const r = applyAction(state, currentPlayer(state).id, chooseAction(state));
            trackEvents(run, r.events);
            state = r.state;
          }
          finishBattle(run, state);
        } else expect(runAction(run, chooseRunAction(run)!)).toBeNull();
      }
      if (run.phase === 'won') {
        won = run;
        expect(new Set(faced).size).toBe(3);
        expect(run.stats.stageTurns).toHaveLength(5);
      }
    }
    expect(won).not.toBeNull();
  });
});

describe('V11 · los 36 logros de la 10.0, con los mismos id', () => {
  /** La lista de la 10.0 (src/rules/achievements.ts en v10.0.0), escrita a mano: Steam los usa. */
  const IDS_10 = [
    'primera', 'capataz', 'media', 'madre', 'asc3', 'abismo', 'abismo3', 'diaria', 'doblepar', 'color', 'full', 'poker', 'real', 'golpe100', 'golpe500', 'golpe2000', 'limpio10', 'limpio50',
    'pisos100', 'pisos500', 'intacto', 'rico', 'cinturon', 'forja', 'contratos', 'atajo', 'coleccion', 'ferretero',
    'j-doble', 'j-escasez', 'j-sequia', 'j-intemperie', 'j-blindaje', 'j-furia', 'j-inestable', 'jefes',
  ];

  it('siguen siendo 36 y con los mismos id, menos «diaria» (V40: se fue el Asalto diario) y los trofeos de los monarcas (V40 1c: los de los 4 Reyes)', () => {
    expect(IDS_10).toHaveLength(36);
    const viejos = Object.keys(MONARCAS_VIEJOS).map((m) => `j-${m}`);
    const reyes = BOSSES.map((b) => `j-${b.id}`);
    expect(ACHIEVEMENTS.map((a) => a.id).sort()).toEqual([...IDS_10.filter((id) => id !== 'diaria' && !viejos.includes(id)), ...reyes].sort());
  });

  it('«Adiós, carcelero» pide el asalto 2 y «Medio castillo» el asalto 3, en los dos idiomas', () => {
    const meta = newMeta();
    const of = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;
    const done = (a: (typeof ACHIEVEMENTS)[number], m: typeof meta) => a.progress(m)[0] >= a.progress(m)[1];
    meta.stats.reach = 1;
    expect(done(of('capataz'), meta)).toBe(false);
    meta.stats.reach = 2;
    expect(done(of('capataz'), meta)).toBe(true);
    expect(done(of('media'), meta)).toBe(false);
    meta.stats.reach = 3;
    expect(done(of('media'), meta)).toBe(true);
    expect([ES['logro.capataz.desc'], ES['logro.media.desc']]).toEqual(['Supera el asalto 2.', 'Supera el asalto 3.']);
    expect([EN['logro.capataz.desc'], EN['logro.media.desc']]).toEqual(['Clear assault 2.', 'Clear assault 3.']);
  });
});
