const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');
const User = require('../models/User');

router.post('/create', auth, async (req, res) => {
  try {
    const { challengedId, duration } = req.body;

    const match = new Match({
      challenger: req.user.id,
      challenged: challengedId,
      duration: duration
    });

    await match.save();
    res.json(match);
  } catch (err) {
    res.status(500).send('Server error');
  }
});


router.post('/:matchId/start', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.status = 'in_progress';
    match.startTime = new Date();
    match.endTime = new Date(match.startTime.getTime() + match.duration * 1000);

    await match.save();
    res.json(match);
  } catch (err) {
    res.status(500).send('Server error');
  }
});


router.get('/history', auth, async (req, res) => {
    try {
      const matches = await Match.find({
        $or: [
          { challenger: req.user.id },
          { challenged: req.user.id }
        ]
      })
      .populate('challenger challenged', 'username')
      .sort({ createdAt: -1 });
  
      const formattedMatches = matches.map(match => {
        const isChallenger = match.challenger._id.toString() === req.user.id;
        return {
          id: match._id,
          opponent: isChallenger ? match.challenged.username : match.challenger.username,
          userScore: isChallenger ? match.challengerScore : match.challengedScore,
          opponentScore: isChallenger ? match.challengedScore : match.challengerScore,
          status: match.status,
          duration: match.duration,
          date: match.createdAt,
          won: match.status === 'completed' ? 
            (isChallenger ? 
              match.challengerScore > match.challengedScore : 
              match.challengedScore > match.challengerScore) 
            : null
        };
      });
  
      res.json(formattedMatches);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });
  

router.post('/:matchId/complete', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const isDraw = match.challengerScore === match.challengedScore;
    let winnerId, loserId;
    
    if (!isDraw) {
      winnerId = match.challengerScore > match.challengedScore ? 
        match.challenger : match.challenged;
      loserId = match.challengerScore > match.challengedScore ? 
        match.challenged : match.challenger;
    }

    if (isDraw) {
      await User.updateEloRatings(match.challenger, match.challenged, true);
    } else {
      await User.updateEloRatings(winnerId, loserId);
    }

    const challenger = await User.findById(match.challenger);
    const challenged = await User.findById(match.challenged);
    
    await challenger.updateAverageScore(match.challengerScore);
    await challenged.updateAverageScore(match.challengedScore);

    res.json({ message: 'match completed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


module.exports = router;