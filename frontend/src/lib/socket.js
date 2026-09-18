// Single WebSocket connection shared by every page for the life of the tab.
//
// Pages declare intent with `whenOpen(fn)`: fn runs as soon as the socket is
// authenticated and again after every reconnect, so a game page that says
// "join room X" keeps its seat through a dropped connection. Fire-and-forget
// messages use `send`; the few call/response ones use `request`.

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
const CLOSE_UNAUTHORIZED = 4001;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 10_000;

class GameSocket {
  ws = null;
  listeners = new Map(); // message type -> Set<handler>
  openHandlers = new Set();
  pending = new Map(); // request id -> { resolve, reject, timer }
  nextId = 1;
  retryDelay = RETRY_MIN_MS;
  authError = null;

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect() {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;

    const token = localStorage.getItem('token');
    if (!token) {
      this.fail(new Error('no token'));
      return;
    }
    this.authError = null;

    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.retryDelay = RETRY_MIN_MS;
      // The server processes messages in order, so intents can follow auth
      // immediately without waiting for an acknowledgement.
      ws.send(JSON.stringify({ type: 'auth', token }));
      for (const fn of [...this.openHandlers]) fn();
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.id !== undefined) this.settle(msg.id, msg);
      this.emit(msg.type, msg);
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (event.code === CLOSE_UNAUTHORIZED) {
        this.fail(new Error(event.reason || 'token not valid'));
        return;
      }
      this.rejectPending(new Error('connection closed'));
      // Only fight to get back if a page still wants the connection.
      if (this.openHandlers.size > 0) {
        setTimeout(() => this.connect(), this.retryDelay);
        this.retryDelay = Math.min(this.retryDelay * 2, RETRY_MAX_MS);
      }
    };
  }

  fail(err) {
    this.authError = err;
    this.rejectPending(err);
    // Deferred so handlers registered in the same tick as the failing
    // connect() still hear about it.
    queueMicrotask(() => this.emit('auth_error', err));
  }

  rejectPending(err) {
    for (const id of [...this.pending.keys()]) this.settle(id, null, err);
  }

  settle(id, msg, err) {
    const entry = this.pending.get(id);
    if (!entry) return;
    this.pending.delete(id);
    clearTimeout(entry.timer);
    entry.off?.();
    if (err) entry.reject(err);
    else entry.resolve(msg);
  }

  emit(type, payload) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    for (const fn of [...handlers]) fn(payload);
  }

  // Subscribe to a server message type (or 'auth_error'). Returns unsubscribe.
  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type)?.delete(fn);
  }

  // Run fn now if connected, and again on every reconnect. Returns unsubscribe.
  whenOpen(fn) {
    this.openHandlers.add(fn);
    if (this.isOpen) fn();
    return () => this.openHandlers.delete(fn);
  }

  send(msg) {
    if (this.isOpen) this.ws.send(JSON.stringify(msg));
  }

  // Send and resolve with the server's direct reply (matched by id).
  request(msg) {
    return new Promise((resolve, reject) => {
      if (this.authError) {
        reject(this.authError);
        return;
      }
      const id = this.nextId++;
      const payload = JSON.stringify({ ...msg, id });
      const entry = { resolve, reject, off: null };
      entry.timer = setTimeout(() => this.settle(id, null, new Error('request timed out')), REQUEST_TIMEOUT_MS);
      this.pending.set(id, entry);

      if (this.isOpen) {
        this.ws.send(payload);
      } else {
        // Send once connected; `off` is released by settle() either way.
        entry.off = this.whenOpen(() => {
          entry.off();
          entry.off = null;
          this.ws.send(payload);
        });
      }
    });
  }
}

let instance = null;

// Returns the shared socket, (re)connecting if needed.
export function getSocket() {
  if (!instance) instance = new GameSocket();
  instance.connect();
  return instance;
}
