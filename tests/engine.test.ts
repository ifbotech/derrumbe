import { describe, expect, it } from 'vitest';
import { Card, Config, DEFAULT_CONFIG, DIFFICULTY, GameEvent, GameState, StrikeEnv, Suit, applyAction, classify, createGame, currentPlayer, eventsFor, newTowers, previewStrike, seedFrom, sortCards, strike, viewFor } from '../src/rules/engine';
import { chooseAction, formations } from '../src/rules/bot';
import { ARCH, BOXES, RARITY, TOOL, TOOLS, placeTool, toolPool } from '../src/rules/tools';
import { REY_IDS } from '../src/rules/reyes';
import { BALANCE as B } from '../src/rules/balance-config';
import { muestra } from './muestra';

const card = (id: string, extra: Partial<Card> = {}): Card => (id[0] === 'X' ? { id, suit: 'X', rank: 0, ...extra } : { id, suit: id[0] as Suit, rank: Number(id.slice(1)), ...extra });
const cards = (...ids: string[]) => ids.map((id) => card(id));
const special = (sp: string): Card => ({ id: `sp-${sp}`, suit: 'X', rank: 0, sp });

/** Mesa de prueba con Vidas fijas (J 20 · Q 30 · K 40), aparte de las de la campaña: aquí se mide la mecánica. */
const MESA: Partial<Config> = { floorHp: { 10: 20, 11: 30, 12: 40 } };

/** Mesa suelta para probar golpes: pisos J 20 · Q 30 · K 40. */
function env(tools: string[] = [], cfg: Partial<Config> = {}): StrikeEnv {
  const config: Config = { ...structuredClone(DEFAULT_CONFIG), ...MESA, ...cfg };
  for (const id of tools) TOOL[id].cfg?.(config);
  return { config, towers: newTowers([10, 11, 12], config), tools: tools.map((id) => ({ id, n: 0 })), chain: 0, charge: 0, scrap: 0, integrity: 20, wall: 0 };
}

/**
 * Partida de un jugador con la mano y la cima de la cantera que se pidan. V35: se combate Casa por Casa; aquí la
 * primera es DIAMANTES (los golpes de estas pruebas van contra ♦) salvo que la prueba diga otro `orden`.
 */
function game(hand: Card[], top: Card[] = [], tools: string[] = [], cfg: Partial<Config> = {}): GameState {
  const config: Config = { ...structuredClone(DEFAULT_CONFIG), ...MESA, orden: ['D', 'S', 'H', 'C'], ...cfg };
  for (const id of tools) TOOL[id].cfg?.(config);
  const s = createGame([{ id: 'a', name: 'A' }], 1, config);
  const taken = new Set([...hand, ...top].map((c) => c.id));
  s.deck = [...top, ...[...s.deck, ...s.players[0].hand].filter((c) => !taken.has(c.id))];
  s.players[0].hand = hand;
  s.tools = tools.map((id) => ({ id, n: 0 }));
  return s;
}
const of = <E extends GameEvent['e']>(events: GameEvent[], e: E) => events.filter((ev): ev is Extract<GameEvent, { e: E }> => ev.e === e);

describe('formaciones', () => {
  it('reconoce cada formación', () => {
    expect(classify(cards('S7'))).toBe('solo');
    expect(classify(cards('S7', 'H7'))).toBe('grupo');
    expect(classify(cards('S7', 'H7', 'D7', 'C7'))).toBe('poker');
    expect(classify(cards('S4', 'H4', 'D9', 'C9'))).toBe('doblepar');
    expect(classify(cards('H5', 'C5', 'D5', 'S9', 'H9'))).toBe('full');
    expect(classify(cards('S3', 'H4', 'D5'))).toBe('escalera');
    expect(classify(cards('D3', 'D4', 'D5'))).toBe('escaleracolor');
    expect(classify(cards('S2', 'S4', 'S6', 'S8', 'S9'))).toBe('color');
    expect(classify(cards('S8', 'H9', 'D1'))).toBe('escalera'); // el As enlaza por arriba (V40: 8-9-1, no hay diez)
    expect(classify(cards('S1', 'H2', 'D3'))).toBe('escalera'); // y por abajo
    expect(classify(cards('S1', 'H9'))).toBe('compania'); // un As acompaña a cualquier carta
    expect(classify(cards('S1', 'H1'))).toBe('grupo'); // dos ases son un grupo
    expect(classify(cards('S1', 'H9', 'D4'))).toBeNull();
    expect(classify(cards('S2', 'H9'))).toBeNull();
    expect(classify(cards('S2', 'X1'))).toBeNull();
  });

  it('las especiales acompañan (hasta dos) o van solas, sin contar para la formación', () => {
    expect(classify([special('bola')])).toBe('solo');
    expect(classify([...cards('S7', 'H7'), special('bola'), special('barreno')])).toBe('grupo');
    expect(classify([card('S7'), special('bola'), special('barreno'), special('grua')])).toBeNull();
  });

  it('el bot encuentra todas las formaciones de una mano', () => {
    const found = formations(cards('S8', 'H9', 'D1', 'C1', 'S1')).map((f) => classify(f));
    expect(found).toContain('escalera');
    expect(found).toContain('grupo');
  });
});

describe('Daño × Multi', () => {
  const hit = (ids: string[], target: Suit, e = env()) => strike(e, cards(...ids), target);

  it('carta sola: el Daño es su número (0 contra el trono de su palo), el Multi ×1', () => {
    expect(hit(['S7'], 'D')).toMatchObject({ fuerza: 7, res: 1, total: 7 });
    expect(hit(['S7'], 'H')).toMatchObject({ fuerza: 7, total: 7 });
    expect(hit(['S7'], 'S')).toMatchObject({ fuerza: 0, total: 0 }); // Inmune a su palo
    expect(hit(['S1'], 'D')).toMatchObject({ fuerza: 11 }); // el As vale 11
  });

  it('cada formación pone su base; el Multi es entero y el Golpe, el producto exacto', () => {
    expect(hit(['H6', 'C6'], 'C')).toMatchObject({ fuerza: 8, res: 2, total: 16, wallGain: 2, repair: 2 });
    expect(hit(['S3', 'H4', 'D5'], 'C')).toMatchObject({ fuerza: 16, res: 2, total: 32 });
    // As cómplice: el As suma sus 11 y el poder de su palo (aquí, Perfora)
    expect(hit(['H7', 'S1'], 'D')).toMatchObject({ formation: 'compania', fuerza: 18, res: 2, total: 36, repair: 2 });
    expect(hit(['S4', 'H4', 'D9', 'C9'], 'H')).toMatchObject({ fuerza: 28, res: 2, total: 56 });
    expect(hit(['S2', 'S4', 'S6', 'S8', 'S9'], 'D')).toMatchObject({ fuerza: 37, res: 3, total: 111 });
    expect(hit(['H5', 'C5', 'D5', 'S9', 'H9'], 'D')).toMatchObject({ fuerza: 38, res: 3, total: 114 });
    expect(hit(['D3', 'D4', 'D5'], 'H')).toMatchObject({ fuerza: 22, res: 3, total: 66 });
    expect(hit(['S7', 'D7', 'H7', 'C7'], 'C')).toMatchObject({ fuerza: 35, res: 4, total: 140 });
  });

  it('el Pergamino sube el Daño de una formación, no su Multi', () => {
    const e = env([], { formLevel: { grupo: 2 } });
    expect(hit(['H6', 'C6'], 'C', e)).toMatchObject({ fuerza: 14, res: 2, total: 28 });
  });

  it('emite un paso por cada aportación, en orden: formación, cartas, especiales, herramientas, impacto', () => {
    const e = env(['piqueta', 'gemelos']);
    const res = strike(e, [...cards('S7', 'H7'), special('bola')], 'D');
    const steps = of(res.events, 'step');
    expect(steps.map((s) => s.src)).toEqual(['form', 'card', 'card', 'special', 'tool', 'tool']);
    expect(steps.map((s) => s.id)).toEqual(['grupo', 'S7', 'H7', 'sp-bola', 'piqueta', 'gemelos']);
    expect(steps[3]).toMatchObject({ dr: 1 });
    expect(steps[4]).toMatchObject({ slot: 0, df: 3 });
    expect(steps[5]).toMatchObject({ slot: 1, dr: 1 });
    // (2 + 7 + 7 + 3) × (2 + 1 + 1) = 19 × 4
    expect(res).toMatchObject({ fuerza: 19, res: 4, total: 76 });
    const last = steps[steps.length - 1];
    expect(of(res.events, 'impact')[0]).toMatchObject({ tower: 'D', fuerza: last.fuerza, res: last.res, total: 76 });
    expect(res.events.findIndex((ev) => ev.e === 'impact')).toBeGreaterThan(res.events.lastIndexOf(last));
  });

  it('previsualizar no toca el estado', () => {
    const e = env(['calibre']);
    e.towers.D.damage = 10;
    const before = JSON.stringify(e);
    expect(previewStrike(e, cards('S10'), 'D').clean).toBe(true);
    expect(JSON.stringify(e)).toBe(before);
  });
});

describe('cinturón: el orden no cambia la cuenta (V31)', () => {
  const run = cards('S5', 'S6', 'S7'); // escalera de color contra Oros: 10 + 18 de Daño, ×3

  it('primero se suma todo el Multi y al final se multiplica, vayan como vayan los Amuletos', () => {
    // el Último trago (×2 de Multi con la Vida a la mitad o menos) y la Guitarra (+1 con escalera)
    const herido = (ids: string[]) => {
      const e = env(ids);
      e.integrity = Math.floor(e.config.maxIntegrity / 2);
      return e;
    };
    expect(strike(herido(['cinta', 'ultimo']), run, 'D')).toMatchObject({ fuerza: 28, res: 8, total: 224 }); // (3 + 1) × 2
    expect(strike(herido(['ultimo', 'cinta']), run, 'D')).toMatchObject({ fuerza: 28, res: 8, total: 224 }); // lo mismo
    // en la cuenta, los pasos que multiplican van siempre después de los que suman
    const pasos = of(strike(herido(['ultimo', 'cinta']), run, 'D').events, 'step');
    const ultimoQueSuma = pasos.map((p) => p.dr !== undefined || p.df !== undefined).lastIndexOf(true);
    const primeroQueMultiplica = pasos.findIndex((p) => p.mr !== undefined);
    expect(primeroQueMultiplica).toBeGreaterThan(ultimoQueSuma);
  });

  it('V34 · un Amuleto nuevo va al final de la tira y los demás no se mueven', () => {
    const belt = ['plano_maestro', 'piqueta'].map((id) => ({ id, n: 0 }));
    expect(placeTool(belt, { id: 'sacos', n: 0 })).toBe(2);
    expect(placeTool(belt, { id: 'maza', n: 0 })).toBe(3);
    expect(belt.map((t) => t.id)).toEqual(['plano_maestro', 'piqueta', 'sacos', 'maza']);
  });

  it('V40 1d · de 20 a 24 Amuletos, de 4 rarezas y en 4 familias de 5 o 6 (una por Rey), todos bien definidos', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(20);
    expect(TOOLS.length).toBeLessThanOrEqual(24);
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.rarity))).toEqual(new Set(Object.keys(RARITY)));
    for (const rey of REY_IDS) {
      const n = TOOLS.filter((t) => t.arch === rey).length;
      expect(n, rey).toBeGreaterThanOrEqual(5);
      expect(n, rey).toBeLessThanOrEqual(6);
    }
    for (const t of TOOLS) expect(ARCH[t.arch], t.id).toBeTruthy();
    // el surtido base es deliberadamente corto: lo demás se abre en el Altar, arcón a arcón (uno por Rey)
    expect(toolPool([]).length).toBe(TOOLS.filter((t) => !t.box).length);
    expect(toolPool([]).length).toBeLessThan(TOOLS.length * 0.6);
    expect(toolPool([...BOXES]).length).toBe(TOOLS.length);
    for (const t of TOOLS) if (t.box) expect(t.box, t.id).toBe(t.arch);
    // ninguno revienta al resolverse sobre una mesa cualquiera
    for (const t of TOOLS) expect(() => strike(env([t.id, 'piqueta']), cards('S5', 'S6', 'S7'), 'D'), t.id).not.toThrow();
  });
});

describe('Amuletos de cada Rey', () => {
  it('Espadas: el Cortaplumas premia la carta sola, la Piedra de afilar da margen al exacto, el Facón cuenta el golpe de una vez y la Tijera corta al siguiente', () => {
    expect(strike(env(['cincel']), cards('S5'), 'D').fuerza).toBe(5 + 14);
    expect(strike(env(['cincel']), cards('S5', 'H5'), 'D').fuerza).toBe(strike(env([]), cards('S5', 'H5'), 'D').fuerza);
    // la Piedra: pasarse hasta 3 de la Vida del guardia también es exacto (sin ella, no)
    const margen = B.reliquias.calibre.margen;
    const pasado = (ids: string[]) => {
      const e = env(ids);
      e.towers.D.damage = 20 - 5 + margen - 1; // con 5 de golpe se pasa margen − 1 de sus 20 de Vida
      return strike(e, cards('S5'), 'D').clean;
    };
    expect(pasado(['calibre'])).toBe(true);
    expect(pasado([])).toBe(false);
    // el Facón: un guardia sin Daño que cae de un golpe que se pasa, cae con Golpe exacto (sin Espadas: no perfora)
    const deUno = (ids: string[]) => strike(env(ids), cards('H9', 'C9'), 'D');
    expect(deUno([]).clean).toBe(false);
    expect(deUno(['plano_maestro']).clean).toBe(true);
    const tocado = env(['plano_maestro']);
    tocado.towers.D.damage = 1;
    expect(strike(tocado, cards('H9', 'C9'), 'D').clean).toBe(false); // ya tenía Daño: no fue de un golpe
    const con = env(['cizalla']);
    const sin = env([]);
    con.towers.D.damage = 15;
    sin.towers.D.damage = 15;
    strike(con, cards('S5'), 'D');
    strike(sin, cards('S5'), 'D');
    expect(con.towers.D.damage - sin.towers.D.damage).toBe(15); // la mitad de los 30 del Caballo
  });

  it('Bastos: el Poncho da Escudo por guardia abatido y las Boleadoras bajan el Ataque', () => {
    const golpe = cards('S10', 'H10'); // (2 + 10 + 10) × 2 = 44: cae la Sota de Oros
    expect(strike(env(['encofrado']), golpe, 'D').wallGain).toBe(strike(env([]), golpe, 'D').wallGain + 2);
    const cfg = env(['sordina']).config;
    for (const r of [10, 11, 12]) expect(cfg.floorThreat[r]).toBe(Math.max(1, DEFAULT_CONFIG.floorThreat[r] - B.reliquias.sordina.ataque));
  });

  it('Oros: los Naipes marcados suman Multi con grupos y el Cubilete con un 5 o más en el dado', () => {
    expect(strike(env(['gemelos']), cards('S7', 'H7'), 'D').res).toBe(3);
    expect(strike(env(['gemelos']), cards('S5', 'S6', 'S7'), 'D').res).toBe(3);
    const alto = env(['dados']);
    alto.dado = 5;
    const bajo = env(['dados']);
    bajo.dado = 4;
    expect(strike(alto, cards('S5'), 'D').res).toBe(2);
    expect(strike(bajo, cards('S5'), 'D').res).toBe(1);
    // cada carta de Oros salpica 2 a los que esperan
    expect(strike(env(), cards('D8'), 'H').dealt.S).toBe(2);
  });

  it('Oros: la Cañita voladora hace 6 a los otros tronos en pie por cada guardia abatido', () => {
    const e = env(['dinamita']);
    const res = strike(e, cards('S10', 'H10'), 'D'); // (2 + 10 + 10) × 2 = 44: cae la Sota de Oros
    expect(res.fell).toHaveLength(1);
    expect(res.dealt).toMatchObject({ S: 6, H: 6, C: 6 });
    const nada = strike(env(['dinamita']), cards('S5'), 'D');
    expect(nada.dealt).toEqual({ D: 5 });
  });

  it('Copas: el Último trago dobla el Multi con media Vida, el Asado cura por guardia y las Alpargatas dan una carta más', () => {
    const e = env(['ultimo'], { maxIntegrity: 20 });
    e.integrity = 8;
    expect(strike(e, cards('S5'), 'D')).toMatchObject({ fuerza: 5, res: 2, total: 10 });
    e.integrity = 15;
    expect(strike(e, cards('S5'), 'D').res).toBe(1);
    const golpe = cards('S10', 'H10');
    expect(strike(env(['casco']), golpe, 'D').repair).toBe(strike(env([]), golpe, 'D').repair + 1);
    const mano = env(['andamio']).config.handSize;
    for (const [k, v] of Object.entries(DEFAULT_CONFIG.handSize)) expect(mano[+k]).toBe(Math.max(3, v + 1));
  });

  it('Guardamonte y Bota de vino: los poderes de palo son un número por carta', () => {
    expect(strike(env(['botiquin']), cards('H2', 'H3', 'H4'), 'C').repair).toBe(3 * 3); // tres Copas, (2 + 1) cada una
    const paves = env(['sacos']);
    expect(strike(paves, cards('C2'), 'S').wallGain).toBe(3);
    expect(paves.config.wallCap).toBe(DEFAULT_CONFIG.wallCap + 4);
    expect(strike(env([], { curaPorCarta: 0 }), cards('H9'), 'C').repair).toBe(0);
  });
});

describe('sellos', () => {
  it('eco: repite el impacto y el poder del palo', () => {
    expect(strike(env(), [card('S7', { seal: 'eco' })], 'D').fuerza).toBe(14);
    expect(strike(env(), [card('H6', { seal: 'eco' })], 'C').repair).toBe(4);
    expect(strike(env(), [card('C6', { seal: 'eco' })], 'S').wallGain).toBe(4);
  });

  it('dinamita: las torres vecinas reciben el valor de la carta', () => {
    const res = strike(env(), [card('S7', { seal: 'dinamita' })], 'D');
    expect(res.dealt).toEqual({ D: 7, S: 7, H: 7 });
  });

  it('jornal: +2 de oro solo si el golpe derriba un piso', () => {
    const e = env();
    e.towers.D.damage = 15;
    expect(strike(e, [card('S1', { seal: 'jornal' })], 'D').gold).toBe(2);
    expect(strike(env(), [card('S2', { seal: 'jornal' })], 'D').gold).toBe(0);
  });

  it('sindical: robas una carta extra al jugarla y al descartarla', () => {
    const s = game([card('S2', { seal: 'sindical' }), card('H3', { seal: 'sindical' }), ...cards('C4', 'C5', 'C6', 'C7', 'C8')]);
    const played = applyAction(s, 'a', { type: 'attack', cards: ['S2'], target: 'D' });
    expect(played.state.players[0].hand.length).toBe(8);
    // descartar una carta normal deja la mano en 7; descartar la sindical conserva la octava
    expect(applyAction(played.state, 'a', { type: 'discard', cards: ['C4'] }).state.players[0].hand.length).toBe(7);
    expect(applyAction(played.state, 'a', { type: 'discard', cards: ['H3'] }).state.players[0].hand.length).toBe(8);
  });

});

describe('tratamientos', () => {
  it('Filo de plata suma Daño, Templado suma Multi, Lacre policromo y Cristal maldito lo multiplican', () => {
    expect(strike(env(), [card('S7', { tr: 'forjado' })], 'D')).toMatchObject({ fuerza: 13, res: 1, total: 13 });
    expect(strike(env(), [card('S7', { tr: 'templado' })], 'D')).toMatchObject({ fuerza: 7, res: 2, total: 14 });
    expect(strike(env(), [card('S7', { tr: 'policromado' })], 'D')).toMatchObject({ res: 2, total: 14 });
    expect(strike(env(), [card('S7', { tr: 'agrietado' })], 'D')).toMatchObject({ res: 3, total: 21 });
  });

  it('V31 · el orden de las cartas no cambia la cuenta: se suma todo y luego se multiplica', () => {
    const a = card('S7', { tr: 'templado' });
    const b = card('H7', { tr: 'policromado' });
    expect(strike(env(), [a, b], 'D').res).toBe(6); // (2 + 1) × 2
    expect(strike(env(), [b, a], 'D').res).toBe(6); // lo mismo
  });

  it('agrietado se hace añicos 1 de cada 4 veces, según la semilla; al previsualizar, nunca', () => {
    const cracked = card('S7', { tr: 'agrietado' });
    expect(previewStrike(env(), [cracked], 'D').shattered).toEqual([]);
    let broken = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = game([cracked, ...cards('C2', 'C3', 'C4', 'C5', 'C6', 'C7')]);
      s.rng = seed;
      const a = applyAction(s, 'a', { type: 'attack', cards: ['S7'], target: 'D' });
      const b = applyAction(s, 'a', { type: 'attack', cards: ['S7'], target: 'D' });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b)); // misma semilla, mismo destino
      if (a.state.burned.includes('S7')) {
        broken++;
        expect(a.state.scrap).toBe(1);
        expect(a.state.discard.some((c) => c.id === 'S7')).toBe(false);
        expect(of(a.events, 'burn')[0].card.id).toBe('S7');
      } else expect(a.state.discard.some((c) => c.id === 'S7')).toBe(true);
    }
    expect(broken).toBeGreaterThan(70);
    expect(broken).toBeLessThan(130);
  });
});

describe('golpe limpio y estados de las torres', () => {
  it('Golpe exacto: calla el Contraataque, paga 1 de oro, lanza el Impulso y abre una Racha', () => {
    const s = game(cards('S4', 'H4', 'S5', 'C2', 'C3', 'C5', 'C6'));
    const { state, events } = applyAction(s, 'a', { type: 'attack', cards: ['S4', 'H4'], target: 'D' }); // (2 + 4 + 4) × 2 = 20
    expect(of(events, 'floorDown')[0]).toMatchObject({ tower: 'D', rank: 10, clean: true });
    expect(of(events, 'onda')[0]).toMatchObject({ tower: 'D', amount: 8 }); // un cuarto de 30
    expect(state.towers.D).toMatchObject({ floors: [11, 12], damage: 8 });
    expect(of(events, 'gold')[0].amount).toBe(1);
    expect(of(events, 'siren')[0]).toMatchObject({ reason: 'clean', taken: 0 });
    expect(state.chain).toBe(1);
    expect(state.players[0].hand.length).toBe(8); // el golpe limpio da una carta de impulso
    // el golpe siguiente lleva +1 de Multi, y si no es exacto la Racha se corta
    const next = applyAction(state, 'a', { type: 'attack', cards: ['S5'], target: 'D' });
    expect(of(next.events, 'step').find((st) => st.src === 'chain')).toMatchObject({ dr: 1 });
    expect(of(next.events, 'impact')[0]).toMatchObject({ fuerza: 5, res: 2, total: 10 });
    expect(next.state.chain).toBe(0);
  });

  it('la Racha llega como mucho a +3 de Multi', () => {
    const s = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'));
    s.chain = 3;
    s.towers.D.damage = 18;
    const { state } = applyAction(s, 'a', { type: 'attack', cards: ['S2'], target: 'D' }); // 2 × (1 + 3) = 8: no es exacto
    expect(state.chain).toBe(0);
    const e = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'));
    e.chain = 3;
    e.towers.D.damage = 12;
    expect(applyAction(e, 'a', { type: 'attack', cards: ['S2'], target: 'D' }).state.chain).toBe(3); // 8 justos: exacto, y se queda en 3
  });

  it('las picas perforan: el exceso pasa al piso siguiente; sin picas se pierde', () => {
    const pierce = env();
    strike(pierce, cards('S1', 'C1'), 'D'); // (2 + 11 + 11) × 2 = 48
    expect(pierce.towers.D).toMatchObject({ floors: [11, 12], damage: 28 });
    const blunt = env();
    strike(blunt, cards('H1', 'C1'), 'S'); // (2 + 11 + 11) × 2 = 48
    expect(blunt.towers.S).toMatchObject({ floors: [11, 12], damage: 0 });
  });

  it('Expuesto: el siguiente golpe hace ×2 de Daño, al final de la columna, y se gasta', () => {
    const e = env([], { floorHp: { 10: 500, 11: 500, 12: 500 } });
    const first = strike(e, cards('S2', 'S3', 'S4'), 'D');
    expect(of(first.events, 'state')).toEqual([{ e: 'state', tower: 'D', fx: 'fractura', on: true }]);
    expect(strike(e, cards('S5'), 'D')).toMatchObject({ fuerza: 10, res: 1, total: 10 });
    expect(strike(e, cards('S6'), 'D')).toMatchObject({ fuerza: 6, res: 1, total: 6 });
  });

  it('sobrecarga: la torre se salta su próximo golpe de sirena', () => {
    const s = game(cards('S3', 'H4', 'D5', 'D2', 'D7', 'D8', 'D9'), cards('C9', 'C10'), [], { orden: ['C', 'S', 'D', 'H'] });
    const first = applyAction(s, 'a', { type: 'attack', cards: ['S3', 'H4', 'D5'], target: 'C' });
    expect(of(first.events, 'siren')[0]).toMatchObject({ tower: 'C', reason: 'sobrecarga', taken: 0 });
    expect(first.state.integrity).toBe(20);
    expect(first.state.towers.C.fx.sobrecarga).toBe(false);
  });

  it('el decreto del Inquisidor (noFx) no deja ningún estado', () => {
    const inq = env([], { noFx: true });
    expect(of(strike(inq, cards('S2', 'S3', 'S4'), 'D').events, 'state')).toEqual([]);
    expect(of(strike(inq, cards('S3', 'H4', 'D5'), 'C').events, 'state')).toEqual([]);
  });

  it('el Disfraz: el golpe no respeta Inmune', () => {
    expect(strike(env(), [card('S7')], 'S').fuerza).toBe(0);
    expect(strike(env(), [card('S7'), special('sierra')], 'S').fuerza).toBe(7);
  });
});

describe('turno: sirena, muro, descartes, huelga y colapso', () => {
  it('la sirena golpea con la amenaza del piso y el muro la absorbe', () => {
    // el Ataque de la Corte de antes de la 1f (3/4/6): la prueba mide el reparto entre Escudo y Vida, no la escala
    const s = game(cards('C9', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'), cards('H9', 'D9'), [], { orden: ['S', 'D', 'H', 'C'], floorThreat: { ...DEFAULT_CONFIG.floorThreat, 10: 3, 11: 4, 12: 6 } });
    const { state, events } = applyAction(s, 'a', { type: 'attack', cards: ['C9'], target: 'S' });
    expect(state.wall).toBe(0); // 2 de Escudo (un ♣), y contraataca el enemigo activo: la Sota de ♠, que ataca 3
    expect(of(events, 'siren')[0]).toMatchObject({ tower: 'S', threat: 3, blocked: 2, taken: 1 });
    // V35 · solo se golpea al enemigo activo
    expect(() => applyAction(s, 'a', { type: 'attack', cards: ['C9'], target: 'H' })).toThrow(/enemigo que tenés delante/);
    const next = applyAction(state, 'a', { type: 'discard', cards: ['S2'] });
    expect(next.state.integrity).toBe(16);
  });

  it('el Motín deja Aturdido al trono, calla el Contraataque y retira el comodín del asalto', () => {
    const s = game([card('X1'), ...cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7')], cards('D9'), ['piquete']);
    const { state, events } = applyAction(s, 'a', { type: 'joker', card: 'X1', target: 'D' });
    expect(state.towers.D.fx.sobrecarga).toBe(true);
    expect(of(events, 'state')).toEqual([{ e: 'state', tower: 'D', fx: 'sobrecarga', on: true }]);
    expect(state.exhausted.map((c) => c.id)).toEqual(['X1']);
    expect(of(events, 'siren')[0].reason).toBe('huelga');
    expect(of(events, 'gold')[0].amount).toBe(3); // Piquete
    expect(state.players[0].hand.length).toBe(9); // repone 1 y roba 2 más
  });

  it('cuando el Mazo se agota se baraja el Descarte: no quita Vida y el Asedio final sube 1 (V27)', () => {
    const s = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'));
    s.discard = s.deck.splice(0);
    const { state, events } = applyAction(s, 'a', { type: 'discard', cards: ['S2'] });
    const sube = s.config.collapseSiege;
    expect(of(events, 'collapse')[0]).toMatchObject({ sube, asedio: sube });
    expect(state.collapses).toBe(1);
    expect(state.fatigue).toBe(sube);
    // la Vida solo baja por el Contraataque que sigue, nunca por barajar
    expect(s.integrity - state.integrity).toBe(of(events, 'siren')[0]?.taken ?? 0);
  });

  it('rechaza jugadas ilegales sin tocar el estado', () => {
    const s = game(cards('S2', 'H9', 'S4', 'S5', 'S6', 'S7', 'S8'));
    const before = JSON.stringify(s);
    expect(() => applyAction(s, 'a', { type: 'attack', cards: ['S2', 'H9'], target: 'D' })).toThrow(/Formación inválida/);
    expect(() => applyAction(s, 'b', { type: 'pass' })).toThrow(/No es tu turno/);
    expect(() => applyAction(s, 'a', { type: 'attack', cards: ['C1'], target: 'D' })).toThrow(/no está en tu mano/);
    expect(() => applyAction(s, 'a', { type: 'pass' })).toThrow();
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('determinismo', () => {
  const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  function playOut(seed: number) {
    let state = createGame(players, seed);
    const log: { player: string; action: ReturnType<typeof chooseAction> }[] = [];
    while (state.phase === 'playing') {
      const player = currentPlayer(state).id;
      const action = chooseAction(state);
      log.push({ player, action });
      state = applyAction(state, player, action).state;
    }
    return { state, log };
  }

  it('la misma semilla y el mismo registro de acciones reproducen la partida exacta', () => {
    const a = playOut(seedFrom('DERRUMBE'));
    let replay = createGame(players, seedFrom('DERRUMBE'));
    for (const { player, action } of a.log) replay = applyAction(replay, player, action).state;
    expect(JSON.stringify(replay)).toBe(JSON.stringify(a.state));
    expect(JSON.stringify(playOut(seedFrom('OTRA')).state)).not.toBe(JSON.stringify(a.state));
    expect(seedFrom('DERRUMBE')).toBe(seedFrom('DERRUMBE'));
  });
});

describe('información oculta en partidas online', () => {
  const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];

  it('la vista de un jugador no lleva el orden de la cantera, el azar ni las manos ajenas', () => {
    const state = createGame(players, 77);
    const view = viewFor(state, 'a');
    expect(view.hand).toEqual(state.players[0].hand);
    expect(view.players).toEqual([{ id: 'a', name: 'A', handCount: 6, reserveCount: 0 }, { id: 'b', name: 'B', handCount: 6, reserveCount: 0 }]);
    for (const key of ['deck', 'rng', 'burnedIds', 'undo']) expect(view).not.toHaveProperty(key);
    // lo no visto (cantera + mano ajena) llega mezclado y ordenado: no delata ni el orden ni quién tiene qué
    const hidden = [...state.deck, ...state.players[1].hand];
    expect(view.unseen).toEqual(sortCards(hidden));
    expect(view.unseen.map((c) => c.id)).not.toEqual(state.deck.map((c) => c.id));
    expect(view.unseen.length).toBe(view.deckCount + 6);
    // otra semilla, mismas cartas ocultas en otro orden: la vista no cambia
    const twin = structuredClone(state);
    twin.deck.reverse();
    expect(viewFor(twin, 'a').unseen).toEqual(view.unseen);
  });

  it('las cartas que roba otro jugador no viajan en sus eventos', () => {
    let state = createGame(players, 77);
    const res = applyAction(state, 'a', { type: 'discard', cards: [state.players[0].hand[0].id] });
    state = res.state;
    const mine = of(eventsFor(res.events, 'a'), 'draw')[0];
    const theirs = of(eventsFor(res.events, 'b'), 'draw')[0];
    expect(mine.cards?.length).toBe(1);
    expect(theirs).toEqual({ e: 'draw', player: 'a', count: 1 });
    expect(JSON.stringify(eventsFor(res.events, 'b'))).not.toContain(`"id":"${mine.cards![0].id}"`);
  });

  it('la vista sirve para previsualizar el golpe igual que el estado completo', () => {
    const state = createGame(players, 5);
    state.tools = [{ id: 'piqueta', n: 0 }];
    const hand = state.players[0].hand.filter((c) => c.suit !== 'X').slice(0, 1);
    expect(previewStrike(viewFor(state, 'a'), hand, 'D').total).toBe(previewStrike(state, hand, 'D').total);
  });
});

describe('andamio: el hueco de reserva', () => {
  const hand = () => cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8');

  it('guardar una carta no gasta el turno, y al reponer la mano hay una carta más en juego', () => {
    const s = game(hand(), cards('H9', 'H10', 'D9'));
    const a = applyAction(s, 'a', { type: 'stash', card: 'S8' });
    expect(a.state.players[0].reserve.map((c) => c.id)).toEqual(['S8']);
    expect(a.state.players[0].hand.length).toBe(6);
    expect(a.state.turnCount).toBe(0); // sigue siendo tu turno y no ha sonado la sirena
    expect(a.events).toEqual([{ e: 'stash', player: 'a', card: card('S8'), back: null }]);
    expect(() => applyAction(a.state, 'a', { type: 'stash', card: 'S7' })).toThrow(/Manga/);
    const b = applyAction(a.state, 'a', { type: 'discard', cards: ['S2'] });
    expect(b.state.players[0].hand.length).toBe(7);
    expect(b.state.players[0].reserve.length).toBe(1);
    expect(b.state.stashed).toBe(false);
  });

  it('la carta guardada se juega como si estuviera en la mano', () => {
    const s = game(hand(), cards('H9', 'H10'));
    const a = applyAction(s, 'a', { type: 'stash', card: 'S8' }).state;
    const b = applyAction(a, 'a', { type: 'attack', cards: ['S7', 'S8', 'S6'], target: 'D' });
    expect(of(b.events, 'play')[0].formation).toBe('escaleracolor');
    expect(b.state.players[0].reserve).toEqual([]);
  });

  it('con el hueco lleno, guardar otra devuelve la más antigua a la mano', () => {
    let s = game(hand(), cards('H9', 'H10', 'D9'));
    s = applyAction(s, 'a', { type: 'stash', card: 'S8' }).state;
    s = applyAction(s, 'a', { type: 'discard', cards: ['S2'] }).state;
    const swap = applyAction(s, 'a', { type: 'stash', card: 'S7' });
    expect(swap.state.players[0].reserve.map((c) => c.id)).toEqual(['S7']);
    expect(swap.state.players[0].hand.some((c) => c.id === 'S8')).toBe(true);
    expect(of(swap.events, 'stash')[0].back?.id).toBe('S8');
  });

  it('en sala, el andamio es tan privado como la mano', () => {
    const state = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 77);
    const id = state.players[0].hand[0].id;
    const res = applyAction(state, 'a', { type: 'stash', card: id });
    expect(eventsFor(res.events, 'b')).toEqual([{ e: 'stash', player: 'a' }]);
    expect(JSON.stringify(eventsFor(res.events, 'b'))).not.toContain(id);
    const mine = viewFor(res.state, 'a');
    const theirs = viewFor(res.state, 'b');
    expect(mine.reserve.map((c) => c.id)).toEqual([id]);
    expect(theirs.reserve).toEqual([]);
    expect(theirs.players[0]).toMatchObject({ handCount: 5, reserveCount: 1 });
    expect(theirs.unseen.some((c) => c.id === id)).toBe(true); // va mezclada con la cantera: no se sabe dónde está
  });

  it('sin huecos (como en la partida guiada) no se puede guardar', () => {
    const s = game(hand(), [], [], { reserveSize: 0 });
    expect(() => applyAction(s, 'a', { type: 'stash', card: 'S8' })).toThrow(/no hay Manga/);
  });
});

describe('tiza de replanteo', () => {
  const start = () => {
    const s = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'));
    s.chalk = 1;
    return s;
  };

  it('deshace la última jugada y vuelve a barajar la cantera, para que lo visto no valga', () => {
    const s = start();
    const played = applyAction(s, 'a', { type: 'attack', cards: ['S8'], target: 'D' }).state;
    expect(played.undo).not.toBeNull();
    expect(viewFor(played, 'a')).toMatchObject({ chalk: 1, canUndo: true });
    const { state, events } = applyAction(played, 'a', { type: 'undo' });
    expect(events).toEqual([{ e: 'undo', chalk: 0 }]);
    expect(state).toMatchObject({ chalk: 0, undo: null, turnCount: 0, integrity: s.integrity });
    expect(state.towers).toEqual(s.towers);
    expect(state.players[0].hand).toEqual(s.players[0].hand);
    expect(sortCards(state.deck)).toEqual(sortCards(s.deck)); // las mismas cartas…
    expect(state.deck.map((c) => c.id)).not.toEqual(s.deck.map((c) => c.id)); // …en otro orden
    expect(() => applyAction(state, 'a', { type: 'undo' })).toThrow(/rebobinados/);
    // y es determinista: deshacer dos veces desde el mismo punto da lo mismo
    expect(JSON.stringify(applyAction(played, 'a', { type: 'undo' }).state)).toBe(JSON.stringify(state));
  });

  it('sin tiza no se guarda historia ni se puede deshacer', () => {
    const s = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'));
    const played = applyAction(s, 'a', { type: 'attack', cards: ['S8'], target: 'D' }).state;
    expect(played.undo).toBeNull();
    expect(() => applyAction(played, 'a', { type: 'undo' })).toThrow(/rebobinados/);
  });

  it('la historia no se anida: solo se recuerda la jugada anterior', () => {
    let s = start();
    s = applyAction(s, 'a', { type: 'stash', card: 'S2' }).state;
    s = applyAction(s, 'a', { type: 'attack', cards: ['S8'], target: 'D' }).state;
    expect(s.undo?.undo).toBeNull();
    const back = applyAction(s, 'a', { type: 'undo' }).state;
    expect(back.players[0].reserve.map((c) => c.id)).toEqual(['S2']); // vuelve a después de guardar
  });
});

describe('fuzz: 500 partidas con semilla', () => {
  const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const count = (s: GameState) => s.deck.length + s.discard.length + s.exhausted.length + s.burned.length + s.players.reduce((n, p) => n + p.hand.length + p.reserve.length, 0);

  it('ninguna rompe una invariante y todas se reproducen desde su registro de acciones', { timeout: 240_000 }, () => {
    let wins = 0;
    for (let seed = 1; seed <= muestra(500, 90); seed++) {
      const n = 1 + (seed % 2);
      let state = createGame(players.slice(0, n), seed * 7919, DIFFICULTY.obra);
      const log: [string, ReturnType<typeof chooseAction>][] = [];
      for (let guard = 0; state.phase === 'playing'; guard++) {
        if (guard > 600) throw new Error(`partida sin fin, semilla ${seed}`);
        const player = currentPlayer(state).id;
        const action = chooseAction(state);
        log.push([player, action]);
        state = applyAction(state, player, action).state;
        if (count(state) !== 38) throw new Error(`se perdieron cartas, semilla ${seed}`);
        if (state.wall < 0 || state.wall > state.config.wallCap || state.integrity > state.config.maxIntegrity) throw new Error(`búnker fuera de rango, semilla ${seed}`);
        for (const t of Object.values(state.towers)) if (t.floors.length && (t.damage < 0 || t.damage >= state.config.floorHp[t.floors[0]])) throw new Error(`piso mal cerrado, semilla ${seed}`);
        for (const p of state.players) if (p.reserve.length > 1) throw new Error(`andamio desbordado, semilla ${seed}`);
      }
      if (state.phase === 'won') wins++;
      if (seed % 10 === 0) {
        let replay = createGame(players.slice(0, n), seed * 7919, DIFFICULTY.obra);
        for (const [player, action] of log) replay = applyAction(replay, player, action).state;
        if (JSON.stringify(replay) !== JSON.stringify(state)) throw new Error(`la repetición difiere, semilla ${seed}`);
      }
    }
    // la obra clásica está equilibrada para que el bot gane en torno al 60 %
    expect(wins / muestra(500, 90)).toBeGreaterThan(0.4);
    expect(wins / muestra(500, 90)).toBeLessThan(0.84);
  });
});
