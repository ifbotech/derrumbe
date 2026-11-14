// V9 · El cooperativo a prueba de cortes: clientes `ws` de verdad contra el servidor arrancado aquí mismo en
// un puerto libre, con el bot casi sin espera y la semilla de las salas fija. Cada cliente juega con una
// política sembrada sobre su propia vista (PlayerView): el bot de referencia sobre lo que ese asiento ve, y
// de vez en cuando una carta al azar. Se espera a mensajes, nunca a relojes.
import { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import type { Action, GameState, PlayerView } from '../src/rules/engine';
import type { Run } from '../src/rules/run';
import { stateHash, tableHash } from '../src/rules/state-hash';
import { DEFAULT_NAME, RunningServer, startServer } from '../src/server/index';
import type { ClientMsg, LobbyInfo, ServerMsg } from '../src/shared/protocol';

const SEED = 9_090;
const WAIT_MS = 4000;
let server: RunningServer;
const open = new Set<Client>();

beforeAll(async () => {
  server = await startServer({ port: 0, botDelayMs: 20, seed: SEED, quiet: true });
});
afterAll(async () => {
  for (const c of open) c.ws.terminate();
  await server?.close();
});

/** Azar sembrado (mulberry32) para la política de cada cliente y para los cortes. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** La mesa tal como la ve un asiento, con forma de GameState para el bot (las manos ajenas, vacías). */
function asState(v: PlayerView): GameState {
  const players = v.players.map((p) => ({ id: p.id, name: p.name, hand: p.id === v.you ? v.hand : [], reserve: p.id === v.you ? v.reserve : [] }));
  return { ...v, players, turn: v.players.findIndex((p) => p.id === v.turnPlayer), deck: [], undo: null } as unknown as GameState;
}

class Client {
  ws: WebSocket;
  inbox: ServerMsg[] = [];
  private waiters: { pred: (m: ServerMsg) => boolean; done: (m: ServerMsg) => void; from: number }[] = [];
  id = '';
  token = '';
  room = '';
  view: PlayerView | null = null;
  run: Run | null = null;
  lobby: LobbyInfo | null = null;
  /** tableHash de cada estado recibido, en orden. */
  tables: string[] = [];
  /** Estados cuyo resumen no cuadró con el que mandó el servidor. */
  badHash = 0;
  pings: { player: string; target: string }[] = [];
  /** Juega solo cuando le toca. */
  auto = false;
  /** Si se pone, se llama en vez de jugar (para cortar a mitad de turno). */
  onTurn: ((c: Client) => boolean) | null = null;
  private pick: () => number;
  private acted = '';
  private fallback = 0;

  constructor(port: number, seed: number, private wild = 0.15) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    this.pick = rng(seed);
    open.add(this);
    this.ws.on('message', (raw) => this.receive(JSON.parse(raw.toString()) as ServerMsg));
    this.ws.on('close', () => open.delete(this));
  }
  ready(): Promise<void> {
    return new Promise((done, fail) => {
      if (this.ws.readyState === WebSocket.OPEN) return done();
      this.ws.once('open', () => done());
      this.ws.once('error', fail);
    });
  }
  send(msg: ClientMsg): void {
    this.ws.send(JSON.stringify(msg));
  }
  /** Espera al primer mensaje (desde `from`) que cumpla `pred`. */
  next(pred: (m: ServerMsg) => boolean, what = 'mensaje', from = 0): Promise<ServerMsg> {
    const seen = this.inbox.slice(from).find(pred);
    if (seen) return Promise.resolve(seen);
    return new Promise((done, fail) => {
      const timer = setTimeout(() => fail(new Error(`sin ${what} en ${WAIT_MS} ms`)), WAIT_MS);
      this.waiters.push({ pred, from, done: (m) => (clearTimeout(timer), done(m)) });
    });
  }
  ended(): Promise<ServerMsg> {
    return this.next((m) => m.t === 'state' && m.view.phase !== 'playing', 'fin de la partida');
  }
  close(): Promise<void> {
    return new Promise((done) => {
      if (this.ws.readyState === WebSocket.CLOSED) return done();
      this.ws.once('close', () => done());
      this.ws.close();
    });
  }

  private receive(m: ServerMsg): void {
    this.inbox.push(m);
    if (m.t === 'joined') Object.assign(this, { id: m.playerId, token: m.token, room: m.room });
    if (m.t === 'lobby') this.lobby = m.lobby;
    if (m.t === 'run') this.run = m.run;
    if (m.t === 'ping') this.pings.push({ player: m.player, target: m.target });
    if (m.t === 'state') {
      if (stateHash(m.view) !== m.hash) this.badHash++;
      this.view = m.view;
      this.tables.push(tableHash(m.view));
      this.fallback = 0;
      this.play();
    }
    if (m.t === 'error' && this.auto && this.view?.phase === 'playing' && this.view.turnPlayer === this.id && this.fallback < 8) {
      // la jugada no valía: una que siempre vale (descartar una carta, o pasar con la mano vacía)
      this.fallback++;
      const v = this.view;
      const held = [...v.hand, ...v.reserve];
      this.send({ t: 'action', action: held.length ? { type: 'discard', cards: [held[this.fallback % held.length].id] } : { type: 'pass' } });
    }
    for (const w of [...this.waiters]) {
      if (this.inbox.length - 1 >= w.from && w.pred(m)) {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        w.done(m);
      }
    }
  }

  private play(): void {
    const v = this.view;
    if (!this.auto || !v || v.phase !== 'playing' || v.turnPlayer !== this.id) return;
    const key = `${v.turnCount}:${v.hand.length}:${v.reserve.length}:${v.stashed}`;
    if (key === this.acted) return;
    this.acted = key;
    if (this.onTurn?.(this)) return;
    this.send({ t: 'action', action: this.choose(v) });
  }

  private choose(v: PlayerView): Action {
    const held = [...v.hand, ...v.reserve];
    if (!held.length) return { type: 'pass' };
    if (this.pick() < this.wild) {
      const plain = held.filter((c) => c.suit !== 'X' && !c.sp);
      const targets = (['S', 'D', 'H', 'C'] as const).filter((s) => v.towers[s].floors.length > 0);
      if (plain.length && targets.length) return { type: 'attack', cards: [plain[Math.floor(this.pick() * plain.length)].id], target: targets[Math.floor(this.pick() * targets.length)] };
    }
    const a = chooseAction(asState(v));
    return a.type === 'undo' ? { type: 'pass' } : a;
  }
}

async function connect(seed: number, wild?: number): Promise<Client> {
  const c = new Client(server.port, seed, wild);
  await c.ready();
  return c;
}

/** Una sala de n: el primero la crea; el segundo entra sin nombre (V8-4: recibe el de la conjura). */
async function room(n: number, seed: number, mode: 'clasica' | 'campana' = 'clasica', wild?: number): Promise<Client[]> {
  const host = await connect(seed, wild);
  host.send({ t: 'create', name: 'Ana' });
  await host.next((m) => m.t === 'joined', 'sala creada');
  const all = [host];
  for (let i = 1; i < n; i++) {
    const c = await connect(seed * 31 + i, wild);
    c.send({ t: 'join', room: host.room, name: i === 1 ? '' : `Jugador ${i}` });
    await c.next((m) => m.t === 'joined', 'entrar en la sala');
    all.push(c);
  }
  await host.next((m) => m.t === 'lobby' && m.lobby.players.length === n, `vestíbulo con ${n}`);
  if (mode === 'campana') host.send({ t: 'mode', value: 'campana' });
  return all;
}

/** Todos los asientos acaban con la misma mesa (tableHash) y ningún resumen falló. */
function sameTable(clients: Client[]): void {
  const last = clients.map((c) => c.tables.at(-1));
  expect(new Set(last).size).toBe(1);
  for (const c of clients) expect(c.badHash).toBe(0);
}

async function finish(clients: Client[]): Promise<PlayerView[]> {
  const ends = await Promise.all(clients.map((c) => c.ended()));
  for (const c of clients) await c.close();
  return ends.map((m) => (m as Extract<ServerMsg, { t: 'state' }>).view);
}

describe('cooperativo a prueba de cortes (clientes ws contra startServer)', () => {
  it('(e) importar el módulo del servidor no abre ningún puerto', async () => {
    const listen = vi.spyOn(Server.prototype, 'listen');
    vi.resetModules();
    const mod = await import('../src/server/index');
    expect(typeof mod.startServer).toBe('function');
    expect(listen).not.toHaveBeenCalled();
    listen.mockRestore();
  });

  it.each([2, 3, 4])('(a) %i jugadores juegan un Asalto único entero hasta ganar o perder', async (n) => {
    const clients = await room(n, SEED + n);
    // V8-4: quien entra sin nombre recibe el de la conjura
    expect(clients[0].lobby?.players.map((p) => p.name)).toContain(DEFAULT_NAME);
    expect(DEFAULT_NAME.length).toBeLessThanOrEqual(12);
    for (const c of clients) c.auto = true;
    clients[0].send({ t: 'start' });
    const ends = await finish(clients);
    expect(['won', 'lost']).toContain(ends[0].phase);
    expect(ends[0].players).toHaveLength(n);
    sameTable(clients);
    // los que nunca se cortaron vieron exactamente la misma secuencia de mesas
    for (const c of clients) expect(c.tables).toEqual(clients[0].tables);
  }, 15_000);

  it('(b) en campaña, las señas en el Mapa del castillo y en La Taberna llegan a todos con el player de quien la hace', async () => {
    const clients = await room(3, SEED + 50, 'campana', 0);
    const [host] = clients;
    await host.next((m) => m.t === 'lobby' && m.lobby.mode === 'campana', 'modo campaña');
    host.send({ t: 'start', deck: 'obra' });
    const phase = (p: Run['phase']) => Promise.all(clients.map((c) => c.next((m) => m.t === 'run' && m.run.phase === p, `campaña en ${p}`)));
    await phase('pack');
    host.send({ t: 'run', action: { t: 'begin' } });
    await phase('map');
    const signal = async (target: string) => {
      for (const c of clients) c.send({ t: 'ping', target });
      for (const c of clients) for (const from of clients) await c.next((m) => m.t === 'ping' && m.player === from.id && m.target === target, `seña ${target} de ${from.id}`);
    };
    await signal('route:0');
    // el primer asalto: lo juegan los tres
    for (const c of clients) c.auto = true;
    host.send({ t: 'run', action: { t: 'route', i: 0 } });
    await Promise.all(clients.map((c) => c.ended()));
    sameTable(clients);
    await host.next((m) => m.t === 'run' && m.run.phase !== 'battle', 'el asalto se cobra');
    // el anfitrión decide el Botín hasta llegar a La Taberna
    for (let guard = 0; guard < 10 && host.run?.phase !== 'shop'; guard++) {
      const run = host.run!;
      expect(run.phase, 'la conjura cayó en el primer asalto: cambia SEED').not.toBe('lost');
      const a = chooseRunAction(run);
      const seen = host.inbox.length;
      host.send({ t: 'run', action: a! });
      await host.next((m) => m.t === 'run', 'la campaña sigue', seen);
    }
    await phase('shop');
    await signal('offer:0');
    // quitar la seña también llega a todos
    host.send({ t: 'ping', target: '' });
    for (const c of clients) await c.next((m) => m.t === 'ping' && m.player === host.id && m.target === '', 'seña borrada');
    for (const c of clients) await c.close();
  }, 15_000);

  it('(c) quien tiene el turno se corta a mitad de turno: el bot juega por él, vuelve con rejoin y recupera su mano', async () => {
    const clients = await room(3, SEED + 70);
    const victim = clients[1];
    let cut: { turn: number } | null = null;
    // en su segundo turno guarda una carta en La Manga (no gasta el turno) y se corta sin jugar
    let turns = 0;
    let cutting = false;
    victim.onTurn = (c) => {
      if (cutting) return true;
      if (++turns < 2 || !c.view || c.view.stashed || !c.view.hand.length) return false;
      cutting = true;
      c.send({ t: 'action', action: { type: 'stash', card: c.view.hand[0].id } });
      void c.next((m) => m.t === 'state' && m.view.stashed, 'La Manga').then(() => {
        cut = { turn: c.view!.turnCount };
        c.auto = false;
        c.ws.terminate();
      });
      return true;
    };
    for (const c of clients) c.auto = true;
    clients[0].send({ t: 'start' });
    // el bot juega el turno del cortado: los demás ven pasar ese turno
    const watcher = clients[0];
    await watcher.next((m) => m.t === 'lobby' && m.lobby.players.some((p) => p.id === victim.id && !p.connected), 'el cortado sale de la sala');
    await watcher.next((m) => m.t === 'state' && cut !== null && m.view.turnCount > cut.turn, 'el bot juega por el cortado');
    // vuelve con su token
    const back = await connect(SEED + 71);
    back.auto = true; // antes de volver: el estado llega pegado al «joined»
    back.send({ t: 'rejoin', room: victim.room, playerId: victim.id, token: victim.token });
    const joined = (await back.next((m) => m.t === 'joined', 'rejoin')) as Extract<ServerMsg, { t: 'joined' }>;
    expect(joined.playerId).toBe(victim.id);
    const full = (await back.next((m) => m.t === 'state', 'estado completo')) as Extract<ServerMsg, { t: 'state' }>;
    expect(full.events).toEqual([]);
    expect(stateHash(full.view)).toBe(full.hash);
    // su mano es la que la mesa dice que tiene, y su mesa es una de las que vieron los demás
    const mine = full.view.players.find((p) => p.id === victim.id)!;
    expect(full.view.hand.length).toBe(mine.handCount);
    expect(full.view.reserve.length).toBe(mine.reserveCount);
    const ends = await finish([clients[0], clients[2], back]);
    expect(['won', 'lost']).toContain(ends[0].phase);
    for (const other of [clients[0], clients[2]]) expect(other.tables).toContain(back.tables[0]);
    sameTable([clients[0], clients[2], back]);
    expect(victim.badHash + back.badHash).toBe(0);
  }, 15_000);

  it('(d) cortes sembrados en partidas de 2 a 4: cero desincronizaciones y 100 % de reconexiones', async () => {
    const pick = rng(SEED);
    const GAMES = 50;
    let rejoined = 0;
    let cuts = 0;
    for (let g = 0; g < GAMES; g++) {
      const n = 2 + (g % 3);
      const clients = await room(n, SEED + 1000 + g);
      const who = 1 + Math.floor(pick() * (n - 1));
      const at = 1 + Math.floor(pick() * 4);
      const victim = clients[who];
      let turns = 0;
      let cutDone: () => void = () => {};
      const cut = new Promise<'corte'>((done) => (cutDone = () => done('corte')));
      // en su turno n.º `at`, a mitad de turno (antes de jugar), se le va la red
      victim.onTurn = (c) => {
        if (++turns !== at) return turns > at;
        c.auto = false;
        void c.close().then(cutDone);
        return true;
      };
      for (const c of clients) c.auto = true;
      clients[0].send({ t: 'start' });
      const stayed = clients.filter((c) => c !== victim);
      // o la partida acaba antes de ese turno, o se corta y vuelve
      const first = await Promise.race([stayed[0].ended().then(
        () => 'fin' as const,
        () => 'fin' as const,
      ), cut]);
      const players = [...stayed];
      if (first === 'corte') {
        cuts++;
        await stayed[0].next((m) => m.t === 'lobby' && m.lobby.players.some((p) => p.id === victim.id && !p.connected), 'el cortado sale');
        const back = await connect(SEED + 2000 + g);
        back.auto = true;
        back.send({ t: 'rejoin', room: victim.room, playerId: victim.id, token: victim.token });
        const joined = await back.next((m) => m.t === 'joined' || m.t === 'left', 'rejoin');
        if (joined.t === 'joined') rejoined++;
        players.push(back);
      } else players.push(victim);
      await finish(players);
      sameTable(players);
      for (const c of [...players, victim]) expect(c.badHash).toBe(0);
      // cada partida cierra sus conexiones: sin esto se acumulaban unas 200 abiertas en el mismo proceso
      for (const c of players) await c.close();
    }
    expect(cuts).toBeGreaterThanOrEqual(20);
    console.log(`(d) ${GAMES} partidas, ${cuts} cortes, ${rejoined} reconexiones`);
    expect(rejoined).toBe(cuts);
  }, 20_000);

  it('misma semilla, misma partida: dos salas con la misma semilla de servidor juegan igual', async () => {
    const play = async () => {
      const s = await startServer({ port: 0, botDelayMs: 20, seed: 77, quiet: true });
      const prev = server;
      server = s;
      try {
        const clients = await room(2, 5, 'clasica');
        for (const c of clients) c.auto = true;
        clients[0].send({ t: 'start' });
        const [end] = await finish(clients);
        return { phase: end.phase, turns: end.turnCount, table: tableHash({ ...end, players: end.players.map((p, i) => ({ ...p, id: `p${i}` })), turnPlayer: '' }) };
      } finally {
        server = prev;
        await s.close();
      }
    };
    expect(await play()).toEqual(await play());
  }, 15_000);
});
