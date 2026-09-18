const { verify } = require('../lib/token');

module.exports = function auth(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ message: 'no token' });
  }
  try {
    req.user = { id: verify(token) };
    next();
  } catch (err) {
    res.status(401).json({ message: 'token not valid' });
  }
};
