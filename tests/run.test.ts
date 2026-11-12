import { describe, expect, it } from 'vitest';
import { GameState, SEALS, TREATMENTS, applyAction, currentPlayer, seedFrom } from '../src/rules/engine';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { ACHIEVEMENTS, claim, deckUnlocked, noteEvents, noteRun, unlockedPool } from '../src/rules/achievements';
import { ASCENSIONS, BOSSES, CONTRACT, DECKS, EVENT, EVENTS, LAST_STAGE, MAX_ASCENSION, RUN_VERSION, Run, RunAction, STAGES, TAGS, UPGRADES, buyUpgrade, cleanUp, dailySeed, depthOf, finishBattle, healCost, loadMeta, mvpTool, newMeta, newRun, publicRun, removeCost, renownFor, reorderBelt, rerollCost, runAction, sellValue, settle, stageConfig, stageDef, stagesCleared, startStage, trackEvents, FATIGUE } from '../src/rules/run';
import { BASE_POOL, SPECIAL, SPECIALS } from '../src/rules/specials';
import { TOOL, TOOL_SLOTS, toolPool } from '../src/rules/tools';

const P = [{ id: 'a', name: 'A' }];
const act = (run: Run, a: RunAction) => expect(runAction(run, a), JSON.stringify(a)).toBeNull();
const fullGuild = () => Object.fromEntries(UPGRADES.map((u) => [u.id, u.costs.length]));

/** Entra a la obra por la primera ruta. */
function enter(run: Run, route = 0): GameState {
  if (run.phase === 'pack') act(run, { t: 'begin' });
  act(run, { t: 'route', i: route });
  return startStage(run, P);
}
/** Da la obra por ganada (sin jugarla) y cierra la batalla. */
function win(run: Run, tweak?: (s: GameState) => void): GameState {
  const state = enter(run);
  for (const t of Object.values(state.towers)) t.floors = [];
  state.phase = 'won';
  tweak?.(state);
  finishBattle(run, state);
  return state;
}
/** Cobra sin llevarse nada y llega a la ferretería. */
function toShop(run: Run): void {
  win(run);
  if (!run.looted) act(run, { t: 'loot', id: null });
  act(run, { t: 'draft', i: null });
  expect(run.phase).toBe('shop');
}
/** Juega la campaña entera con el bot. */
function botRun(run: Run): Run {
  for (let guard = 0; guard < 5000 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
    if (run.phase === 'battle') {
      let state = startStage(run, P);
      while (state.phase === 'playing') {
        const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
        trackEvents(run, res.events);
        state = res.state;
      }
      finishBattle(run, state);
    } else act(run, chooseRunAction(run)!);
  }
  return run;
}

describe('semillas', () => {
  it('la misma semilla monta la misma campaña; el texto de semilla manda sobre el azar', () => {
    expect(JSON.stringify(newRun({}, 42))).toBe(JSON.stringify(newRun({}, 42)));
    expect(JSON.stringify(newRun({}, 42))).not.toBe(JSON.stringify(newRun({}, 43)));
    const a = newRun({ seedText: ' obra ' }, 1);
    const b = newRun({ seedText: 'OBRA' }, 999);
    expect(a.seedText).toBe('OBRA');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('una campaña al azar se repite escribiendo la semilla que enseña; una palabra sigue pasando por el hash', () => {
    for (const n of [42, -123456789, 2 ** 31 - 1, -(2 ** 31)]) {
      const a = newRun({ seed: n }, 7);
      expect(a.seedText).toMatch(/^#[0-9A-Z]{1,7}$/);
      const b = newRun({ seedText: a.seedText }, 999);
      const c = newRun({ seedText: a.seedText.toLowerCase() }, 5);
      expect(b.id).toBe(n | 0);
      expect(b.deck).toEqual(a.deck);
      // la campaña entera (mazo inicial, plano, ofertas) es la misma
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
      expect(JSON.stringify(c)).toBe(JSON.stringify(a));
    }
    // lo que no tiene la forma «#base36» va por el hash de siempre: las actas viejas con palabra no cambian
    expect(newRun({ seedText: 'CASA' }, 1).id).toBe(seedFrom('CASA'));
    expect(newRun({ seedText: 'casa' }, 2).id).toBe(seedFrom('CASA'));
    expect(newRun({ seedText: '#ABCDEFGH' }, 3).id).toBe(seedFrom('#ABCDEFGH'));
  });

  it('la Obra diaria usa la semilla de la fecha, la baraja de obra y ninguna mejora del gremio', () => {
    const a = newRun({ daily: '2026-11-11', up: fullGuild(), deck: 'ases', ascension: 5, pool: ['j-furia'] }, 1);
    const b = newRun({ daily: '2026-11-11' }, 2);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a).toMatchObject({ daily: '2026-11-11', id: dailySeed('2026-11-11'), deckId: 'obra', ascension: 0 });
    expect(Object.values(a.up).every((n) => n === 0)).toBe(true);
    expect(a.pool).toEqual(BASE_POOL);
    expect(newRun({ daily: '2026-11-12' }, 1).id).not.toBe(a.id);
    expect(newRun({ daily: 'mañana' }, 7).daily).toBeNull();
  });

  it('una campaña entera jugada por el bot es reproducible paso a paso', () => {
    const a = botRun(newRun({ seedText: 'DERRUMBE' }));
    const b = botRun(newRun({ seedText: 'DERRUMBE' }));
    expect(['won', 'lost']).toContain(a.phase);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.stats.floors).toBeGreaterThan(0);
  });
});

describe('preparación', () => {
  it('empieza con un sobre de 3 especiales, 4 de oro y los jefes ya sorteados a la vista', () => {
    const run = newRun({}, 7);
    expect(run).toMatchObject({ phase: 'pack', stage: 1, gold: 4, integrity: 20, maxIntegrity: 20, tools: [] });
    expect(run.pack.length).toBe(3);
    expect(run.deck.length).toBe(45);
    expect(run.deck.filter((c) => c.sp).map((c) => c.sp)).toEqual(run.pack);
    const bossStages = STAGES.flatMap((s, i) => (s.boss ? [i + 1] : []));
    expect(Object.keys(run.bosses).map(Number)).toEqual(bossStages);
    expect(new Set(Object.values(run.bosses)).size).toBe(bossStages.length);
    expect(run.events.length).toBe(3);
    expect(run.toolPool.length).toBe(toolPool([]).length);
    expect(run.v).toBe(RUN_VERSION);
    expect(run.seals).toEqual(['eco', 'jornal']);
    expect(run.treats).toEqual(['forjado', 'templado']);
  });

  it('el gremio abre surtidos (cajas, tampones, bronce) en vez de dar potencia bruta', () => {
    const run = newRun({ up: fullGuild(), pool: SPECIALS.map((s) => s.id) }, 7);
    expect(run.toolPool.length).toBe(Object.keys(TOOL).length);
    expect(run.seals).toEqual(SEALS);
    expect(run.treats).toEqual(TREATMENTS);
    expect(run.pool.length).toBe(SPECIALS.length);
    expect(run.maxIntegrity).toBe(20);
    expect(run.gold).toBe(4 + 2 * 2);
    expect(cleanUp({ vale: 99, inventada: 3, caja: -1 })).toMatchObject({ vale: 2, caja: 0 });
  });

  it('cada baraja inicial monta un mazo válido', () => {
    for (const d of DECKS) {
      const run = newRun({ deck: d.id }, 3);
      expect(new Set(run.deck.map((c) => c.id)).size, d.id).toBe(run.deck.length);
      expect(run.integrity, d.id).toBe(run.maxIntegrity);
      expect(startStage(Object.assign(run, { phase: 'battle' as const }), P).players[0].hand.length).toBe(7 + run.handBonus);
    }
    expect(newRun({ deck: 'acero' }, 3).tools.map((t) => t.id)).toEqual(['acido', 'sacos']);
    expect(newRun({ deck: 'acero' }, 3).maxIntegrity).toBe(25);
    // con la caja de aguante abierta en el gremio, la baraja negra trae además el Bastión
    expect(newRun({ deck: 'acero', up: { caja_aguante: 1 } }, 3).tools.map((t) => t.id)).toEqual(['acido', 'sacos', 'bastion']);
    // ases y caos ya no llevan oro de más
    expect(newRun({ deck: 'ases' }, 3).gold).toBe(4);
    expect(newRun({ deck: 'caos' }, 3).gold).toBe(4);
    expect(newRun({ deck: 'ases' }, 3).deck.filter((c) => c.rank === 1).length).toBe(8);
    expect(newRun({ deck: 'caos' }, 3).pack.length).toBe(5);
  });
});

describe('plano de demolición', () => {
  it('una obra sin jefe ofrece dos rutas con contrato (la primera nunca de riesgo) y un atajo con etiqueta', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const run = newRun({}, seed);
      act(run, { t: 'begin' });
      expect(run.phase).toBe('map');
      expect(run.node.routes.length).toBe(2);
      expect(new Set(run.node.routes).size).toBe(2);
      expect(CONTRACT[run.node.routes[0]].risk).toBeFalsy();
      expect(TAGS.some((t) => t.id === run.node.tag)).toBe(true);
    }
    const guild = newRun({ up: { rutas: 1 } }, 1);
    act(guild, { t: 'begin' });
    expect(guild.node.routes.length).toBe(3);
  });

  it('tomar una ruta fija su contrato y abre la obra', () => {
    const run = newRun({}, 5);
    act(run, { t: 'begin' });
    const contract = run.node.routes[1];
    act(run, { t: 'route', i: 1 });
    expect(run).toMatchObject({ phase: 'battle', contract, boss: null });
    expect(runAction(run, { t: 'route', i: 0 })).toMatch(/Mapa del castillo/);
  });

  it('saltar la obra cobra la etiqueta y avanza sin cobro ni ferretería', () => {
    const run = newRun({}, 5);
    act(run, { t: 'begin' });
    run.node.tag = 'liquidacion';
    act(run, { t: 'skip' });
    expect(run).toMatchObject({ phase: 'map', stage: 2, gold: 4 + 15 });
    expect(run.stats.skips).toBe(1);
    expect(stagesCleared(run)).toBe(1);
  });

  it('cada etiqueta hace lo que dice', () => {
    const fresh = (tag: string) => {
      const run = newRun({}, 9);
      act(run, { t: 'begin' });
      run.node.tag = tag;
      act(run, { t: 'skip' });
      return run;
    };
    expect(fresh('vale').freeShop).toBe(true);
    const envio = fresh('envio');
    expect(envio.tools.length).toBe(1);
    expect(['capataz', 'reliquia']).toContain(TOOL[envio.tools[0].id].rarity);
    expect(fresh('timbrado').deck.filter((c) => c.seal).length).toBe(2);
    // el molde deja una elección pendiente: nada más se puede hacer hasta resolverla
    const molde = fresh('molde');
    expect(molde.pending).toEqual({ kind: 'dup' });
    expect(runAction(molde, { t: 'route', i: 0 })).toMatch(/pendientes/);
    act(molde, { t: 'target', cards: ['S1'] });
    expect(molde.deck.filter((c) => c.suit === 'S' && c.rank === 1).length).toBe(2);
    expect(molde.pending).toBeNull();
  });

  it('las obras con jefe no se saltan y el jefe anunciado es el que sale', () => {
    const run = newRun({}, 5);
    run.stage = 3;
    run.phase = 'pack';
    act(run, { t: 'begin' });
    expect(run.node).toEqual({ routes: [], tag: null });
    expect(runAction(run, { t: 'skip' })).toMatch(/no tiene Atajo/);
    act(run, { t: 'route', i: 0 });
    expect(run.boss).toBe(run.bosses[3]);
    expect(run.contract).toBeNull();
    const boss = BOSSES.find((b) => b.id === run.boss)!;
    const plain = stageConfig({ ...run, boss: null });
    const cursed = stageConfig(run);
    expect(JSON.stringify(cursed)).not.toBe(JSON.stringify(plain));
    expect(boss.desc.length).toBeGreaterThan(10);
  });
});

describe('contratos', () => {
  it('cumplido: paga su premio; incumplido: nada', () => {
    const ok = newRun({}, 5);
    act(ok, { t: 'begin' });
    ok.node.routes[0] = 'intacto';
    win(ok);
    expect(ok.contractDone).toBe(true);
    expect(ok.stats.contracts).toBe(1);

    const ko = newRun({}, 5);
    act(ko, { t: 'begin' });
    ko.node.routes[0] = 'intacto';
    const state = enter(ko);
    trackEvents(ko, [{ e: 'siren', card: null, tower: 'S', threat: 2, blocked: 0, taken: 2, integrity: 18, wall: 0, reason: 'strike' }]);
    for (const t of Object.values(state.towers)) t.floors = [];
    state.phase = 'won';
    finishBattle(ko, state);
    expect(ko.contractDone).toBe(false);
    expect(ok.gold - ko.gold).toBe(8);
  });

  it('los de pulso y jugada se comprueban con lo que pasó en la mesa', () => {
    const run = newRun({}, 5);
    act(run, { t: 'begin' });
    run.node.routes[0] = 'limpios';
    enter(run);
    trackEvents(run, Array.from({ length: 3 }, () => ({ e: 'floorDown' as const, tower: 'S' as const, rank: 11, clean: true, towerDown: false, damage: 0 })));
    expect(run.battle.cleans).toBe(3);
    expect(CONTRACT.limpios.done!(run.battle, startStage(run, P), run)).toBe(true);
    trackEvents(run, [{ e: 'play', player: 'a', cards: [], target: 'S', formation: 'full' }]);
    expect(CONTRACT.maestra.done!(run.battle, startStage(run, P), run)).toBe(true);
    trackEvents(run, [{ e: 'joker', player: 'a', card: { id: 'X1', suit: 'X', rank: 0 }, target: 'S' }]);
    expect(CONTRACT.austero.done!(run.battle, startStage(run, P), run)).toBe(false);
  });

  it('los de riesgo endurecen la obra y pagan siempre que la termines', () => {
    const run = newRun({}, 5);
    act(run, { t: 'begin' });
    run.node.routes[1] = 'horas';
    const base = stageConfig(run).floorThreat[11];
    act(run, { t: 'route', i: 1 });
    expect(stageConfig(run).floorThreat[11]).toBe(base + 1);
    const state = startStage(run, P);
    for (const t of Object.values(state.towers)) t.floors = [];
    state.phase = 'won';
    const before = run.gold;
    finishBattle(run, state);
    expect(run.contractDone).toBe(true);
    expect(run.gold - before).toBe(run.pay.reduce((a, [, n]) => a + n, 0) + 10);
  });
});

describe('cobro y selección', () => {
  it('tras la obra se cobra y se ofrecen 3 opciones a la vista: 2 especiales y 1 carta modificada', () => {
    const run = newRun({}, 11);
    win(run);
    expect(run.phase).toBe('reward');
    expect(run.pay[0]).toEqual(['Asalto ganado', 5]);
    expect(run.integrity).toBe(20);
    expect(run.draft.map((o) => o.kind)).toEqual(['special', 'special', 'card']);
    const card = run.draft[2];
    if (card.kind === 'card') expect(!!card.card.seal !== !!card.card.tr).toBe(true);
    const size = run.deck.length;
    act(run, { t: 'draft', i: 2 });
    expect(run.deck.length).toBe(size + 1);
    expect(run.phase).toBe('shop');
  });

  it('pasar de la selección da 3 de oro', () => {
    const run = newRun({}, 11);
    win(run);
    const gold = run.gold;
    const size = run.deck.length;
    act(run, { t: 'draft', i: null });
    expect(run.gold).toBe(gold + 3);
    expect(run.deck.length).toBe(size);
    expect(runAction(run, { t: 'draft', i: 0 })).toMatch(/selección/);
  });

  it('los jefes dejan botín: una de dos herramientas de oficio o mejor', () => {
    const run = newRun({}, 11);
    run.stage = 3;
    win(run);
    expect(run.loot.length).toBe(2);
    expect(run.beaten).toEqual([run.bosses[3]]);
    for (const id of run.loot) expect(TOOL[id].rarity).not.toBe('comun');
    act(run, { t: 'draft', i: null });
    expect(run.phase).toBe('reward'); // falta el botín
    act(run, { t: 'loot', id: run.loot[0] });
    expect(run.tools).toEqual([{ id: run.loot[0], n: 0 }]);
    expect(run.phase).toBe('shop');
  });

  it('lo que pasa en la obra vuelve a la campaña: cartas destruidas, contadores y escombros', () => {
    const run = newRun({}, 11);
    run.tools = [{ id: 'calibre', n: 0 }];
    win(run, (s) => {
      s.burned = ['S2', 'S3'];
      s.scrap = 2;
      s.tools[0].n = 4;
    });
    expect(run.deck.some((c) => c.id === 'S2' || c.id === 'S3')).toBe(false);
    expect(run.scrap).toBe(2);
    expect(run.tools[0].n).toBe(4);
  });

  it('perder la obra termina la campaña', () => {
    const run = newRun({}, 11);
    const state = enter(run);
    state.phase = 'lost';
    finishBattle(run, state);
    expect(run.phase).toBe('lost');
    expect(chooseRunAction(run)).toBeNull();
  });
});

describe('ferretería', () => {
  it('surtido: herramientas, sobre de especiales, sobre clandestino, mesa de forja y plano', () => {
    const run = newRun({}, 21);
    toShop(run);
    const kinds = run.shop.map((o) => o.kind);
    expect(kinds.filter((k) => k === 'tool').length).toBe(2);
    for (const k of ['sobre', 'clandestino', 'forja', 'plano']) expect(kinds).toContain(k);
    const sobre = run.shop.find((o) => o.kind === 'sobre')!;
    const blind = run.shop.find((o) => o.kind === 'clandestino')!;
    expect(blind.cost).toBeLessThan(sobre.cost + 1);
    const guild = newRun({ up: { tienda: 1 } }, 21);
    toShop(guild);
    expect(guild.shop.filter((o) => o.kind === 'tool').length).toBe(3);
  });

  it('sobre de especiales: se abre y eliges 1 de 3; mientras tanto no puedes irte', () => {
    const run = newRun({}, 21);
    toShop(run);
    run.gold = 50;
    const i = run.shop.findIndex((o) => o.kind === 'sobre');
    const size = run.deck.length;
    act(run, { t: 'buy', i });
    expect(run.sobre!.length).toBe(3);
    expect(new Set(run.sobre).size).toBe(3);
    expect(runAction(run, { t: 'next' })).toMatch(/sobre abierto/);
    const want = run.sobre![1];
    act(run, { t: 'open', i: 1 });
    expect(run.deck.length).toBe(size + 1);
    expect(run.deck[run.deck.length - 1].sp).toBe(want);
    expect(run.sobre).toBeNull();
    expect(runAction(run, { t: 'buy', i })).toMatch(/ya no está/);
  });

  it('sobre clandestino: una especial a ciegas, más barata', () => {
    const run = newRun({}, 21);
    toShop(run);
    run.gold = 50;
    const size = run.deck.length;
    act(run, { t: 'buy', i: run.shop.findIndex((o) => o.kind === 'clandestino') });
    expect(run.deck.length).toBe(size + 1);
    expect(SPECIAL[run.deck[run.deck.length - 1].sp!]).toBeTruthy();
  });

  it('mesa de forja: eliges la carta, y solo entonces se cobra y se estampa', () => {
    const run = newRun({}, 21);
    toShop(run);
    run.gold = 50;
    const i = run.shop.findIndex((o) => o.kind === 'forja');
    const offer = run.shop[i];
    act(run, { t: 'buy', i });
    expect(run.pending).toEqual({ kind: 'forge', i });
    expect(run.gold).toBe(50);
    act(run, { t: 'cancel' });
    expect(run.gold).toBe(50);
    expect(offer.sold).toBeFalsy();
    act(run, { t: 'buy', i });
    expect(runAction(run, { t: 'target', cards: ['X1'] })).toMatch(/carta de baraja/);
    act(run, { t: 'target', cards: ['S1'] });
    const forged = run.deck.find((c) => c.id === 'S1')!;
    expect(offer.seal ? forged.seal : forged.tr).toBe(offer.seal ?? offer.tr);
    expect(run.gold).toBe(50 - offer.cost);
    expect(offer.sold).toBe(true);
    expect(run.stats.forged).toBe(1);
  });

  it('quemador: destruye una carta, cada vez más caro, y suma escombros', () => {
    const run = newRun({}, 21);
    toShop(run);
    run.gold = 50;
    expect(removeCost(run)).toBe(3);
    act(run, { t: 'burn', card: 'S2' });
    expect(run.deck.some((c) => c.id === 'S2')).toBe(false);
    expect(run).toMatchObject({ gold: 47, scrap: 1, removals: 1 });
    expect(removeCost(run)).toBe(5);
    run.deck = run.deck.slice(0, 12);
    expect(runAction(run, { t: 'burn', card: run.deck[0].id })).toMatch(/no puede bajar/);
  });

  it('«Revolver cajones» renueva el surtido con coste creciente; los vales del gremio lo pagan', () => {
    const run = newRun({}, 21);
    toShop(run);
    run.gold = 50;
    const before = JSON.stringify(run.shop);
    expect(rerollCost(run)).toBe(2);
    act(run, { t: 'reroll' });
    expect(JSON.stringify(run.shop)).not.toBe(before);
    expect(rerollCost(run)).toBe(3);
    act(run, { t: 'reroll' });
    expect(run.gold).toBe(45);
    const guild = newRun({ up: { vale: 2 } }, 21);
    toShop(guild);
    const gold = guild.gold;
    act(guild, { t: 'reroll' });
    act(guild, { t: 'reroll' });
    expect(guild.gold).toBe(gold);
    expect(rerollCost(guild)).toBe(2);
  });

  it('herramientas: se compran hasta llenar el cinturón, se venden por la mitad y se reparan búnkeres', () => {
    const run = newRun({}, 21);
    toShop(run);
    run.gold = 99;
    const i = run.shop.findIndex((o) => o.kind === 'tool');
    const id = run.shop[i].id!;
    act(run, { t: 'buy', i });
    expect(run.tools).toEqual([{ id, n: 0 }]);
    const gold = run.gold;
    act(run, { t: 'sell', i: 0 });
    expect(run.gold).toBe(gold + sellValue(id));
    run.tools = Array.from({ length: TOOL_SLOTS }, () => ({ id: 'piqueta', n: 0 }));
    expect(runAction(run, { t: 'buy', i: run.shop.findIndex((o) => o.kind === 'tool' && !o.sold) })).toMatch(/Solo caben/);
    run.integrity = 10;
    expect(healCost(run)).toBe(5);
    act(run, { t: 'heal' });
    expect(run.integrity).toBe(16);
    expect(healCost(run)).toBe(6);
  });

  it('con el vale de ferretería todo el surtido es gratis', () => {
    const run = newRun({}, 21);
    act(run, { t: 'begin' });
    run.node.tag = 'vale';
    act(run, { t: 'skip' });
    toShop(run);
    const gold = run.gold;
    act(run, { t: 'buy', i: run.shop.findIndex((o) => o.kind === 'tool') });
    expect(run.gold).toBe(gold);
    act(run, { t: 'next' });
    expect(run.freeShop).toBe(false);
  });

  it('no deja comprar sin oro', () => {
    const run = newRun({}, 21);
    toShop(run);
    run.gold = 0;
    expect(runAction(run, { t: 'buy', i: 0 })).toMatch(/oro/);
    expect(runAction(run, { t: 'burn', card: 'S2' })).toMatch(/oro/);
  });
});

describe('cinturón', () => {
  it('se reordena con una permutación; en plena obra, la mesa sigue el mismo orden', () => {
    const run = newRun({}, 4);
    run.tools = ['piqueta', 'prisma', 'ultimo'].map((id) => ({ id, n: 0 }));
    act(run, { t: 'reorder', order: [2, 0, 1] });
    expect(run.tools.map((t) => t.id)).toEqual(['ultimo', 'piqueta', 'prisma']);
    expect(runAction(run, { t: 'reorder', order: [0, 0, 1] })).toMatch(/no es válido/);
    const state = enter(run);
    state.tools[0].n = 3;
    expect(reorderBelt(run, state, [1, 2, 0])).toBeNull();
    expect(run.tools.map((t) => t.id)).toEqual(['piqueta', 'prisma', 'ultimo']);
    expect(state.tools).toEqual([{ id: 'piqueta', n: 0 }, { id: 'prisma', n: 0 }, { id: 'ultimo', n: 3 }]);
    expect(runAction(run, { t: 'sell', i: 0 })).toMatch(/pleno asalto/);
  });

  it('las herramientas cambian las reglas de la obra', () => {
    const run = newRun({}, 4);
    const base = stageConfig(run);
    run.tools = ['sacos', 'andamio', 'nivel'].map((id) => ({ id, n: 0 }));
    const cfg = stageConfig(run);
    expect(cfg.wallCap).toBe(base.wallCap + 4);
    expect(cfg.handSize[1]).toBe(8);
    expect(cfg.cleanTol).toBe(1);
  });
});

describe('hallazgos en los cimientos', () => {
  it('tras cada jefe intermedio hay un hallazgo antes de la obra siguiente', () => {
    const run = newRun({}, 31);
    run.stage = 3;
    toShop(run);
    const next = run.events[0];
    act(run, { t: 'next' });
    expect(run).toMatchObject({ phase: 'event', event: next, stage: 3 });
    expect(EVENTS.some((e) => e.id === next)).toBe(true);
    act(run, { t: 'event', i: EVENT[next].options.length - 1 });
    expect(run).toMatchObject({ phase: 'map', stage: 4, event: null });
    expect(run.events.length).toBe(2);
  });

  it('cada dilema tiene al menos dos salidas y la última siempre se puede elegir', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(4);
    for (const e of EVENTS) {
      expect(e.options.length).toBeGreaterThanOrEqual(2);
      const run = newRun({}, 1);
      run.gold = 0;
      run.integrity = 1;
      const last = e.options[e.options.length - 1];
      expect(!last.can || last.can(run), e.id).toBe(true);
    }
  });

  it('la caja fuerte cambia integridad por una herramienta de capataz o reliquia', () => {
    const run = newRun({}, 31);
    Object.assign(run, { phase: 'event', event: 'caja' });
    act(run, { t: 'event', i: 0 });
    expect(run.integrity).toBe(15);
    expect(['capataz', 'reliquia']).toContain(TOOL[run.tools[0].id].rarity);
  });

  it('el horno funde dos cartas en una de bronce vivo', () => {
    const run = newRun({}, 31);
    Object.assign(run, { phase: 'event', event: 'horno' });
    run.deck.find((c) => c.id === 'H3')!.seal = 'eco';
    const size = run.deck.length;
    act(run, { t: 'event', i: 0 });
    expect(run.pending).toEqual({ kind: 'fuse' });
    expect(runAction(run, { t: 'target', cards: ['S9'] })).toMatch(/dos cartas/);
    act(run, { t: 'target', cards: ['S9', 'H3'] });
    expect(run.deck.length).toBe(size - 1);
    expect(run.deck[run.deck.length - 1]).toMatchObject({ suit: 'S', rank: 9, tr: 'policromado', seal: 'eco' });
    expect(run).toMatchObject({ scrap: 2, phase: 'map', stage: 2 });
  });

  it('el contrato maldito paga ahora y cobra en la obra siguiente', () => {
    const run = newRun({}, 31);
    run.stage = 3;
    const threat = stageConfig({ ...run, stage: 4 }).floorThreat[13];
    Object.assign(run, { phase: 'event', event: 'contrato' });
    act(run, { t: 'event', i: 0 });
    expect(run).toMatchObject({ gold: 24, curse: true, stage: 4 });
    expect(stageConfig(run).floorThreat[13]).toBe(threat + 1);
    win(run);
    expect(run.curse).toBe(false);
  });

  it('no deja elegir lo que no puedes pagar', () => {
    const run = newRun({}, 31);
    Object.assign(run, { phase: 'event', event: 'clandestino', gold: 0 });
    expect(runAction(run, { t: 'event', i: 1 })).toMatch(/No puedes/);
  });
});

describe('final, cimientos abisales y gremio', () => {
  it('ganar la obra 8 corona la campaña; después se puede seguir a los cimientos abisales', () => {
    const run = newRun({}, 13);
    run.stage = LAST_STAGE;
    win(run);
    expect(run).toMatchObject({ phase: 'won', conquered: true });
    expect(renownFor(run)).toBe(13);
    expect(runAction(run, { t: 'next' })).toBeTruthy();
    act(run, { t: 'endless' });
    expect(run).toMatchObject({ phase: 'reward', endless: true });
    act(run, { t: 'draft', i: null });
    act(run, { t: 'next' });
    expect(run).toMatchObject({ phase: 'map', stage: 9 });
    expect(stageDef(9)).toMatchObject({ name: 'Trono infinito 1', boss: true });
    expect(stageDef(10).hp).toBeGreaterThan(stageDef(9).hp);
    expect(stageDef(9).hp).toBeGreaterThan(STAGES[7].hp);
    win(run);
    expect(run.phase).toBe('reward'); // ya no hay final: solo más hondo
    expect(depthOf(run)).toBe(1);
    expect(renownFor(run)).toBe(14);
  });

  it('en cuadrilla y en ascenso las obras aguantan más', () => {
    const run = newRun({}, 13);
    const solo = stageConfig(run, 1).floorHp[11];
    expect(stageConfig(run, 3).floorHp[11]).toBeGreaterThan(solo);
    expect(stageConfig(newRun({ ascension: 2 }, 13), 1).floorHp[11]).toBeGreaterThan(solo);
    // en cuadrilla la fatiga de cimientos empieza más tarde, en proporción a lo que aguantan las obras
    expect(stageConfig(run, 1).fatigueStart).toBe(FATIGUE.start);
    expect(stageConfig(run, 4).fatigueStart!).toBeGreaterThan(FATIGUE.start);
    // en solitario hay una tiza de replanteo por obra; en cuadrilla, ninguna
    expect(startStage(Object.assign(newRun({}, 13), { phase: 'battle' as const }), P).chalk).toBe(1);
    expect(startStage(Object.assign(newRun({}, 13), { phase: 'battle' as const }), [...P, { id: 'b', name: 'B' }]).chalk).toBe(0);
  });

  it('lo que viaja a los clientes de una sala no lleva el azar ni la semilla hasta que termina', () => {
    const run = newRun({ seedText: 'SECRETA' }, 1);
    const sent = publicRun(run, 1234);
    expect(sent).toMatchObject({ id: 1234, rng: 0, seedText: '', events: [] });
    expect(JSON.stringify(sent)).not.toContain(String(run.rng));
    expect(run.rng).not.toBe(0); // la campaña del servidor sigue intacta
    run.phase = 'lost';
    expect(publicRun(run, 1234).seedText).toBe('SECRETA');
  });

  it('el acta sabe cuál fue la herramienta más activa', () => {
    const run = newRun({}, 13);
    trackEvents(run, [
      { e: 'step', src: 'tool', id: 'piqueta', slot: 0, label: '', fuerza: 0, res: 1 },
      { e: 'step', src: 'tool', id: 'prisma', slot: 1, label: '', fuerza: 0, res: 1 },
      { e: 'step', src: 'tool', id: 'prisma', slot: 1, label: '', fuerza: 0, res: 1 },
      { e: 'impact', tower: 'S', fuerza: 30, res: 2, total: 60 },
      { e: 'gold', amount: 2 },
    ]);
    expect(mvpTool(run)).toBe('prisma');
    expect(run.stats.maxHit).toBe(60);
    expect(run.gold).toBe(6);
  });

  it('el gremio guarda renombre, vende mejoras y migra los guardados antiguos devolviendo lo gastado', () => {
    const meta = newMeta();
    const run = newRun({}, 13);
    run.stage = 4;
    run.phase = 'lost';
    expect(settle(meta, run)).toBe(3);
    expect(meta).toMatchObject({ renown: 3, runs: 1, best: 3, wins: 0 });
    expect(buyUpgrade(meta, 'caja')).toBe(true);
    expect(meta).toMatchObject({ renown: 0, up: { caja: 1 } });
    expect(buyUpgrade(meta, 'caja')).toBe(false);
    const old = { renown: 2, up: { cimientos: 2, seguro: 1 }, runs: 9, wins: 1, best: 8, ascMax: 1, ach: { madre: true }, stats: { floors: 80 }, seen: { relics: ['piqueta', 'inventada'], specials: ['bola'], bosses: [], forms: [] } };
    const migrated = loadMeta(old);
    expect(migrated).toMatchObject({ v: 2, renown: 2 + 3 + 5 + 4, up: {}, runs: 9, ach: { madre: true } });
    expect(migrated.stats).toMatchObject({ floors: 80, forged: 0 });
    expect(migrated.seen.tools).toEqual(['piqueta']);
    expect(loadMeta(migrated).renown).toBe(migrated.renown); // migrar dos veces no regala nada
    expect(loadMeta(null)).toEqual(newMeta());
  });

  it('la Obra diaria deja su marca en el gremio', () => {
    const meta = newMeta();
    const run = newRun({ daily: '2026-11-11' }, 1);
    run.stage = 6;
    run.phase = 'lost';
    settle(meta, run);
    expect(meta.daily).toEqual({ date: '2026-11-11', cleared: 5, won: false });
    expect(meta.stats.dailies).toBe(1);
  });

  it('los logros se cumplen jugando, dan renombre y abren barajas y cartas legendarias', () => {
    const meta = newMeta();
    expect(deckUnlocked(meta, 'obra')).toBe(true);
    expect(deckUnlocked(meta, 'ases')).toBe(false);
    const run = newRun({}, 13);
    run.stage = LAST_STAGE;
    run.tools = [{ id: 'piqueta', n: 0 }];
    run.stats.forged = 4;
    win(run);
    noteEvents(meta, [{ e: 'impact', tower: 'S', fuerza: 60, res: 2, total: 120 }, { e: 'floorDown', tower: 'S', rank: 11, clean: true, towerDown: false, damage: 0 }]);
    noteRun(meta, run);
    noteRun(meta, run); // llamarlo dos veces no duplica lo acumulado
    settle(meta, run);
    expect(meta.stats).toMatchObject({ reach: 8, maxHit: 120, cleans: 1, forged: 4, winAsc: 0 });
    expect(meta.seen.tools).toEqual(['piqueta']);
    const got = claim(meta).map((a) => a.id);
    for (const id of ['primera', 'capataz', 'media', 'madre', 'golpe100', `j-${run.bosses[8]}`]) expect(got).toContain(id);
    expect(deckUnlocked(meta, 'ases')).toBe(true);
    expect(unlockedPool(meta)).toContain(`j-${run.bosses[8]}`);
    expect(claim(meta)).toEqual([]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const d of DECKS) if (d.unlock) expect(ACHIEVEMENTS.some((a) => a.id === d.unlock), d.id).toBe(true);
    for (const s of SPECIALS) if (s.locked) expect(ACHIEVEMENTS.some((a) => a.id === s.locked), s.id).toBe(true);
  });
});

describe('niveles de obra y maestría', () => {
  const at = (ascension: number, stage = 1) => Object.assign(newRun({ ascension }, 5), { stage });

  it('hay 8 niveles y cada uno añade un giro a los anteriores', () => {
    expect(ASCENSIONS.length).toBe(8);
    expect(MAX_ASCENSION).toBe(7);
    expect(newRun({ ascension: 99 }, 1).ascension).toBe(7);
    const base = stageConfig(at(0, 3));
    const harder = stageConfig(at(1, 3)).floorHp[13] / base.floorHp[13]; // 2 · hormigón armado: +5 % (con el redondeo a enteros)
    expect(harder).toBeGreaterThan(1.03);
    expect(harder).toBeLessThan(1.07);
    // 4 · vigas maestras: K apuntaladas, pero solo en las obras con jefe (la 5 lo es; la 4 no)
    expect(stageConfig(at(2, 5)).apuntalado).toBeUndefined();
    expect(stageConfig(at(3, 5)).apuntalado).toEqual([13]);
    expect(stageConfig(at(3, 4)).apuntalado).toBeUndefined();
    // 5 · sirena afinada: solo las K
    expect(stageConfig(at(3, 3)).floorThreat[13]).toBe(base.floorThreat[13]);
    expect(stageConfig(at(4, 3)).floorThreat[13]).toBe(base.floorThreat[13] + 1);
    expect(stageConfig(at(4, 3)).floorThreat[11]).toBe(base.floorThreat[11]);
    // 6 · búnker viejo: un punto menos de integridad
    expect(at(4).maxIntegrity - at(5).maxIntegrity).toBe(1);
    // 7 · turno de noche: J y Q, no las K
    expect(stageConfig(at(6, 3)).floorThreat[11]).toBe(base.floorThreat[11] + 1);
    expect(stageConfig(at(6, 3)).floorThreat[12]).toBe(base.floorThreat[12] + 1);
    expect(stageConfig(at(6, 3)).floorThreat[13]).toBe(base.floorThreat[13] + 1);
    // 8 · clausura: +1 de amenaza en todas las torres, solo en la obra 8 (ni en la 7 ni en las otras con jefe)
    for (const r of [11, 12, 13]) expect(stageConfig(at(7, 8)).floorThreat[r]).toBe(stageConfig(at(6, 8)).floorThreat[r] + 1);
    expect(stageConfig(at(7, 7)).floorThreat[11]).toBe(stageConfig(at(6, 7)).floorThreat[11]);
    expect(stageConfig(at(7, 3)).floorThreat[11]).toBe(stageConfig(at(6, 3)).floorThreat[11]);
    // ningún nivel alarga las obras con jefe más que el hormigón armado
    expect(stageConfig(at(7, 3)).floorHp[13]).toBe(stageConfig(at(1, 3)).floorHp[13]);
  });

  it('3 · precios de obra: la ferretería cuesta 2 más; al terminar una obra el búnker se repara 4', () => {
    const cheap = at(1);
    const dear = at(2);
    toShop(cheap);
    toShop(dear);
    expect(dear.shop.map((o) => o.cost)).toEqual(cheap.shop.map((o) => o.cost + 2));
    const healed = at(7);
    win(healed, (s) => (s.integrity = 10));
    expect(healed.integrity).toBe(14);
  });

  it('ganar estampa el sello de maestría en la baraja y en cada herramienta del cinturón', () => {
    const meta = newMeta();
    const run = Object.assign(newRun({ ascension: 3, deck: 'obra' }, 5), { stage: LAST_STAGE });
    run.tools = [{ id: 'prisma', n: 0 }, { id: 'calibre', n: 2 }];
    win(run);
    settle(meta, run);
    expect(meta.mastery).toEqual({ tools: { prisma: 4, calibre: 4 }, decks: { obra: 4 } });
    expect(meta.ascMax).toBe(4);
    // una victoria en un nivel más bajo no rebaja el sello
    const again = Object.assign(newRun({ ascension: 0 }, 6), { stage: LAST_STAGE });
    again.tools = [{ id: 'prisma', n: 0 }];
    win(again);
    settle(meta, again);
    expect(meta.mastery.tools.prisma).toBe(4);
    expect(loadMeta(JSON.parse(JSON.stringify(meta))).mastery).toEqual(meta.mastery);
    expect(loadMeta({ ascMax: 20 }).ascMax).toBe(7);
  });

  it('30 campañas del bot con semilla: mismas decisiones, mismo resultado, y nada se sale de sus límites', { timeout: 240_000 }, () => {
    for (let seed = 1; seed <= 30; seed++) {
      const a = botRun(newRun({ ascension: seed % 8 }, seed * 104729));
      const b = botRun(newRun({ ascension: seed % 8 }, seed * 104729));
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(a.gold).toBeGreaterThanOrEqual(0);
      expect(a.tools.length).toBeLessThanOrEqual(TOOL_SLOTS);
      expect(a.deck.length).toBeGreaterThanOrEqual(12);
      expect(new Set(a.deck.map((c) => c.id)).size).toBe(a.deck.length);
      expect(a.stats.stageTurns.length).toBeGreaterThan(0);
    }
  });
});
