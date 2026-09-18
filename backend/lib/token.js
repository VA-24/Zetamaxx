const jwt = require('jsonwebtoken');

const EXPIRES_IN = '168h';

// Payload shape is kept as { user: { id } } so tokens issued by the previous
// backend keep working across the cutover.
function sign(userId) {
  return jwt.sign({ user: { id: userId } }, process.env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

// Returns the user id, or throws if the token is missing/invalid/expired.
function verify(token) {
  return jwt.verify(token, process.env.JWT_SECRET).user.id;
}

module.exports = { sign, verify };
