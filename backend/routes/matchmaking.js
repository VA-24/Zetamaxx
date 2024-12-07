const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const { v4: uuidv4 } = require('uuid');

// Start looking for match
router.post('/search', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.lookingForMatch = true;
    await user.save();


  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Check matchmaking status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const match = await Match.findOne({
      $or: [
        { challenger: user._id },
        { challenged: user._id }
      ],
      status: 'waiting'
    }).sort({ createdAt: -1 });

    if (match) {
      // Reset matchmaking status
      user.lookingForMatch = false;
      await user.save();
      
      res.json({ 
        found: true, 
        matchId: match._id 
      });
    } else {
      // Try to find an opponent
      const opponent = await User.findOne({
        _id: { $ne: user._id },
        lookingForMatch: true,
        rating: { 
          $gte: user.rating - 150, 
          $lte: user.rating + 150 
        }
      });

      if (opponent) {
        const match = new Match({
          _id: uuidv4(),
          challenger: user._id,
          challenged: opponent._id,
          duration: 120,
          status: 'waiting',
          seed: Math.floor(Math.random() * 1000000)
        });

        await match.save();

        // Reset matchmaking status for both users
        user.lookingForMatch = false;
        opponent.lookingForMatch = false;
        await user.save();
        await opponent.save();

        res.json({ 
          found: true, 
          matchId: match._id 
        });
      } else {
        res.json({ found: false });
      }
    }
  } catch (err) {
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
