import { describe, expect, it } from 'vitest';
import { applyAction, cardValue, currentPlayer, previewStrike } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';
import { RELICS, STAGES, advance, buy, buyUpgrade, completeStage, newMeta, newRun, reroll, settle, stageConfig, startStage } from '../src/rules/run';

describe('campaña', () => {
  it('las herramientas cambian las reglas de la obra', () => {
    const meta = newMeta();
    const run = newRun(meta, 5);
    run.relics = ['piqueta', 'dinamita', 'acido', 'andamio'];
    const cfg = stageConfig(run, meta);
    expect(cfg.handSize[1]).toBe(8);
    expect(cfg.mods).toMatchObject({ suitFlat: { S: 3 }, advMult: 3, ownMult: 1 });
    const state = startStage(run, meta);
    const s7 = { id: 'S7', suit: 'S' as const, rank: 7 };
    // (7 + 3) × 3 contra vidrio; (7 + 3) × 1 contra su propio acero
    expect(previewStrike(state.towers, [s7], 'D', cfg).dealt.D).toBe(30);
    expect(previewStrike(state.towers, [s7], 'S', cfg).dealt.S).toBe(10);
  });

  it('la forja mejora una carta para toda la campaña', () => {
    const meta = newMeta();
    const run = newRun(meta, 9);
    run.phase = 'shop';
    run.gold = 20;
    run.shop = [{ kind: 'forja', cost: 4, cards: ['H5', 'C2', 'D9'] }];
    expect(buy(run, 0, 'S1')).not.toBeNull();
    expect(buy(run, 0, 'H5')).toBeNull();
    expect(cardValue(run.deck.find((c) => c.id === 'H5')!)).toBe(8);
    expect(run.gold).toBe(16);
    expect(buy(run, 0, 'H5')).not.toBeNull(); // ya vendida
  });

  it('una campaña completa se puede jugar: obra, cobro, ferretería y siguiente', () => {
    const meta = newMeta();
    for (const id of ['cimientos', 'caja']) meta.up[id] = 3;
    const run = newRun(meta, 1234);
    expect(run.maxIntegrity).toBe(26);
    expect(run.gold).toBe(9);
    let cleared = 0;
    for (let guard = 0; guard < 12 && run.phase === 'battle'; guard++) {
      let state = startStage(run, meta);
      expect(state.players[0].hand.length).toBe(state.config.handSize[1]);
      let steps = 0;
      while (state.phase === 'playing' && steps++ < 3000) state = applyAction(state, currentPlayer(state).id, chooseAction(state)).state;
      if (state.phase !== 'won') {
        run.phase = 'lost';
        break;
      }
      const before = run.gold;
      const lines = completeStage(run, state, 0, meta);
      expect(run.gold).toBe(before + lines.reduce((a, [, n]) => a + n, 0));
      cleared++;
      if ((run.phase as string) !== 'shop') break;
      expect(run.shop.filter((o) => o.kind === 'relic').length).toBe(3);
      run.shop.forEach((o, i) => buy(run, i, o.cards?.[0]));
      reroll(run, meta);
      advance(run);
      expect(run.stage).toBe(cleared + 1);
    }
    expect(cleared).toBeGreaterThan(0);
    expect(['won', 'lost']).toContain(run.phase);
    const gained = settle(meta, run);
    expect(gained).toBeGreaterThan(0);
    expect(meta.runs).toBe(1);
    expect(meta.best).toBe(run.phase === 'won' ? STAGES.length : cleared);
  });

  it('el gremio cobra renombre por cada mejora y respeta el máximo', () => {
    const meta = newMeta();
    expect(buyUpgrade(meta, 'manos')).toBe(false);
    meta.renown = 40;
    expect(buyUpgrade(meta, 'manos')).toBe(true);
    expect(buyUpgrade(meta, 'manos')).toBe(false);
    expect(meta.renown).toBe(22);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(RELICS.length);
  });
});
