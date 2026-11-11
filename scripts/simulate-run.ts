// Balance de la campaña: el bot juega campañas enteras (plano, contratos, selección, ferretería,
// forja, hallazgos y orden del cinturón) y se mide hasta dónde llega.
//
//   npm run simulate:run [campañas] [gremio: vacio | lleno | ambos] [jugadores] [baraja | todas]
//
// Variables: SKIP=envio,molde (etiquetas por las que salta obra) · RISK=1 (acepta contratos de riesgo)
//            ASC=n (ascenso) · VERBOSE=1 (herramientas más usadas y oro medio)
//            HPX=1.2 LATE=0.3 HPS=1.5,1.8,… THR=-1,-1,0,… (mandos de ajuste de las obras)
//            UPS=caja_sismo,vale,legendarias (con gremio lleno, solo estas mejoras)
//            GIVE=bola,mordaza (cartas especiales de regalo al empezar, para medir lo que valen)
import { applyAction, currentPlayer } from '../src/rules/engine';
import { RunPolicy, chooseAction, chooseRunAction } from '../src/rules/bot';
import { DECKS, LAST_STAGE, Run, STAGES, UPGRADES, addSpecial, finishBattle, newRun, runAction, stagesCleared, startStage, trackEvents } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';

const runs = Number(process.argv[2] ?? 400);
const guild = process.argv[3] ?? 'ambos';
const players = Array.from({ length: Number(process.argv[4] ?? 1) }, (_, i) => ({ id: `p${i}`, name: `p${i}` }));
const which = process.argv[5] ?? 'obra';
const policy: RunPolicy = { skip: process.env.SKIP ? process.env.SKIP.split(',') : [], risk: process.env.RISK === '1' };
const ascension = Number(process.env.ASC ?? 0);
const verbose = process.env.VERBOSE === '1';
// mandos de ajuste: HPX escala la resistencia de todas las obras y LATE la inclina hacia las últimas
if (process.env.HPS) process.env.HPS.split(',').forEach((v, i) => (STAGES[i].hp = Number(v)));
if (process.env.THR) process.env.THR.split(',').forEach((v, i) => (STAGES[i].threat = Number(v)));
if (process.env.HPX || process.env.LATE) STAGES.forEach((st, i) => (st.hp = Math.round(st.hp * Number(process.env.HPX ?? 1) * (1 + Number(process.env.LATE ?? 0) * (i / 7)) * 100) / 100));

export function playRun(seed: number, deck: string, maxed: boolean): Run {
  const only = process.env.UPS?.split(',');
  const up = maxed ? Object.fromEntries(UPGRADES.filter((u) => !only || only.includes(u.id)).map((u) => [u.id, u.costs.length])) : {};
  const pool = maxed && (!only || only.includes('legendarias')) ? SPECIALS.map((s) => s.id) : [];
  const run = newRun({ up, deck, pool, ascension }, seed);
  for (const id of process.env.GIVE?.split(',') ?? []) addSpecial(run, id);
  for (let guard = 0; guard < 4000; guard++) {
    if (run.phase === 'won' || run.phase === 'lost') return run;
    if (run.phase === 'battle') {
      let state = startStage(run, players);
      let turns = 0;
      while (state.phase === 'playing') {
        if (turns++ > 3000) throw new Error(`obra sin fin (baraja ${deck}, semilla ${seed}, obra ${run.stage})`);
        const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
        trackEvents(run, res.events);
        state = res.state;
      }
      finishBattle(run, state);
      continue;
    }
    const action = chooseRunAction(run, policy);
    if (!action) throw new Error(`el bot no sabe qué hacer en la fase ${run.phase}`);
    const err = runAction(run, action);
    if (err) throw new Error(`decisión rechazada (${JSON.stringify(action)}): ${err}`);
  }
  throw new Error(`campaña sin fin (baraja ${deck}, semilla ${seed})`);
}

function report(deck: string, maxed: boolean): void {
  const reached = new Array(LAST_STAGE + 1).fill(0);
  const use: Record<string, number> = {};
  let gold = 0;
  let tools = 0;
  let hit = 0;
  for (let i = 0; i < runs; i++) {
    const run = playRun(i * 7919 + 13, deck, maxed);
    reached[Math.min(LAST_STAGE, stagesCleared(run))]++;
    gold += run.stats.gold;
    tools += run.tools.length;
    hit = Math.max(hit, run.stats.maxHit);
    for (const t of run.tools) use[t.id] = (use[t.id] ?? 0) + 1;
  }
  const dist = reached.map((n) => String(Math.round((n / runs) * 100)).padStart(3)).join(' ');
  const mean = reached.reduce((a, n, i) => a + n * i, 0) / runs;
  console.log(`  ${deck.padEnd(12)} gana ${((reached[LAST_STAGE] / runs) * 100).toFixed(1).padStart(5)}% · media ${mean.toFixed(2)} obras · cae tras [${dist}]`);
  if (verbose) {
    const top = Object.entries(use).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => `${id} ${n}`).join(', ');
    console.log(`      oro medio ${(gold / runs).toFixed(0)} · herramientas al final ${(tools / runs).toFixed(1)} · mayor golpe ${hit} · más llevadas: ${top}`);
  }
}

if (process.argv[1]?.includes('simulate-run')) {
  for (const maxed of guild === 'ambos' ? [false, true] : [guild === 'lleno']) {
    console.log(`Gremio ${maxed ? 'lleno' : 'vacío'} · ${players.length} jugador(es) · ${runs} campañas por baraja${ascension ? ` · ascenso ${ascension}` : ''}`);
    for (const deck of which === 'todas' ? DECKS.map((d) => d.id) : [which]) report(deck, maxed);
  }
}
