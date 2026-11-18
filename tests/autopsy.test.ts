import { describe, expect, it } from 'vitest';
import { Autopsy, autopsy, omen } from '../src/rules/autopsy';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { Action, Card, Config, DEFAULT_CONFIG, GameEvent, GameState, MATERIAL, Suit, applyAction, createGame, currentPlayer, newTowers, threatOf, viewFor } from '../src/rules/engine';
import { BOSS, Run, finishBattle, newRun, runAction, startStage, trackEvents } from '../src/rules/run';
import { SPECIAL } from '../src/rules/specials';
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
    expect(a.title).toBe('Contraataque de PICAS: Ataque 14 contra Escudo 3 → entran 11');
    // le quedaban 9 y entraron 11: con 3 puntos más de Escudo habría seguido en pie con 1
    expect(a.detail).toBe('Te quedaban 9 de Vida. Faltaron 3 de Escudo (♣); un Golpe exacto también lo paraba.');
    fits(a);
  });

  it('sirena sin muro delante, y con la reparación del mismo golpe ya contada', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 9, 12: 9, 13: 9 } });
    // el 6♥ repara 2 antes de que suene la sirena: al búnker le quedaban 3 + 2
    const s = table(cfg, [card('H6'), card('H3')], [card('D4')], [], { integrity: 3, wall: 0 });
    const { a } = lose(s, { type: 'attack', cards: ['H6'], target: 'S' });
    expect(a).toMatchObject({ kind: 'sirena', tower: 'S', before: 5, threat: 9, blocked: 0, taken: 9 });
    expect(a.title).toBe(`Contraataque de ${MATERIAL.S}: Ataque 9 y ningún Escudo → entran 9`);
    expect(a.detail).toContain('quedaban 5');
    expect(a.detail).toContain('Faltaron 5 de Escudo');
    fits(a);
  });

  it('doble sirena: el golpe final es la segunda y lo dice', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 4, 12: 4, 13: 4 }, sirenCount: 2 });
    const s = table(cfg, [card('H2'), card('H3')], [card('S9'), card('C9')], [], { integrity: 6, wall: 0 });
    const { a } = lose(s, { type: 'discard', cards: ['H2'] });
    expect(a).toMatchObject({ kind: 'sirena', tower: 'S', before: 2, threat: 4, taken: 4 });
    expect(a.detail).toContain('2.º Contraataque del turno');
    expect(a.detail).toContain('quedaban 2');
    fits(a);
  });

  it('V35 · el Mazo agotado no quita Vida ni mata: baraja el Descarte y sube la Furia', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 1, 12: 1, 13: 1 } });
    const s = table(cfg, [card('H2'), card('H3')], [], [], { integrity: 1, wall: 8 });
    // Mazo vacío y Descarte lleno: el Contraataque tiene que barajar
    s.discard = s.deck;
    s.deck = [];
    const out = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    const ev = out.events.find((e) => e.e === 'collapse');
    expect(ev).toMatchObject({ e: 'collapse', sube: cfg.collapseSiege, asedio: cfg.collapseSiege });
    expect(out.events.some((e) => e.e === 'fatigue' && e.level === cfg.collapseSiege)).toBe(true);
    expect(out.state.collapses).toBe(1);
    expect(out.state.fatigue).toBe(cfg.collapseSiege);
    // con 1 de Vida y 8 de Escudo, el barajado no le quita nada: sigue en pie
    expect(out.state.integrity).toBe(1);
    expect(out.state.phase).toBe('playing');
  });

  it('V35 · la causa de la derrota dice cuánto del Ataque era Furia', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 6, 12: 6, 13: 6 } });
    // dos Mazos agotados en este asalto: la Furia va por 2
    const s = table(cfg, [card('H2'), card('H3')], [card('D9')], [], { integrity: 5, wall: 2, collapses: 2, fatigue: 2 * cfg.collapseSiege });
    const furia = 2 * cfg.collapseSiege;
    const { a, events } = lose(s, { type: 'discard', cards: ['H2'] });
    const golpe = events.find((e) => e.e === 'siren')!;
    expect(golpe).toMatchObject({ tower: 'S', asedio: furia, threat: 6 + furia });
    expect(a.kind).toBe('sirena');
    expect(a.title).toBe(`Contraataque de PICAS: Ataque ${6 + furia} contra Escudo 2 → entran ${4 + furia}`);
    expect(a.detail).toContain('Te quedaban 5 de Vida');
    expect(a.detail).toContain(`${furia} del Ataque eran de Furia`);
    fits(a);
    // el caso más largo que puede salir (palo de nueve letras y cifras de tres) sigue entrando en sus dos líneas
    fits({ title: 'Contraataque de DIAMANTES: Ataque 148 contra Escudo 12 → entran 136', detail: 'Te quedaban 21 de Vida. 120 del Ataque eran de Furia. Faltaron 116 de Escudo (♣) o un Golpe exacto.' });
  });

  it('V30 · sin Furia, la causa es la de siempre', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 6, 12: 6, 13: 6 } });
    const s = table(cfg, [card('H2')], [card('S9')], [], { integrity: 3, wall: 1 });
    const { a, events } = lose(s, { type: 'discard', cards: ['H2'] });
    const golpe = events.find((e) => e.e === 'siren')!;
    expect(golpe.e === 'siren' && golpe.asedio).toBeUndefined();
    expect(a.title).toBe('Contraataque de PICAS: Ataque 6 contra Escudo 1 → entran 5');
    expect(a.detail).not.toContain('Furia');
  });

  it('V35 · tras un Mazo agotado sigue contraatacando el enemigo activo, y desde el turno siguiente con la Furia sumada', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 1, 12: 3, 13: 5 } });
    const s = table(cfg, [card('H2'), card('H3')], [], [], { integrity: 20, wall: 2 });
    // el trono más fuerte ya no pinta nada: contraataca la Casa que tienes delante (PICAS, con su Sota)
    s.towers.C.floors = [13];
    s.discard = s.deck;
    s.deck = [];
    const out = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    const golpe = out.events.find((e) => e.e === 'siren')!;
    // este Contraataque llega antes de robar (y de barajar): Ataque 1, sin Furia todavía
    expect(golpe).toMatchObject({ e: 'siren', reason: 'strike', tower: 'S', threat: 1, blocked: 1 });
    expect(out.state.integrity).toBe(20);
    expect(out.state.fatigue).toBe(cfg.collapseSiege);
    const otra = applyAction(out.state, 'a', { type: 'discard', cards: ['H3'] });
    const segundo = otra.events.find((e) => e.e === 'siren')!;
    expect(segundo).toMatchObject({ tower: 'S', threat: 1 + cfg.collapseSiege, asedio: cfg.collapseSiege });
  });

  it('V35 · con la Baraja de reserva, el primer Mazo agotado del asalto no sube la Furia', () => {
    const cfg = cfgWith({ floorHp: TOUGH });
    const s = table(cfg, [card('H2'), card('H3')], [], ['puntales'], { integrity: 20 });
    s.discard = s.deck;
    s.deck = [];
    const out = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    expect(out.events.find((e) => e.e === 'collapse')).toMatchObject({ sube: 0, asedio: 0 });
    expect(out.state.fatigue ?? 0).toBe(0);
    expect(out.state.collapses).toBe(1);
  });

  it('V27 · cada Mazo agotado del asalto sube otro nivel, y el Ataque de los tronos sube con él', () => {
    const cfg = cfgWith({ floorHp: TOUGH });
    const s = table(cfg, [card('H2'), card('H3')], [], [], { integrity: 20, collapses: 1 });
    s.fatigue = cfg.collapseSiege;
    const antes = threatOf(s, s.towers.S);
    s.discard = s.deck;
    s.deck = [];
    const out = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    expect(out.state.collapses).toBe(2);
    expect(out.state.fatigue).toBe(2 * cfg.collapseSiege);
    expect(threatOf(out.state, out.state.towers.S)).toBe(antes + cfg.collapseSiege);
  });

  it('herida propia: Corazón de la torre cobra su punto cuando el golpe no tira nada', () => {
    const cfg = cfgWith({ floorHp: TOUGH, orden: ['D', 'S', 'H', 'C'] });
    const s = table(cfg, [card('S5'), card('H3')], [card('X1')], ['corazon'], { integrity: 1, wall: 8 });
    const { a } = lose(s, { type: 'attack', cards: ['S5'], target: 'D' });
    expect(a).toMatchObject({ kind: 'herida', before: 1, threat: 1, blocked: 0, taken: 1 });
    expect(a.title).toBe(`${TOOL.corazon.name}: tu propio golpe te costó 1 de Vida`);
    expect(a.detail).toContain('quedaba 1 de Vida.');
    expect(a.detail).toContain('El Escudo no frena');
    fits(a);
  });

  it('herida propia: el suelo inestable del Topo y la Nitroglicerina salen con su nombre', () => {
    const topo = cfgWith({ floorHp: { 11: 20, 12: 30, 13: 40 }, orden: ['D', 'S', 'H', 'C'] });
    BOSS.inestable.apply(topo);
    // pareja de dieces sin corazones (nada repara): tira la J de vidrio con daño de sobra, no es limpio y el suelo cobra 1
    const s = table(topo, [card('C10'), card('S10'), card('D3')], [card('X1')], [], { integrity: 1 });
    const out = applyAction(s, 'a', { type: 'attack', cards: ['C10', 'S10'], target: 'D' });
    expect(out.events.some((e) => e.e === 'floorDown' && !e.clean)).toBe(true);
    expect(out.state.phase).toBe('lost');
    const a = autopsy(out.events, topo)!;
    expect(a).toMatchObject({ kind: 'herida', before: 1, taken: 1 });
    expect(a.title).toBe(`${BOSS.inestable.name}: tu propio golpe te costó 1 de Vida`);
    fits(a);

    const nitro: Card = { id: 'sp-nitro-9', suit: 'X', rank: 0, sp: 'nitro' };
    const t = table(cfgWith({ floorHp: TOUGH, orden: ['D', 'S', 'H', 'C'] }), [card('S5'), nitro, card('D3')], [card('X1')], [], { integrity: 2 });
    const b = lose(t, { type: 'attack', cards: ['S5', nitro.id], target: 'D' }).a;
    expect(b).toMatchObject({ kind: 'herida', before: 2, taken: 2 });
    expect(b.title).toBe(`${SPECIAL.nitro.name}: tu propio golpe te costó 2 de Vida`);
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
        { e: 'siren', tower: 'H', threat: 7, blocked: 2, taken: 5, integrity: 0, wall: 0, reason: 'strike' },
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
    expect(o.title).toMatch(/^Último turno: el Contraataque de (PICAS|DIAMANTES|CORAZONES|TRÉBOLES) \(⚔ 6\) puede acabar contigo$/);
    expect(o.detail).toContain('Te quedan 4 de Vida y 2 de Escudo');
    // las cifras también van en campos propios (el aviso de un renglón del móvil las lee de ahí)
    expect(o).toMatchObject({ threat: 6, shield: 2, life: 4 });
    expect(o.title).toContain(MATERIAL[o.tower!]);
    fits(o);
    // un punto más de muro y ya no es el último turno
    expect(omen(view({ ...s, wall: 3 }))).toBeNull();
  });

  it('cuenta la fatiga de cimientos y no cuenta los tronos Aturdidos, caídos o sin cartas de su palo por salir', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 3, 12: 3, 13: 3 } });
    const s = table(cfg, [card('H2')], [card('S9')], [], { integrity: 5, wall: 0 });
    expect(omen(view(s))).toBeNull();
    expect(omen(view({ ...s, fatigue: 2 }))?.title).toContain('(⚔ 5)');
    // con todo Aturdido no hay sirena que temer
    const calm = structuredClone({ ...s, fatigue: 2 });
    for (const t of Object.values(calm.towers)) t.fx.sobrecarga = true;
    expect(omen(view(calm))).toBeNull();
    // solo queda armada la torre de ladrillo, pero ya no quedan ♥ por salir: tampoco
    const noHearts = structuredClone({ ...s, fatigue: 2 });
    for (const t of Object.values(noHearts.towers)) t.fx.sobrecarga = t.suit !== 'H';
    noHearts.deck = noHearts.deck.filter((c) => c.suit !== 'H');
    expect(omen(view(noHearts))).toBeNull();
  });

  it('V35 · con el Mazo vacío, el aviso cuenta el Ataque de ahora: la Furia de barajar llega al turno siguiente', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 5, 12: 5, 13: 5 } });
    // 4 de Vida y 2 de Escudo: un Ataque de 5 se aguanta, y el próximo Contraataque llega antes de barajar
    const s = table(cfg, [card('H2')], [card('S9')], [], { integrity: 4, wall: 2 });
    expect(omen(view(s))).toBeNull();
    expect(omen(view({ ...s, discard: s.deck, deck: [] }))).toBeNull();
    // con la Furia ya subida (un Mazo agotado antes), el Ataque es 6 y sí avisa; el que avisa es el enemigo activo
    const o = omen(view({ ...s, collapses: 1, fatigue: cfg.collapseSiege }))!;
    expect(o.kind).toBe('sirena');
    expect(o).toMatchObject({ threat: 5 + cfg.collapseSiege, shield: 2, life: 4, tower: 'S' });
    fits(o);
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
    const cfg = cfgWith({ floorHp: TOUGH, orden: ['D', 'S', 'H', 'C'] });
    const s = table(cfg, [card('S5'), card('H3')], [card('X1')], ['ariete'], { wall: 5 });
    const [st] = steps(applyAction(s, 'a', { type: 'attack', cards: ['S5'], target: 'D' }).events, 'ariete');
    expect(st.df).toBe(20);
    expect(st.proc).toEqual({ what: 'fuerza', n: 20 });
    const dry = table(cfgWith({ floorHp: TOUGH, orden: ['D', 'S', 'H', 'C'] }), [card('S5'), card('H3')], [card('X1')], ['ariete'], { wall: 0 });
    expect(steps(applyAction(dry, 'a', { type: 'attack', cards: ['S5'], target: 'D' }).events, 'ariete')).toHaveLength(0);
  });

  it('el Diapasón que copia al Ariete también lo anuncia; una herramienta callada no', () => {
    const s = table(cfgWith({ floorHp: TOUGH, orden: ['D', 'S', 'H', 'C'] }), [card('S5'), card('H3')], [card('X1')], ['piqueta', 'diapason', 'ariete'], { wall: 2 });
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
    expect(st.label).toBe('Rodela de púas: 3 × 4 frenado = 12 a PICAS');
    expect(out.state.towers.S.damage).toBe(12);
  });

  it('Rebosadero marca lo que repara con el muro que no cabe y la Fuerza que carga, con la cuenta en el texto', () => {
    const cfg = cfgWith({ floorHp: TOUGH });
    const s = table(cfg, [card('C8'), card('C9'), card('C10')], [card('X1')], ['rebosadero'], { wall: cfg.wallCap - 1, integrity: cfg.maxIntegrity - 1 });
    // escalera de tréboles: tres ♣ dan +6 de Escudo; cabe 1 y no caben 5 → cura 2; cabe 1 y no cabe 1 → +3 de Daño cargado
    const st = steps(applyAction(s, 'a', { type: 'attack', cards: ['C8', 'C9', 'C10'], target: 'S' }).events, 'rebosadero');
    expect(st.map((x) => x.proc)).toEqual([
      { what: 'repara', n: 2 },
      { what: 'carga', n: 3 },
    ]);
    expect(st.map((x) => x.label)).toEqual(['Copa rebosante: 5 de Escudo que no cabe ÷ 2 = cura 2', 'Copa rebosante: 1 de curación que no cabe × 3 = +3 de Daño cargado']);
  });

  it('Megáfono (cualquier gancho que pega) también lleva su aviso', () => {
    const cfg = cfgWith({ floorHp: TOUGH, floorThreat: { 11: 4, 12: 4, 13: 4 } });
    const s = table(cfg, [card('H2'), card('H3')], [card('S9')], ['megafono'], { wall: 0 });
    const [st] = steps(applyAction(s, 'a', { type: 'discard', cards: ['H2'] }).events, 'megafono');
    expect(st.proc).toEqual({ what: 'dano', n: 8, tower: 'S' });
    expect(st.label).toBe('Rosa de espinas: 8 a PICAS');
  });
});
