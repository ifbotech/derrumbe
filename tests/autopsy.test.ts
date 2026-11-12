import { describe, expect, it } from 'vitest';
import { Autopsy, autopsy, omen } from '../src/rules/autopsy';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { Action, Card, Config, DEFAULT_CONFIG, GameEvent, GameState, MATERIAL, Suit, applyAction, createGame, currentPlayer, newTowers, viewFor } from '../src/rules/engine';
import { BOSS, Run, finishBattle, newRun, runAction, startStage, trackEvents } from '../src/rules/run';
import { TOOL } from '../src/rules/tools';

const card = (id: string, extra: Partial<Card> = {}): Card => (id[0] === 'X' ? { id, suit: 'X', rank: 0, ...extra } : { id, suit: id[0] as Suit, rank: Number(id.slice(1)), ...extra });
const cfgWith = (extra: Partial<Config> = {}): Config => ({ ...structuredClone(DEFAULT_CONFIG), ...extra });
/** Pisos que no caen: lo que se mide es lo que le pasa al búnker. */
const TOUGH = { 11: 900, 12: 900, 13: 900 };

/** Mesa de un jugador con la mano y la cima de la cantera que se pidan, y lo que se le añada. */
function table(config: Config, hand: Card[], top: Card[], tools: string[] = [], extra: Partial<GameState> = {}): GameState {
  for (const id of tools) TOOL[id].cfg?.(config);
  const s = createGame([{ id: 'a', name: 'A' }], 3, config);
  const taken = new Set([...hand, ...top].map((c) => c.id));
  s.deck = [...top, ...[...s.deck, ...s.players[0].hand].filter((c) => !taken.has(c.id))];
  s.players[0].hand = hand;
  s.towers = newTowers([11, 12, 13], config);
  s.tools = tools.map((id) => ({ id, n: 0 }));
  return { ...s, ...extra };
}
/** Juega la acción y devuelve el lote de eventos, que tiene que acabar en derrota. */
function lose(s: GameState, action: Action): { events: GameEvent[]; a: Autopsy } {
  const out = applyAction(s, 'a', action);
  expect(out.state.phase).toBe('lost');
  const a = autopsy(out.events, s.config);
  expect(a).not.toBeNull();
  return { events: out.events, a: a! };
}
const fits = (a: { title: string; detail: string }) => {
  expect(a.title.length, a.title).toBeLessThanOrEqual(90);
  expect(a.detail.length, a.detail).toBeLessThanOrEqual(110);
};

describe('autopsia de la derrota (contrato C1)', () => {
  it('sirena que supera muro + integridad: nombra la torre y da la cuenta entera', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 14, 12: 14, 13: 14 } });
    const s = table(cfg, [card('H2'), card('H3')], [card('S9')], [], { integrity: 9, wall: 3 });
    const { a } = lose(s, { type: 'discard', cards: ['H2'] });
    expect(a).toMatchObject({ kind: 'sirena', tower: 'S', before: 9, threat: 14, blocked: 3, taken: 11 });
    expect(a.title).toBe('Sirena de ACERO: amenaza 14 contra muro 3 → entran 11');
    // le quedaban 9 y entraron 11: con 3 puntos más de muro habría seguido en pie con 1
    expect(a.detail).toBe('Al búnker le quedaban 9. Faltaron 3 de muro (♣); un golpe limpio también la callaba.');
    fits(a);
  });

  it('sirena sin muro delante, y con la reparación del mismo golpe ya contada', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 9, 12: 9, 13: 9 } });
    // el 6♥ repara 2 antes de que suene la sirena: al búnker le quedaban 3 + 2
    const s = table(cfg, [card('H6'), card('H3')], [card('D4')], [], { integrity: 3, wall: 0 });
    const { a } = lose(s, { type: 'attack', cards: ['H6'], target: 'S' });
    expect(a).toMatchObject({ kind: 'sirena', tower: 'D', before: 5, threat: 9, blocked: 0, taken: 9 });
    expect(a.title).toBe(`Sirena de ${MATERIAL.D}: amenaza 9 y ningún muro → entran 9`);
    expect(a.detail).toContain('quedaban 5');
    expect(a.detail).toContain('Faltaron 5 de muro');
    fits(a);
  });

  it('doble sirena: el golpe final es la segunda y lo dice', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 4, 12: 4, 13: 4 }, sirenCount: 2 });
    const s = table(cfg, [card('H2'), card('H3')], [card('S9'), card('C9')], [], { integrity: 6, wall: 0 });
    const { a } = lose(s, { type: 'discard', cards: ['H2'] });
    expect(a).toMatchObject({ kind: 'sirena', tower: 'C', before: 2, threat: 4, taken: 4 });
    expect(a.detail).toContain('2.ª sirena del turno');
    expect(a.detail).toContain('quedaban 2');
    fits(a);
  });

  it('colapso de cantera: el muro no lo frena, dice cuánto quitó y que cada colapso quita 1 más', () => {
    const cfg = cfgWith({ floorHp: TOUGH });
    const s = table(cfg, [card('H2'), card('H3')], [], [], { integrity: 4, wall: 8 });
    // cantera vacía y escombrera llena: la sirena tiene que barajar, y eso es un colapso
    s.discard = s.deck;
    s.deck = [];
    const { a, events } = lose(s, { type: 'discard', cards: ['H2'] });
    const loss = events.find((e) => e.e === 'collapse');
    expect(loss && loss.e === 'collapse' ? loss.loss : 0).toBe(cfg.collapseLoss);
    expect(a).toMatchObject({ kind: 'colapso', before: 4, threat: cfg.collapseLoss, blocked: 0, taken: cfg.collapseLoss });
    expect(a.tower).toBeUndefined();
    expect(a.title).toBe(`Cantera agotada: el colapso quitó ${cfg.collapseLoss} y el muro no lo frena`);
    expect(a.detail).toContain('quedaban 4');
    expect(a.detail).toContain('Cada colapso quita 1 más');
    fits(a);
  });

  it('el segundo colapso de la obra quita 1 más, y la autopsia da ese número', () => {
    const cfg = cfgWith({ floorHp: TOUGH });
    const s = table(cfg, [card('H2'), card('H3')], [], [], { integrity: 6, collapses: 1 });
    s.discard = s.deck;
    s.deck = [];
    const { a } = lose(s, { type: 'discard', cards: ['H2'] });
    expect(a).toMatchObject({ kind: 'colapso', before: 6, taken: cfg.collapseLoss + 1 });
    expect(a.title).toContain(`quitó ${cfg.collapseLoss + 1}`);
  });

  it('herida propia: Corazón de la torre cobra su punto cuando el golpe no tira nada', () => {
    const cfg = cfgWith({ floorHp: TOUGH });
    const s = table(cfg, [card('S5'), card('H3')], [card('X1')], ['corazon'], { integrity: 1, wall: 8 });
    const { a } = lose(s, { type: 'attack', cards: ['S5'], target: 'D' });
    expect(a).toMatchObject({ kind: 'herida', before: 1, threat: 1, blocked: 0, taken: 1 });
    expect(a.title).toBe('Corazón de la torre: tu propio golpe le costó 1 al búnker');
    expect(a.detail).toContain('quedaba 1.');
    expect(a.detail).toContain('El muro no frena');
    fits(a);
  });

  it('herida propia: el suelo inestable del Topo y la Nitroglicerina salen con su nombre', () => {
    const topo = cfgWith({ floorHp: { 11: 20, 12: 30, 13: 40 } });
    BOSS.inestable.apply(topo);
    // pareja de dieces sin corazones (nada repara): tira la J de vidrio con daño de sobra, no es limpio y el suelo cobra 1
    const s = table(topo, [card('C10'), card('S10'), card('D3')], [card('X1')], [], { integrity: 1 });
    const out = applyAction(s, 'a', { type: 'attack', cards: ['C10', 'S10'], target: 'D' });
    expect(out.events.some((e) => e.e === 'floorDown' && !e.clean)).toBe(true);
    expect(out.state.phase).toBe('lost');
    const a = autopsy(out.events, topo)!;
    expect(a).toMatchObject({ kind: 'herida', before: 1, taken: 1 });
    expect(a.title).toBe('Suelo inestable: tu propio golpe le costó 1 al búnker');
    fits(a);

    const nitro: Card = { id: 'sp-nitro-9', suit: 'X', rank: 0, sp: 'nitro' };
    const t = table(cfgWith({ floorHp: TOUGH }), [card('S5'), nitro, card('D3')], [card('X1')], [], { integrity: 2 });
    const b = lose(t, { type: 'attack', cards: ['S5', nitro.id], target: 'D' }).a;
    expect(b).toMatchObject({ kind: 'herida', before: 2, taken: 2 });
    expect(b.title).toBe('Nitroglicerina: tu propio golpe le costó 2 al búnker');
    fits(b);
  });

  it('sin cartas: ni mano, ni cantera, ni escombrera', () => {
    const s = table(cfgWith({ floorHp: TOUGH }), [], [], [], { integrity: 7 });
    s.exhausted = s.deck;
    s.deck = [];
    const { a } = lose(s, { type: 'pass' });
    expect(a).toMatchObject({ kind: 'sin_cartas', before: 7, threat: 0, blocked: 0, taken: 0 });
    expect(a.title).toMatch(/^Sin cartas/);
    expect(a.detail).toContain('quedaban 7');
    fits(a);
  });

  it('no hay autopsia si la jugada no acaba en derrota', () => {
    const s = table(cfgWith({ floorHp: TOUGH }), [card('H2'), card('H3')], [card('X1')]);
    const alive = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    expect(alive.state.phase).toBe('playing');
    expect(autopsy(alive.events, s.config)).toBeNull();
    expect(autopsy([{ e: 'end', result: 'won' }], s.config)).toBeNull();
    expect(autopsy([], s.config)).toBeNull();
  });

  it('un lote sin la integridad de partida (eventos antiguos) sigue dando una autopsia coherente', () => {
    const a = autopsy(
      [
        { e: 'siren', card: null, tower: 'H', threat: 7, blocked: 2, taken: 5, integrity: 0, wall: 0, reason: 'strike' },
        { e: 'end', result: 'lost' },
      ],
      cfgWith(),
    )!;
    expect(a).toMatchObject({ kind: 'sirena', tower: 'H', threat: 7, blocked: 2, taken: 5 });
    expect(a.before).toBeGreaterThan(0);
    expect(a.before).toBeLessThanOrEqual(5);
    fits(a);
  });

  it('la campaña la guarda en run.death al perder y la limpia al empezar otra obra', () => {
    const P = [{ id: 'a', name: 'A' }];
    const run: Run = newRun({}, 77);
    expect(runAction(run, { t: 'begin' })).toBeNull();
    expect(runAction(run, { t: 'route', i: 0 })).toBeNull();
    let state = startStage(run, P);
    expect(run.death).toBeNull();
    state.integrity = 1; // un búnker que no aguanta la primera sirena que entre
    state.wall = 0;
    for (let guard = 0; state.phase === 'playing' && guard < 400; guard++) {
      // solo descartes: la obra no avanza y la sirena acaba entrando
      const p = currentPlayer(state);
      const spare = [...p.hand, ...p.reserve][0];
      const res = applyAction(state, p.id, spare ? { type: 'discard', cards: [spare.id] } : { type: 'pass' });
      trackEvents(run, res.events);
      state = res.state;
    }
    expect(state.phase).toBe('lost');
    expect(run.death).toBeTruthy();
    expect(['sirena', 'colapso', 'sin_cartas']).toContain(run.death!.kind);
    fits(run.death!);
    finishBattle(run, state);
    expect(run.phase).toBe('lost');
    expect(run.death).toBeTruthy(); // sigue ahí para la pantalla de derrota
    // otra campaña con el mismo objeto: al empezar obra se limpia
    run.phase = 'battle';
    startStage(run, P);
    expect(run.death).toBeNull();
  });

  it('en campañas enteras del bot, toda derrota tiene autopsia y sus números cuadran', () => {
    const P = [{ id: 'a', name: 'A' }];
    const kinds = new Set<string>();
    let lost = 0;
    for (let seed = 1; seed <= 14; seed++) {
      const run = newRun({ ascension: 7 }, seed * 31);
      for (let guard = 0; guard < 5000 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
        if (run.phase !== 'battle') {
          expect(runAction(run, chooseRunAction(run)!)).toBeNull();
          continue;
        }
        let state = startStage(run, P);
        while (state.phase === 'playing') {
          const prev = state;
          const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
          trackEvents(run, res.events);
          state = res.state;
          if (state.phase !== 'lost') {
            expect(autopsy(res.events, state.config)).toBeNull();
            continue;
          }
          const a = autopsy(res.events, state.config)!;
          expect(a).toBeTruthy();
          expect(run.death).toEqual(a);
          fits(a);
          kinds.add(a.kind);
          lost++;
          // lo que quedaba es positivo, cabe en el búnker y no aguanta lo que entró
          expect(a.before).toBeGreaterThan(0);
          expect(a.before).toBeLessThanOrEqual(prev.config.maxIntegrity);
          if (a.kind !== 'sin_cartas') {
            expect(a.taken).toBe(a.threat - a.blocked);
            expect(a.taken).toBeGreaterThanOrEqual(a.before);
          }
          if (a.kind === 'sirena') expect(a.title).toContain(MATERIAL[a.tower!]);
        }
        finishBattle(run, state);
      }
    }
    expect(lost).toBeGreaterThan(5);
    expect(kinds.has('sirena')).toBe(true);
  });
});

describe('aviso de último turno', () => {
  const view = (s: GameState) => viewFor(s, 'a');

  it('calla cuando el búnker aguanta cualquier sirena', () => {
    const s = table(cfgWith({ floorHp: TOUGH }), [card('H2')], [card('S9')], [], { integrity: 20, wall: 0 });
    expect(omen(view(s))).toBeNull();
  });

  it('avisa cuando una sola sirena posible iguala integridad + muro, con la torre y su amenaza', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 6, 12: 6, 13: 6 } });
    const s = table(cfg, [card('H2')], [card('S9')], [], { integrity: 4, wall: 2 });
    const o = omen(view(s))!;
    expect(o.kind).toBe('sirena');
    expect(o.title).toMatch(/^Último turno: la sirena de (ACERO|VIDRIO|LADRILLO|HORMIGÓN) \(6\) puede tirar el búnker$/);
    expect(o.detail).toContain('Te quedan 4 y 2 de muro');
    fits(o);
    // un punto más de muro y ya no es el último turno
    expect(omen(view({ ...s, wall: 3 }))).toBeNull();
  });

  it('cuenta la fatiga de cimientos y no cuenta las torres desarmadas, caídas o sin cartas de su palo por salir', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 3, 12: 3, 13: 3 } });
    const s = table(cfg, [card('H2')], [card('S9')], [], { integrity: 5, wall: 0 });
    expect(omen(view(s))).toBeNull();
    expect(omen(view({ ...s, fatigue: 2 }))?.title).toContain('(5)');
    // con todo desarmado no hay sirena que temer
    const calm = structuredClone({ ...s, fatigue: 2 });
    for (const t of Object.values(calm.towers)) t.disarmed = true;
    expect(omen(view(calm))).toBeNull();
    // solo queda armada la torre de ladrillo, pero ya no quedan ♥ por salir: tampoco
    const noHearts = structuredClone({ ...s, fatigue: 2 });
    for (const t of Object.values(noHearts.towers)) t.disarmed = t.suit !== 'H';
    noHearts.deck = noHearts.deck.filter((c) => c.suit !== 'H');
    expect(omen(view(noHearts))).toBeNull();
  });

  it('avisa del colapso cuando a la cantera le quedan 2 cartas o menos y el siguiente tira el búnker', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 1, 12: 1, 13: 1 } });
    const s = table(cfg, [card('H2')], [], [], { integrity: 5, wall: 8 });
    s.discard = s.deck.slice(2);
    s.deck = s.deck.slice(0, 2);
    const o = omen(view(s))!;
    expect(o.kind).toBe('colapso');
    expect(o.title).toBe(`Último turno: quedan 2 cartas en la cantera y el colapso quita ${cfg.collapseLoss}`);
    expect(o.detail).toContain('el muro no frena un colapso');
    fits(o);
    // con 3 cartas en la cantera, o con un punto más de búnker, todavía no
    expect(omen(view({ ...s, deck: [...s.deck, card('S2')] }))).toBeNull();
    expect(omen(view({ ...s, integrity: 6 }))).toBeNull();
    // los Puntales lo abaratan: mismo búnker, sin aviso
    const braced = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 1, 12: 1, 13: 1 } });
    TOOL.puntales.cfg!(braced);
    expect(omen(view({ ...s, config: braced }))).toBeNull();
  });

  it('con la partida terminada no avisa de nada', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 9, 12: 9, 13: 9 } });
    const s = table(cfg, [card('H2')], [card('S9')], [], { integrity: 1, phase: 'lost' });
    expect(omen(view(s))).toBeNull();
  });
});

describe('avisos de herramienta que dispara (contrato C2)', () => {
  const steps = (events: GameEvent[], id: string) => events.filter((e): e is Extract<GameEvent, { e: 'step' }> => e.e === 'step' && e.id === id);

  it('Ariete marca la Fuerza que suma, y solo cuando suma', () => {
    const cfg = cfgWith({ floorHp: TOUGH });
    const s = table(cfg, [card('S5'), card('H3')], [card('X1')], ['ariete'], { wall: 5 });
    const [st] = steps(applyAction(s, 'a', { type: 'attack', cards: ['S5'], target: 'D' }).events, 'ariete');
    expect(st.df).toBe(20);
    expect(st.proc).toEqual({ what: 'fuerza', n: 20 });
    const dry = table(cfgWith({ floorHp: TOUGH }), [card('S5'), card('H3')], [card('X1')], ['ariete'], { wall: 0 });
    expect(steps(applyAction(dry, 'a', { type: 'attack', cards: ['S5'], target: 'D' }).events, 'ariete')).toHaveLength(0);
  });

  it('el Diapasón que copia al Ariete también lo anuncia; una herramienta callada no', () => {
    const s = table(cfgWith({ floorHp: TOUGH }), [card('S5'), card('H3')], [card('X1')], ['piqueta', 'diapason', 'ariete'], { wall: 2 });
    const events = applyAction(s, 'a', { type: 'attack', cards: ['S5'], target: 'D' }).events;
    expect(steps(events, 'diapason')[0].proc).toEqual({ what: 'fuerza', n: 8 });
    expect(steps(events, 'ariete')[0].proc).toEqual({ what: 'fuerza', n: 8 });
    expect(steps(events, 'piqueta')[0].proc).toBeUndefined();
  });

  it('Contragolpe marca el daño devuelto y su torre, con la cuenta en el texto de mesa', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 4, 12: 4, 13: 4 } });
    const s = table(cfg, [card('H2'), card('H3')], [card('S9')], ['contragolpe'], { wall: 6 });
    const out = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    const [st] = steps(out.events, 'contragolpe');
    expect(st.proc).toEqual({ what: 'dano', n: 12, tower: 'S' });
    expect(st.label).toBe('Contragolpe: 3 × 4 frenado = 12 a ACERO');
    expect(out.state.towers.S.damage).toBe(12);
  });

  it('Rebosadero marca lo que repara con el muro que no cabe y la Fuerza que carga, con la cuenta en el texto', () => {
    const cfg = cfgWith({ floorHp: TOUGH });
    const s = table(cfg, [card('C8'), card('C9'), card('C10')], [card('X1')], ['rebosadero'], { wall: cfg.wallCap - 1, integrity: cfg.maxIntegrity - 1 });
    // escalera de tréboles (27): muro +9; cabe 1 y no caben 8 → repara 4; cabe 1 y no caben 3 → +9 de Fuerza cargada
    const st = steps(applyAction(s, 'a', { type: 'attack', cards: ['C8', 'C9', 'C10'], target: 'S' }).events, 'rebosadero');
    expect(st.map((x) => x.proc)).toEqual([
      { what: 'repara', n: 4 },
      { what: 'carga', n: 9 },
    ]);
    expect(st.map((x) => x.label)).toEqual(['Rebosadero: 8 de muro que no cabe ÷ 2 = repara 4', 'Rebosadero: 3 de reparación que no cabe × 3 = +9 de Fuerza cargada']);
  });

  it('Megáfono (cualquier gancho que pega) también lleva su aviso', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 4, 12: 4, 13: 4 } });
    const s = table(cfg, [card('H2'), card('H3')], [card('S9')], ['megafono'], { wall: 0 });
    const [st] = steps(applyAction(s, 'a', { type: 'discard', cards: ['H2'] }).events, 'megafono');
    expect(st.proc).toEqual({ what: 'dano', n: 8, tower: 'S' });
    expect(st.label).toBe('Megáfono: 8 a ACERO');
  });
});
