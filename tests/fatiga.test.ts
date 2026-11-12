import { describe, expect, it } from 'vitest';
import { chooseAction } from '../src/rules/bot';
import { Card, Config, DEFAULT_CONFIG, DIFFICULTY, GameState, applyAction, createGame, currentPlayer, fatigueAt, newTowers, previewStrike, strike, threatOf, viewFor } from '../src/rules/engine';
import { BOSS, FATIGUE, STAGES, newRun, stageConfig } from '../src/rules/run';
import { SPECIAL } from '../src/rules/specials';
import { TOOL, TOOLS } from '../src/rules/tools';

const card = (id: string): Card => ({ id, suit: id[0] as Card['suit'], rank: Number(id.slice(1)) });
const cfgWith = (extra: Partial<Config> = {}): Config => ({ ...structuredClone(DEFAULT_CONFIG), ...extra });
/** Una mesa mínima para probar golpes: cuatro torres de un piso (J) y lo que se le añada. */
function table(config: Config, tools: string[] = [], extra: Partial<GameState> = {}): GameState {
  for (const id of tools) TOOL[id].cfg?.(config);
  return { ...createGame([{ id: 'a', name: 'A' }], 7, config), towers: newTowers([11, 12], config), tools: tools.map((id) => ({ id, n: 0 })), ...extra };
}

describe('fatiga de cimientos', () => {
  it('sube un nivel desde el turno de inicio y cada tantos turnos; sin configurar, no existe', () => {
    const cfg = cfgWith({ fatigueStart: 8, fatigueEvery: 2 });
    expect([0, 7, 8, 9, 10, 13, 14].map((t) => fatigueAt(cfg, t))).toEqual([0, 0, 1, 1, 2, 3, 4]);
    expect(fatigueAt(cfgWith(), 99)).toBe(0);
  });

  it('acelera la obra en los dos sentidos: más Resonancia para ti y más amenaza para la sirena', () => {
    const cfg = cfgWith({ fatigueStart: 8, fatigueEvery: 2, fatigueRes: 0.25 });
    const fresh = table(cfg);
    const tired = table(cfg, [], { fatigue: 3 });
    const hit = [card('S5')];
    expect(previewStrike(tired, hit, 'D').res).toBeCloseTo(previewStrike(fresh, hit, 'D').res + 0.75, 5);
    expect(threatOf(tired, tired.towers.S)).toBe(threatOf(fresh, fresh.towers.S) + 3);
  });

  it('el motor la sube sola al pasar los turnos, avisa con un evento y la enseña en la vista', () => {
    let state = createGame([{ id: 'a', name: 'A' }], 11, cfgWith({ fatigueStart: 2, fatigueEvery: 1, floorHp: { 11: 900, 12: 900, 13: 900 }, floorThreat: { 11: 0, 12: 0, 13: 0 } }));
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

  it('en campaña empieza en el turno previsto; la partida clásica la tiene más tarde y la guiada no la tiene', () => {
    expect(stageConfig(newRun({}, 3), 1).fatigueStart).toBe(FATIGUE.start);
    expect(DIFFICULTY.obra.fatigueStart!).toBeGreaterThan(FATIGUE.start * 2);
    expect(DEFAULT_CONFIG.fatigueStart).toBeUndefined();
  });

  it('ninguna obra de la campaña alarga los pisos: la dureza va por la amenaza', () => {
    expect(Math.max(...STAGES.map((s) => s.hp))).toBeLessThan(7);
    expect(STAGES[7].threat).toBeGreaterThan(STAGES[0].threat + 3);
  });
});

describe('aguante: la defensa se cobra en daño', () => {
  it('la caja de aguante trae sus cuatro remates', () => {
    expect(TOOLS.filter((t) => t.arch === 'aguante').map((t) => t.id)).toEqual(['ariete', 'contragolpe', 'rebosadero', 'bastion']);
  });

  it('Ariete suma Fuerza por cada punto de muro, y la Embestida también', () => {
    const cfg = cfgWith();
    const bare = previewStrike(table(cfg, [], { wall: 6 }), [card('S5')], 'D').fuerza;
    expect(previewStrike(table(cfg, ['ariete'], { wall: 6 }), [card('S5')], 'D').fuerza).toBe(bare + 18);
    expect(previewStrike(table(cfg, ['ariete'], { wall: 0 }), [card('S5')], 'D').fuerza).toBe(bare);
    expect(SPECIAL.embestida.fx.wallForce).toBe(3);
    const rider: Card = { id: 'sp-e', suit: 'X', rank: 0, sp: 'embestida' };
    expect(previewStrike(table(cfg, [], { wall: 4 }), [card('S5'), rider], 'D').fuerza).toBe(bare + 4 + 12);
    // sin muro no es una carta muerta: su Fuerza fija sigue ahí
    expect(previewStrike(table(cfg, [], { wall: 0 }), [card('S5'), rider], 'D').fuerza).toBe(bare + 4);
  });

  it('Bastión multiplica con el muro a la mitad de su tope o más', () => {
    const cfg = cfgWith();
    const low = previewStrike(table(cfgWith(), ['bastion'], { wall: 3 }), [card('S5')], 'D').res;
    const high = previewStrike(table(cfg, ['bastion'], { wall: 4 }), [card('S5')], 'D').res;
    expect(high).toBeCloseTo(low * 1.5, 5);
  });

  it('Contragolpe devuelve el triple de lo que el muro frena entero, y nada si la sirena pasa', () => {
    const play = (wall: number) => {
      const cfg = cfgWith({ floorHp: { 11: 900, 12: 900, 13: 900 } });
      const s = table(cfg, ['contragolpe'], { wall });
      // la sirena saca un trébol: golpea la torre de hormigón (amenaza 3 con una J)
      s.deck = [card('C9'), ...s.deck.filter((c) => c.id !== 'C9')];
      s.players[0].hand = [card('S2'), card('S3')];
      const out = applyAction(s, 'a', { type: 'discard', cards: ['S2'] }).state;
      return out.towers.C.damage;
    };
    expect(play(5)).toBe(9);
    expect(play(1)).toBe(0);
  });

  it('Rebosadero: el muro que sobra repara, y lo que sobra de reparar carga Fuerza', () => {
    const cfg = cfgWith({ floorHp: { 11: 900, 12: 900, 13: 900 } });
    const s = table(cfg, ['rebosadero'], { wall: cfg.wallCap - 1, integrity: cfg.maxIntegrity - 1 });
    s.deck = [card('X0'), ...s.deck]; // sirena muda: un comodín
    s.deck[0] = { id: 'X1', suit: 'X', rank: 0 };
    s.players[0].hand = [card('C8'), card('C9'), card('C10')];
    // escalera de tréboles (27): muro +9; cabe 1 y sobran 8 → repara 4; cabe 1 y sobran 3 → +9 de Fuerza cargada
    const out = applyAction(s, 'a', { type: 'attack', cards: ['C8', 'C9', 'C10'], target: 'S' }).state;
    expect(out.wall).toBe(cfg.wallCap);
    expect(out.integrity).toBe(cfg.maxIntegrity);
    expect(out.charge).toBe(9);
  });
});

describe('jefes de la 4.0', () => {
  const boss = (id: string) => {
    const cfg = cfgWith();
    BOSS[id].apply(cfg);
    return cfg;
  };

  it('El Coloso: sus pisos amenazan más mientras siguen apuntalados', () => {
    const cfg = boss('blindaje');
    const s = table(cfg);
    const braced = threatOf(s, s.towers.S);
    strike(s, [card('C2')], 'S'); // el primer golpe rompe el apuntalamiento
    expect(s.towers.S.fx.apuntalado).toBe(false);
    expect(threatOf(s, s.towers.S)).toBe(braced - cfg.bracedThreat!);
  });

  it('El Topo: cada piso que cae sin golpe limpio le cuesta al búnker, y su fatiga llega antes', () => {
    const cfg = boss('inestable');
    cfg.fatigueStart = 8;
    BOSS.inestable.apply(cfg);
    expect(cfg.fatigueStart).toBe(5);
    const s = table(cfgWith({ ...cfg, floorHp: { 11: 20, 12: 30, 13: 40 } }));
    const rough = strike(s, [card('C10'), card('H10')], 'D'); // pareja sin picas: tira la J con daño de sobra y no perfora
    expect(rough.fallen).toBeGreaterThan(0);
    expect(rough.clean).toBe(false);
    expect(rough.hurt).toBe(rough.fallen);
    const exact = table(cfgWith({ ...cfg, floorHp: { 11: 20, 12: 30, 13: 40 } }));
    const clean = strike(exact, [card('S10')], 'D'); // 10 × 2 = 20: daño exacto
    expect(clean.clean).toBe(true);
    expect(clean.hurt).toBe(0);
  });

  it('La Ventisca limita el muro sin anularlo', () => {
    const cfg = boss('intemperie');
    expect(cfg.wallCap).toBeGreaterThanOrEqual(3);
    expect(cfg.wallCap).toBeLessThan(DEFAULT_CONFIG.wallCap);
  });
});

describe('partida clásica en cuadrilla', () => {
  it('el colapso se ajusta al número de jugadores', () => {
    const loss = (n: number) => {
      const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      const s = createGame(players, 5, DIFFICULTY.obra);
      s.discard = s.deck;
      s.deck = [];
      const before = s.integrity;
      const hand = s.players[0].hand;
      const out = applyAction(s, 'p0', { type: 'discard', cards: [hand[0].id] });
      const ev = out.events.find((e) => e.e === 'collapse');
      return ev && ev.e === 'collapse' ? ev.loss : before - out.state.integrity;
    };
    expect(loss(1)).toBe(DIFFICULTY.obra.collapseLoss);
    expect(loss(4)).toBeLessThan(loss(1));
    expect(loss(2)).toBeGreaterThanOrEqual(loss(3));
  });
});
