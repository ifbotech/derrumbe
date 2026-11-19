import { describe, expect, it } from 'vitest';
import { chooseAction } from '../src/rules/bot';
import { Card, Config, DEFAULT_CONFIG, DIFFICULTY, GameState, applyAction, createGame, currentPlayer, esJefe, fatigueAt, floorHp, newTowers, previewStrike, strike, threatOf, viewFor } from '../src/rules/engine';
import { BOSS, FURIA, STAGES, newRun, stageConfig } from '../src/rules/run';
import { SPECIAL } from '../src/rules/specials';
import { TOOL, TOOLS } from '../src/rules/tools';
import { BALANCE } from '../src/rules/balance-config';

const card = (id: string): Card => ({ id, suit: id[0] as Card['suit'], rank: Number(id.slice(1)) });
const cfgWith = (extra: Partial<Config> = {}): Config => ({ ...structuredClone(DEFAULT_CONFIG), ...extra });
/** Una mesa mínima para probar golpes: cuatro torres de un piso (J) y lo que se le añada. */
function table(config: Config, tools: string[] = [], extra: Partial<GameState> = {}): GameState {
  for (const id of tools) TOOL[id].cfg?.(config);
  return { ...createGame([{ id: 'a', name: 'A' }], 7, config), towers: newTowers([10, 11], config), tools: tools.map((id) => ({ id, n: 0 })), ...extra };
}

describe('fatiga de cimientos', () => {
  it('sube un nivel desde el turno de inicio y cada tantos turnos; sin configurar, no existe', () => {
    const cfg = cfgWith({ fatigueStart: 8, fatigueEvery: 2 });
    expect([0, 7, 8, 9, 10, 13, 14].map((t) => fatigueAt(cfg, t))).toEqual([0, 0, 1, 1, 2, 3, 4]);
    expect(fatigueAt(cfgWith(), 99)).toBe(0);
  });

  it('V35 · la Furia solo sube el Ataque de los enemigos: tus golpes no cambian', () => {
    const cfg = cfgWith({ fatigueStart: 8, fatigueEvery: 2 });
    const fresh = table(cfg);
    const tired = table(cfg, [], { fatigue: 3 });
    const hit = [card('S5')];
    expect(previewStrike(tired, hit, 'D').fuerza).toBe(previewStrike(fresh, hit, 'D').fuerza);
    expect(previewStrike(tired, hit, 'D').res).toBe(previewStrike(fresh, hit, 'D').res);
    expect(threatOf(tired, tired.towers.S)).toBe(threatOf(fresh, fresh.towers.S) + 3);
  });

  it('el motor la sube sola al pasar los turnos, avisa con un evento y la enseña en la vista', () => {
    let state = createGame([{ id: 'a', name: 'A' }], 11, cfgWith({ fatigueStart: 2, fatigueEvery: 1, floorHp: { 10: 900, 11: 900, 12: 900 }, floorThreat: { 10: 0, 11: 0, 12: 0 } }));
    const seen: number[] = [];
    for (let i = 0; i < 4 && state.phase === 'playing'; i++) {
      const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
      state = res.state;
      if (state.stashed) continue; // guardar en el andamio no gasta turno
      for (const ev of res.events) if (ev.e === 'fatigue') seen.push(ev.level);
    }
    expect(state.fatigue).toBe(fatigueAt(state.config, state.turnCount));
    expect(seen.length).toBeGreaterThan(0);
    expect(viewFor(state, 'a').fatigue).toBe(state.fatigue);
  });

  it('V35 · la campaña no tiene reloj de turnos (Furia por Mazo agotado y por turnos del monarca); la clásica lo conserva', () => {
    const cfg = stageConfig(newRun({}, 3), 1);
    expect(cfg.fatigueStart).toBeUndefined();
    expect(cfg.collapseSiege).toBe(FURIA.mazo);
    expect(DIFFICULTY.obra.fatigueStart!).toBeGreaterThan(20);
    expect(DEFAULT_CONFIG.fatigueStart).toBeUndefined();
  });

  it('V35 · Furia del Rey: cada turno que el monarca sigue de enemigo activo, la Furia sube; su Vida va multiplicada', () => {
    const cfg = cfgWith({ floorHp: { 10: 900, 11: 900, 12: 900 }, floorThreat: { 10: 1, 11: 1, 12: 2 }, jefe: { suit: 'S', vida: 2, furia: 1 } });
    const s = table(cfg, [], { integrity: 20 });
    // PICAS es la Casa activa y le queda un solo guardia (el Rey): es el monarca
    s.towers.S.floors = [12];
    expect(esJefe(cfg, s.towers.S)).toBe(true);
    expect(floorHp(s.towers.S, cfg)).toBe(1800);
    expect(esJefe(cfg, s.towers.D)).toBe(false);
    s.players[0].hand = [card('H2'), card('H3'), card('H4')];
    const uno = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    expect(uno.state.furiaRey).toBe(1);
    expect(uno.state.fatigue).toBe(1);
    expect(uno.events.some((e) => e.e === 'fatigue' && e.level === 1)).toBe(true);
    const dos = applyAction(uno.state, 'a', { type: 'discard', cards: ['H3'] });
    expect(dos.state.fatigue).toBe(2);
    // el segundo Contraataque ya lleva la Furia del primero: 2 del Rey + 1
    expect(dos.events.find((e) => e.e === 'siren')).toMatchObject({ tower: 'S', threat: 3, asedio: 1 });
    // contra un guardia que no es el monarca la Furia no sube sola
    const guardia = table(cfg, [], { integrity: 20 });
    guardia.players[0].hand = [card('H2'), card('H3')];
    expect(applyAction(guardia, 'a', { type: 'discard', cards: ['H2'] }).state.fatigue).toBe(0);
  });

  // V11-C: los asaltos 1–3 enseñan (Ataque bajo) y la dureza llega en el 4 y el 5; la Vida ya no se mantiene baja,
  // porque el Asedio fuerte recorta la cola de turnos
  it('la dureza crece: el Ataque de los asaltos 1 a 3 queda por debajo del de los asaltos 4 y 5', () => {
    const early = Math.max(...STAGES.slice(0, 3).map((s) => s.threat));
    for (const st of STAGES.slice(3)) expect(st.threat).toBeGreaterThan(early);
    // V40 1c · con las Bendiciones la campaña pega más, y los guardias de los asaltos 3 a 5 aguantan más
    expect(Math.max(...STAGES.map((s) => s.hp))).toBeLessThan(12);
  });
});

describe('Rey de Bastos: la defensa se cobra en daño', () => {
  it('V40 1d · la familia del Rey de Bastos trae sus cinco Amuletos', () => {
    expect(TOOLS.filter((t) => t.arch === 'bastos').map((t) => t.id)).toEqual(['maza', 'sacos', 'encofrado', 'contragolpe', 'sordina']);
  });

  it('el Talero devuelve el triple de lo que el Escudo frena entero, y nada si el Contraataque pasa', () => {
    const play = (wall: number) => {
      const cfg = cfgWith({ floorHp: { 10: 900, 11: 900, 12: 900 } });
      const s = table(cfg, ['contragolpe'], { wall });
      // contraataca el enemigo activo: la Sota de PICAS (Ataque 3)
      s.players[0].hand = [card('S2'), card('S3')];
      const out = applyAction(s, 'a', { type: 'discard', cards: ['S2'] }).state;
      return out.towers.S.damage;
    };
    expect(play(5)).toBe(9);
    expect(play(1)).toBe(0);
  });
});

describe('V40 1c · los 4 Reyes jefe en la mesa', () => {
  /** Una mesa con el Rey del palo `suit` solo al frente (las otras Casas ya cayeron) y su rasgo puesto. */
  const conRey = (id: string, suit: 'S' | 'C' | 'D' | 'H', extra: Partial<GameState> = {}) => {
    const cfg = cfgWith({ floorHp: { 10: 900, 11: 900, 12: 900 }, orden: [suit] });
    cfg.jefe = { suit, vida: 1, furia: 1, rey: id as 'espadas' };
    BOSS[id].apply(cfg);
    const s = table(cfg, [], extra);
    for (const o of ['S', 'C', 'D', 'H'] as const) s.towers[o].floors = o === suit ? [12] : [];
    return s;
  };

  it('Bastos: mientras está al frente no queda Expuesto ni Aturdido', () => {
    const s = conRey('bastos', 'C');
    expect(esJefe(s.config, s.towers.C)).toBe(true);
    strike(s, [card('D2'), card('D3'), card('D4')], 'C'); // un solo palo: dejaría Expuesto
    strike(s, [card('S3'), card('H4'), card('D5')], 'C'); // tres palos: dejaría Aturdido
    expect(s.towers.C.fx).toEqual({});
  });

  it('Oros: su dado suma de +1 a +caras a su Contraataque; sin dado, nada', () => {
    const s = conRey('oros', 'D');
    const base = threatOf({ config: s.config }, s.towers.D);
    expect(threatOf({ config: s.config, dado: 1 }, s.towers.D)).toBe(base + 1);
    expect(threatOf({ config: s.config, dado: 6 }, s.towers.D)).toBe(base + BALANCE.reyes.oros.dado);
    for (let d = 1; d <= 6; d++) expect(Number.isInteger(threatOf({ config: s.config, dado: d }, s.towers.D))).toBe(true);
  });

  it('Espadas: su Contraataque atraviesa parte del Escudo', () => {
    const golpe = (wall: number) => {
      const s = conRey('espadas', 'S', { wall });
      s.players[0].hand = [card('C2'), card('C3')];
      const before = s.integrity;
      const out = applyAction(s, 'a', { type: 'discard', cards: ['C2'] }).state;
      return before - out.integrity;
    };
    const ataque = threatOf({ config: conRey('espadas', 'S').config }, conRey('espadas', 'S').towers.S);
    // con Escudo de sobra, entra justo lo que atraviesa
    expect(golpe(99)).toBe(Math.min(ataque, BALANCE.reyes.espadas.perfora));
    expect(golpe(0)).toBe(ataque);
  });

  it('Copas: cada turno que sigue al frente se cura, sin pasar de lo que le hicieron', () => {
    const s = conRey('copas', 'H');
    s.towers.H.damage = 50;
    s.players[0].hand = [card('C2'), card('C3'), card('C4')];
    const out = applyAction(s, 'a', { type: 'discard', cards: ['C2'] }).state;
    expect(out.towers.H.damage).toBe(50 - BALANCE.reyes.copas.cura);
    expect(out.furiaRey).toBe(1);
  });
});

describe('partida clásica en cuadrilla', () => {
  it('V27 · el Mazo agotado sube el Asedio final 1 nivel, jueguen los que jueguen, y no quita Vida', () => {
    const sube = (n: number) => {
      const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      const s = createGame(players, 5, DIFFICULTY.obra);
      s.discard = s.deck;
      s.deck = [];
      const before = s.integrity;
      const hand = s.players[0].hand;
      const out = applyAction(s, 'p0', { type: 'discard', cards: [hand[0].id] });
      const ev = out.events.find((e) => e.e === 'collapse');
      // la Vida solo puede bajar por el Contraataque que sigue, nunca por barajar
      const golpe = out.events.find((e) => e.e === 'siren');
      expect(before - out.state.integrity).toBe(golpe && golpe.e === 'siren' ? golpe.taken : 0);
      return ev && ev.e === 'collapse' ? ev.sube : -1;
    };
    for (const n of [1, 2, 3, 4]) expect(sube(n)).toBe(DIFFICULTY.obra.collapseSiege);
    expect(DIFFICULTY.brutal.collapseSiege).toBeGreaterThan(DIFFICULTY.obra.collapseSiege);
  });
});
