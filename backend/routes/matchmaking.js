const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const { v4: uuidv4 } = require('uuid');

// Start looking for match
router.post('/initiate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.lookingForMatch = true;
    await user.save();


  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Check matchmaking status
router.get('/search', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // First check if user is already in a match 
    const existingMatch = await Match.findOne({
      $or: [
        { challenger: user._id },
        { challenged: user._id }
      ],
      status: 'waiting'
    }).sort({ createdAt: -1 });

    if (existingMatch) {
      console.log('User already in match:', {
        matchId: existingMatch._id,
        challenger: existingMatch.challenger,
        challenged: existingMatch.challenged
      });
      return res.json({ found: true, matchId: existingMatch._id });
    }

    // Find another user who is looking for a match within rating range
    const opponent = await User.findOne({
      _id: { $ne: user._id },
      lookingForMatch: true,
      elo: { 
        $gte: user.elo - 100, 
        $lte: user.elo + 100 
      }
    });

    if (opponent) {
      // Create a new match with both players
      const newMatch = new Match({
        _id: uuidv4(),
        challenger: user._id,
        challenged: opponent._id,
        duration: 120,
        startTime: new Date(),
        status: 'waiting',
        seed: Math.floor(Math.random() * 1000000)
      });

      await newMatch.save();

      // Reset matchmaking status for both users
      user.lookingForMatch = false;
      opponent.lookingForMatch = false;
      await Promise.all([user.save(), opponent.save()]);

      console.log('Created match with opponent:', {
        matchId: newMatch._id,
        challenger: user.username,
        challengerElo: user.elo,
        challenged: opponent.username,
        challengedElo: opponent.elo,
        duration: newMatch.duration,
        startTime: newMatch.startTime
      });

      return res.json({ 
        found: true, 
        matchId: newMatch._id 
      });
    }

    // No opponent found, set user as looking for match
    user.lookingForMatch = true;
    await user.save();

    console.log('No opponent found, user waiting:', {
      userId: user._id,
      username: user.username,
      elo: user.elo
    });

    return res.json({ found: false });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel matchmaking
router.post('/cancel', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.lookingForMatch = false;
    await user.save();
    res.json({ message: 'Matchmaking cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
