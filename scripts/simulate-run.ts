// Balance de la campaña: el bot juega campañas enteras comprando lo primero que puede pagar.
// npm run simulate:run [campañas] [gremio al máximo: 1] [jugadores] [baraja | todas]
import { applyAction, currentPlayer } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';
import { DECKS, STAGES, UPGRADES, finishBattle, newRun, runAction, startStage, trackEvents } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';

const runs = Number(process.argv[2] ?? 400);
const maxed = process.argv[3] === '1';
const players = Array.from({ length: Number(process.argv[4] ?? 1) }, (_, i) => ({ id: `p${i}`, name: `p${i}` }));
const which = process.argv[5] ?? 'obra';
const up = maxed ? Object.fromEntries(UPGRADES.map((u) => [u.id, u.costs.length])) : {};
const pool = maxed ? SPECIALS.map((s) => s.id) : [];

function play(seed: number, deck: string): number {
  const run = newRun({ up, deck, pool }, seed);
  runAction(run, { t: 'begin' });
  for (;;) {
    let state = startStage(run, players);
    let guard = 0;
    while (state.phase === 'playing' && guard++ < 3000) {
      const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
      trackEvents(run, res.events);
      state = res.state;
    }
    if (guard >= 3000) throw new Error(`partida sin fin (baraja ${deck}, semilla ${seed})`);
    finishBattle(run, state);
    if (run.phase === 'lost') return run.stage - 1;
    if (run.phase === 'won') return STAGES.length;
    runAction(run, { t: 'pick', take: true });
    if (!run.relicPicked && runAction(run, { t: 'pickRelic', id: run.relicPicks[0] })) runAction(run, { t: 'pickRelic', id: null });
    for (let i = 0; i < run.shop.length; i++) {
      const o = run.shop[i];
      if (o.kind === 'reparacion' && run.integrity > run.maxIntegrity - 6) continue;
      runAction(run, { t: 'buy', i, choice: o.cards?.[0] });
    }
    runAction(run, { t: 'next' });
  }
}

console.log(`Gremio ${maxed ? 'al máximo' : 'vacío'} · ${players.length} jugador(es) · ${runs} campañas por baraja`);
for (const deck of which === 'todas' ? DECKS.map((d) => d.id) : [which]) {
  const reached = new Array(STAGES.length + 1).fill(0);
  for (let i = 0; i < runs; i++) reached[play(i * 7919 + 13, deck)]++;
  const dist = reached.map((n) => String(Math.round((n / runs) * 100)).padStart(3)).join(' ');
  console.log(`  ${deck.padEnd(12)} gana ${((reached[STAGES.length] / runs) * 100).toFixed(1).padStart(5)}% · media ${(reached.reduce((a, n, i) => a + n * i, 0) / runs).toFixed(2)} obras · cae en [${dist}]`);
}
