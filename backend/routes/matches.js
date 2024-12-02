const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');
const User = require('../models/User');

router.post('/create', auth, async (req, res) => {
  try {
    const { matchId, duration, status, seed } = req.body;

    const match = new Match({
      _id: matchId,
      challenger: req.user.id,
      duration: duration,
      status: status || 'waiting',
      seed: seed || Math.floor(Math.random() * 1000000)
    });

    const savedMatch = await match.save();
    console.log('Match created:', savedMatch);
    res.json(savedMatch);
  } catch (err) {
    console.error('Error creating match:', err);
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

  //for singleplayer
  router.post('/complete', auth, async (req, res) => {
    try {
      const { score, timestamp } = req.body;
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'user not found' });
      }

      user.singleplayerResults.push({
        score: score,
        timestamp: new Date(timestamp),
      });
  
      await user.save();
      await user.updateAverageScore(score);
  
      res.json({ message: 'match completed' });
    } catch (err) {
      console.error(err);
      res.status(500).send('server error');
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

router.get('/available-players', auth, async (req, res) => {
  try {
    const availablePlayers = await User.find({
      _id: { $ne: req.user.id },
      isOnline: true,
      currentMatch: null
    }).select('_id username');
    
    res.json(availablePlayers);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    console.log('Join attempt - User ID:', req.user.id);
    console.log('Match ID:', req.params.id);
    
    const match = await Match.findById(req.params.id);
    console.log('Found match:', match);
    
    if (!match) {
      console.log('Match not found');
      return res.status(404).json({ message: 'Match not found' });
    }

    console.log('Current challenger:', match.challenger);
    console.log('Current challenged:', match.challenged);
    console.log('Current user:', req.user.id);
    console.log('Comparison:', match.challenger.toString() !== req.user.id);

    if (!match.challenger) {
      console.log('Setting as challenger');
      match.challenger = req.user.id;
    } else if (!match.challenged && match.challenger.toString() !== req.user.id) {
      console.log('Setting as challenged');
      match.challenged = req.user.id;
      match.status = 'ready';
      match.startTime = new Date();
    }

    console.log('Saving match...');
    await match.save();
    const updatedMatch = await Match.findById(req.params.id);
    console.log('Updated match:', updatedMatch);
    res.json(updatedMatch);
  } catch (err) {
    console.error('Error in join route:', err);
    res.status(500).send('Server error');
  }
});

router.get('/:matchId', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.json(match);
    console.log(match);
  } catch (err) {
    res.status(500).send('Server error');
  }
});



module.exports = router;