// In-memory matchmaking queue. Players are paired when their ratings are
// within range; the acceptable range widens the longer the pair has waited so
// nobody sits in an empty queue forever. Leaving the queue is implicit on
// disconnect, so there are no stale entries.

const User = require('../models/User');
const rooms = require('./rooms');
const { send } = require('./send');

const BASE_RANGE = 100; // rating window on join
const RANGE_STEP = 100; // widens by this much...
const STEP_MS = 10_000; // ...every this often
const TICK_MS = 1000;

const queue = new Map(); // userId -> { session, elo, since }
let onChange = null; // (size) => void, set by the ws server to push live counts

function notify() {
  onChange?.(queue.size);
}

function size() {
  return queue.size;
}

function watch(fn) {
  onChange = fn;
}

async function join(session) {
  session.wantsQueue = true;
  const user = await User.findById(session.userId, 'elo').lean();
  // The player may have left (or disconnected) while we were loading.
  if (!session.wantsQueue || !user) return;
  queue.set(session.userId, { session, elo: user.elo, since: Date.now() });
  notify();
  tryMatch();
}

function leave(session) {
  session.wantsQueue = false;
  const entry = queue.get(session.userId);
  if (entry && entry.session === session) {
    queue.delete(session.userId);
    notify();
  }
}

function pair(a, b) {
  queue.delete(a.session.userId);
  queue.delete(b.session.userId);
  a.session.wantsQueue = false;
  b.session.wantsQueue = false;
  notify();
  const room = rooms.createMatchedRoom(a.session.userId, b.session.userId);
  const msg = JSON.stringify({ type: 'match_found', matchId: room.id });
  send(a.session, msg);
  send(b.session, msg);
}

function tryMatch() {
  if (queue.size < 2) return;
  const entries = [...queue.values()];
  const now = Date.now();
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    if (!a) continue;
    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j];
      if (!b) continue;
      const waited = Math.max(now - a.since, now - b.since);
      const range = BASE_RANGE + RANGE_STEP * Math.floor(waited / STEP_MS);
      if (Math.abs(a.elo - b.elo) <= range) {
        pair(a, b);
        entries[i] = entries[j] = null;
        break;
      }
    }
  }
}

setInterval(tryMatch, TICK_MS).unref();

module.exports = { join, leave, size, watch };
