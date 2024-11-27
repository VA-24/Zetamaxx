const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');
const User = require('../models/User');

function generateProblem() {
  const operators = ['+', '–', '×', '÷'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let firstNumber, secondNumber, correctAnswer;

  switch(operator) {
    case '+':
      firstNumber = Math.floor(Math.random() * 100);
      secondNumber = Math.floor(Math.random() * 100);
      correctAnswer = firstNumber + secondNumber;
      break;
    case '–':
      firstNumber = Math.floor(Math.random() * 100);
      secondNumber = Math.floor(Math.random() * firstNumber);
      correctAnswer = firstNumber - secondNumber;
      break;
    case '×':
      firstNumber = Math.floor(Math.random() * 12);
      secondNumber = Math.floor(Math.random() * 12);
      correctAnswer = firstNumber * secondNumber;
      break;
    case '÷':
      secondNumber = Math.floor(Math.random() * 11) + 1;
      correctAnswer = Math.floor(Math.random() * 12);
      firstNumber = correctAnswer * secondNumber;
      break;
  }

  return {
    firstNumber,
    secondNumber,
    operator,
    correctAnswer
  };
}

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

    const problem = generateProblem();
    match.challengerProblems = [problem];
    match.challengedProblems = [problem];

    await match.save();
    res.json(match);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/:matchId/answer', auth, async (req, res) => {
  try {
    const { answer } = req.body;
    const match = await Match.findById(req.params.matchId);
    
    if (!match || match.status !== 'in_progress') {
      return res.status(404).json({ message: 'Match not found or not in progress' });
    }

    const now = new Date();
    if (now > match.endTime) {
      match.status = 'completed';
      await match.save();
      return res.json({ message: 'Match completed', match });
    }

    const isChallenger = req.user.id === match.challenger.toString();
    const problems = isChallenger ? match.challengerProblems : match.challengedProblems;
    
    
    const currentProblem = problems[problems.length - 1];
    currentProblem.userAnswer = parseInt(answer);
    currentProblem.answeredAt = now;

    if (currentProblem.userAnswer === currentProblem.correctAnswer) {
      if (isChallenger) {
        match.challengerScore += 1;
      } else {
        match.challengedScore += 1;
      }
    }

    const nextProblem = generateProblem();
    if (isChallenger) {
      match.challengerProblems.push(nextProblem);
    } else {
      match.challengedProblems.push(nextProblem);
    }

    await match.save();
    res.json({
      match,
      nextProblem,
      isCorrect: currentProblem.userAnswer === currentProblem.correctAnswer
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.get('/:matchId', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate('challenger challenged', 'username');
    
    if (!match) {
      return res.status(404).json({ message: 'match not found' });
    }

    if (match.status === 'in_progress' && new Date() > match.endTime) {
      match.status = 'completed';
      await match.save();
    }

    res.json(match);
  } catch (err) {
    res.status(500).send('server error');
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
      .populate('challenger challenged', 'username') // Get usernames of both players
      .sort({ createdAt: -1 }) // Most recent first
      .limit(20); // Limit to last 20 matches
  
      // Format the matches for frontend display
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
  

  router.get('/history/:matchId', auth, async (req, res) => {
    try {
      const match = await Match.findById(req.params.matchId)
        .populate('challenger challenged', 'username');
  
      if (!match) {
        return res.status(404).json({ message: 'match not found' });
      }
  

      if (match.challenger._id.toString() !== req.user.id && 
          match.challenged._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'not authorized to view this match' });
      }
  
      const isChallenger = match.challenger._id.toString() === req.user.id;
      const matchDetails = {
        id: match._id,
        opponent: isChallenger ? match.challenged.username : match.challenger.username,
        userScore: isChallenger ? match.challengerScore : match.challengedScore,
        opponentScore: isChallenger ? match.challengedScore : match.challengerScore,
        status: match.status,
        duration: match.duration,
        date: match.createdAt,
        // problems: isChallenger ? match.challengerProblems : match.challengedProblems,
        won: match.status === 'completed' ? 
          (isChallenger ? 
            match.challengerScore > match.challengedScore : 
            match.challengedScore > match.challengerScore) 
          : null
      };
  
      res.json(matchDetails);
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

router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await User.getLeaderboard(10);
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;