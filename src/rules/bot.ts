// Bot: juega obras (chooseAction) y dirige campañas enteras (chooseRunAction).
// Se usa para balancear las reglas por simulación y para jugar el turno de un jugador
// desconectado en partidas online. Entiende el cinturón (lo ordena), los sellos, los
// tratamientos, la selección de cartas y las sinergias entre herramientas.
import { Action, Card, Config, GameState, SUITS, StrikeEnv, Suit, Tower, cardValue, classify, currentPlayer, standing, strike } from './engine';
import { DraftOpt, EVENT, MIN_DECK, Run, RunAction, CONTRACT, healCost, offerCost, removeCost, rerollCost, stageDef } from './run';
import { SPECIAL } from './specials';
import { RARITY, TOOL, TOOL_SLOTS, bestOrder } from './tools';

// ───────────────────────── La obra ─────────────────────────

/** Orden de las cartas dentro del golpe: la más alta primero (el Percutor la repite) y lo que multiplica, al final. */
function arrange(cards: Card[]): Card[] {
  const late = (c: Card) => (c.tr === 'policromado' || c.tr === 'agrietado' ? 1 : 0);
  return [...cards].sort((a, b) => late(a) - late(b) || cardValue(b) - cardValue(a));
}

/** Todas las formaciones de ataque legales que se pueden armar con una mano (sin cartas especiales). */
export function formations(hand: Card[]): Card[][] {
  const cards = hand.filter((c) => c.suit !== 'X' && !c.sp);
  const out: Card[][] = cards.map((c) => [c]);
  const byRank = new Map<number, Card[]>();
  for (const c of cards) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
  // grupos y póker
  for (const group of byRank.values()) {
    const n = Math.min(group.length, 6);
    for (let mask = 1; mask < 1 << n; mask++) {
      const sub = group.filter((_, i) => mask & (1 << i));
      if (sub.length >= 2) out.push(sub);
    }
  }
  // escaleras: el As enlaza por abajo (posición 1) y por arriba (posición 11)
  const at = (pos: number) => byRank.get(pos === 11 ? 1 : pos);
  for (let start = 1; start <= 9; start++) {
    let combos: Card[][] = [[]];
    for (let pos = start; pos <= (start === 1 ? 10 : 11) && at(pos); pos++) {
      const next: Card[][] = [];
      for (const combo of combos) for (const c of at(pos)!) next.push([...combo, c]);
      combos = next.slice(0, 120);
      if (pos - start + 1 >= 3) out.push(...combos);
    }
  }
  // doble par y full
  const ranks = [...byRank.keys()];
  const take = (r: number, size: number) => {
    const g = arrange(byRank.get(r)!);
    return g.length >= size ? [g.slice(0, size)] : [];
  };
  for (const a of ranks)
    for (const b of ranks) {
      if (a < b) for (const pa of take(a, 2)) for (const pb of take(b, 2)) out.push([...pa, ...pb]);
      if (a !== b) for (const ta of take(a, 3)) for (const pb of take(b, 2)) out.push([...ta, ...pb]);
    }
  // color: todas las cartas de un palo si son 5 o más (y también las 5 más altas)
  for (const s of SUITS) {
    const same = cards.filter((c) => c.suit === s).sort((x, y) => cardValue(y) - cardValue(x));
    if (same.length >= 5) out.push(same, same.slice(0, 5));
  }
  return out.filter((f) => classify(f)).map(arrange);
}

const remaining = (towers: Record<Suit, Tower>, cfg: Config) => SUITS.reduce((a, s) => a + towers[s].floors.reduce((b, r) => b + cfg.floorHp[r], 0) - (standing(towers[s]) ? towers[s].damage : 0), 0);
/** Daño medio que hará la próxima sirena. */
const danger = (towers: Record<Suit, Tower>, cfg: Config) => SUITS.reduce((a, s) => a + (standing(towers[s]) && !towers[s].disarmed && !towers[s].fx.sobrecarga ? cfg.floorThreat[towers[s].floors[0]] : 0), 0) / 4;

/** Cuánto vale una jugada: demolición útil, pisos caídos, defensa del búnker y lo que cuesta. */
function evaluate(state: GameState, cards: Card[], target: Suit): number {
  const cfg = state.config;
  const env: StrikeEnv = { ...state, towers: structuredClone(state.towers), tools: state.tools.map((t) => ({ ...t })) };
  const before = remaining(state.towers, cfg);
  const risk = danger(state.towers, cfg) * (cfg.sirenCount ?? 1);
  const res = strike(env, cards, target);
  const unit = cfg.floorHp[11] / 20;
  const low = state.integrity <= cfg.maxIntegrity / 2 ? 1.5 : 1;
  let score = (before - remaining(env.towers, cfg)) / unit;
  for (const s of SUITS) {
    const fallen = res.fallenBy[s] ?? 0;
    if (fallen) score += fallen * 5 + (standing(env.towers[s]) ? 0 : 9);
  }
  if (res.clean || res.noSiren) score += risk * 1.7 * low;
  if (res.clean) score += 3;
  score += Math.min(res.wallGain, cfg.wallCap - state.wall) * 1.3;
  score += Math.min(res.repair, cfg.maxIntegrity - state.integrity) * 1.6 * low;
  score += res.gold * 0.7 + res.draw * 1.2;
  score -= res.hurt * 1.8 * low;
  score -= cards.filter((c) => !c.sp).length * 0.8 + cards.filter((c) => c.sp).length * 0.5; // las especiales vuelven en cada vuelta de cantera: guardarlas solo estorba
  if (state.integrity - res.hurt <= 0) score -= 1000;
  return score;
}

export function chooseAction(state: GameState): Action {
  const p = currentPlayer(state);
  if (p.hand.length === 0) return { type: 'pass' };

  const targets = SUITS.filter((s) => standing(state.towers[s]));
  const joker = p.hand.find((c) => c.suit === 'X' && !c.sp);
  if (joker) {
    const armed = targets.filter((s) => !state.towers[s].disarmed);
    const pool = armed.length ? armed : targets;
    const target = pool.reduce((a, b) => (state.towers[b].floors[0] > state.towers[a].floors[0] ? b : a));
    // Úsalo cuando la torre más peligrosa es una Q o K, o si el búnker está en apuros.
    if (state.towers[target].floors[0] >= 12 || state.integrity <= 8) return { type: 'joker', card: joker.id, target };
  }

  type Play = { score: number; cards: Card[]; target: Suit };
  const plays: Play[] = [];
  for (const cards of formations(p.hand)) for (const target of targets) plays.push({ score: evaluate(state, cards, target), cards, target });
  plays.sort((a, b) => b.score - a.score);
  // las cartas especiales se prueban sobre las mejores jugadas, y también solas
  const specials = p.hand.filter((c) => c.sp);
  if (specials.length) {
    const riders: Card[][] = [...specials.map((s) => [s]), ...specials.flatMap((a, i) => specials.slice(i + 1).map((b) => [a, b]))];
    const tops = plays.slice(0, 6);
    for (const extra of riders) {
      for (const top of tops) plays.push({ score: evaluate(state, [...top.cards, ...extra], top.target), cards: [...top.cards, ...extra], target: top.target });
      for (const target of targets) plays.push({ score: evaluate(state, extra, target), cards: extra, target });
    }
    plays.sort((a, b) => b.score - a.score);
  }
  const best = plays[0];
  if (best && best.score > 1.5) return { type: 'attack', cards: best.cards.map((c) => c.id), target: best.target };
  // Sin jugada útil: descarta las dos cartas más bajas.
  const lowest = [...p.hand].filter((c) => c.suit !== 'X').sort((a, b) => cardValue(a) - cardValue(b)).slice(0, 2);
  if (lowest.length) return { type: 'discard', cards: lowest.map((c) => c.id) };
  const spare = p.hand.find((c) => c.sp);
  if (spare) return { type: 'discard', cards: [spare.id] };
  return { type: 'joker', card: joker!.id, target: targets[0] };
}

// ───────────────────────── La campaña ─────────────────────────

/** Cómo se comporta el bot de campaña en las decisiones que se pueden discutir. */
export interface RunPolicy {
  /** Salta las obras que ofrecen estas etiquetas. */
  skip?: string[];
  /** Acepta contratos de riesgo si el búnker está sano. */
  risk?: boolean;
}

const SPECIAL_VALUE: Record<string, number> = { bola: 8, nitro: 6, martillo: 7, sierra: 7, gemelo: 6, barreno: 6, palanca: 6, mordaza: 5, botica: 5, hormigonera: 5, cemento: 4, clavos: 4, grua: 4, saboteador: 4, pico: 4, chatarrero: 3 };
const specialValue = (id: string) => SPECIAL_VALUE[id] ?? (SPECIAL[id]?.locked ? 9 : 4);
const TREAT_VALUE = { forjado: 2, templado: 2, policromado: 4, agrietado: 3 } as const;
const SEAL_VALUE = { eco: 3, dinamita: 2, sindical: 2, jornal: 1 } as const;
const cardWorth = (c: Card) => (c.sp ? specialValue(c.sp) : c.suit === 'X' ? 3 : cardValue(c) / 2 + (c.tr ? TREAT_VALUE[c.tr] : 0) + (c.seal ? SEAL_VALUE[c.seal] : 0));
const isPlain = (c: Card) => !c.sp && c.suit !== 'X';

/** Cuánto le interesa una herramienta a esta campaña: rareza, tipo y lo que ya lleva en el cinturón. */
export function toolValue(id: string, run: Run): number {
  const def = TOOL[id];
  if (!def) return 0;
  const has = (other: string) => run.tools.some((t) => t.id === other);
  let v = { comun: 3, oficio: 5, capataz: 7, reliquia: 9 }[def.rarity] + { f: 0.5, r: 1, x: 3, copy: 0, p: 0 }[def.kind];
  const mults = run.tools.filter((t) => TOOL[t.id]?.kind === 'x').length;
  if (id === 'diapason') v += mults ? 4 : run.tools.some((t) => TOOL[t.id]?.strike) ? 1 : -2;
  if (def.arch === 'precision' && id !== 'nivel') v += has('nivel') ? 2.5 : 0;
  if (id === 'nivel') v += 1 + run.tools.filter((t) => TOOL[t.id]?.arch === 'precision').length;
  if (id === 'montacargas' || id === 'prensa') v += Math.min(4, run.scrap * 0.5) + (has('trituradora') ? 2 : 0) - 1.5;
  if (id === 'horno') v += has('trituradora') ? 2 : -1.5;
  if (id === 'trituradora') v += has('montacargas') || has('prensa') ? 2 : -1;
  if (id === 'contenedor') v -= 1;
  if (id === 'catalizador') v += has('crisol') ? 2 : 0;
  if (id === 'timbre') v += Math.min(3, run.deck.filter((c) => c.seal).length * 0.5) - 2;
  if (id === 'corazon') v += run.tools.some((t) => t.id === 'casco' || t.id === 'plomada' || t.id === 'botiquin') ? 1 : -1;
  if (id === 'andamio' || id === 'sordina' || id === 'dinamita') v += 1.5;
  if (id === 'hucha') v += run.stage <= 3 ? 1.5 : -1;
  if (id === 'cincel') v -= 1;
  return v;
}

const draftValue = (o: DraftOpt) => (o.kind === 'special' ? specialValue(o.id) : 2.5 + cardWorth(o.card));

function pendingTarget(run: Run): RunAction {
  const p = run.pending!;
  const plain = run.deck.filter(isPlain);
  if (p.kind === 'forge') {
    const o = run.shop[p.i];
    const free = plain.filter((c) => (o?.seal ? !c.seal : !c.tr));
    const best = (free.length ? free : plain).sort((a, b) => cardWorth(b) - cardWorth(a))[0];
    return best ? { t: 'target', cards: [best.id] } : { t: 'cancel' };
  }
  if (p.kind === 'dup') {
    const best = [...run.deck].sort((a, b) => cardWorth(b) - cardWorth(a))[0];
    return best ? { t: 'target', cards: [best.id] } : { t: 'cancel' };
  }
  const sorted = [...plain].sort((a, b) => cardValue(b) - cardValue(a));
  const high = sorted.find((c) => !c.tr) ?? sorted[0];
  const low = sorted.reverse().find((c) => c !== high && !c.tr && !c.seal);
  return high && low && run.deck.length - 1 >= MIN_DECK ? { t: 'target', cards: [high.id, low.id] } : { t: 'cancel' };
}

function shopAction(run: Run): RunAction {
  if (run.sobre) return { t: 'open', i: run.sobre.reduce((best, id, i) => (specialValue(id) > specialValue(run.sobre![best]) ? i : best), 0) };
  const order = bestOrder(run.tools);
  if (order.some((slot, i) => slot !== i)) return { t: 'reorder', order };
  if (run.integrity <= run.maxIntegrity * 0.6 && run.gold >= healCost(run)) return { t: 'heal' };

  const open = run.shop.map((o, i) => ({ o, i, cost: offerCost(run, o) })).filter((x) => !x.o.sold && x.cost <= run.gold);
  // herramientas: la mejor que se pueda pagar; con el cinturón lleno, se vende la peor si compensa
  const tools = open.filter((x) => x.o.kind === 'tool').sort((a, b) => toolValue(b.o.id!, run) - toolValue(a.o.id!, run));
  if (tools.length) {
    const want = tools[0];
    if (run.tools.length < TOOL_SLOTS) return { t: 'buy', i: want.i };
    const worst = run.tools.reduce((w, t, i) => (toolValue(t.id, run) < toolValue(run.tools[w].id, run) ? i : w), 0);
    if (toolValue(want.o.id!, run) > toolValue(run.tools[worst].id, run) + 2.5) return { t: 'sell', i: worst };
  }
  const reserve = run.freeShop ? 0 : 5;
  const spare = (x: { cost: number }) => run.gold - x.cost >= reserve;
  const forja = open.find((x) => x.o.kind === 'forja' && spare(x));
  if (forja && run.deck.some((c) => isPlain(c) && (forja.o.seal ? !c.seal : !c.tr))) return { t: 'buy', i: forja.i };
  const sobre = open.find((x) => x.o.kind === 'sobre' && spare(x));
  if (sobre) return { t: 'buy', i: sobre.i };
  const plano = open.find((x) => x.o.kind === 'plano' && spare(x) && ['solo', 'grupo', 'escalera', 'doblepar'].includes(x.o.form!));
  if (plano) return { t: 'buy', i: plano.i };
  const blind = open.find((x) => x.o.kind === 'clandestino' && spare(x));
  if (blind) return { t: 'buy', i: blind.i };
  // la chatarra solo interesa si hay herramientas que la aprovechan
  const scrapper = run.tools.some((t) => ['montacargas', 'prensa', 'horno'].includes(t.id));
  if (scrapper && run.deck.length > MIN_DECK + 12 && run.gold >= removeCost(run) + reserve) {
    const victim = run.deck.filter((c) => isPlain(c) && !c.tr && !c.seal).sort((a, b) => cardValue(a) - cardValue(b))[0];
    if (victim) return { t: 'burn', card: victim.id };
  }
  const unsold = run.shop.some((o) => !o.sold && o.kind === 'tool');
  if (run.tools.length < TOOL_SLOTS && !unsold && run.rerolls < 2 && run.gold >= rerollCost(run) + RARITY.oficio.cost) return { t: 'reroll' };
  return { t: 'next' };
}

function eventAction(run: Run): RunAction {
  const def = EVENT[run.event!];
  const healthy = run.integrity >= run.maxIntegrity * 0.7;
  const want: Record<string, number[]> = {
    caja: healthy ? [0, 1] : [1],
    horno: healthy ? [0, 1] : [1, 0],
    contrato: healthy ? [0, 1] : [1],
    clandestino: [1, healthy ? 0 : 2, 2],
    planos: [1, 2],
  };
  const i = (want[def.id] ?? []).find((n) => def.options[n] && (!def.options[n].can || def.options[n].can!(run)));
  return { t: 'event', i: i ?? def.options.length - 1 };
}

/** La siguiente decisión de campaña, o null si toca jugar la obra o la campaña ya terminó. */
export function chooseRunAction(run: Run, policy: RunPolicy = {}): RunAction | null {
  if (run.pending) return pendingTarget(run);
  switch (run.phase) {
    case 'pack':
      return { t: 'begin' };
    case 'map': {
      if (stageDef(run.stage).boss) return { t: 'route', i: 0 };
      if (run.node.tag && policy.skip?.includes(run.node.tag)) return { t: 'skip' };
      const healthy = run.integrity >= run.maxIntegrity * 0.8;
      const i = run.node.routes.findIndex((id) => CONTRACT[id]?.risk);
      return { t: 'route', i: i >= 0 && policy.risk && healthy ? i : i === 0 ? 1 : 0 };
    }
    case 'reward': {
      if (!run.looted) {
        if (run.tools.length >= TOOL_SLOTS) return { t: 'loot', id: null };
        return { t: 'loot', id: [...run.loot].sort((a, b) => toolValue(b, run) - toolValue(a, run))[0] ?? null };
      }
      const best = run.draft.reduce((b, o, i) => (draftValue(o) > draftValue(run.draft[b]) ? i : b), 0);
      return { t: 'draft', i: run.draft.length ? best : null };
    }
    case 'shop':
      return shopAction(run);
    case 'event':
      return eventAction(run);
    default:
      return null;
  }
}
