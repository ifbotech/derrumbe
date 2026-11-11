// Simula partidas con el bot para medir el balance: npm run simulate [partidas]
import { DIFFICULTY, applyAction, createGame, currentPlayer, SUITS } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';

const games = Number(process.argv[2] ?? 2000);
const CFG = { ...DIFFICULTY[process.env.MODO === 'brutal' ? 'brutal' : 'obra'], ...JSON.parse(process.env.CFG ?? '{}') };
for (let n = 1; n <= 4; n++) {
  let wins = 0;
  let turns = 0;
  let floors = 0;
  let collapses = 0;
  for (let g = 0; g < games; g++) {
    let state = createGame(Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}` })), g * 7919 + n, CFG);
    let guard = 0;
    while (state.phase === 'playing' && guard++ < 2000) {
      state = applyAction(state, currentPlayer(state).id, chooseAction(state)).state;
    }
    if (guard >= 2000) throw new Error('partida sin fin');
    if (state.phase === 'won') wins++;
    turns += state.turnCount;
    collapses += state.collapses;
    floors += 12 - SUITS.reduce((a, s) => a + state.towers[s].floors.length, 0);
  }
  console.log(`${n} jugador(es): victorias ${((wins / games) * 100).toFixed(1)}% · turnos ${(turns / games).toFixed(1)} · pisos demolidos ${(floors / games).toFixed(1)}/12 · colapsos ${(collapses / games).toFixed(2)}`);
}
