const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Singleplayer result. Multiplayer results are persisted by ws/rooms.js.
//
// One atomic pipeline update appends the result and advances the running
// average, so concurrent submissions can't clobber each other. The average is
// kept as an integer (round half up) to match what the profile has always shown.
router.post('/complete', auth, async (req, res) => {
  try {
    const score = Number(req.body.score);
    const timestamp = req.body.timestamp ? new Date(req.body.timestamp) : new Date();
    if (!Number.isInteger(score) || score < 0 || Number.isNaN(timestamp.getTime())) {
      return res.status(400).json({ message: 'invalid result' });
    }

    const played = { $ifNull: ['$singleplayerGamesPlayed', 0] };
    const average = { $ifNull: ['$averageScore', 0] };
    const total = { $add: [{ $multiply: [average, played] }, score] };
    const games = { $add: [played, 1] };

    const result = await User.updateOne({ _id: req.user.id }, [{
      $set: {
        singleplayerResults: { $concatArrays: [{ $ifNull: ['$singleplayerResults', []] }, [{ score, timestamp }]] },
        averageScore: { $floor: { $add: [{ $divide: [total, games] }, 0.5] } },
        singleplayerGamesPlayed: games,
      },
    }]);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'user not found' });
    }
    res.json({ message: 'match completed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('server error');
  }
});

module.exports = router;
