// DERRUMBE — servidor autoritativo: salas, turnos, reconexión y estáticos.
import { createServer } from 'node:http';
import { existsSync, readFile, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { DIFFICULTY, Difficulty, GameEvent, GameState, RuleError, applyAction, createGame, currentPlayer, eventsFor, viewFor } from '../rules/engine';
import { chooseAction } from '../rules/bot';
import type { ClientMsg, LobbyInfo, ServerMsg } from '../shared/protocol';

const portArg = process.argv.find((a) => a.startsWith('--port='))?.split('=')[1];
const PORT = Number(portArg ?? process.env.PORT ?? 3000);
const BOT_DELAY_MS = 6000; // espera antes de jugar por un desconectado
const ROOM_TTL_MS = 30 * 60 * 1000;

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
  seats: Seat[];
  state: GameState | null;
  botTimer: NodeJS.Timeout | null;
  emptySince: number | null;
}

const rooms = new Map<string, Room>();
const sockets = new WeakMap<WebSocket, { room: Room; seat: Seat }>();

const send = (ws: WebSocket | null, msg: ServerMsg) => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

function newCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += alphabet[randomInt(alphabet.length)];
    if (!rooms.has(code)) return code;
  }
}

function cleanName(raw: unknown): string {
  const name = String(raw ?? '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 12);
  return (name || 'OBRERO').toUpperCase();
}

function lobbyInfo(room: Room): LobbyInfo {
  return {
    room: room.code,
    host: room.host,
    difficulty: room.difficulty,
    inGame: room.state !== null,
    players: room.seats.map((s) => ({ id: s.id, name: s.name, connected: s.ws !== null })),
  };
}

function broadcastLobby(room: Room): void {
  const lobby = lobbyInfo(room);
  for (const s of room.seats) send(s.ws, { t: 'lobby', lobby });
}

function broadcastState(room: Room, events: GameEvent[]): void {
  if (!room.state) return;
  for (const s of room.seats) send(s.ws, { t: 'state', view: viewFor(room.state, s.id), events: eventsFor(events, s.id) });
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
    broadcastState(room, res.events);
    scheduleBot(room);
  }, BOT_DELAY_MS);
}

function attach(ws: WebSocket, room: Room, seat: Seat): void {
  if (seat.ws && seat.ws !== ws) seat.ws.close(4000, 'sesión abierta en otra pestaña');
  seat.ws = ws;
  sockets.set(ws, { room, seat });
  room.emptySince = null;
  send(ws, { t: 'joined', room: room.code, playerId: seat.id, token: seat.token });
  broadcastLobby(room);
  if (room.state) send(ws, { t: 'state', view: viewFor(room.state, seat.id), events: [] });
  scheduleBot(room);
}

function detach(ws: WebSocket, leave: boolean): void {
  const ctx = sockets.get(ws);
  if (!ctx) return;
  sockets.delete(ws);
  const { room, seat } = ctx;
  if (seat.ws === ws) seat.ws = null;
  if (leave && !room.state) {
    room.seats = room.seats.filter((s) => s !== seat);
    if (room.host === seat.id && room.seats.length) room.host = room.seats[0].id;
  }
  if (room.seats.every((s) => !s.ws)) room.emptySince = Date.now();
  if (room.seats.length === 0) rooms.delete(room.code);
  else {
    if (room.host === seat.id && !room.state) room.host = (room.seats.find((s) => s.ws) ?? room.seats[0]).id;
    broadcastLobby(room);
    scheduleBot(room);
  }
}

function handle(ws: WebSocket, msg: ClientMsg): void {
  const ctx = sockets.get(ws);

  if (msg.t === 'create') {
    if (ctx) detach(ws, true);
    const seat: Seat = { id: randomBytes(6).toString('hex'), name: cleanName(msg.name), token: randomBytes(16).toString('hex'), ws: null };
    const room: Room = { code: newCode(), host: seat.id, difficulty: 'obra', seats: [seat], state: null, botTimer: null, emptySince: null };
    rooms.set(room.code, room);
    return attach(ws, room, seat);
  }
  if (msg.t === 'join') {
    const room = rooms.get(String(msg.room ?? '').toUpperCase().trim());
    if (!room) return send(ws, { t: 'error', message: 'Esa sala no existe.' });
    if (room.state) return send(ws, { t: 'error', message: 'La partida ya empezó.' });
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
    case 'difficulty':
      if (seat.id !== room.host || room.state) return;
      if (!(msg.value in DIFFICULTY)) return;
      room.difficulty = msg.value;
      return broadcastLobby(room);
    case 'start': {
      if (seat.id !== room.host) return send(ws, { t: 'error', message: 'Solo el anfitrión puede empezar.' });
      if (room.state) return;
      room.state = createGame(room.seats.map((s) => ({ id: s.id, name: s.name })), randomInt(2 ** 31), DIFFICULTY[room.difficulty]);
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
        broadcastState(room, res.events);
        scheduleBot(room);
      } catch (err) {
        if (err instanceof RuleError) return send(ws, { t: 'error', message: err.message });
        console.error(err);
        send(ws, { t: 'error', message: 'Jugada inválida.' });
      }
      return;
    }
    case 'lobby':
      if (seat.id !== room.host || !room.state || room.state.phase === 'playing') return;
      room.state = null;
      room.seats = room.seats.filter((s) => s.ws); // quien se fue pierde el asiento
      return broadcastLobby(room);
  }
}

// ───────────────────────── HTTP (estáticos) + WebSocket ─────────────────────────

const here = fileURLToPath(new URL('.', import.meta.url));
const clientDir = [resolve(here, '../client'), resolve(process.cwd(), 'dist/client')].find((d) => existsSync(join(d, 'index.html')));
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
  }
  if (!clientDir) {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Servidor DERRUMBE activo. En desarrollo abre http://localhost:5173 (npm run dev).');
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

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.emptySince && now - room.emptySince > ROOM_TTL_MS) {
      if (room.botTimer) clearTimeout(room.botTimer);
      rooms.delete(code);
    }
  }
}, 60000).unref();

http.listen(PORT, () => console.log(`DERRUMBE escuchando en http://localhost:${PORT}`));
