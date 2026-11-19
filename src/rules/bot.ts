// Bot: juega asaltos (chooseAction) y dirige campañas enteras (chooseRunAction).
// Se usa para balancear las reglas por simulación y para jugar el turno de un jugador
// desconectado en partidas online. Entiende los Amuletos (los compra por sinergia, sello y rareza), los sellos de
// lacre, los acabados, la selección de cartas y las Bendiciones de los Reyes.
import { AS_ALTO, Action, CABALLO, Card, Config, GameState, MAX_NUM, SOTA, SUITS, StrikeEnv, Suit, Tower, activo, cardValue, classify, currentPlayer, eligeEngano, standing, strike, threatOf, vidaTotal } from './engine';
import { ESCOBA_SUMA, MZ } from './mazos';
import { DraftOpt, EVENT, MAPA_CFG, MIN_DECK, Run, RunAction, healCost, offerCost, rerollCost, toolSlots } from './run';
import { NodoMapa, TipoNodo, alcanzables, asaltoDe, caminos } from './mapa';
import { SPECIAL } from './specials';
import { RARITY, TOOL } from './tools';
import { BENDICION, OpcionBend, PALO_DE_REY, ReyId, UMBRALES_REY, esDe, fuentesDe, nivelesReyes, reyesDe } from './reyes';
import { selloDe, sinergia } from './piezas';
import type { SelloNivel } from './balance-config';

// ───────────────────────── La obra ─────────────────────────

/** Orden de las cartas dentro del golpe: la más alta primero (el Percutor la repite) y lo que multiplica, al final. */
export function arrange(cards: Card[]): Card[] {
  const late = (c: Card) => (c.tr === 'policromado' || c.tr === 'agrietado' ? 1 : 0);
  return [...cards].sort((a, b) => late(a) - late(b) || cardValue(b) - cardValue(a));
}

/** Todas las formaciones de ataque legales que se pueden armar con una mano (sin cartas especiales). Con `cfg`, también las del Mazo. */
export function formations(hand: Card[], cfg?: { mazo?: Config['mazo'] }): Card[][] {
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
  // as de compañía: un As con cualquier otra carta
  for (const ace of byRank.get(1) ?? []) for (const c of cards) if (c.rank !== 1) out.push([c, ace]);
  // escaleras: el As enlaza por abajo (posición 1) y por arriba (posición AS_ALTO, detrás del 9)
  const at = (pos: number) => byRank.get(pos === AS_ALTO ? 1 : pos);
  for (let start = 1; start <= AS_ALTO - 2; start++) {
    let combos: Card[][] = [[]];
    for (let pos = start; pos <= (start === 1 ? MAX_NUM : AS_ALTO) && at(pos); pos++) {
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
  // V40 · Truco: las parejas del mismo palo (Par de palo, que canta Envido)
  if (cfg?.mazo === 'truco') for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) if (cards[i].suit === cards[j].suit) out.push([cards[i], cards[j]]);
  // V40 · Escoba: todas las combinaciones que suman 15 (hasta 12 cartas: 4.096 subconjuntos como mucho)
  if (cfg?.mazo === 'escoba') {
    const lisas = cards.slice(0, 12);
    for (let mask = 3; mask < 1 << lisas.length; mask++) {
      let suma = 0;
      for (let i = 0; i < lisas.length && suma <= ESCOBA_SUMA; i++) if (mask & (1 << i)) suma += lisas[i].rank;
      if (suma === ESCOBA_SUMA) out.push(lisas.filter((_, i) => mask & (1 << i)));
    }
  }
  return out.filter((f) => classify(f, cfg)).map(arrange);
}

const remaining = (towers: Record<Suit, Tower>, cfg: Config) => SUITS.reduce((a, s) => a + vidaTotal(towers[s], cfg), 0);
/** V35 · Daño que hará el próximo Contraataque: el Ataque del enemigo activo (0 si está Aturdido o no queda nadie). */
const danger = (env: { config: Config; fatigue?: number; towers: Record<Suit, Tower> }, towers: Record<Suit, Tower>) => {
  const t = activo({ config: env.config, towers });
  return t && !t.fx.sobrecarga ? threatOf(env, t) : 0;
};
/** Herramientas que solo rinden con cartas de un palo. */
const SUIT_TOOL: Record<string, Suit> = { piqueta: 'S', cortavidrios: 'D', paleta: 'H', botiquin: 'H', maza: 'C', sacos: 'C' };
/** Amuletos que cobran la defensa: con ellos el Escudo vale más. */
const WALL_PAYOFF = ['contragolpe'];

/** Cuánto vale una jugada: demolición útil, pisos caídos, defensa del búnker y lo que cuesta. */
function evaluate(state: GameState, cards: Card[], target: Suit): number {
  const cfg = state.config;
  const env: StrikeEnv = { ...state, towers: structuredClone(state.towers), tools: state.tools.map((t) => ({ ...t })), ...(state.bendiciones ? { bendiciones: state.bendiciones.map((b) => ({ ...b })) } : {}) };
  const before = remaining(state.towers, cfg);
  const risk = danger(state, state.towers) * (cfg.sirenCount ?? 1);
  const has = (id: string) => state.tools.some((t) => t.id === id);
  const wallPays = WALL_PAYOFF.filter(has).length;
  // V40 · El Mentiroso: el Engaño automático, tal como lo aplicará el motor
  const engano = eligeEngano(state, cards, target);
  const res = strike(env, cards, target, undefined, { engano });
  const unit = cfg.floorHp[SOTA] / 20;
  const low = state.integrity <= cfg.maxIntegrity / 2 ? 1.5 : 1;
  let score = (before - remaining(env.towers, cfg)) / unit;
  for (const s of SUITS) {
    const fallen = res.fallenBy[s] ?? 0;
    if (fallen) score += fallen * 5 + (standing(env.towers[s]) ? 0 : 9);
  }
  if (res.clean || res.noSiren) score += risk * 1.7 * low;
  if (res.clean) score += 3;
  // un trono que queda Aturdido se salta su próximo Contraataque
  const hitTower = env.towers[target];
  if (standing(hitTower) && hitTower.fx.sobrecarga && !state.towers[target].fx.sobrecarga) score += threatOf(state, hitTower) * 1.7 * low;
  // dejar Expuesto a un trono que sigue en pie: el próximo golpe contra él hace más Daño
  if (standing(hitTower) && hitTower.fx.fractura && !state.towers[target].fx.fractura) score += 1.5;
  const walled = Math.min(res.wallGain, cfg.wallCap - state.wall);
  score += walled * (1.3 + 0.9 * wallPays);
  // con el Rebosadero, el muro que sobra repara el búnker
  const spill = cfg.overwallRepair ? Math.floor((res.wallGain - walled) / cfg.overwallRepair) : 0;
  const mended = Math.min(res.repair + spill, cfg.maxIntegrity - state.integrity);
  score += mended * 1.6 * low;
  // con el Rebosadero, reparar de más carga el golpe siguiente
  if (cfg.overhealCharge) score += (res.repair + spill - mended) * cfg.overhealCharge * 0.35;
  score += res.gold * 0.7 + res.draw * 1.2;
  score -= res.hurt * 1.8 * low;
  score -= cards.filter((c) => !c.sp).length * 0.8 + cards.filter((c) => c.sp).length * 0.5; // las especiales vuelven en cada vuelta de cantera: guardarlas solo estorba
  if (state.integrity - res.hurt <= 0) score -= 1000;
  // V40 · lo que el Mazo deja para después: una carga permanente vale; el Chancho en cadena, como Aturdidos
  if (res.mazo.escoba || res.mazo.larga) score += 2.5;
  if (res.mazo.chancho) score += threatOf(state, activo(state) ?? state.towers[target]) * 1.7 * low * Math.min(2, MZ.chancho.cadena);
  if (res.mazo.alivio) score += Math.min(res.mazo.alivio, risk) * 1.7 * low;
  return score;
}

export function chooseAction(state: GameState): Action {
  const p = currentPlayer(state);
  // el andamio se juega como si fuera mano
  const held = [...p.hand, ...p.reserve];
  if (held.length === 0) return { type: 'pass' };

  // V35 · solo se golpea al enemigo activo
  const frente = activo(state);
  const targets: Suit[] = frente ? [frente.suit] : [];
  const joker = held.find((c) => c.suit === 'X' && !c.sp);
  // V40 · El Mentiroso: el Comodín no gasta el turno, así que se juega en cuanto no haya ya un Contraataque frenado
  if (joker && frente && !frente.fx.sobrecarga && !frente.piedra && state.config.mazo === 'mentiroso') return { type: 'joker', card: joker.id, target: frente.suit };
  if (joker && frente && !frente.fx.sobrecarga) {
    // el Motín, cuando el que contraataca pega fuerte (Caballo, Rey o monarca) o la Vida está en apuros
    if (frente.floors[0] >= CABALLO || state.integrity <= 8 || threatOf(state, frente) >= state.integrity + state.wall) return { type: 'joker', card: joker.id, target: frente.suit };
  }

  type Play = { score: number; cards: Card[]; target: Suit };
  const plays: Play[] = [];
  for (const cards of formations(held, state.config)) for (const target of targets) plays.push({ score: evaluate(state, cards, target), cards, target });
  plays.sort((a, b) => b.score - a.score);
  // las cartas especiales se prueban sobre las mejores jugadas, y también solas
  const specials = held.filter((c) => c.sp);
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
  // V40 1e · el Motín cuando vale más que la mejor jugada: frena este Contraataque y Aturde (se salta el siguiente), al
  // precio de un turno sin Daño (contra el monarca, un turno más de Furia). Antes se guardaba hasta un Caballo o un
  // apuro y ocupaba un hueco de la mano: con manos cortas (el Truco) eso costaba mucho.
  if (joker && frente && !frente.fx.sobrecarga && state.config.mazo !== 'mentiroso') {
    const low = state.integrity <= state.config.maxIntegrity / 2 ? 1.5 : 1;
    const amenaza = threatOf(state, frente);
    const furia = state.config.jefe && frente.suit === state.config.jefe.suit ? 2 : 0;
    const motin = Math.max(0, amenaza * (state.config.sirenCount ?? 1) - state.wall) * 1.7 * low + amenaza * 1.7 * low * 0.6 - 0.8 - furia;
    if (motin > (best?.score ?? 0)) return { type: 'joker', card: joker.id, target: frente.suit };
  }
  // andamio: antes de jugar, aparta la mejor carta que esta jugada no necesita (al reponer, hay una más)
  if (!state.stashed && p.reserve.length < (state.config.reserveSize ?? 1) && p.hand.length > 1) {
    const used = new Set(best && best.score > 1.5 ? best.cards.map((c) => c.id) : []);
    const keep = p.hand.filter((c) => !used.has(c.id)).sort((a, b) => cardWorth(b) - cardWorth(a))[0];
    if (keep) return { type: 'stash', card: keep.id };
  }
  // V40 · Chancho Va: antes de golpear, pasa la carta que menos sirve (sola en su número y fuera de la jugada)
  if (state.config.mazo === 'chancho' && !state.pasado && p.hand.length > 1) {
    const used = new Set(best && best.score > 1.5 ? best.cards.map((c) => c.id) : []);
    const veces = (c: Card) => held.filter((h) => !h.sp && h.suit !== 'X' && h.rank === c.rank).length;
    const junk = p.hand.filter((c) => !used.has(c.id) && !c.sp && c.suit !== 'X' && veces(c) === 1 && c.rank !== 1).sort((a, b) => cardWorth(a) - cardWorth(b))[0];
    if (junk && cardWorth(junk) <= 4) return { type: 'discard', cards: [junk.id] };
  }
  if (best && best.score > 1.5) return { type: 'attack', cards: best.cards.map((c) => c.id), target: best.target };
  // Sin jugada útil: el Motín si lo hay (al menos frena el Contraataque); si no, descarta las dos cartas más bajas.
  if (joker && frente && !frente.fx.sobrecarga) return { type: 'joker', card: joker.id, target: frente.suit };
  const lowest = held.filter((c) => c.suit !== 'X').sort((a, b) => cardValue(a) - cardValue(b)).slice(0, 2);
  if (lowest.length) return { type: 'discard', cards: lowest.map((c) => c.id) };
  const spare = held.find((c) => c.sp);
  if (spare) return { type: 'discard', cards: [spare.id] };
  return { type: 'joker', card: joker!.id, target: targets[0] };
}

// ───────────────────────── La campaña ─────────────────────────

/** Cómo se comporta el bot de campaña en las decisiones que se pueden discutir. */
/**
 * V40 1e · Cómo elige el bot su camino en el Mapa: `equilibrada` (la de serie: Bravo con la Vida alta, Fogón con la
 * Vida baja, Pulpería con oro), `brava` (busca los Guardias Bravos aunque vaya tocado), `prudente` (nunca un Bravo;
 * prefiere Fogón y Pulpería) y `sinPulperia` (solo laboratorio: evita La Pulpería, para medir lo que vale gastar).
 */
export type PoliticaRuta = 'equilibrada' | 'brava' | 'prudente' | 'sinPulperia' | 'azar';
export const POLITICAS_RUTA: PoliticaRuta[] = ['equilibrada', 'brava', 'prudente', 'sinPulperia', 'azar'];

export interface RunPolicy {
  /** V40 1e · Cómo elige el camino en el Mapa (de serie, `equilibrada`). */
  ruta?: PoliticaRuta;
  /** V40 1c · Toma esta Bendición siempre que se ofrezca (para medir cuánto vale). */
  bendicion?: string;
  /** V40 1c · Sigue a este Rey: toma una suya (o una Dual suya) siempre que se ofrezca (para medir cada línea). */
  rey?: ReyId;
}

/** V40 1d · Las Trampas del Bufón: un valor propio más su sello de nivel. */
const SPECIAL_VALUE: Record<string, number> = { bola: 7, nitro: 5.5, sierra: 5.5, gemelo: 5.5, barreno: 5.5, mordaza: 5, grua: 4, pico: 4 };
const specialValue = (id: string) => (SPECIAL_VALUE[id] ?? (SPECIAL[id] ? 4 : 0)) + selloValue(selloDe({ tipo: 'trampa', id }));
const TREAT_VALUE = { forjado: 2, templado: 2, policromado: 4, agrietado: 3 } as const;
const SEAL_VALUE = { eco: 3, dinamita: 2, sindical: 2, jornal: 1 } as const;
const cardWorth = (c: Card) => (c.sp ? specialValue(c.sp) : c.suit === 'X' ? 3 : cardValue(c) / 2 + (c.tr ? TREAT_VALUE[c.tr] : 0) + (c.seal ? SEAL_VALUE[c.seal] : 0));
const isPlain = (c: Card) => !c.sp && c.suit !== 'X';

/** Lo que suma el sello de nivel del laboratorio (sin sello todavía, como uno A). */
const SELLO_VALUE: Record<SelloNivel, number> = { S: 3, A: 1.5, B: 0 };
const selloValue = (s: SelloNivel | null) => (s ? SELLO_VALUE[s] : SELLO_VALUE.A);

/**
 * V40 1d · Cuánto le interesa un Amuleto a esta campaña: su rareza y lo que hace, su sello de nivel (del laboratorio),
 * su ★ Sinergia (enciende un nivel [2/4] de su Rey, encaja con el Mazo o acerca el [4]), las piezas que ya lleva de su
 * Rey y el peso en el mazo del palo al que está atado. Un Amuleto que ya lleva se valora como si no lo llevara (para
 * comparar al vender). `rey`: el Rey que sigue el bot (laboratorio), que suma lo suyo.
 */
export function toolValue(id: string, run: Run, rey?: ReyId): number {
  const def = TOOL[id];
  if (!def) return 0;
  const otros = run.tools.filter((t) => t.id !== id);
  const has = (other: string) => otros.some((t) => t.id === other);
  let v = { comun: 3, oficio: 3.5, capataz: 4, reliquia: 4.5 }[def.rarity] + { f: 0.5, r: 1, x: 1.5, copy: 0, p: 0 }[def.kind];
  v += selloValue(selloDe({ tipo: 'amuleto', id }));
  const s = sinergia({ tipo: 'amuleto', id }, { mazo: run.deckId, bendiciones: run.bendiciones, tools: otros });
  if (s) v += s.tipo === 'nivel' ? (s.umbral >= 4 ? 4 : 3) : s.tipo === 'mazo' ? 2.5 : 1.5;
  const nv = nivelesReyes(fuentesDe(run.bendiciones, otros));
  v += Math.min(2.4, 0.8 * nv[def.arch].n);
  if (rey && def.arch === rey) v += 4;
  // Bastos: el Escudo rinde con Bastos en el mazo y con los que cobran la defensa
  if (def.arch === 'bastos' && id !== 'sordina') {
    const clubs = run.deck.filter((c) => !c.sp && c.suit === 'C').length / Math.max(1, run.deck.length);
    const builds = clubs > 0.3 || has('sacos') || has('encofrado');
    if (id === 'contragolpe') v += builds ? 2 : -2;
    if ((id === 'sacos' || id === 'encofrado') && WALL_PAYOFF.some(has)) v += 1.5;
  }
  // un Amuleto atado a un palo vale según cuánto de ese palo lleva el mazo (y nada si no lleva ninguno)
  const plain = run.deck.filter((c) => !c.sp && c.suit !== 'X');
  const share = (x: Suit) => plain.filter((c) => c.suit === x).length / Math.max(1, plain.length);
  const suit = SUIT_TOOL[id];
  if (suit) v += share(suit) < 0.08 ? -20 : (share(suit) - 0.25) * 10;
  if (id === 'hucha') v += run.stage <= 3 ? 1 : -1.5;
  if (id === 'ultimo') v += run.tools.some((t) => t.id === 'casco' || t.id === 'botiquin') ? -1 : 0;
  return v;
}

// ───────────────────────── Las Bendiciones ─────────────────────────

/**
 * V40 1c · Lo que vale una Bendición para el bot: un valor propio (lo que da desde ya y lo fácil que es cargarla), el
 * peso en el mazo del palo de su Rey, y un plus si enciende un nivel [2/4] o sigue al Rey que ya lleva. Sin azar.
 */
const BEND_VALUE: Record<string, number> = {
  filo: 5, estocada: 3.5, tajo: 4.5, duelo: 4, remate: 4,
  garrote: 4, empalizada: 3.5, replica: 3.5, porra: 4, aguante: 4.5,
  moneda: 4, lluvia: 4, taba: 4.5, arcon: 3.5, envite: 4,
  brindis: 4, porron: 4.5, ronda: 4, caliz: 3.5, sobremesa: 4,
  hoja: 3, filodorado: 3, sangria: 3, peaje: 3, fogon: 3, convite: 3,
};

export function bendicionValue(o: OpcionBend, run: Run): number {
  const def = BENDICION[o.id];
  if (!def) return -99;
  let v = BEND_VALUE[o.id] ?? 4;
  const plain = run.deck.filter((c) => !c.sp && c.suit !== 'X');
  const nv = nivelesReyes(fuentesDe(run.bendiciones, run.tools));
  // una Dual reparte su peso entre sus dos Reyes: cuenta la media, no la suma
  const reyes = reyesDe(def) as ReyId[];
  for (const rey of reyes) {
    const share = plain.filter((c) => c.suit === PALO_DE_REY[rey]).length / Math.max(1, plain.length);
    const n = nv[rey].n;
    v += ((share - 0.25) * 6 + ((UMBRALES_REY as readonly number[]).includes(n + 1) ? 3 : n >= 1 ? 1 : 0)) / reyes.length;
  }
  return v;
}

const draftValue = (o: DraftOpt) => (o.kind === 'special' ? specialValue(o.id) : 2.5 + cardWorth(o.card));
/**
 * V40 1e · Las Trampas del Bufón que ya lleva el mazo, y cuántas compra como mucho: más atascan la mano (sonda, n=600:
 * sin comprar Trampas 44,7 %; con tope 5, 40,3; sin tope, 29,2). En la «Elegí una» acepta una más.
 */
const trampasEn = (run: Run) => run.deck.filter((c) => c.sp).length;
const TOPE_TRAMPAS = 4;

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

function shopAction(run: Run, rey?: ReyId): RunAction {
  if (run.sobre) return { t: 'open', i: run.sobre.reduce((best, id, i) => (specialValue(id) > specialValue(run.sobre![best]) ? i : best), 0) };
  if (run.integrity <= run.maxIntegrity * 0.6 && run.gold >= healCost(run)) return { t: 'heal' };

  const open = run.shop.map((o, i) => ({ o, i, cost: offerCost(run, o) })).filter((x) => !x.o.sold && x.cost <= run.gold);
  // herramientas: la mejor que se pueda pagar; con el cinturón lleno, se vende la peor si compensa
  const tools = open.filter((x) => x.o.kind === 'tool').sort((a, b) => toolValue(b.o.id!, run, rey) - toolValue(a.o.id!, run, rey));
  if (tools.length) {
    const want = tools[0];
    if (run.tools.length < toolSlots(run)) return { t: 'buy', i: want.i };
    const worst = run.tools.reduce((w, t, i) => (toolValue(t.id, run, rey) < toolValue(run.tools[w].id, run, rey) ? i : w), 0);
    if (toolValue(want.o.id!, run, rey) > toolValue(run.tools[worst].id, run, rey) + 2.5) return { t: 'sell', i: worst };
  }
  const reserve = 5;
  const spare = (x: { cost: number }) => run.gold - x.cost >= reserve;
  // con gotas de lacre la Mesa de lacre sella gratis: se usa aunque no sobre oro
  const forja = open.find((x) => x.o.kind === 'forja' && (x.cost === 0 || spare(x)));
  if (forja && run.deck.some((c) => isPlain(c) && (forja.o.seal ? !c.seal : !c.tr))) return { t: 'buy', i: forja.i };
  // V40 1e · las Trampas atascan la mano: el bot no compra más con el mazo ya cargado de ellas
  const pocas = trampasEn(run) < TOPE_TRAMPAS;
  const sobre = open.find((x) => x.o.kind === 'sobre' && spare(x) && pocas);
  if (sobre) return { t: 'buy', i: sobre.i };
  const plano = open.find((x) => x.o.kind === 'plano' && spare(x) && ['solo', 'grupo', 'escalera', 'doblepar'].includes(x.o.form!));
  if (plano) return { t: 'buy', i: plano.i };
  const blind = open.find((x) => x.o.kind === 'clandestino' && spare(x) && pocas);
  if (blind) return { t: 'buy', i: blind.i };
  const unsold = run.shop.some((o) => !o.sold && o.kind === 'tool');
  if (run.tools.length < toolSlots(run) && !unsold && run.rerolls < 2 && run.gold >= rerollCost(run) + RARITY.oficio.cost) return { t: 'reroll' };
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

// ───────────────────────── V40 1e · El Mapa, el Botín y el Fogón ─────────────────────────

/** Lo que el bot va suponiendo de sí mismo al recorrer un camino (Vida en fracción, oro y huecos libres). */
interface Supuesto {
  vida: number;
  oro: number;
  hueco: boolean;
}
/** Cuánto vale pasar por un nodo, según la política de ruta y lo que se supone que se lleva al llegar. */
function valorNodo(n: NodoMapa, su: Supuesto, ruta: PoliticaRuta, run: Run): number {
  const tipo: TipoNodo = n.tipo;
  if (tipo === 'pulperia') {
    if (ruta === 'sinPulperia') return -50;
    const v = su.oro >= 6 ? 2 + Math.min(4, su.oro / 5) : 0.5;
    return ruta === 'prudente' ? v + 1 : v;
  }
  if (tipo === 'fogon') {
    const falta = 1 - su.vida;
    const v = su.vida < 0.6 ? 3 + falta * 8 : 1.5;
    return ruta === 'prudente' ? v + 1 : v;
  }
  if (tipo === 'bravo') {
    if (ruta === 'prudente') return -50;
    // su Botín: un Amuleto (vale si hay hueco) y, con `bravo.bendicion`, una Bendición a elegir
    const amuleto = (su.hueco ? 2.5 : 1) + (MAPA_CFG.bravo.bendicion ? 5 : 0);
    const umbral = ruta === 'brava' ? 0.45 : 0.7;
    // a partir del tramo 4 el Bravo es un Rey: pide más Vida
    const tarde = n.tramo >= 4 ? 0.1 : 0;
    return su.vida >= umbral + tarde ? amuleto + (ruta === 'brava' ? 3 : 0) : su.vida >= umbral - 0.15 + tarde ? amuleto - 4 : -8;
  }
  if (tipo === 'santuario') return 2;
  return 0;
}
/** Cómo cambia lo que se supone al salir de un nodo. */
function trasNodo(n: NodoMapa, su: Supuesto, run: Run): Supuesto {
  if (n.tipo === 'fogon') return { ...su, vida: Math.min(1, su.vida + MAPA_CFG.fogon.curar / Math.max(1, run.maxIntegrity)) };
  if (n.tipo === 'pulperia') return { ...su, oro: 0 };
  if (n.tipo === 'bravo') return { vida: su.vida - 0.25, oro: su.oro + MAPA_CFG.bravo.oro, hueco: su.hueco };
  return su;
}

/** El Mapa: el primer paso del camino que más vale hasta el asalto del tramo (seis caminos como mucho). */
function mapaAction(run: Run, policy: RunPolicy): RunAction {
  const ruta = policy.ruta ?? 'equilibrada';
  const meta = asaltoDe(run.mapa, run.stage);
  const opciones = alcanzables(run.mapa);
  // azar (laboratorio): un paso cualquiera, sacado de la semilla y del nodo (sin tocar el azar de la campaña)
  if (ruta === 'azar') return { t: 'ir', nodo: opciones[Math.abs(Math.imul((run.id | 0) ^ (run.mapa.en + 7), 0x9e3779b1) >>> 7) % opciones.length] };
  const paths = meta ? caminos(run.mapa, run.mapa.en, meta.id) : [];
  if (!paths.length) return { t: 'ir', nodo: opciones[0] };
  let mejor = paths[0];
  let tope = -Infinity;
  for (const p of paths) {
    let su: Supuesto = { vida: run.integrity / Math.max(1, run.maxIntegrity), oro: run.gold, hueco: run.tools.length < toolSlots(run) };
    let v = 0;
    for (const id of p) {
      const n = run.mapa.nodos[id];
      v += valorNodo(n, su, ruta, run);
      su = trasNodo(n, su, run);
    }
    if (v > tope) (tope = v), (mejor = p);
  }
  return { t: 'ir', nodo: mejor[0] };
}

/** El Botín: primero el oro, luego cada «Elegí una» y el Amuleto; con todo resuelto, seguir. */
function botinAction(run: Run, policy: RunPolicy): RunAction {
  if (run.elegi !== null) {
    const r = run.botin[run.elegi];
    if (!r || r.k !== 'elegi') return { t: 'volver' };
    if (r.tipo === 'bendicion') {
      const op = r.opciones;
      const pref = policy.bendicion ? op.findIndex((o) => o.id === policy.bendicion) : -1;
      if (pref >= 0) return { t: 'elegir', j: pref };
      const suya = policy.rey ? op.findIndex((o) => esDe(BENDICION[o.id], policy.rey!)) : -1;
      if (suya >= 0) return { t: 'elegir', j: suya };
      return { t: 'elegir', j: op.reduce((b, o, i) => (bendicionValue(o, run) > bendicionValue(op[b], run) ? i : b), 0) };
    }
    if (r.tipo === 'trampa') {
      // V40 1e · con el mazo ya cargado de Trampas, la carta (o Saltar: +oro)
      const llenas = trampasEn(run) > TOPE_TRAMPAS;
      const ops = r.opciones.map((o, i) => ({ o, i })).filter((x) => !llenas || x.o.kind !== 'special');
      return { t: 'elegir', j: ops.length ? ops.reduce((b, x) => (draftValue(x.o) > draftValue(b.o) ? x : b)).i : null };
    }
    if (run.tools.length >= toolSlots(run)) return { t: 'elegir', j: null };
    const best = [...r.opciones].sort((a, b) => toolValue(b, run, policy.rey) - toolValue(a, run, policy.rey))[0];
    return { t: 'elegir', j: best ? r.opciones.indexOf(best) : null };
  }
  const i = run.botin.findIndex((r) => r.estado === 'abierta');
  if (i < 0) return { t: 'seguir' };
  const r = run.botin[i];
  if (r.k === 'amuleto' && run.tools.length >= toolSlots(run)) return { t: 'saltar', i };
  return { t: 'cobrar', i };
}

/** El Fogón: Curar si falta Vida (menos del 70 %); si no, Purgar la carta que menos vale. */
function fogonAction(run: Run): RunAction {
  const f = run.fogon;
  if (!f) return { t: 'next' };
  const falta = run.integrity < run.maxIntegrity * 0.7;
  const plain = run.deck.filter(isPlain).sort((a, b) => cardWorth(a) - cardWorth(b));
  const peor = plain[0];
  if (f.curar && (falta || !f.purgar || !peor || run.deck.length <= MIN_DECK) && run.integrity < run.maxIntegrity) return { t: 'fogon', que: 'curar' };
  if (f.purgar && peor && run.deck.length > MIN_DECK) return { t: 'fogon', que: 'purgar', card: peor.id };
  if (f.curar && run.integrity < run.maxIntegrity) return { t: 'fogon', que: 'curar' };
  return { t: 'next' };
}

/** La siguiente decisión de campaña, o null si toca jugar la obra o la campaña ya terminó. */
export function chooseRunAction(run: Run, policy: RunPolicy = {}): RunAction | null {
  if (run.pending) return pendingTarget(run);
  switch (run.phase) {
    case 'pack':
      return { t: 'begin', don: 0 }; // V29: el bot se queda con la Reliquia del Don de la Conjura
    case 'bendicion': {
      const op = run.oferta ?? [];
      const pref = policy.bendicion ? op.findIndex((o) => o.id === policy.bendicion) : -1;
      if (pref >= 0) return { t: 'bendicion', i: pref };
      const suya = policy.rey ? op.findIndex((o) => esDe(BENDICION[o.id], policy.rey!)) : -1;
      if (suya >= 0) return { t: 'bendicion', i: suya };
      return { t: 'bendicion', i: op.reduce((b, o, i) => (bendicionValue(o, run) > bendicionValue(op[b], run) ? i : b), 0) };
    }
    case 'map':
      return mapaAction(run, policy);
    case 'reward':
      return botinAction(run, policy);
    case 'fogon':
      return fogonAction(run);
    case 'shop':
      return shopAction(run, policy.rey);
    case 'event':
      return eventAction(run);
    default:
      return null;
  }
}
