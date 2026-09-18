const WebSocket = require('ws');

// Send a message (object or pre-serialised string) to a session's socket,
// silently dropping it if the socket is no longer open.
function send(session, msg) {
  if (session.ws.readyState !== WebSocket.OPEN) return;
  session.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
}

module.exports = { send };
