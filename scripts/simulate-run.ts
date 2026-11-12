// Balance de la campaña, versión rápida: el bot juega campañas enteras (plano, contratos, selección,
// ferretería, forja, hallazgos, andamio y orden del cinturón) y se mide hasta dónde llega.
// Para el informe completo, con cada herramienta y cada jefe: npm run analyze:meta
//
//   npm run simulate:run [campañas] [gremio: vacio | lleno | ambos] [jugadores] [baraja | todas]
//
// Variables: SKIP=envio,molde (etiquetas por las que salta obra) · RISK=1 (acepta contratos de riesgo)
//            ASC=n (nivel de obra, de 1 a 8) · VERBOSE=1 (herramientas más llevadas y oro medio)
//            HPX=1.2 LATE=0.3 HPS=1.5,1.8,… THR=-1,-1,0,… (mandos de ajuste de las obras)
//            UPS=caja_sismo,vale,legendarias (con gremio lleno, solo estas mejoras)
//            GIVE=prisma (herramienta de regalo al empezar, para medir lo que vale)
import { DECKS, LAST_STAGE, STAGES } from '../src/rules/run';
import { playCampaign } from './lab';

const runs = Number(process.argv[2] ?? 400);
const guild = process.argv[3] ?? 'ambos';
const players = Number(process.argv[4] ?? 1);
const which = process.argv[5] ?? 'obra';
const policy = { skip: process.env.SKIP ? process.env.SKIP.split(',') : [], risk: process.env.RISK === '1' };
const ascension = Math.max(0, Number(process.env.ASC ?? 1) - 1);
const verbose = process.env.VERBOSE === '1';

function report(deck: string, full: boolean): void {
  const reached = new Array(LAST_STAGE + 1).fill(0);
  const use: Record<string, number> = {};
  let gold = 0;
  let tools = 0;
  let hit = 0;
  const turns: number[][] = Array.from({ length: LAST_STAGE }, () => []);
  for (let i = 0; i < runs; i++) {
    const { log } = playCampaign({ seed: i * 7919 + 13, deck, ascension, full, players, policy, only: process.env.UPS?.split(','), giveTool: process.env.GIVE });
    reached[log.cleared]++;
    log.stageTurns.slice(0, LAST_STAGE).forEach((t, k) => turns[k].push(t));
    gold += log.gold;
    tools += log.toolsEnd.length;
    hit = Math.max(hit, log.maxHit);
    for (const id of log.toolsEnd) use[id] = (use[id] ?? 0) + 1;
  }
  const dist = reached.map((n) => String(Math.round((n / runs) * 100)).padStart(3)).join(' ');
  const mean = reached.reduce((a, n, i) => a + n * i, 0) / runs;
  console.log(`  ${deck.padEnd(12)} gana ${((reached[LAST_STAGE] / runs) * 100).toFixed(1).padStart(5)}% · media ${mean.toFixed(2)} obras · cae tras [${dist}]`);
  const q = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] : 0);
  console.log(`      turnos por obra (mediana/p95): ${turns.map((t) => `${q(t, 0.5)}/${q(t, 0.95)}`).join(' · ')}`);
  if (verbose) {
    const top = Object.entries(use).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => `${id} ${n}`).join(', ');
    console.log(`      oro medio ${(gold / runs).toFixed(0)} · herramientas al final ${(tools / runs).toFixed(1)} · mayor golpe ${hit} · más llevadas: ${top}`);
  }
}

for (const full of guild === 'ambos' ? [false, true] : [guild === 'lleno']) {
  console.log(`Gremio ${full ? 'lleno' : 'vacío'} · ${players} jugador(es) · ${runs} campañas por baraja · nivel de obra ${ascension + 1}`);
  for (const deck of which === 'todas' ? DECKS.map((d) => d.id) : [which]) report(deck, full);
}
