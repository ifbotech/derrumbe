// V40 1c · Los 4 Reyes y sus Bendiciones: la oferta (Reyes distintos, Duales solo con su requisito, reproducible),
// las cargas (suman, se ven, viajan con la campaña), los niveles con 2 y 4 piezas, el Rey jefe (su guardia, su
// Furia y su frase) y la migración de los perfiles con los siete monarcas viejos.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/rules/balance-config';
import { Card, Config, DEFAULT_CONFIG, GameState, REY, Suit, applyAction, createGame, newTowers, previewStrike, siegeLevel, strike, type StrikeEnv } from '../src/rules/engine';
import { META_40B, campanaSinReyes, migraMeta40c } from '../src/rules/migracion';
import {
  BENDICION,
  BENDICIONES,
  DUALES,
  PALO_DE_REY,
  REY_IDS,
  type BendInst,
  type ReyId,
  bendicionesDe,
  bendicionesVisibles,
  dadoSalva,
  esDe,
  fraseRey,
  nivelesCfg,
  nivelesReyes,
  ofertaBendiciones,
  relacionRey,
  reyesDe,
} from '../src/rules/reyes';
import { BOSSES, EVENT, META_VERSION, MONARCAS_VIEJOS, RUN_VERSION, Run, cargaRun, finishBattle, loadMeta, newMeta, newRun, runAction, stageConfig, startStage } from '../src/rules/run';
import { tFor } from '../src/shared/i18n';

const P = [{ id: 'a', name: 'A' }];
const act = (run: Run, a: Parameters<typeof runAction>[1]) => expect(runAction(run, a), JSON.stringify(a)).toBeNull();
const card = (id: string): Card => ({ id, suit: id[0] as Suit, rank: Number(id.slice(1)) });
const OF = BALANCE.oferta;

/** Gana el asalto en curso sin jugarlo y llega a La Pulpería. */
function ganaYCompra(run: Run): void {
  if (run.phase === 'bendicion') act(run, { t: 'bendicion', i: 0 });
  act(run, { t: 'route', i: 0 });
  const st = startStage(run, P);
  for (const t of Object.values(st.towers)) t.floors = [];
  st.phase = 'won';
  finishBattle(run, st);
  if (!run.looted) act(run, { t: 'loot', id: null });
  act(run, { t: 'draft', i: null });
  expect(run.phase).toBe('shop');
}

/** Un golpe de prueba con estas Bendiciones (mesa ancha, sin jefe). */
function env(bend: BendInst[], extra: Partial<StrikeEnv> = {}): StrikeEnv {
  // se golpea a Oros (el enemigo activo): Espadas, Bastos y Copas no le son Inmunes
  const config: Config = { ...structuredClone(DEFAULT_CONFIG), floorHp: { 10: 900, 11: 900, 12: 900 }, orden: ['D', 'C', 'H', 'S'] };
  return { config, towers: newTowers([10, 11], config), tools: [], chain: 0, charge: 0, scrap: 0, integrity: 20, wall: 0, bendiciones: bend, ...extra };
}

/** Una jugada válida al azar: de 1 a 4 cartas del mismo número, de palos distintos (sola, pareja, trío o póker). */
function manoAl(azar: (n: number) => number): Card[] {
  const rank = 1 + azar(7);
  const palos: Suit[] = ['S', 'C', 'D', 'H'];
  for (let i = 3; i > 0; i--) {
    const j = azar(i + 1);
    [palos[i], palos[j]] = [palos[j], palos[i]];
  }
  return palos.slice(0, 1 + azar(4)).map((p) => card(`${p}${rank}`));
}

describe('V40 1c · la oferta de Bendiciones', () => {
  it('al empezar ofrecen Reyes distintos, cada uno una Bendición suya; elegir una la deja con 0 cargas y abre el Mapa', () => {
    const run = newRun({ seedText: 'REYES-1' }, 3);
    act(run, { t: 'begin' });
    expect(run.phase).toBe('bendicion');
    expect(run.oferta).toHaveLength(OF.inicio);
    const op = run.oferta!;
    expect(new Set(op.map((o) => o.rey)).size).toBe(op.length);
    for (const o of op) expect(esDe(BENDICION[o.id], o.rey), o.id).toBe(true);
    // la Bendición que no está en la oferta no se puede tomar, ni se elige fuera de la oferta
    expect(runAction(run, { t: 'bendicion', i: 9 })).toBe('Esa Bendición no está en la oferta.');
    act(run, { t: 'bendicion', i: 1 });
    expect(run.bendiciones).toEqual([{ id: op[1].id, n: 0 }]);
    expect(run.phase).toBe('map');
    expect(run.oferta).toBeNull();
    expect(runAction(run, { t: 'bendicion', i: 0 })).toBe('No hay Bendiciones que elegir.');
  });

  it('entre asaltos vuelven a ofrecer (con oferta.entre Reyes), y nunca una Bendición que ya llevás', () => {
    const run = newRun({ seedText: 'REYES-2' }, 3);
    act(run, { t: 'begin' });
    for (let stage = 1; stage <= 4; stage++) {
      ganaYCompra(run);
      act(run, { t: 'next' });
      if (run.phase === 'event') act(run, { t: 'event', i: EVENT[run.event!].options.length - 1 });
      expect(run.phase, `tras el asalto ${stage}`).toBe('bendicion');
      expect(run.oferta).toHaveLength(OF.entre);
      for (const o of run.oferta!) expect(run.bendiciones.some((b) => b.id === o.id), o.id).toBe(false);
    }
    expect(run.bendiciones.length).toBe(4);
  });

  it('es reproducible: la misma semilla da la misma oferta, y no depende de nada más de la campaña', () => {
    const a = newRun({ seedText: 'MISMA' }, 3);
    const b = newRun({ seedText: 'MISMA' }, 3);
    b.gold = 99;
    act(a, { t: 'begin' });
    act(b, { t: 'begin' });
    expect(a.oferta).toEqual(b.oferta);
    expect(ofertaBendiciones(77, 3, [{ id: 'filo', n: 2 }], 3)).toEqual(ofertaBendiciones(77, 3, [{ id: 'filo', n: 0 }], 3));
    // y varía entre semillas
    expect(new Set(Array.from({ length: 40 }, (_, s) => JSON.stringify(ofertaBendiciones(s, 1, [], 2)))).size).toBeGreaterThan(5);
  });

  it('una Dual solo sale si llevás una de cada uno de sus dos Reyes, y en el sitio de uno de ellos', () => {
    const una = (rey: ReyId) => bendicionesDe(rey)[0].id;
    let vistas = 0;
    for (let seed = 0; seed < 400; seed++) {
      // de un solo Rey: nunca una Dual
      for (const r of REY_IDS) for (const o of ofertaBendiciones(seed, 2, [{ id: una(r), n: 0 }, { id: bendicionesDe(r)[1].id, n: 0 }], 3)) expect(o.dual, o.id).toBeUndefined();
      // de dos Reyes: a veces la Dual de ese par, que cuenta para los dos
      const bend = [{ id: una('espadas'), n: 0 }, { id: una('oros'), n: 0 }];
      for (const o of ofertaBendiciones(seed, 3, bend, 3)) {
        if (!o.dual) continue;
        vistas++;
        const d = BENDICION[o.id];
        expect(reyesDe(d).sort()).toEqual(['espadas', 'oros']);
        expect(reyesDe(d)).toContain(o.rey);
      }
    }
    expect(vistas).toBeGreaterThan(20);
    expect(DUALES.some((d) => reyesDe(d).sort().join() === 'espadas,oros')).toBe(true);
  });

  it('el bot del laboratorio elige en la oferta', async () => {
    const { chooseRunAction } = await import('../src/rules/bot');
    const run = newRun({ seedText: 'BOT' }, 3);
    act(run, { t: 'begin' });
    const a = chooseRunAction(run);
    expect(a?.t).toBe('bendicion');
    act(run, a!);
    expect(run.bendiciones).toHaveLength(1);
  });
});

describe('V40 1c · cargas', () => {
  it('Filo templado: +Daño por cada carta de Espadas, y cada carga suma Daño a todos los golpes (con su paso en el desglose)', () => {
    const v = BALANCE.bendiciones.filo;
    // una pareja de cincos con una de Espadas
    const mano = [card('S5'), card('C5')];
    const sin = previewStrike(env([]), mano, 'D').fuerza;
    expect(sin).toBeGreaterThan(0);
    const con = previewStrike(env([{ id: 'filo', n: 0 }]), mano, 'D');
    expect(con.fuerza).toBe(sin + v.dano);
    const cargada = previewStrike(env([{ id: 'filo', n: 3 }]), mano, 'D');
    expect(cargada.fuerza).toBe(sin + v.dano + 3 * v.carga);
    expect(cargada.events.some((e) => e.e === 'step' && e.src === 'bendicion' && e.id === 'filo')).toBe(true);
  });

  it('las cargas suben al cumplirse su condición, viajan a la campaña y sobreviven al guardado', () => {
    const run = newRun({ seedText: 'CARGAS' }, 3);
    act(run, { t: 'begin' });
    act(run, { t: 'bendicion', i: 0 });
    run.bendiciones = [{ id: 'filo', n: 0 }];
    act(run, { t: 'route', i: 0 });
    let st = startStage(run, P);
    // un Golpe exacto: el guardia al frente queda justo a cero
    const frente = (st.config.orden ?? ['S', 'C', 'D', 'H']).find((s) => st.towers[s].floors.length)!;
    const sola = card(`${frente === 'C' ? 'D' : 'C'}2`); // nunca del palo del enemigo (le sería Inmune)
    st.players[0].hand = [sola];
    const dealt = previewStrike(st, [sola], frente).dealt[frente] ?? 0;
    expect(dealt).toBeGreaterThan(0);
    st.towers[frente].damage = st.config.floorHp[st.towers[frente].floors[0]] - dealt;
    st = applyAction(st, 'a', { type: 'attack', cards: [sola.id], target: frente }).state;
    expect(st.bendiciones?.[0].n).toBe(1);
    for (const t of Object.values(st.towers)) t.floors = [];
    st.phase = 'won';
    finishBattle(run, st);
    expect(run.bendiciones[0].n).toBe(1);
    const vuelta = cargaRun(JSON.parse(JSON.stringify(run)));
    expect(vuelta?.bendiciones).toEqual([{ id: 'filo', n: 1 }]);
    // y se ven: «Espadas +n»
    expect(bendicionesVisibles([{ id: 'filo', n: 3 }])[0].pildora).toBe(`Espadas +${3 * BALANCE.bendiciones.filo.carga}`);
    expect(bendicionesVisibles([{ id: 'filo', n: 0 }])[0].pildora).toBe('Espadas');
  });

  it('el Multi sigue entero con cualquier Bendición y cualquier número de cargas', () => {
    let semilla = 12345;
    const azar = (n: number) => ((semilla = (semilla * 1103515245 + 12345) >>> 0) % n);
    for (let i = 0; i < 600; i++) {
      const bend = Array.from({ length: 1 + azar(4) }, () => ({ id: BENDICIONES[azar(BENDICIONES.length)].id, n: azar(6) }));
      const mano = manoAl(azar);
      const r = previewStrike(env(bend, { dado: 1 + azar(6), wall: azar(8) }), mano, 'D');
      expect(Number.isInteger(r.res), JSON.stringify({ bend, mano })).toBe(true);
      expect(Number.isInteger(r.fuerza)).toBe(true);
    }
  });

  it('ninguna Bendición tiene un efecto negativo: con ella el golpe nunca hace menos', () => {
    let semilla = 99;
    const azar = (n: number) => ((semilla = (semilla * 1103515245 + 12345) >>> 0) % n);
    for (const b of BENDICIONES)
      for (let i = 0; i < 80; i++) {
        const mano = manoAl(azar);
        const target = 'D';
        const extra = { dado: 1 + azar(6), wall: azar(6) };
        const sin = previewStrike(env([], extra), mano, target);
        const con = previewStrike(env([{ id: b.id, n: azar(4) }], extra), mano, target);
        expect(con.total, `${b.id} con ${mano.map((c) => c.id).join(' ')}`).toBeGreaterThanOrEqual(sin.total);
        expect(con.wallGain + con.repair + con.gold, b.id).toBeGreaterThanOrEqual(sin.wallGain + sin.repair + sin.gold);
      }
  });
});

describe('V40 1c · niveles de los Reyes con 2 y 4 piezas', () => {
  it('una sola cuenta (nivelesReyes) con varias fuentes: Bendiciones (las Duales, a los dos) y Amuletos', () => {
    const esp = bendicionesDe('espadas').map((b) => ({ id: b.id, n: 0 }));
    expect([0, 1, 2, 3, 4].map((k) => nivelesReyes({ bendiciones: esp.slice(0, k) }).espadas.nivel)).toEqual([0, 0, 1, 1, 2]);
    expect(nivelesReyes({ bendiciones: esp.slice(0, 1) }).espadas.falta).toBe(1);
    expect(nivelesReyes({ bendiciones: esp.slice(0, 3) }).espadas.falta).toBe(1);
    expect(nivelesReyes({ bendiciones: esp.slice(0, 4) }).espadas.falta).toBe(0);
    const dual = DUALES[0];
    const nv = nivelesReyes({ bendiciones: [{ id: dual.id, n: 0 }] });
    for (const r of reyesDe(dual)) expect(nv[r].n).toBe(1);
    // los Amuletos (tramo 1d) suman en la misma cuenta
    expect(nivelesReyes({ bendiciones: esp.slice(0, 1), amuletos: ['espadas'] }).espadas.nivel).toBe(1);
    expect(nivelesReyes({}).copas).toEqual({ n: 0, nivel: 0, falta: 2 });
  });

  const piezas = (rey: ReyId, n: number) => bendicionesDe(rey).slice(0, n).map((d) => ({ id: d.id, n: 0 }));

  it('Espadas [2]: el Golpe exacto (y la caída) admite quedarse corto o pasarse por la tolerancia', () => {
    const tol = BALANCE.niveles.espadas.tol;
    const con = { ...structuredClone(DEFAULT_CONFIG) };
    nivelesCfg(con, nivelesReyes({ bendiciones: piezas('espadas', 2) }));
    expect(con.cleanTol).toBe(tol);
    const sin = { ...structuredClone(DEFAULT_CONFIG) };
    nivelesCfg(sin, nivelesReyes({ bendiciones: piezas('espadas', 1) }));
    expect(sin.cleanTol ?? 0).toBe(0);
  });

  it('Espadas [4]: con 2 cartas de Espadas o más, ×Multi y el enemigo queda Aturdido (con su paso en el desglose)', () => {
    const escalera = [card('S2'), card('S3'), card('C4')];
    const de4 = env(piezas('espadas', 4));
    const r = strike(de4, escalera, 'D');
    expect(r.events.some((e) => e.e === 'step' && e.src === 'rey' && e.id === 'espadas')).toBe(true);
    expect(de4.towers.D.fx.sobrecarga).toBe(true);
    const de3 = env(piezas('espadas', 3));
    const r3 = strike(de3, escalera, 'D');
    expect(r3.events.some((e) => e.e === 'step' && e.src === 'rey')).toBe(false);
    expect(r.res).toBe(r3.res * BALANCE.niveles.espadas.x);
  });

  it('Oros [2] y [4]: el dado alto hace que el Contraataque del turno no llegue', () => {
    expect(dadoSalva(piezas('oros', 1), 6)).toBe(false);
    expect(dadoSalva(piezas('oros', 2), BALANCE.niveles.oros.cara)).toBe(true);
    expect(dadoSalva(piezas('oros', 2), BALANCE.niveles.oros.cara - 1)).toBe(false);
    expect(dadoSalva(piezas('oros', 4), BALANCE.niveles.oros.cara4)).toBe(true);
    expect(dadoSalva(piezas('oros', 4), BALANCE.niveles.oros.cara4 - 1)).toBe(false);
    expect(dadoSalva(piezas('oros', 4), undefined)).toBe(false);
    // y en la mesa: con el dado salvador, el Contraataque se anuncia como que no llega
    const config: Config = { ...structuredClone(DEFAULT_CONFIG), floorHp: { 10: 900, 11: 900, 12: 900 } };
    let st: GameState = { ...createGame(P, 7, config), towers: newTowers([10, 11], config), bendiciones: piezas('oros', 2), dado: 6 };
    st.players[0].hand = [card('C2'), card('C3')];
    const antes = st.integrity;
    const res = applyAction(st, 'a', { type: 'discard', cards: ['C2'] });
    st = res.state;
    expect(res.events.some((e) => e.e === 'siren' && e.reason === 'sobrecarga')).toBe(true);
    expect(st.integrity).toBe(antes);
  });

  it('Bastos [4] y Copas [2]/[4]: Escudo y curación por guardia abatido', () => {
    const facil = (bend: BendInst[]) => env(bend, { config: { ...structuredClone(DEFAULT_CONFIG), floorHp: { 10: 2, 11: 900, 12: 900 }, orden: ['D', 'C', 'H', 'S'] } });
    const golpe = (bend: BendInst[], c: string) => strike(facil(bend), [card(c)], 'D');
    expect(golpe(piezas('bastos', 4), 'C5').wallGain).toBe(golpe(piezas('bastos', 3), 'C5').wallGain + BALANCE.niveles.bastos.escudo2);
    const cura = (bend: BendInst[], c: string) => golpe(bend, c).events.some((e) => e.e === 'step' && e.src === 'rey' && e.id === 'copas');
    expect(cura(piezas('copas', 2), 'H5')).toBe(true);
    expect(cura(piezas('copas', 2), 'C5')).toBe(false);
    expect(cura(piezas('copas', 4), 'C5')).toBe(true);
  });
});

describe('V40 1c · el Rey jefe', () => {
  it('los monarcas de los asaltos 2, 4 y 5 son siempre de los 4 Reyes', () => {
    expect(BOSSES.map((b) => b.id).sort()).toEqual([...REY_IDS].sort());
    for (let s = 0; s < 40; s++) {
      const run = newRun({ seedText: `JEFE-${s}` }, 3);
      for (const st of [2, 4, 5]) expect(REY_IDS as string[]).toContain(run.bosses[st]);
    }
  });

  it('cierra la Casa de su palo: su último guardia es el Rey, con la Furia y el rasgo de su Rey', () => {
    for (const stage of [2, 4, 5]) {
      const run = newRun({ seedText: `CASA-${stage}` }, 3);
      act(run, { t: 'begin' });
      act(run, { t: 'bendicion', i: 0 });
      run.stage = stage;
      run.boss = run.bosses[stage];
      run.phase = 'battle';
      const rey = run.bosses[stage] as ReyId;
      const cfg = stageConfig(run);
      expect(cfg.jefe?.rey).toBe(rey);
      expect(cfg.jefe?.suit).toBe(PALO_DE_REY[rey]);
      expect(cfg.jefe?.furia).toBe(BALANCE.reyes[rey].furia);
      expect(cfg.orden?.[cfg.orden.length - 1]).toBe(PALO_DE_REY[rey]);
      const st = startStage(run, P);
      const casa = st.towers[PALO_DE_REY[rey]].floors;
      expect(casa[casa.length - 1]).toBe(REY);
      if (rey === 'espadas') expect(st.config.jefe?.perfora).toBe(BALANCE.reyes.espadas.perfora);
      if (rey === 'bastos') expect(st.config.jefe?.sinFx).toBe(true);
      if (rey === 'oros') expect(st.config.jefe?.dado).toBe(BALANCE.reyes.oros.dado);
      if (rey === 'copas') expect(st.config.jefe?.cura).toBe(BALANCE.reyes.copas.cura);
    }
  });

  it('su Furia sube cada turno que sigue al frente y entra en el Ataque de la mesa', () => {
    const config: Config = { ...structuredClone(DEFAULT_CONFIG), floorHp: { 10: 900, 11: 900, 12: 900 }, orden: ['S'] };
    config.jefe = { suit: 'S', vida: 1, furia: 3, rey: 'espadas' };
    let s = { ...createGame(P, 7, config), towers: newTowers([10, 11], config) };
    for (const o of ['S', 'C', 'D', 'H'] as const) s.towers[o].floors = o === 'S' ? [REY] : [];
    s.players[0].hand = [card('C2'), card('C3'), card('C4')];
    const antes = siegeLevel({ ...s, furiaRey: s.furiaRey ?? 0 });
    s = applyAction(s, 'a', { type: 'discard', cards: ['C2'] }).state;
    expect(s.furiaRey).toBe(3);
    s = applyAction(s, 'a', { type: 'discard', cards: ['C3'] }).state;
    expect(s.furiaRey).toBe(6);
    expect(siegeLevel(s)).toBe(antes + 6);
  });

  it('habla según lo que llevás de él: aliado, rival o neutral, con frases de ≤ 90 caracteres en los dos idiomas', () => {
    const esp = { id: bendicionesDe('espadas')[0].id, n: 0 };
    const oro = { id: bendicionesDe('oros')[0].id, n: 0 };
    expect(relacionRey([], 'espadas')).toBe('neutral');
    expect(relacionRey([esp], 'espadas')).toBe('aliado');
    expect(relacionRey([oro], 'espadas')).toBe('rival');
    expect(fraseRey([esp, oro], 'oros')).toBe('rey.oros.frase.aliado');
    for (const r of REY_IDS)
      for (const rel of ['aliado', 'rival', 'neutral'])
        for (const l of ['es', 'en'] as const) {
          const f = tFor(l, `rey.${r}.frase.${rel}`);
          expect(f, `${l} ${r} ${rel}`).not.toBe(`rey.${r}.frase.${rel}`);
          expect(f.length, f).toBeLessThanOrEqual(90);
        }
  });
});

describe('V40 1c · migración de los siete monarcas a los 4 Reyes', () => {
  it('los trofeos y la Colección de los monarcas viejos pasan al Rey de su palo', () => {
    const meta = { ach: { 'j-sequia': true, 'j-furia': true, primera: true } as Record<string, boolean>, seen: { bosses: ['doble', 'furia', 'sequia'] } };
    migraMeta40c(meta, MONARCAS_VIEJOS);
    expect(meta.ach).toEqual({ 'j-copas': true, 'j-espadas': true, primera: true });
    expect(meta.seen.bosses.sort()).toEqual(['copas', 'espadas']);
  });

  it('un perfil del tramo 1b se carga con los Reyes y la versión nueva', () => {
    const vieja = { ...newMeta(), v: META_40B, ach: { 'j-blindaje': true } as Record<string, boolean> };
    vieja.seen = { ...vieja.seen, bosses: ['blindaje', 'intemperie'] };
    const meta = loadMeta(JSON.parse(JSON.stringify(vieja)));
    expect(meta.v).toBe(META_VERSION);
    expect(meta.ach['j-bastos']).toBe(true);
    expect(meta.ach['j-blindaje']).toBeUndefined();
    expect(meta.seen.bosses).toEqual(['bastos']);
  });

  it('una campaña a medias de los tramos 1a y 1b no se sigue (se cobra al abrir); la de ahora sí', () => {
    expect(campanaSinReyes({ v: 6 })).toBe(true);
    expect(campanaSinReyes({ v: 7 })).toBe(true);
    expect(campanaSinReyes({ v: RUN_VERSION })).toBe(false);
    const run = newRun({ seedText: 'GUARDADO' }, 3);
    act(run, { t: 'begin' });
    expect(cargaRun({ ...JSON.parse(JSON.stringify(run)), v: 7 })).toBeNull();
    expect(cargaRun(JSON.parse(JSON.stringify(run)))?.oferta).toEqual(run.oferta);
  });
});
