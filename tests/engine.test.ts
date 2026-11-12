import { describe, expect, it } from 'vitest';
import { Card, Config, DEFAULT_CONFIG, DIFFICULTY, GameEvent, GameState, StrikeEnv, Suit, applyAction, classify, createGame, currentPlayer, eventsFor, newTowers, previewStrike, reorder, seedFrom, sortCards, strike, viewFor } from '../src/rules/engine';
import { chooseAction, formations } from '../src/rules/bot';
import { ARCH, RARITY, TOOL, TOOLS, bestOrder, toolPool } from '../src/rules/tools';

const card = (id: string, extra: Partial<Card> = {}): Card => (id[0] === 'X' ? { id, suit: 'X', rank: 0, ...extra } : { id, suit: id[0] as Suit, rank: Number(id.slice(1)), ...extra });
const cards = (...ids: string[]) => ids.map((id) => card(id));
const special = (sp: string): Card => ({ id: `sp-${sp}`, suit: 'X', rank: 0, sp });

/** Mesa suelta para probar golpes: pisos J 20 · Q 30 · K 40. */
function env(tools: string[] = [], cfg: Partial<Config> = {}): StrikeEnv {
  const config: Config = { ...structuredClone(DEFAULT_CONFIG), ...cfg };
  for (const id of tools) TOOL[id].cfg?.(config);
  return { config, towers: newTowers([11, 12, 13], config), tools: tools.map((id) => ({ id, n: 0 })), chain: 0, charge: 0, scrap: 0, integrity: 20, wall: 0 };
}

/** Partida de un jugador con la mano y la cima de la cantera que se pidan. */
function game(hand: Card[], top: Card[] = [], tools: string[] = [], cfg: Partial<Config> = {}): GameState {
  const config: Config = { ...structuredClone(DEFAULT_CONFIG), ...cfg };
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
    expect(classify(cards('S2', 'S4', 'S6', 'S8', 'S10'))).toBe('color');
    expect(classify(cards('S9', 'H10', 'D1'))).toBe('escalera'); // el As enlaza por arriba
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
    const found = formations(cards('S9', 'H10', 'D1', 'C1', 'S1')).map((f) => classify(f));
    expect(found).toContain('escalera');
    expect(found).toContain('grupo');
  });
});

describe('Fuerza × Resonancia', () => {
  const hit = (ids: string[], target: Suit, e = env()) => strike(e, cards(...ids), target);

  it('carta sola: la Fuerza es el valor por la ventaja de material, la Resonancia ×1', () => {
    expect(hit(['S7'], 'D')).toMatchObject({ fuerza: 14, res: 1, total: 14 }); // ♠ rompe ♦
    expect(hit(['S7'], 'H')).toMatchObject({ fuerza: 7, total: 7 });
    expect(hit(['S7'], 'S')).toMatchObject({ fuerza: 0, total: 0 }); // inmune a su palo
    expect(hit(['S1'], 'D')).toMatchObject({ fuerza: 22 }); // el As vale 11
  });

  it('cada formación pone su base y redondea el producto', () => {
    expect(hit(['H6', 'C6'], 'C')).toMatchObject({ fuerza: 14, res: 1.2, total: 17, wallGain: 2, repair: 2 });
    expect(hit(['S3', 'H4', 'D5'], 'C')).toMatchObject({ fuerza: 20, res: 1.3, total: 26 });
    // as de compañía: el As suma sus 11 y el poder de su palo (aquí, perforar)
    expect(hit(['H7', 'S1'], 'D')).toMatchObject({ formation: 'compania', fuerza: 29, res: 1.1, total: 32, repair: 3 });
    expect(hit(['S4', 'H4', 'D9', 'C9'], 'H')).toMatchObject({ fuerza: 37, res: 1.5, total: 56 });
    expect(hit(['S2', 'S4', 'S6', 'S8', 'S10'], 'D')).toMatchObject({ fuerza: 68, res: 1.8, total: 122 });
    expect(hit(['H5', 'C5', 'D5', 'S9', 'H9'], 'D')).toMatchObject({ fuerza: 47, res: 2, total: 94 });
    expect(hit(['D3', 'D4', 'D5'], 'H')).toMatchObject({ fuerza: 34, res: 2, total: 68 });
    expect(hit(['S7', 'D7', 'H7', 'C7'], 'C')).toMatchObject({ fuerza: 42, res: 2.5, total: 105 });
  });

  it('los planos suben la base de una formación', () => {
    const e = env([], { formLevel: { grupo: 2 } });
    expect(hit(['H6', 'C6'], 'C', e)).toMatchObject({ fuerza: 20, res: 1.6, total: 32 });
  });

  it('emite un paso por cada aportación, en orden: formación, cartas, especiales, herramientas, impacto', () => {
    const e = env(['piqueta', 'gemelos']);
    const res = strike(e, [...cards('S7', 'H7'), special('bola')], 'D');
    const steps = of(res.events, 'step');
    expect(steps.map((s) => s.src)).toEqual(['form', 'card', 'card', 'special', 'tool', 'tool']);
    expect(steps.map((s) => s.id)).toEqual(['grupo', 'S7', 'H7', 'sp-bola', 'piqueta', 'gemelos']);
    expect(steps[4]).toMatchObject({ slot: 0, df: 3 });
    expect(steps[5]).toMatchObject({ slot: 1, dr: 0.5 });
    // (2 + 14 + 7 + 3) × (1,2 × 1,5 + 0,5) = 26 × 2,3
    expect(res).toMatchObject({ fuerza: 26, res: 2.3, total: 60 });
    const last = steps[steps.length - 1];
    expect(of(res.events, 'impact')[0]).toMatchObject({ tower: 'D', fuerza: last.fuerza, res: last.res, total: 60 });
    expect(res.events.findIndex((ev) => ev.e === 'impact')).toBeGreaterThan(res.events.lastIndexOf(last));
  });

  it('previsualizar no toca el estado', () => {
    const e = env(['calibre']);
    const before = JSON.stringify(e);
    expect(previewStrike(e, cards('S10'), 'D').clean).toBe(true);
    expect(JSON.stringify(e)).toBe(before);
  });
});

describe('cinturón: el orden importa', () => {
  const run = cards('S5', 'S6', 'S7'); // escalera de color contra ♦: 10 + 36 de Fuerza, ×2

  it('lo que suma Resonancia cuenta donde está; lo que multiplica, multiplica todo lo de su izquierda', () => {
    expect(strike(env(['prisma', 'plano_maestro']), run, 'D')).toMatchObject({ fuerza: 46, res: 7, total: 322 }); // (2 + 1,5) × 2
    expect(strike(env(['plano_maestro', 'prisma']), run, 'D')).toMatchObject({ fuerza: 46, res: 5.5, total: 253 }); // 2 × 2 + 1,5
  });

  it('el Diapasón copia la herramienta de su derecha', () => {
    expect(strike(env(['diapason', 'plano_maestro']), run, 'D')).toMatchObject({ res: 8 });
    expect(strike(env(['plano_maestro', 'diapason']), run, 'D')).toMatchObject({ res: 4 });
    const steps = of(strike(env(['diapason', 'plano_maestro']), run, 'D').events, 'step').filter((s) => s.src === 'tool');
    expect(steps.map((s) => [s.id, s.slot])).toEqual([['diapason', 0], ['plano_maestro', 1]]);
  });

  it('el Percutor repite la primera carta: importa cuál va delante', () => {
    expect(strike(env(['percutor']), cards('S7', 'H7'), 'D').fuerza).toBe(2 + 14 + 7 + 14);
    expect(strike(env(['percutor']), cards('H7', 'S7'), 'D').fuerza).toBe(2 + 7 + 14 + 7);
  });

  it('reordenar exige una permutación válida y el orden recomendado deja lo que multiplica al final', () => {
    expect(reorder(['a', 'b', 'c'], [2, 0, 1])).toEqual(['c', 'a', 'b']);
    expect(reorder(['a', 'b', 'c'], [0, 0, 1])).toBeNull();
    expect(reorder(['a', 'b'], [0, 1, 2])).toBeNull();
    const belt = ['plano_maestro', 'prisma', 'piqueta', 'sacos'].map((id) => ({ id, n: 0 }));
    expect(bestOrder(belt).map((i) => belt[i].id)).toEqual(['sacos', 'piqueta', 'prisma', 'plano_maestro']);
    const withCopy = ['diapason', 'piqueta', 'ultimo'].map((id) => ({ id, n: 0 }));
    expect(bestOrder(withCopy).map((i) => withCopy[i].id)).toEqual(['piqueta', 'diapason', 'ultimo']);
  });

  it('hay al menos 36 herramientas, de 4 rarezas y 5 arquetipos, todas bien definidas', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(36);
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.rarity))).toEqual(new Set(Object.keys(RARITY)));
    for (const arch of ['precision', 'sismo', 'alquimia', 'limite', 'trituradora', 'aguante'] as const) expect(TOOLS.filter((t) => t.arch === arch).length).toBeGreaterThanOrEqual(4);
    for (const t of TOOLS) expect(ARCH[t.arch], t.id).toBeTruthy();
    // el surtido base es deliberadamente corto: lo demás se abre en el gremio, caja a caja
    expect(toolPool([]).length).toBe(TOOLS.filter((t) => !t.box).length);
    expect(toolPool([]).length).toBeLessThan(TOOLS.length * 0.6);
    expect(toolPool(['precision', 'sismo', 'alquimia', 'limite', 'trituradora', 'aguante']).length).toBe(TOOLS.length);
    // ninguna revienta al resolverse sobre una mesa cualquiera
    for (const t of TOOLS) expect(() => strike(env([t.id, 'piqueta']), cards('S5', 'S6', 'S7'), 'D'), t.id).not.toThrow();
  });
});

describe('herramientas con sinergia', () => {
  it('precisión: el Nivel da margen, el Calibre crece y la Cizalla corta el piso siguiente', () => {
    const e = env(['nivel', 'calibre', 'cizalla']);
    e.towers.D.damage = 9;
    const res = strike(e, cards('S5'), 'D'); // 19 de 20: limpio con margen ±1
    expect(res.clean).toBe(true);
    expect(e.tools[1].n).toBe(1);
    // onda sísmica (un cuarto de 30 = 8) + cizalla (la mitad = 15)
    expect(e.towers.D).toMatchObject({ floors: [12, 13], damage: 23 });
    expect(strike(e, cards('H2'), 'S').res).toBe(1.15); // el Calibre ya suma +0,15
  });

  it('sismo: el Vibrador salpica la mitad del daño de un grupo y la Metralla afila las esquirlas', () => {
    const res = strike(env(['vibrador']), cards('S7', 'H7'), 'D'); // (2 + 14 + 7) × 1,2 = 28
    expect(res.dealt).toMatchObject({ D: 28, S: 14, H: 14, C: 14 });
    expect(strike(env(['metralla']), cards('D8'), 'H').dealt.S).toBe(4);
  });

  it('alquimia: un solo material fractura, tres materiales sobrecargan y el Catalizador cobra cada estado', () => {
    const e = env(['catalizador'], { floorHp: { 11: 500, 12: 500, 13: 500 } });
    strike(e, cards('S2', 'S3', 'S4'), 'D');
    expect(e.towers.D.fx.fractura).toBe(true);
    strike(e, cards('S3', 'H4', 'D5'), 'C');
    expect(e.towers.C.fx.sobrecarga).toBe(true);
    // contra ♦: fractura ×1,5 y, al llegar al cinturón, queda un estado activo en la mesa: ×1,5 más
    const res = strike(e, cards('S5'), 'D');
    expect(res).toMatchObject({ fuerza: 10, res: 2.25, total: 23 });
    expect(e.towers.D.fx.fractura).toBe(false);
    const crisol = env(['crisol'], { floorHp: { 11: 500, 12: 500, 13: 500 } });
    strike(crisol, cards('S3', 'H4', 'D5'), 'C');
    expect(crisol.towers.C.fx).toMatchObject({ fractura: true, sobrecarga: true });
    expect(strike(crisol, cards('H5'), 'C').res).toBe(2);
  });

  it('búnker al límite: el peligro se convierte en Resonancia', () => {
    const e = env(['sismografo', 'ultimo', 'corazon']);
    e.integrity = 8;
    const res = strike(e, cards('S5'), 'D');
    expect(res).toMatchObject({ fuerza: 10, res: 8.8, total: 88, hurt: 0 }); // (1 + 1,2) × 2 × 2; tira el piso: el Corazón no cobra
    // si el golpe no derriba nada, el Corazón le cuesta 1 al búnker
    const hard = env(['corazon'], { floorHp: { 11: 500, 12: 500, 13: 500 } });
    expect(strike(hard, cards('S5'), 'D').hurt).toBe(1);
  });

  it('trituradora: destruir cartas ceba el Montacargas y la Prensa', () => {
    const e = env(['montacargas', 'prensa']);
    e.scrap = 4;
    expect(strike(e, cards('S5'), 'D')).toMatchObject({ fuerza: 18, res: 1.2, total: 22 });
  });
});

describe('sellos', () => {
  it('eco: repite el impacto y el poder del palo', () => {
    expect(strike(env(), [card('S7', { seal: 'eco' })], 'D').fuerza).toBe(28);
    expect(strike(env(), [card('H6', { seal: 'eco' })], 'C').repair).toBe(4);
    expect(strike(env(), [card('C6', { seal: 'eco' })], 'S').wallGain).toBe(4);
  });

  it('dinamita: las torres vecinas reciben el valor de la carta', () => {
    const res = strike(env(), [card('S7', { seal: 'dinamita' })], 'D');
    expect(res.dealt).toEqual({ D: 14, S: 7, H: 7 });
  });

  it('jornal: +2 de oro solo si el golpe derriba un piso', () => {
    expect(strike(env(), [card('S1', { seal: 'jornal' })], 'D').gold).toBe(2);
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

  it('el Timbre del gremio activa los sellos dos veces', () => {
    expect(strike(env(['timbre']), [card('S7', { seal: 'eco' })], 'D').fuerza).toBe(42);
    expect(strike(env(['timbre']), [card('S1', { seal: 'jornal' })], 'D').gold).toBe(4);
  });
});

describe('tratamientos', () => {
  it('forjado suma Fuerza, templado suma Resonancia, bronce vivo y agrietado la multiplican', () => {
    expect(strike(env(), [card('S7', { tr: 'forjado' })], 'D')).toMatchObject({ fuerza: 20, res: 1, total: 20 });
    expect(strike(env(), [card('S7', { tr: 'templado' })], 'D')).toMatchObject({ fuerza: 14, res: 1.3, total: 18 });
    expect(strike(env(), [card('S7', { tr: 'policromado' })], 'D')).toMatchObject({ res: 1.5, total: 21 });
    expect(strike(env(), [card('S7', { tr: 'agrietado' })], 'D')).toMatchObject({ res: 2.5, total: 35 });
  });

  it('el orden de las cartas decide: sumar antes de multiplicar rinde más', () => {
    const a = card('S7', { tr: 'templado' });
    const b = card('H7', { tr: 'policromado' });
    expect(strike(env(), [a, b], 'D').res).toBe(2.25); // (1,2 + 0,3) × 1,5
    expect(strike(env(), [b, a], 'D').res).toBe(2.1); // 1,2 × 1,5 + 0,3
  });

  it('agrietado se hace añicos 1 de cada 4 veces, según la semilla; al previsualizar, nunca', () => {
    const cracked = card('S7', { tr: 'agrietado' });
    expect(previewStrike(env(), [cracked], 'D').shattered).toEqual([]);
    let broken = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = game([cracked, ...cards('C2', 'C3', 'C4', 'C5', 'C6', 'C7')], [], ['horno']);
      s.rng = seed;
      const a = applyAction(s, 'a', { type: 'attack', cards: ['S7'], target: 'D' });
      const b = applyAction(s, 'a', { type: 'attack', cards: ['S7'], target: 'D' });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b)); // misma semilla, mismo destino
      if (a.state.burned.includes('S7')) {
        broken++;
        expect(a.state.scrap).toBe(1);
        expect(a.state.discard.some((c) => c.id === 'S7')).toBe(false);
        expect(of(a.events, 'burn')[0].card.id).toBe('S7');
        expect(of(a.events, 'gold').some((g) => g.amount === 3)).toBe(true); // el Horno paga 3 por cada carta destruida
      } else expect(a.state.discard.some((c) => c.id === 'S7')).toBe(true);
    }
    expect(broken).toBeGreaterThan(70);
    expect(broken).toBeLessThan(130);
  });
});

describe('golpe limpio y estados de las torres', () => {
  it('daño exacto: calla la sirena, paga 1 de oro, lanza la onda sísmica y abre una racha', () => {
    const s = game(cards('S10', 'S5', 'C2', 'C3', 'C4', 'C5', 'C6'));
    const { state, events } = applyAction(s, 'a', { type: 'attack', cards: ['S10'], target: 'D' });
    expect(of(events, 'floorDown')[0]).toMatchObject({ tower: 'D', rank: 11, clean: true });
    expect(of(events, 'onda')[0]).toMatchObject({ tower: 'D', amount: 8 }); // un cuarto de 30
    expect(state.towers.D).toMatchObject({ floors: [12, 13], damage: 8 });
    expect(of(events, 'gold')[0].amount).toBe(1);
    expect(of(events, 'siren')[0]).toMatchObject({ reason: 'clean', taken: 0 });
    expect(state.chain).toBe(1);
    expect(state.players[0].hand.length).toBe(8); // el golpe limpio da una carta de impulso
    // el golpe siguiente resuena +0,5, y si no es limpio la racha se corta
    const next = applyAction(state, 'a', { type: 'attack', cards: ['S5'], target: 'D' });
    expect(of(next.events, 'step').find((st) => st.src === 'chain')).toMatchObject({ dr: 0.5 });
    expect(of(next.events, 'impact')[0]).toMatchObject({ fuerza: 10, res: 1.5, total: 15 });
    expect(next.state.chain).toBe(0);
  });

  it('las picas perforan: el exceso pasa al piso siguiente; sin picas se pierde', () => {
    const pierce = env();
    strike(pierce, cards('S1', 'C1'), 'D'); // (2 + 22 + 11) × 1,2 = 42
    expect(pierce.towers.D).toMatchObject({ floors: [12, 13], damage: 22 });
    const blunt = env();
    strike(blunt, cards('H1', 'C1'), 'S'); // 2 + 11 + 22 = 35 × 1,2 = 42
    expect(blunt.towers.S).toMatchObject({ floors: [12, 13], damage: 0 });
  });

  it('fractura expuesta: el siguiente golpe resuena ×1,5 y se gasta', () => {
    const e = env([], { floorHp: { 11: 500, 12: 500, 13: 500 } });
    const first = strike(e, cards('S2', 'S3', 'S4'), 'D');
    expect(of(first.events, 'state')).toEqual([{ e: 'state', tower: 'D', fx: 'fractura', on: true }]);
    expect(strike(e, cards('S5'), 'D')).toMatchObject({ res: 1.5, total: 15 });
    expect(strike(e, cards('S6'), 'D')).toMatchObject({ res: 1, total: 12 });
  });

  it('sobrecarga: la torre se salta su próximo golpe de sirena', () => {
    const s = game(cards('S3', 'H4', 'D5', 'D2', 'D7', 'D8', 'D9'), cards('C9', 'C10'));
    const first = applyAction(s, 'a', { type: 'attack', cards: ['S3', 'H4', 'D5'], target: 'C' });
    expect(of(first.events, 'siren')[0]).toMatchObject({ tower: 'C', reason: 'sobrecarga', taken: 0 });
    expect(first.state.integrity).toBe(20);
    expect(first.state.towers.C.fx.sobrecarga).toBe(false);
  });

  it('apuntalado: el primer golpe contra el piso resuena a la mitad', () => {
    const e = env([], { apuntalado: [11, 12] });
    expect(strike(e, cards('S9'), 'D')).toMatchObject({ res: 0.5, total: 9 });
    expect(strike(e, cards('S1'), 'D').total).toBe(22); // cae la J…
    expect(e.towers.D.fx.apuntalado).toBe(true); // …y la Q llega apuntalada
  });
});

describe('turno: sirena, muro, descartes, huelga y colapso', () => {
  it('la sirena golpea con la amenaza del piso y el muro la absorbe', () => {
    const s = game(cards('C9', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'), cards('H9', 'D9'));
    const { state, events } = applyAction(s, 'a', { type: 'attack', cards: ['C9'], target: 'S' });
    expect(state.wall).toBe(0); // 3 de muro, y la J de ♥ amenaza 3
    expect(of(events, 'siren')[0]).toMatchObject({ tower: 'H', threat: 3, blocked: 3, taken: 0 });
    const next = applyAction(state, 'a', { type: 'discard', cards: ['S2'] });
    expect(next.state.integrity).toBe(17);
  });

  it('la huelga desarma el piso y retira el comodín de la obra', () => {
    const s = game([card('X1'), ...cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7')], cards('D9'), ['piquete']);
    const { state, events } = applyAction(s, 'a', { type: 'joker', card: 'X1', target: 'D' });
    expect(state.towers.D.disarmed).toBe(true);
    expect(state.exhausted.map((c) => c.id)).toEqual(['X1']);
    expect(of(events, 'siren')[0].reason).toBe('huelga');
    expect(of(events, 'gold')[0].amount).toBe(3); // Piquete
    expect(state.players[0].hand.length).toBe(9); // repone 1 y roba 2 más
  });

  it('la Trituradora destruye la primera carta descartada y el Contenedor agota y carga Fuerza', () => {
    const s = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'), [], ['trituradora', 'contenedor']);
    const { state, events } = applyAction(s, 'a', { type: 'discard', cards: ['S2', 'S3', 'S4'] });
    expect(state.burned).toEqual(['S2']);
    expect(state.scrap).toBe(1);
    expect(state.exhausted.map((c) => c.id)).toEqual(['S3', 'S4']);
    expect(state.discard.some((c) => ['S2', 'S3', 'S4'].includes(c.id))).toBe(false);
    expect(state.charge).toBe(12);
    expect(of(events, 'burn').length).toBe(1);
    const hit = applyAction(state, 'a', { type: 'attack', cards: ['S5'], target: 'D' });
    expect(of(hit.events, 'impact')[0].fuerza).toBe(22);
    expect(hit.state.charge).toBe(0);
  });

  it('el Megáfono devuelve cada golpe de sirena', () => {
    const s = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'), cards('H9'), ['megafono']);
    const { state } = applyAction(s, 'a', { type: 'discard', cards: ['S2'] });
    expect(state.integrity).toBe(17);
    expect(state.towers.H.damage).toBe(8);
  });

  it('cuando la cantera se agota hay colapso', () => {
    const s = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'));
    s.discard = s.deck.splice(0);
    const { state, events } = applyAction(s, 'a', { type: 'discard', cards: ['S2'] });
    expect(of(events, 'collapse')[0].loss).toBe(5);
    expect(state.collapses).toBe(1);
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
    expect(() => applyAction(a.state, 'a', { type: 'stash', card: 'S7' })).toThrow(/andamio/);
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

  it('con el hueco lleno, guardar otra devuelve la más antigua a la mano; la Pasarela da un segundo hueco', () => {
    let s = game(hand(), cards('H9', 'H10', 'D9'));
    s = applyAction(s, 'a', { type: 'stash', card: 'S8' }).state;
    s = applyAction(s, 'a', { type: 'discard', cards: ['S2'] }).state;
    const swap = applyAction(s, 'a', { type: 'stash', card: 'S7' });
    expect(swap.state.players[0].reserve.map((c) => c.id)).toEqual(['S7']);
    expect(swap.state.players[0].hand.some((c) => c.id === 'S8')).toBe(true);
    expect(of(swap.events, 'stash')[0].back?.id).toBe('S8');
    let two = game(hand(), [], ['pasarela']);
    two = applyAction(two, 'a', { type: 'stash', card: 'S8' }).state;
    two = applyAction(two, 'a', { type: 'discard', cards: ['S2'] }).state;
    two = applyAction(two, 'a', { type: 'stash', card: 'S7' }).state;
    expect(two.players[0].reserve.map((c) => c.id)).toEqual(['S8', 'S7']);
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
    expect(() => applyAction(s, 'a', { type: 'stash', card: 'S8' })).toThrow(/No hay andamio/);
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
    expect(() => applyAction(state, 'a', { type: 'undo' })).toThrow(/tiza/);
    // y es determinista: deshacer dos veces desde el mismo punto da lo mismo
    expect(JSON.stringify(applyAction(played, 'a', { type: 'undo' }).state)).toBe(JSON.stringify(state));
  });

  it('sin tiza no se guarda historia ni se puede deshacer', () => {
    const s = game(cards('S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'));
    const played = applyAction(s, 'a', { type: 'attack', cards: ['S8'], target: 'D' }).state;
    expect(played.undo).toBeNull();
    expect(() => applyAction(played, 'a', { type: 'undo' })).toThrow(/tiza/);
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
    for (let seed = 1; seed <= 500; seed++) {
      const n = 1 + (seed % 2);
      let state = createGame(players.slice(0, n), seed * 7919, DIFFICULTY.obra);
      const log: [string, ReturnType<typeof chooseAction>][] = [];
      for (let guard = 0; state.phase === 'playing'; guard++) {
        if (guard > 600) throw new Error(`partida sin fin, semilla ${seed}`);
        const player = currentPlayer(state).id;
        const action = chooseAction(state);
        log.push([player, action]);
        state = applyAction(state, player, action).state;
        if (count(state) !== 42) throw new Error(`se perdieron cartas, semilla ${seed}`);
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
    expect(wins).toBeGreaterThan(200);
    expect(wins).toBeLessThan(420);
  });
});
