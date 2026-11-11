// Bot codicioso: se usa para balancear las reglas por simulación y para
// jugar el turno de un jugador desconectado en partidas online.
import { Action, Card, GameState, SUITS, Suit, classify, currentPlayer, previewStrike, standing } from './engine';

/** Todas las formaciones de ataque legales que se pueden armar con una mano. */
export function formations(hand: Card[]): Card[][] {
  const cards = hand.filter((c) => c.suit !== 'X');
  const out: Card[][] = cards.map((c) => [c]);
  const byRank = new Map<number, Card[]>();
  for (const c of cards) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
  // grupos
  for (const group of byRank.values()) {
    const n = group.length;
    for (let mask = 1; mask < 1 << n; mask++) {
      const sub = group.filter((_, i) => mask & (1 << i));
      if (sub.length >= 2) out.push(sub);
    }
  }
  // escaleras
  for (let start = 1; start <= 8; start++) {
    let combos: Card[][] = [[]];
    for (let r = start; r <= 10 && byRank.has(r); r++) {
      const next: Card[][] = [];
      for (const combo of combos) for (const c of byRank.get(r)!) next.push([...combo, c]);
      combos = next.slice(0, 200);
      if (r - start + 1 >= 3) out.push(...combos);
    }
  }
  return out.filter((f) => classify(f));
}

export function chooseAction(state: GameState): Action {
  const p = currentPlayer(state);
  const cfg = state.config;
  if (p.hand.length === 0) return { type: 'pass' };

  const targets = SUITS.filter((s) => standing(state.towers[s]));
  const joker = p.hand.find((c) => c.suit === 'X');
  if (joker) {
    const armed = targets.filter((s) => !state.towers[s].disarmed);
    const pool = armed.length ? armed : targets;
    const target = pool.reduce((a, b) => (state.towers[b].floors[0] > state.towers[a].floors[0] ? b : a));
    // Úsalo cuando la torre más peligrosa es una Q o K, o si el búnker está en apuros.
    if (state.towers[target].floors[0] >= 12 || state.integrity <= 8) return { type: 'joker', card: joker.id, target };
  }

  let best: { score: number; cards: Card[]; target: Suit } | null = null;
  for (const cards of formations(p.hand)) {
    for (const target of targets) {
      const res = previewStrike(state.towers, cards, target, cfg);
      let score = 0;
      for (const s of SUITS) {
        const t = state.towers[s];
        if (!standing(t)) continue;
        const fallen = res.fallen[s] ?? 0;
        const dealt = res.dealt[s] ?? 0;
        const remaining = cfg.floorHp[t.floors[0]] - t.damage;
        const focus = 1 + 0.15 * (3 - t.floors.length);
        score += (fallen > 0 ? remaining : Math.min(dealt, remaining)) * focus;
        score += fallen * (t.floors.length === fallen ? 14 : 5);
      }
      if (res.clean) score += 4;
      score += Math.min(res.wallGain, cfg.wallCap - state.wall) * 1.3;
      score += Math.min(res.repair, cfg.maxIntegrity - state.integrity) * 1.6;
      score -= cards.length * 0.8;
      if (!best || score > best.score) best = { score, cards, target };
    }
  }
  if (best && best.score > 1.5) return { type: 'attack', cards: best.cards.map((c) => c.id), target: best.target };
  // Sin jugada útil: descarta las dos cartas más bajas.
  const low = [...p.hand].filter((c) => c.suit !== 'X').sort((a, b) => a.rank - b.rank).slice(0, 2);
  if (low.length) return { type: 'discard', cards: low.map((c) => c.id) };
  return { type: 'joker', card: joker!.id, target: targets[0] };
}
