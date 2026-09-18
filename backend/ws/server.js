// WebSocket endpoint (/ws). One session per socket; the first message must be
// { type: 'auth', token }. Everything after that is dispatched to the room
// manager or the matchmaking queue. Messages are processed in order, so a
// client can pipeline auth + join without waiting for an acknowledgement.
//
// Client -> server
//   auth        { token }
//   create_room {}                   -> room_created { matchId }
//   join        { matchId }          -> waiting | match_start | match_end | full
//   leave       {}
//   answer      { index, value }     -> (opponent receives) score
//   queue_join  {}                   -> match_found { matchId }
//   queue_leave {}
//
// Server -> client (room events)
//   match_start { problems, remainingMs, you, opponent }   also sent as the state snapshot on rejoin
//   score       { you, opponent }
//   match_end   { you, opponent }
//   error       { code: 'unauthorized' | 'bad_message', message }   followed by close
//
// Any message carrying an `id` gets it echoed on the direct reply.

const { WebSocketServer } = require('ws');
const { verify } = require('../lib/token');
const rooms = require('./rooms');
const matchmaking = require('./matchmaking');
const { send } = require('./send');

const CLOSE_BAD_MESSAGE = 4000;
const CLOSE_UNAUTHORIZED = 4001;
const HEARTBEAT_MS = 30_000;
const MAX_ROOM_ID_LENGTH = 64;

function reply(session, req, res) {
  if (req.id !== undefined) res.id = req.id;
  send(session, res);
}

// Some proxies (Render's included) don't forward close frames with custom
// codes, so state the reason in a normal message first; the close code is
// kept for clients that do see it.
function refuse(session, code, closeCode, message) {
  send(session, { type: 'error', code, message });
  session.ws.close(closeCode, message);
}

function handle(session, msg) {
  switch (msg.type) {
    case 'create_room':
      reply(session, msg, { type: 'room_created', matchId: rooms.newId() });
      break;
    case 'join':
      if (typeof msg.matchId !== 'string' || !msg.matchId || msg.matchId.length > MAX_ROOM_ID_LENGTH) return;
      matchmaking.leave(session);
      rooms.join(session, msg.matchId);
      break;
    case 'leave':
      rooms.leave(session);
      break;
    case 'answer':
      if (!Number.isInteger(msg.index) || !Number.isInteger(msg.value)) return;
      rooms.answer(session, msg.index, msg.value);
      break;
    case 'queue_join':
      rooms.leave(session);
      matchmaking.join(session);
      break;
    case 'queue_leave':
      matchmaking.leave(session);
      break;
  }
}

function attach(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 8192 });

  wss.on('connection', (ws) => {
    const session = { ws, userId: null, room: null, wantsQueue: false, alive: true };
    ws.session = session;

    ws.on('pong', () => { session.alive = true; });

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        msg = null;
      }
      if (!msg || typeof msg !== 'object') return refuse(session, 'bad_message', CLOSE_BAD_MESSAGE, 'bad message');

      if (!session.userId) {
        if (msg.type !== 'auth') return refuse(session, 'unauthorized', CLOSE_UNAUTHORIZED, 'no token');
        try {
          session.userId = verify(msg.token);
        } catch {
          return refuse(session, 'unauthorized', CLOSE_UNAUTHORIZED, 'token not valid');
        }
        return;
      }

      handle(session, msg);
    });

    ws.on('close', () => {
      matchmaking.leave(session);
      rooms.leave(session);
    });
  });

  // Drop connections that stopped answering pings (closed laptops, dead NAT
  // mappings) so their seats and queue entries are released.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.session.alive) {
        ws.terminate();
        continue;
      }
      ws.session.alive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

module.exports = { attach };
