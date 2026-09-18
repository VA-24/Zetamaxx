const jwt = require('jsonwebtoken');

const EXPIRES_IN = '168h';

// New tokens include the username so WebSocket authorization does not need a
// database read on every connection. verifyClaims() still accepts older
// { user: { id } } tokens and the socket server fills their username from DB.
function sign(user) {
  const isDocument = user && typeof user === 'object';
  const id = isDocument ? user._id ?? user.id : user;
  const username = isDocument ? user.username : undefined;
  return jwt.sign(
    { user: { id: String(id), ...(username ? { username } : {}) } },
    process.env.JWT_SECRET,
    { expiresIn: EXPIRES_IN },
  );
}

function verifyClaims(token) {
  const { user } = jwt.verify(token, process.env.JWT_SECRET);
  return { id: String(user.id), username: user.username || null };
}

// REST middleware only needs the id.
function verify(token) {
  return verifyClaims(token).id;
}

module.exports = { sign, verify, verifyClaims };
