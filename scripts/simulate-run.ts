// Balance de la campaña: el bot juega campañas enteras comprando lo primero que puede pagar.
// npm run simulate:run [campañas] [nivel de gremio 0-1]
import { applyAction, currentPlayer } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';
import { Meta, STAGES, UPGRADES, advance, buy, completeStage, newMeta, newRun, startStage } from '../src/rules/run';

const runs = Number(process.argv[2] ?? 400);
const maxed = process.argv[3] === '1';

function play(seed: number, meta: Meta): number {
  const run = newRun(meta, seed);
  for (;;) {
    let state = startStage(run, meta);
    let cleans = 0;
    let guard = 0;
    while (state.phase === 'playing' && guard++ < 3000) {
      const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
      cleans += res.events.filter((e) => e.e === 'floorDown' && e.clean).length;
      state = res.state;
    }
    if (state.phase !== 'won') return run.stage - 1;
    completeStage(run, state, cleans, meta);
    if (run.phase === 'won') return STAGES.length;
    // compra: herramientas primero, luego servicios
    for (let i = 0; i < run.shop.length; i++) {
      const o = run.shop[i];
      if (o.kind === 'reparacion' && run.integrity > run.maxIntegrity - 6) continue;
      buy(run, i, o.cards?.[0]);
    }
    advance(run);
  }
}

const meta = newMeta();
if (maxed) for (const u of UPGRADES) meta.up[u.id] = u.costs.length;
const reached = new Array(STAGES.length + 1).fill(0);
for (let i = 0; i < runs; i++) reached[play(i * 7919 + 13, meta)]++;
console.log(`Gremio ${maxed ? 'al máximo' : 'vacío'} · ${runs} campañas`);
reached.forEach((n, i) => console.log(`  ${i === STAGES.length ? 'VICTORIA     ' : `cae en obra ${i + 1}`}  ${((n / runs) * 100).toFixed(1).padStart(5)}%`));
console.log(`  media de obras superadas: ${(reached.reduce((a, n, i) => a + n * i, 0) / runs).toFixed(2)}`);
