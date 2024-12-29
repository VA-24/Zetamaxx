const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'user already exists' });
    }

    user = new User({
      username,
      email,
      password
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();
    

    const payload = {
      user: {
        id: user.id
      }
    };


    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: '168h' }
    );

    res.json({
      token,
      userId: user._id,
      message: 'Login successful'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'invalid credentials' });
    }

    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET,
      { expiresIn: '168h' }
    );

    res.json({
      token,
      userId: user._id,
      message: 'Login successful'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.getLeaderboard();
    
    const formattedLeaderboard = users.map(user => ({
      _id: user._id,
      username: user.username,
      elo: user.elo,
      multiplayerGamesPlayed: user.multiplayerResults.length,
      averageScore: user.averageScore
    }));

    res.json(formattedLeaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .select({
        username: 1,
        elo: 1,
        averageScore: 1,
        gamesPlayed: 1,
        singleplayerResults: 1,
        multiplayerResults: 1
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.singleplayerResults.sort((a, b) => b.timestamp - a.timestamp);
    user.multiplayerResults.sort((a, b) => b.timestamp - a.timestamp);

    res.json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).send('Server error');
  }
});


module.exports = router;