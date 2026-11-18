// V35 · Rasgos de build: cinco rasgos, cada Reliquia con el suyo, y bonos con 2, 4 y 6 Reliquias del mismo rasgo.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/rules/balance-config';
import { Card, Config, DEFAULT_CONFIG, GameState, StrikeEnv, applyAction, createGame, newTowers, previewStrike, strike, tiraDado } from '../src/rules/engine';
import { newRun, rasgoMayor, stageConfig, startStage } from '../src/rules/run';
import { RASGOS, Rasgo, TOOLS, nivelRasgo, nivelesDe, rasgosCfg, rasgosDe } from '../src/rules/tools';

const RG = BALANCE.rasgos;
const card = (id: string): Card => ({ id, suit: id[0] as Card['suit'], rank: Number(id.slice(1)) });
/** n Reliquias de un rasgo que no tocan la cuenta del golpe por sí mismas (pasivas), para medir solo el bono. */
const PASIVAS: Record<Rasgo, string[]> = {
  sangre: ['megafono', 'piquete', 'acido', 'botiquin', 'plomada', 'casco'],
  tahur: ['hucha', 'tiralineas', 'horno', 'crisol', 'contrapeso', 'diapason'],
  verdugo: ['taladro', 'nivel', 'cizalla', 'trituradora', 'montacargas', 'prensa'],
  bastion: ['sacos', 'encofrado', 'puntales', 'sordina', 'contragolpe', 'pasarela'],
  horda: ['dinamita', 'andamio', 'metralla', 'timbre', 'contenedor', 'vibrador'],
};
const tira = (rasgo: Rasgo, n: number) => PASIVAS[rasgo].slice(0, n).map((id) => ({ id, n: 0 }));
/** Mesa suelta: guardias de 100 de Vida, la Casa de DIAMANTES delante, y lo que se le añada. */
function env(tools: { id: string; n: number }[], extra: Partial<StrikeEnv> = {}, cfg: Partial<Config> = {}): StrikeEnv {
  const config: Config = { ...structuredClone(DEFAULT_CONFIG), floorHp: { 10: 100, 11: 100, 12: 100 }, orden: ['D', 'S', 'H', 'C'], ...cfg };
  rasgosCfg(config, tools);
  return { config, towers: newTowers([10, 11, 12], config), tools, chain: 0, charge: 0, scrap: 0, integrity: config.maxIntegrity, wall: 0, ...extra };
}

describe('V35 · rasgos: reparto y niveles', () => {
  it('las PASIVAS de esta prueba son de su rasgo', () => {
    for (const r of RASGOS) for (const id of PASIVAS[r.id]) expect(TOOLS.find((t) => t.id === id)?.rasgo, id).toBe(r.id);
  });

  it('el nivel sube con 2, 4 y 6 Reliquias del mismo rasgo; otras no cuentan', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(nivelRasgo)).toEqual([0, 0, 1, 1, 2, 2, 3]);
    const mezcla = [...tira('sangre', 3), ...tira('horda', 2), ...tira('tahur', 1)];
    expect(rasgosDe(mezcla)).toEqual({ sangre: 3, tahur: 1, verdugo: 0, bastion: 0, horda: 2 });
    expect(nivelesDe(mezcla)).toEqual({ sangre: 1, tahur: 0, verdugo: 0, bastion: 0, horda: 1 });
    expect(rasgoMayor({ tools: mezcla })).toBe('sangre');
    expect(rasgoMayor({ tools: [] })).toBeNull();
  });
});

describe('V35 · Sangre', () => {
  it('2: cada guardia abatido cura; 4: Multi por la Vida que falta; 6: ×Multi con la Vida a la mitad o menos', () => {
    const golpe = [card('S10'), card('H10')]; // pareja: (2 + 10 + 10) × 2 = 44
    const sin = previewStrike(env([], { integrity: 8 }), golpe, 'D');
    const con2 = previewStrike(env(tira('sangre', 2), { integrity: 8 }), golpe, 'D');
    expect(con2.total).toBe(sin.total);
    // abate a la Sota de 44 con un golpe a medida: cura 1 por el guardia (además de los 2 del ♥)
    const justo = env(tira('sangre', 2), { integrity: 8 }, { floorHp: { 10: 44, 11: 100, 12: 100 } });
    expect(previewStrike(justo, golpe, 'D').repair).toBe(DEFAULT_CONFIG.curaPorCarta + RG.sangre.vida);
    const falta = DEFAULT_CONFIG.maxIntegrity - 8;
    const con4 = previewStrike(env(tira('sangre', 4), { integrity: 8 }), golpe, 'D');
    expect(con4.res).toBe(sin.res + RG.sangre.multi * Math.floor(falta / RG.sangre.cada));
    const con6 = previewStrike(env(tira('sangre', 6), { integrity: 8 }), golpe, 'D');
    expect(con6.res).toBe(con4.res * RG.sangre.x);
    // con la Vida entera, el 6 no multiplica y el 4 no suma
    expect(previewStrike(env(tira('sangre', 6)), golpe, 'D').res).toBe(sin.res);
  });
});

describe('V35 · Tahúr', () => {
  it('el dado se ve antes de golpear: 2 da de +1 a +3 de Multi; 4, la cara entera y oro con un 6; 6, además ×Multi con 5 o 6', () => {
    const golpe = [card('S7')];
    const base = previewStrike(env([]), golpe, 'D').res;
    expect([1, 2, 3, 4, 5, 6].map((dado) => previewStrike(env(tira('tahur', 2), { dado }), golpe, 'D').res - base)).toEqual([1, 1, 2, 2, 3, 3]);
    expect([1, 3, 6].map((dado) => previewStrike(env(tira('tahur', 4), { dado }), golpe, 'D').res - base)).toEqual([1, 3, 6]);
    expect(previewStrike(env(tira('tahur', 4), { dado: 6 }), golpe, 'D').gold).toBe(RG.tahur.oro);
    expect(previewStrike(env(tira('tahur', 4), { dado: 5 }), golpe, 'D').gold).toBe(0);
    expect(previewStrike(env(tira('tahur', 6), { dado: 5 }), golpe, 'D').res).toBe((base + 5) * RG.tahur.x);
    expect(previewStrike(env(tira('tahur', 6), { dado: 4 }), golpe, 'D').res).toBe(base + 4);
    // sin dado tirado (o sin el rasgo) no pasa nada
    expect(previewStrike(env(tira('tahur', 2)), golpe, 'D').res).toBe(base);
    expect(previewStrike(env(tira('tahur', 1), { dado: 6 }), golpe, 'D').res).toBe(base);
  });

  it('el motor tira el dado al empezar cada turno solo con el rasgo activo, y la vista lo enseña', () => {
    const con = createGame([{ id: 'a', name: 'A' }], 5, { ...structuredClone(DEFAULT_CONFIG), floorHp: { 10: 900, 11: 900, 12: 900 }, floorThreat: { 10: 0, 11: 0, 12: 0 } });
    con.tools = tira('tahur', 2);
    tiraDado(con);
    expect(con.dado).toBeGreaterThanOrEqual(1);
    expect(con.dado).toBeLessThanOrEqual(6);
    const caras = new Set<number>();
    let s: GameState = con;
    for (let i = 0; i < 12; i++) {
      s = applyAction(s, 'a', { type: 'discard', cards: [s.players[0].hand[0].id] }).state;
      caras.add(s.dado!);
    }
    expect(caras.size).toBeGreaterThan(1);
    const sin = createGame([{ id: 'a', name: 'A' }], 5, structuredClone(DEFAULT_CONFIG));
    tiraDado(sin);
    expect(sin.dado).toBeUndefined();
  });
});

describe('V35 · Verdugo', () => {
  it('2: ejecuta al que queda con poca Vida; 4: umbral mayor y Daño cargado; 6: la ejecución es Golpe exacto', () => {
    // Sota de 100: un golpe de 88 la deja a 12 (12 %): con el 15 % cae; un golpe de 80 la deja a 20: solo cae con el 25 %
    const golpe = (dano: number, tools: { id: string; n: number }[]) => {
      const e = env(tools, {}, { floorHp: { 10: 100, 11: 100, 12: 100 } });
      e.towers.D.damage = dano - 9; // deja a la Sota a falta del 9♠ que se juega
      return { r: strike(e, [card('S9')], 'D'), e };
    };
    expect(golpe(88, []).r.fallen).toBe(0);
    const con2 = golpe(88, tira('verdugo', 2));
    expect(con2.r.fell).toEqual([{ tower: 'D', rank: 10, clean: false, exec: true }]);
    expect(con2.e.towers.D.damage).toBe(0); // una ejecución no deja sobrante
    expect(golpe(80, tira('verdugo', 2)).r.fallen).toBe(0);
    const con4 = golpe(80, tira('verdugo', 4));
    expect(con4.r.fallen).toBe(1);
    expect(con4.e.charge).toBe(RG.verdugo.dano);
    expect(con4.r.clean).toBe(false);
    const con6 = golpe(80, tira('verdugo', 6));
    expect(con6.r.clean).toBe(true);
    // un golpe que mata por Daño no es ejecución
    expect(golpe(100, tira('verdugo', 4)).r.fell[0]).toEqual({ tower: 'D', rank: 10, clean: true });
  });
});

describe('V35 · Bastión', () => {
  it('2: el asalto empieza con Escudo; 4 y 6: el Escudo suma Daño; 6: sube el tope', () => {
    const run = newRun({}, 4);
    run.phase = 'battle';
    run.tools = tira('bastion', 2).filter((t) => t.id !== 'sacos');
    run.tools.push({ id: 'pasarela', n: 0 });
    expect(nivelesDe(run.tools).bastion).toBe(1);
    expect(stageConfig(run, 1).wallStart).toBe(RG.bastion.escudo);
    expect(startStage(run, [{ id: 'a', name: 'A' }]).wall).toBe(RG.bastion.escudo);
    const golpe = [card('S7')];
    const sin = previewStrike(env([], { wall: 4 }), golpe, 'D').fuerza;
    // (el Escudo inicial lo pone la campaña; aquí se fija a mano)
    const sinSacos = (n: number) => PASIVAS.bastion.filter((id) => id !== 'sacos').slice(0, n).map((id) => ({ id, n: 0 }));
    expect(previewStrike(env(sinSacos(2), { wall: 4 }), golpe, 'D').fuerza).toBe(sin);
    expect(previewStrike(env(sinSacos(4), { wall: 4 }), golpe, 'D').fuerza).toBe(sin + RG.bastion.dano * 4);
    const seis = [...sinSacos(5), { id: 'maza', n: 0 }];
    const e6 = env(seis, { wall: 4 });
    expect(previewStrike(e6, golpe, 'D').fuerza).toBe(sin + RG.bastion.dano2 * 4);
    expect(e6.config.wallCap).toBe(DEFAULT_CONFIG.wallCap + RG.bastion.tope);
  });
});

describe('V35 · Horda', () => {
  it('2: Multi con 3 cartas o más; 4: la primera carta otra vez; 6: todas otra vez', () => {
    const tres = [card('S3'), card('H4'), card('C5')]; // escalera
    const una = [card('S7')];
    const sin = previewStrike(env([]), tres, 'D');
    const con2 = previewStrike(env(tira('horda', 2)), tres, 'D');
    expect(con2.res).toBe(sin.res + RG.horda.multi);
    expect(con2.fuerza).toBe(sin.fuerza);
    expect(previewStrike(env(tira('horda', 2)), una, 'D').res).toBe(previewStrike(env([]), una, 'D').res);
    // sin el Tambor (que no toca escaleras) ni la Caja: cuatro pasivas de Horda
    const con4 = previewStrike(env(tira('horda', 4)), tres, 'D');
    expect(con4.fuerza).toBe(sin.fuerza + 3);
    const con6 = previewStrike(env(tira('horda', 6)), tres, 'D');
    expect(con6.fuerza).toBe(sin.fuerza + 3 + 4 + 5);
  });
});
