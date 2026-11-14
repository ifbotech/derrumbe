// Servidor autoritativo del juego (el título vive en shared/brand.ts): salas, turnos, reconexión y estáticos.
// Importar este módulo no abre ningún puerto: `startServer()` lo arranca (las pruebas lo hacen en un puerto
// libre, con la espera del bot y la semilla inyectadas) y solo se arranca solo cuando se ejecuta como
// programa (npm start → dist/server/index.js; npm run dev:server → tsx watch src/server/index.ts).
import { createServer } from 'node:http';
import { existsSync, readFile, statSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { DIFFICULTY, Difficulty, GameEvent, GameState, RuleError, applyAction, createGame, currentPlayer, eventsFor, reorder, viewFor } from '../rules/engine';
import { chooseAction } from '../rules/bot';
import { Run, finishBattle, newRun, publicRun, runAction, startStage, trackEvents } from '../rules/run';
import { stateHash } from '../rules/state-hash';
import { TITLE } from '../shared/brand';
import type { ClientMsg, LobbyInfo, Mode, ServerMsg } from '../shared/protocol';

/** Espera, por defecto, antes de que el bot juegue por un desconectado. */
export const BOT_DELAY_MS = 6000;
const ROOM_TTL_MS = 30 * 60 * 1000;
/** Nombre de quien entra en una sala sin escribir el suyo (glosario: la conjura). */
export const DEFAULT_NAME = 'CONJURADO';

export interface ServerOptions {
  /** Puerto; 0 toma uno libre. */
  port: number;
  /** Sustituye a BOT_DELAY_MS (las pruebas lo bajan a unos milisegundos). */
  botDelayMs?: number;
  /** Solo para pruebas: fija la semilla de las salas (si no, sale de randomInt). */
  seed?: number;
  /** Sin mensajes de arranque en la consola. */
  quiet?: boolean;
}
export interface RunningServer {
  port: number;
  close(): Promise<void>;
}

interface Seat {
  id: string;
  name: string;
  token: string;
  ws: WebSocket | null;
}

interface Room {
  code: string;
  host: string;
  difficulty: Difficulty;
  mode: Mode;
  /** Campaña en curso (modo campaña). */
  run: Run | null;
  /** Identificador de la campaña para los clientes (no revela la semilla). */
  runUid: number;
  seats: Seat[];
  state: GameState | null;
  botTimer: NodeJS.Timeout | null;
  emptySince: number | null;
}

const send = (ws: WebSocket | null, msg: ServerMsg) => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

export function cleanName(raw: unknown): string {
  const name = String(raw ?? '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 12);
  return (name || DEFAULT_NAME).toUpperCase();
}

/** Semillas de las salas: al azar, o una secuencia fija a partir de `seed` (mulberry32) para las pruebas. */
function seeder(seed?: number): () => number {
  if (seed === undefined) return () => randomInt(2 ** 31);
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) % 2 ** 31;
  };
}

const here = fileURLToPath(new URL('.', import.meta.url));
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

/** Arranca el servidor de salas (HTTP con los estáticos + WebSocket en /ws). */
export function startServer(opts: ServerOptions): Promise<RunningServer> {
  const botDelay = opts.botDelayMs ?? BOT_DELAY_MS;
  const nextSeed = seeder(opts.seed);
  const rooms = new Map<string, Room>();
  const sockets = new WeakMap<WebSocket, { room: Room; seat: Seat }>();

  function newCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (;;) {
      let code = '';
      for (let i = 0; i < 4; i++) code += alphabet[randomInt(alphabet.length)];
      if (!rooms.has(code)) return code;
    }
  }

  function lobbyInfo(room: Room): LobbyInfo {
    return {
      room: room.code,
      host: room.host,
      difficulty: room.difficulty,
      mode: room.mode,
      inGame: room.state !== null || room.run !== null,
      players: room.seats.map((s) => ({ id: s.id, name: s.name, connected: s.ws !== null })),
    };
  }

  function broadcastLobby(room: Room): void {
    const lobby = lobbyInfo(room);
    for (const s of room.seats) send(s.ws, { t: 'lobby', lobby });
  }

  /** El estado de un asiento, con su resumen (el cliente lo compara y, si no cuadra, pide el estado entero). */
  function sendState(room: Room, seat: Seat, events: GameEvent[]): void {
    if (!room.state || !seat.ws) return;
    const view = viewFor(room.state, seat.id);
    send(seat.ws, { t: 'state', view, events: eventsFor(events, seat.id), hash: stateHash(view) });
  }

  function broadcastState(room: Room, events: GameEvent[]): void {
    for (const s of room.seats) sendState(room, s, events);
  }

  function broadcastRun(room: Room): void {
    if (!room.run) return;
    const run = publicRun(room.run, room.runUid);
    for (const s of room.seats) send(s.ws, { t: 'run', run });
  }

  /** Tras cada jugada: en campaña, anota los eventos y cierra el asalto si terminó. */
  function afterAction(room: Room, events: GameEvent[]): void {
    broadcastState(room, events);
    if (room.run && room.state) {
      trackEvents(room.run, events);
      if (room.state.phase !== 'playing') {
        finishBattle(room.run, room.state);
        broadcastRun(room);
      }
    }
    scheduleBot(room);
  }

  /** Arranca el asalto actual de la campaña. */
  function beginStage(room: Room): void {
    if (!room.run) return;
    room.state = startStage(room.run, room.seats.map((s) => ({ id: s.id, name: s.name })));
    broadcastRun(room);
    broadcastState(room, [{ e: 'turn', player: currentPlayer(room.state).id }]);
    scheduleBot(room);
  }

  /** Si le toca a un jugador desconectado, el bot juega por él tras una espera. */
  function scheduleBot(room: Room): void {
    if (room.botTimer) clearTimeout(room.botTimer);
    room.botTimer = null;
    const state = room.state;
    if (!state || state.phase !== 'playing') return;
    if (room.seats.every((s) => !s.ws)) return; // sala vacía: la partida queda en pausa
    const seat = room.seats.find((s) => s.id === currentPlayer(state).id);
    if (!seat || seat.ws) return;
    room.botTimer = setTimeout(() => {
      room.botTimer = null;
      if (!room.state || room.state.phase !== 'playing' || seat.ws || currentPlayer(room.state).id !== seat.id) return;
      const res = applyAction(room.state, seat.id, chooseAction(room.state));
      room.state = res.state;
      afterAction(room, res.events);
    }, botDelay);
  }

  function attach(ws: WebSocket, room: Room, seat: Seat): void {
    if (seat.ws && seat.ws !== ws) seat.ws.close(4000, 'sesión abierta en otra pestaña');
    seat.ws = ws;
    sockets.set(ws, { room, seat });
    room.emptySince = null;
    send(ws, { t: 'joined', room: room.code, playerId: seat.id, token: seat.token });
    broadcastLobby(room);
    sendState(room, seat, []);
    if (room.run) send(ws, { t: 'run', run: publicRun(room.run, room.runUid) });
    scheduleBot(room);
  }

  function detach(ws: WebSocket, leave: boolean): void {
    const ctx = sockets.get(ws);
    if (!ctx) return;
    sockets.delete(ws);
    const { room, seat } = ctx;
    if (seat.ws === ws) seat.ws = null;
    if (leave && !room.state && !room.run) {
      room.seats = room.seats.filter((s) => s !== seat);
      if (room.host === seat.id && room.seats.length) room.host = room.seats[0].id;
    }
    if (room.seats.every((s) => !s.ws)) room.emptySince = Date.now();
    if (room.seats.length === 0) {
      if (room.botTimer) clearTimeout(room.botTimer);
      rooms.delete(room.code);
    } else {
      if (room.host === seat.id && !room.state && !room.run) room.host = (room.seats.find((s) => s.ws) ?? room.seats[0]).id;
      broadcastLobby(room);
      scheduleBot(room);
    }
  }

  function handle(ws: WebSocket, msg: ClientMsg): void {
    const ctx = sockets.get(ws);

    if (msg.t === 'create') {
      if (ctx) detach(ws, true);
      const seat: Seat = { id: randomBytes(6).toString('hex'), name: cleanName(msg.name), token: randomBytes(16).toString('hex'), ws: null };
      const room: Room = { code: newCode(), host: seat.id, difficulty: 'obra', mode: 'clasica', run: null, runUid: 0, seats: [seat], state: null, botTimer: null, emptySince: null };
      rooms.set(room.code, room);
      return attach(ws, room, seat);
    }
    if (msg.t === 'join') {
      const room = rooms.get(String(msg.room ?? '').toUpperCase().trim());
      if (!room) return send(ws, { t: 'error', message: 'Esa sala no existe.' });
      if (room.state || room.run) return send(ws, { t: 'error', message: 'La partida ya empezó.' });
      if (room.seats.length >= 4) return send(ws, { t: 'error', message: 'La sala está llena (máx. 4).' });
      if (ctx) detach(ws, true);
      let name = cleanName(msg.name);
      while (room.seats.some((s) => s.name === name)) name = (name.slice(0, 10) + ' ' + (room.seats.length + 1)).slice(0, 12);
      const seat: Seat = { id: randomBytes(6).toString('hex'), name, token: randomBytes(16).toString('hex'), ws: null };
      room.seats.push(seat);
      return attach(ws, room, seat);
    }
    if (msg.t === 'rejoin') {
      const room = rooms.get(String(msg.room ?? ''));
      const seat = room?.seats.find((s) => s.id === msg.playerId && s.token === msg.token);
      if (!room || !seat) return send(ws, { t: 'left' });
      return attach(ws, room, seat);
    }

    if (!ctx) return send(ws, { t: 'error', message: 'No estás en ninguna sala.' });
    const { room, seat } = ctx;

    switch (msg.t) {
      case 'leave':
        detach(ws, true);
        return send(ws, { t: 'left' });
      case 'resync':
        // el resumen no cuadró en el cliente: el estado entero otra vez, sin eventos que animar
        sendState(room, seat, []);
        if (room.run) send(ws, { t: 'run', run: publicRun(room.run, room.runUid) });
        return;
      case 'ping': {
        // señas: no cambian nada del juego, solo se reparten a la conjura
        const target = typeof msg.target === 'string' && /^(?:[a-z]+:[\w-]{1,24})?$/.test(msg.target) ? msg.target : null;
        if (target === null) return;
        for (const s of room.seats) send(s.ws, { t: 'ping', player: seat.id, target });
        return;
      }
      case 'mode':
        if (seat.id !== room.host || room.state || room.run) return;
        if (msg.value !== 'clasica' && msg.value !== 'campana') return;
        room.mode = msg.value;
        return broadcastLobby(room);
      case 'run': {
        if (!room.run) return send(ws, { t: 'error', message: 'No hay campaña en curso.' });
        if (seat.id !== room.host) return send(ws, { t: 'error', message: 'En campaña decide el anfitrión.' });
        const action = msg.action;
        if (!action || typeof action !== 'object') return send(ws, { t: 'error', message: 'Decisión ilegible.' });
        const err = runAction(room.run, action);
        if (err) return send(ws, { t: 'error', message: err });
        if (action.t === 'route' && room.run.phase === 'battle') return beginStage(room);
        // la semilla ya se enseñó en la crónica: el Trono infinito se siembra de nuevo
        if (action.t === 'endless') room.run.rng = nextSeed();
        broadcastRun(room);
        // las reliquias se pueden reordenar en pleno asalto: la mesa sigue la misma permutación
        if (action.t === 'reorder' && room.state && room.state.phase === 'playing') {
          room.state.tools = reorder(room.state.tools, action.order) ?? room.state.tools;
          broadcastState(room, []);
        }
        return;
      }
      case 'difficulty':
        if (seat.id !== room.host || room.state) return;
        if (!(msg.value in DIFFICULTY)) return;
        room.difficulty = msg.value;
        return broadcastLobby(room);
      case 'start': {
        if (seat.id !== room.host) return send(ws, { t: 'error', message: 'Solo el anfitrión puede empezar.' });
        if (room.state || room.run) return;
        if (room.mode === 'campana') {
          // el Asalto diario es en solitario: en sala no se acepta
          room.run = newRun({ up: msg.up, ascension: msg.ascension, deck: msg.deck, pool: msg.pool, seedText: msg.seedText }, nextSeed());
          room.runUid = randomInt(1, 2 ** 31);
          broadcastLobby(room);
          return broadcastRun(room);
        }
        room.state = createGame(room.seats.map((s) => ({ id: s.id, name: s.name })), nextSeed(), DIFFICULTY[room.difficulty]);
        broadcastLobby(room);
        const first = currentPlayer(room.state).id;
        broadcastState(room, [{ e: 'turn', player: first }]);
        return scheduleBot(room);
      }
      case 'action': {
        if (!room.state) return send(ws, { t: 'error', message: 'La partida no ha empezado.' });
        try {
          const res = applyAction(room.state, seat.id, msg.action);
          room.state = res.state;
          afterAction(room, res.events);
        } catch (err) {
          if (err instanceof RuleError) return send(ws, { t: 'error', message: err.message });
          console.error(err);
          send(ws, { t: 'error', message: 'Jugada inválida.' });
        }
        return;
      }
      case 'lobby':
        if (seat.id !== room.host) return;
        if (room.run ? room.run.phase !== 'won' && room.run.phase !== 'lost' : !room.state || room.state.phase === 'playing') return;
        room.state = null;
        room.run = null;
        room.seats = room.seats.filter((s) => s.ws); // quien se fue pierde el asiento
        return broadcastLobby(room);
    }
  }

  // ───────────────────────── HTTP (estáticos) + WebSocket ─────────────────────────

  const clientDir = [resolve(here, '../client'), resolve(process.cwd(), 'dist/client')].find((d) => existsSync(join(d, 'index.html')));

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    }
    if (!clientDir) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end(`Servidor de ${TITLE} activo. En desarrollo abre http://localhost:5173 (npm run dev).`);
    }
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = normalize(join(clientDir, urlPath));
    if (!file.startsWith(clientDir) || !existsSync(file) || statSync(file).isDirectory()) file = join(clientDir, 'index.html');
    readFile(file, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end();
      }
      const immutable = urlPath.startsWith('/assets/');
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
      res.end(data);
    });
  });

  const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 8 * 1024 });
  wss.on('connection', (ws) => {
    let alive = true;
    ws.on('pong', () => (alive = true));
    const ping = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping();
    }, 20000);
    ws.on('message', (raw) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(raw.toString());
        if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') throw new Error();
      } catch {
        return send(ws, { t: 'error', message: 'Mensaje ilegible.' });
      }
      try {
        handle(ws, msg);
      } catch (err) {
        console.error(err);
        send(ws, { t: 'error', message: 'Error del servidor.' });
      }
    });
    ws.on('close', () => {
      clearInterval(ping);
      detach(ws, false);
    });
  });

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (room.emptySince && now - room.emptySince > ROOM_TTL_MS) {
        if (room.botTimer) clearTimeout(room.botTimer);
        rooms.delete(code);
      }
    }
  }, 60000);
  sweep.unref();

  return new Promise((done, fail) => {
    http.once('error', fail);
    http.listen(opts.port, () => {
      const port = (http.address() as AddressInfo).port;
      if (!opts.quiet) console.log(`${TITLE} escuchando en http://localhost:${port}`);
      done({
        port,
        close: () =>
          new Promise<void>((closed) => {
            clearInterval(sweep);
            for (const room of rooms.values()) if (room.botTimer) clearTimeout(room.botTimer);
            rooms.clear();
            for (const ws of wss.clients) ws.terminate();
            wss.close();
            http.closeAllConnections?.();
            http.close(() => closed());
          }),
      });
    });
  });
}

/** ¿Se ejecuta este archivo como programa (y no importado por una prueba o un script)? */
function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const norm = (p: string) => (process.platform === 'win32' ? p.toLowerCase() : p);
  return norm(resolve(entry)) === norm(fileURLToPath(import.meta.url));
}

if (isMain()) {
  const portArg = process.argv.find((a) => a.startsWith('--port='))?.split('=')[1];
  void startServer({ port: Number(portArg ?? process.env.PORT ?? 3000) });
}
