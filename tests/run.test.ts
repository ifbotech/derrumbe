import { describe, expect, it } from 'vitest';
import { Card, DEFAULT_CONFIG, Suit, applyAction, cardValue, classify, createGame, currentPlayer, previewStrike } from '../src/rules/engine';
import { chooseAction, formations } from '../src/rules/bot';
import { ACHIEVEMENTS, claim, deckUnlocked, noteEvents, noteRun, unlockedPool } from '../src/rules/achievements';
import { BOSSES, DECKS, MIN_DECK, RELICS, STAGES, addSpecial, buyUpgrade, cleanUp, finishBattle, newMeta, newRun, removeCost, runAction, settle, stageConfig, startStage, trackEvents } from '../src/rules/run';
import { BASE_POOL, SPECIALS } from '../src/rules/specials';

const c = (id: string): Card => ({ id, suit: id[0] as Card['suit'], rank: Number(id.slice(1)) });
const cards = (...ids: string[]) => ids.map(c);
const sp = (id: string): Card => ({ id: `sp-${id}`, suit: 'X', rank: 0, sp: id });

describe('formaciones', () => {
  it('reconoce doble par, full, póker, color y escalera de color', () => {
    expect(classify(cards('S5', 'H5', 'D9', 'C9'))).toBe('doblepar');
    expect(classify(cards('S5', 'H5', 'D5', 'C9', 'H9'))).toBe('full');
    expect(classify(cards('S5', 'H5', 'D5', 'C5'))).toBe('poker');
    expect(classify(cards('H1', 'H4', 'H6', 'H9', 'H10'))).toBe('color');
    expect(classify(cards('D3', 'D4', 'D5'))).toBe('escaleracolor');
    expect(classify(cards('S5', 'H5', 'D9'))).toBeNull();
    expect(classify(cards('H1', 'H4', 'H6', 'H9'))).toBeNull(); // el color pide 5
  });
  it('el As es la carta fuerte: vale 11 y enlaza por abajo y por arriba', () => {
    expect(cardValue(c('S1'))).toBe(11);
    expect(classify(cards('S1', 'H2', 'D3'))).toBe('escalera');
    expect(classify(cards('S9', 'H10', 'D1'))).toBe('escalera');
    expect(classify(cards('S10', 'H1', 'D2'))).toBeNull(); // no da la vuelta
    const s = createGame([{ id: 'a', name: 'A' }], 1);
    expect(previewStrike(s.towers, cards('S1'), 'D', DEFAULT_CONFIG).dealt.D).toBe(22);
  });
  it('las formaciones difíciles multiplican el golpe', () => {
    const s = createGame([{ id: 'a', name: 'A' }], 1);
    // póker de 5 contra ACERO: ♣ ×2, ♠ ×0, ♥ y ♦ ×1 → (10 + 0 + 5 + 5) × 2
    expect(previewStrike(s.towers, cards('S5', 'H5', 'D5', 'C5'), 'S', DEFAULT_CONFIG).dealt.S).toBe(40);
    // color de ♥ contra HORMIGÓN: (11 + 4 + 6 + 9 + 10) × 2 de ventaja × 1,5 de color
    expect(previewStrike(s.towers, cards('H1', 'H4', 'H6', 'H9', 'H10'), 'C', DEFAULT_CONFIG).dealt.C).toBe(120);
  });
  it('el bot sabe armarlas y acompañarlas con especiales', () => {
    const hand = [...cards('S5', 'H5', 'D9', 'C9', 'H9', 'H2'), sp('bola')];
    const found = formations(hand);
    expect(found.map((f) => classify(f))).toContain('doblepar');
    expect(found.map((f) => classify(f))).toContain('full');
    expect(found.some((f) => f.length === 6 && f.some((x) => x.sp))).toBe(true);
    expect(found.every((f) => classify(f))).toBe(true);
  });
});

describe('cartas especiales', () => {
  /** Juega la especial (con cartas de baraja si se indican) en la obra 1 de una campaña. */
  const play = (id: string, extra: string[] = [], target: Suit = 'D') => {
    const run = newRun({}, 3);
    run.deck = run.deck.filter((d) => !d.sp);
    const card = addSpecial(run, id);
    const state = startStage(run, [{ id: 'tu', name: 'TÚ' }]);
    state.players[0].hand = [card, ...extra.map(c)];
    state.deck = state.deck.filter((d) => d.id !== card.id && !extra.includes(d.id));
    return applyAction(state, 'tu', { type: 'attack', cards: [card.id, ...extra], target });
  };
  const hit = (r: ReturnType<typeof play>) => r.events.find((e) => e.e === 'hit');

  it('no tienen palo ni número y hay 16 comunes y 8 legendarias', () => {
    expect(SPECIALS.length).toBe(24);
    expect(BASE_POOL.length).toBe(16);
    expect(new Set(SPECIALS.map((s) => s.id)).size).toBe(24);
    expect(SPECIALS.every((s) => Object.keys(s.fx).length > 0)).toBe(true);
    const card = addSpecial(newRun({}, 1), 'barreno');
    expect(card).toMatchObject({ suit: 'X', rank: 0, sp: 'barreno' });
  });
  it('acompañan a cualquier formación sin romperla, hasta dos por golpe', () => {
    expect(classify([...cards('S5', 'H5'), sp('bola')])).toBe('grupo');
    expect(classify([...cards('S3', 'H4', 'D5'), sp('bola'), sp('nitro')])).toBe('escalera');
    expect(classify([sp('mordaza')])).toBe('solo');
    expect(classify([c('S5'), sp('bola'), sp('nitro'), sp('grua')])).toBeNull();
    expect(classify([...cards('S5', 'H9'), sp('bola')])).toBeNull();
  });
  it('Barreno suma 8 y perfora; Martillo repite la carta más alta', () => {
    expect(hit(play('barreno'))).toMatchObject({ amount: 8 });
    expect(hit(play('barreno', ['S7']))).toMatchObject({ amount: 22 }); // 7 × 2 + 8
    expect(hit(play('martillo', ['S9', 'H9']))).toMatchObject({ amount: 45 }); // 18 + 9 + otros 18
  });
  it('Gemelo iguala al alza y Sierra radial ignora la inmunidad', () => {
    expect(hit(play('gemelo', ['H3', 'H4', 'C5'], 'S'))).toMatchObject({ amount: 20 }); // 5 + 5 + 5 × 2
    expect(hit(play('sierra', ['D5', 'H5'], 'D'))).toMatchObject({ amount: 20 }); // ♦ contra vidrio ya no es ×0
  });
  it('Mordaza calla la sirena, Grúa roba de más y Chatarrero da oro', () => {
    expect(play('mordaza', [], 'H').events.find((e) => e.e === 'siren')).toMatchObject({ reason: 'huelga' });
    const grua = play('grua', [], 'H');
    expect(grua.state.players[0].hand.length).toBe(grua.state.config.handSize[1] + 2);
    expect(play('chatarrero', [], 'H').events).toContainEqual({ e: 'gold', amount: 3 });
  });
  it('Nitroglicerina dobla el golpe y le cuesta al búnker', () => {
    const r = play('nitro', ['H9'], 'C'); // ♥9 contra hormigón: 9 × 2 × 2
    expect(hit(r)).toMatchObject({ amount: 36 });
    expect(r.events).toContainEqual({ e: 'hurt', amount: 3, integrity: 17 });
  });
});

describe('campaña', () => {
  it('empieza con un sobre de tres cartas especiales', () => {
    const run = newRun({}, 42);
    expect(run.phase).toBe('pack');
    expect(run.pack.length).toBe(3);
    expect(run.deck.filter((d) => d.sp).length).toBe(3);
    expect(run.deck.length).toBe(45);
    expect(run.pool).toEqual(BASE_POOL);
    expect(runAction(run, { t: 'next' })).not.toBeNull();
    expect(runAction(run, { t: 'begin' })).toBeNull();
    expect(run.phase).toBe('battle');
  });

  it('las barajas iniciales cambian el punto de partida', () => {
    for (const d of DECKS) {
      const run = newRun({ deck: d.id }, 77);
      expect(run.deckId).toBe(d.id);
      expect(new Set(run.deck.map((x) => x.id)).size).toBe(run.deck.length);
      expect(run.deck.length).toBeGreaterThanOrEqual(MIN_DECK);
      const state = startStage(run, [{ id: 'tu', name: 'TÚ' }]);
      expect(state.players[0].hand.length).toBe(state.config.handSize[1]);
    }
    expect(newRun({ deck: 'acero' }, 1).deck.filter((x) => x.suit === 'H' || x.suit === 'D').length).toBe(0);
    expect(newRun({ deck: 'acero' }, 1).relics).toEqual(['acido']);
    expect(newRun({ deck: 'ases' }, 1).deck.filter((x) => x.rank === 1).length).toBe(8);
    expect(newRun({ deck: 'caos' }, 1).pack.length).toBe(6);
    expect(newRun({ deck: 'prestamista' }, 1)).toMatchObject({ gold: 15, maxIntegrity: 16 });
    expect(newRun({ deck: 'no-existe' }, 1).deckId).toBe('obra');
  });

  it('las legendarias solo entran en el sorteo si llegan desbloqueadas', () => {
    expect(newRun({ pool: ['ferretero', 'inventada'] }, 1).pool).toEqual([...BASE_POOL, 'ferretero']);
  });

  it('las herramientas cambian las reglas de la obra', () => {
    const run = newRun({}, 5);
    run.relics = ['piqueta', 'dinamita', 'acido', 'andamio', 'estandarte'];
    const cfg = stageConfig(run, 1);
    expect(cfg.handSize[1]).toBe(8);
    expect(cfg.mods).toMatchObject({ suitFlat: { S: 3 }, advMult: 3, ownMult: 1, formMult: { color: 0.5 } });
    const state = startStage(run, [{ id: 'tu', name: 'TÚ' }]);
    expect(previewStrike(state.towers, [c('S7')], 'D', cfg).dealt.D).toBe(30); // (7 + 3) × 3
    expect(previewStrike(state.towers, [c('S7')], 'S', cfg).dealt.S).toBe(10); // ya no es inmune
  });

  it('ferretería: carta incógnita, forja y quemar', () => {
    const run = newRun({}, 9);
    run.phase = 'shop';
    run.gold = 30;
    run.shop = [
      { kind: 'forja', cost: 4, cards: ['H5', 'C2', 'D9'] },
      { kind: 'sobre', cost: 5 },
      { kind: 'relic', cost: 8, id: 'maza' },
    ];
    expect(runAction(run, { t: 'buy', i: 0, choice: 'S1' })).not.toBeNull();
    expect(runAction(run, { t: 'buy', i: 0, choice: 'H5' })).toBeNull();
    expect(cardValue(run.deck.find((d) => d.id === 'H5')!)).toBe(8);
    const before = run.deck.filter((d) => d.sp).length;
    expect(runAction(run, { t: 'buy', i: 1 })).toBeNull();
    expect(run.deck.filter((d) => d.sp).length).toBe(before + 1);
    expect(runAction(run, { t: 'buy', i: 1 })).not.toBeNull(); // ya vendida
    expect(runAction(run, { t: 'buy', i: 2 })).toBeNull();
    expect(run.relics).toEqual(['maza']);
    expect(run.gold).toBe(13);
    const size = run.deck.length;
    expect(removeCost(run)).toBe(3);
    expect(runAction(run, { t: 'remove', card: 'C1' })).toBeNull();
    expect(run.deck.length).toBe(size - 1);
    expect(removeCost(run)).toBe(5);
    run.deck = run.deck.slice(0, MIN_DECK);
    expect(runAction(run, { t: 'remove', card: run.deck[0].id })).not.toBeNull();
  });

  it('una campaña entera se puede jugar, también en cooperativo', () => {
    for (const n of [1, 3]) {
      const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      const run = newRun({ up: { cimientos: 3, caja: 3 } }, 1234 + n);
      expect(run.maxIntegrity).toBe(26);
      expect(run.gold).toBe(9);
      runAction(run, { t: 'begin' });
      let cleared = 0;
      for (let guard = 0; guard < 12 && run.phase === 'battle'; guard++) {
        let state = startStage(run, players);
        expect(state.players.every((p) => p.hand.length === state.config.handSize[n])).toBe(true);
        let steps = 0;
        while (state.phase === 'playing' && steps++ < 3000) {
          const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
          trackEvents(run, res.events);
          state = res.state;
        }
        expect(steps).toBeLessThan(3000);
        const gold = run.gold;
        const boss = run.boss;
        finishBattle(run, state);
        if ((run.phase as string) !== 'reward') break;
        cleared++;
        if (boss) expect(run.beaten).toContain(boss);
        expect(run.gold).toBe(gold + run.pay.reduce((a, [, x]) => a + x, 0));
        expect(runAction(run, { t: 'next' })).not.toBeNull(); // antes hay que resolver la recompensa
        const specials = run.deck.filter((d) => d.sp).length;
        runAction(run, { t: 'pick', take: true });
        expect(run.deck.filter((d) => d.sp).length).toBe(specials + 1);
        if (!run.relicPicked) runAction(run, { t: 'pickRelic', id: null });
        expect(run.phase).toBe('shop');
        expect(run.shop.filter((o) => o.kind === 'relic').length).toBe(2);
        expect(run.shop.filter((o) => o.kind === 'sobre').length).toBe(1);
        expect(run.shop.length).toBe(4);
        run.shop.forEach((o, i) => runAction(run, { t: 'buy', i, choice: o.cards?.[0] }));
        runAction(run, { t: 'reroll' });
        expect(runAction(run, { t: 'next' })).toBeNull();
        expect(run.stage).toBe(cleared + 1);
      }
      expect(cleared).toBeGreaterThan(0);
      expect(['won', 'lost']).toContain(run.phase);
      const meta = newMeta();
      expect(settle(meta, run)).toBeGreaterThan(0);
      expect(meta.best).toBe(run.phase === 'won' ? STAGES.length : cleared);
    }
  });

  it('el gremio cobra renombre, respeta el máximo y no se fía de niveles inventados', () => {
    const meta = newMeta();
    expect(buyUpgrade(meta, 'manos')).toBe(false);
    meta.renown = 40;
    expect(buyUpgrade(meta, 'manos')).toBe(true);
    expect(buyUpgrade(meta, 'manos')).toBe(false);
    expect(meta.renown).toBe(22);
    expect(cleanUp({ manos: 99, cimientos: -4, otra: 3 })).toMatchObject({ manos: 1, cimientos: 0 });
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(RELICS.length);
  });
});

describe('logros', () => {
  it('se cumplen jugando, dan renombre una sola vez y desbloquean barajas y legendarias', () => {
    const meta = newMeta();
    expect(claim(meta)).toEqual([]);
    expect(deckUnlocked(meta, 'obra')).toBe(true);
    expect(deckUnlocked(meta, 'acero')).toBe(false);
    expect(unlockedPool(meta)).toEqual([]);

    noteEvents(meta, [
      { e: 'play', player: 'a', cards: [], target: 'S', formation: 'poker' },
      { e: 'hit', tower: 'S', amount: 120, splash: false, damage: 0, hp: 20 },
      { e: 'hit', tower: 'D', amount: 400, splash: true, damage: 0, hp: 20 }, // las esquirlas no cuentan como golpe
      { e: 'floorDown', tower: 'S', rank: 11, clean: true, towerDown: false, damage: 0 },
    ]);
    const run = newRun({}, 8);
    run.stage = 4;
    run.phase = 'battle'; // va por la obra 4: ha superado 3
    run.beaten = ['doble'];
    run.relics = ['maza'];
    noteRun(meta, run);
    const got = claim(meta).map((a) => a.id);
    expect(got).toEqual(expect.arrayContaining(['primera', 'capataz', 'poker', 'golpe100', 'j-doble']));
    expect(got).not.toContain('golpe300');
    expect(got).not.toContain('media');
    expect(meta.renown).toBe(ACHIEVEMENTS.filter((a) => got.includes(a.id)).reduce((s, a) => s + a.renown, 0));
    expect(claim(meta)).toEqual([]); // no se cobran dos veces
    expect(deckUnlocked(meta, 'acero')).toBe(true);
    expect(deckUnlocked(meta, 'corta')).toBe(true);
    expect(unlockedPool(meta)).toEqual(['j-doble']);
  });

  it('hay un trofeo por jefe y cada baraja y legendaria tiene su logro', () => {
    for (const b of BOSSES) expect(ACHIEVEMENTS.some((a) => a.id === `j-${b.id}`)).toBe(true);
    for (const d of DECKS) if (d.unlock) expect(ACHIEVEMENTS.some((a) => a.id === d.unlock)).toBe(true);
    for (const s of SPECIALS) if (s.locked) expect(ACHIEVEMENTS.some((a) => a.id === s.locked)).toBe(true);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});
