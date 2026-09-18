// Authoritative in-memory match state.
//
// A room is created the first time someone joins its id (friend link) or when
// matchmaking pairs two players. The server owns the seed, the problem list,
// the clock and both scores; clients only report answers. Nothing touches the
// database until a match ends, at which point results are persisted in one
// read plus two parallel writes.
//
// Lifecycle:  waiting -> in_progress -> completed -> (destroyed after TTL)

const { randomUUID } = require('crypto');
const User = require('../models/User');
const Match = require('../models/Match');
const { generateProblems } = require('../lib/problems');
const { updateElo } = require('../lib/elo');
const { send } = require('./send');

const MATCH_DURATION = Number(process.env.MATCH_DURATION) || 120; // seconds
const PROBLEM_COUNT = 300; // far more than anyone can answer in a match
const NO_SHOW_MS = 5000; // matched players have this long to arrive before the match starts anyway
const COMPLETED_ROOM_TTL_MS = 60_000; // keep results around for late/reconnecting clients
const ANSWER_KEY_USERNAME = 'ultraman3214';

const rooms = new Map(); // roomId -> room

function newSlot(userId) {
  return { userId, score: 0, sessions: new Set() };
}

function createRoom({ id = randomUUID(), type, challengerId = null, challengedId = null }) {
  const room = {
    id,
    type,
    status: 'waiting',
    seed: Math.floor(Math.random() * 0x7fffffff),
    duration: MATCH_DURATION,
    problems: null,
    publicProblems: null,
    challenger: challengerId ? newSlot(challengerId) : null,
    challenged: challengedId ? newSlot(challengedId) : null,
    startTime: null,
    endTime: null,
    timer: null,
  };
  rooms.set(id, room);
  return room;
}

function slotOf(room, userId) {
  if (room.challenger?.userId === userId) return room.challenger;
  if (room.challenged?.userId === userId) return room.challenged;
  return null;
}

function otherSlot(room, slot) {
  return slot === room.challenger ? room.challenged : room.challenger;
}

function isEmpty(room) {
  return !room.challenger?.sessions.size && !room.challenged?.sessions.size;
}

// Per-session view of the room. Correct answers never appear in the public
// problem payload. The one explicitly authorized account receives a separate
// answer key that the frontend exposes in DevTools.
function snapshot(room, slot, type, session) {
  const msg = { type, you: slot.score, opponent: otherSlot(room, slot).score };
  if (type === 'match_start') {
    msg.problems = room.publicProblems;
    msg.serverValidated = true;
    msg.remainingMs = Math.max(0, room.endTime - Date.now());
    if (session?.username === ANSWER_KEY_USERNAME) {
      msg.answerKey = room.problems.map((problem) => problem.correctAnswer);
    }
  }
  return msg;
}

function sendSlot(room, slot, type) {
  if (!slot || slot.sessions.size === 0) return;
  for (const session of slot.sessions) send(session, snapshot(room, slot, type, session));
}

function broadcast(room, type) {
  sendSlot(room, room.challenger, type);
  sendSlot(room, room.challenged, type);
}

function start(room) {
  clearTimeout(room.timer);
  room.status = 'in_progress';
  room.problems = generateProblems(room.seed, PROBLEM_COUNT);
  room.publicProblems = room.problems.map(({ firstNumber, secondNumber, operator }) => ({
    firstNumber,
    secondNumber,
    operator,
  }));
  room.startTime = Date.now();
  room.endTime = room.startTime + room.duration * 1000;
  room.timer = setTimeout(() => end(room), room.duration * 1000);
  broadcast(room, 'match_start');
}

function maybeStart(room) {
  if (room.status !== 'waiting') return;
  if (!room.challenger?.sessions.size || !room.challenged?.sessions.size) return;
  start(room);
}

// Ends the match, notifies both sides immediately, then persists. Returns the
// persistence promise so shutdown can wait for it.
function end(room) {
  if (room.status !== 'in_progress') return Promise.resolve();
  clearTimeout(room.timer);
  room.status = 'completed';
  room.endTime = Date.now();
  broadcast(room, 'match_end');
  room.timer = setTimeout(() => destroy(room), COMPLETED_ROOM_TTL_MS);
  return persist(room).catch((err) => console.error(`[rooms] persist failed for ${room.id}:`, err));
}

async function persist(room) {
  const c = room.challenger;
  const d = room.challenged;
  const users = await User.find({ _id: { $in: [c.userId, d.userId] } }, 'username elo').lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const cu = byId.get(c.userId);
  const du = byId.get(d.userId);
  if (!cu || !du) {
    console.warn(`[rooms] ${room.id}: player missing from db, result not saved`);
    return;
  }

  const outcome = c.score === d.score ? 0.5 : c.score > d.score ? 1 : 0;
  const [cElo, dElo] = updateElo(cu.elo, du.elo, outcome);
  const result = {
    finalScore: { challengerScore: c.score, challengedScore: d.score },
    timestamp: new Date(room.endTime),
    players: { challenger: cu.username, challenged: du.username },
  };

  await Promise.all([
    User.bulkWrite([
      { updateOne: { filter: { _id: cu._id }, update: { $set: { elo: cElo }, $push: { multiplayerResults: { ...result, rating: cElo } } } } },
      { updateOne: { filter: { _id: du._id }, update: { $set: { elo: dElo }, $push: { multiplayerResults: { ...result, rating: dElo } } } } },
    ], { ordered: false }),
    Match.updateOne(
      { _id: room.id },
      {
        $set: {
          type: room.type,
          challenger: cu._id,
          challenged: du._id,
          challengerScore: c.score,
          challengedScore: d.score,
          duration: room.duration,
          seed: room.seed,
          startTime: new Date(room.startTime),
          endTime: new Date(room.endTime),
        },
      },
      { upsert: true },
    ),
  ]);
}

function destroy(room) {
  clearTimeout(room.timer);
  rooms.delete(room.id);
  for (const slot of [room.challenger, room.challenged]) {
    if (!slot) continue;
    for (const session of slot.sessions) {
      if (session.room === room) session.room = null;
    }
  }
}

// ---- public API -----------------------------------------------------------

function newId() {
  return randomUUID();
}

// Called by matchmaking once two players are paired. Both seats are reserved;
// the match starts when both arrive, or after NO_SHOW_MS if only one does.
function createMatchedRoom(challengerId, challengedId) {
  const room = createRoom({ type: 'vsRandom', challengerId, challengedId });
  room.timer = setTimeout(() => {
    if (room.status !== 'waiting') return;
    if (isEmpty(room)) destroy(room);
    else start(room);
  }, NO_SHOW_MS);
  return room;
}

function join(session, roomId) {
  if (session.room) leave(session);

  let room = rooms.get(roomId);
  if (!room) room = createRoom({ id: roomId, type: 'vsFriend' });

  let slot = slotOf(room, session.userId);
  if (!slot) {
    const open = room.status === 'waiting' && room.type === 'vsFriend';
    if (open && !room.challenger) slot = room.challenger = newSlot(session.userId);
    else if (open && !room.challenged) slot = room.challenged = newSlot(session.userId);
    else return send(session, { type: 'full' });
  }

  slot.sessions.add(session);
  session.room = room;

  if (room.status === 'waiting') {
    // If this arrival completes the pair, start() broadcasts match_start to
    // everyone (including this session), so only ack when still waiting.
    maybeStart(room);
    if (room.status === 'waiting') send(session, { type: 'waiting' });
  } else {
    // Late arrival or reconnect: hand this session the current state.
    send(session, snapshot(
      room,
      slot,
      room.status === 'in_progress' ? 'match_start' : 'match_end',
      session,
    ));
  }
}

function leave(session) {
  const room = session.room;
  if (!room) return;
  session.room = null;
  slotOf(room, session.userId)?.sessions.delete(session);
  // A friend room nobody is sitting in has no reason to exist. Matched rooms
  // are governed by their no-show timer instead.
  if (room.status === 'waiting' && room.type === 'vsFriend' && isEmpty(room)) destroy(room);
}

function answer(session, index, value) {
  const room = session.room;
  if (!room || room.status !== 'in_progress') return;
  const slot = slotOf(room, session.userId);
  // Answers must arrive in order; index doubles as a desync guard.
  if (!slot || index !== slot.score) return;
  if (room.problems[index]?.correctAnswer !== value) return;
  slot.score++;
  sendSlot(room, slot, 'answer_correct');
  sendSlot(room, otherSlot(room, slot), 'score');
}

// Used on shutdown: finish every live match so results are not lost.
function endAll() {
  const pending = [];
  for (const room of rooms.values()) {
    if (room.status === 'in_progress') pending.push(end(room));
  }
  return Promise.all(pending);
}

module.exports = { newId, createMatchedRoom, join, leave, answer, endAll };
