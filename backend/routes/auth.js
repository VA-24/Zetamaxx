const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sign } = require('../lib/token');

const router = express.Router();

function loginResponse(user) {
  return { token: sign(user._id), userId: user._id, message: 'Login successful' };
}

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    if (await User.exists({ username })) {
      return res.status(400).json({ message: 'user already exists' });
    }

    const user = await User.create({ username, password: await bcrypt.hash(password, 10) });
    res.json(loginResponse(user));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }, 'password').lean();
    if (!user || !(await bcrypt.compare(password ?? '', user.password))) {
      return res.status(400).json({ message: 'invalid credentials' });
    }
    res.json(loginResponse(user));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    res.json(await User.leaderboard());
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(
      req.user.id,
      'username elo averageScore singleplayerResults multiplayerResults',
    ).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newestFirst = (a, b) => b.timestamp - a.timestamp;
    user.singleplayerResults = (user.singleplayerResults ?? []).sort(newestFirst);
    user.multiplayerResults = (user.multiplayerResults ?? []).sort(newestFirst);
    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
