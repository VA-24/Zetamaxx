const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {

  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'token not valid' });
  }
};