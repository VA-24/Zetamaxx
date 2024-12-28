const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  lookingForMatch: {
    type: Boolean,
    default: false
  },
  elo: {
    type: Number,
    default: 1000
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  singleplayerResults: [{
    score: Number,
    timestamp: Date,
  }],
  multiplayerResults: [{
    finalScore: {'challengerScore': Number, 'challengedScore': Number},
    timestamp: Date,
    players: {'challenger': String, 'challenged': String},
    rating: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.statics.updateEloRatings = async function(winnerId, loserId, isDraw = false) {
    const K = 32;
    
    const winner = await this.findById(winnerId);
    const loser = await this.findById(loserId);
    
    if (!winner || !loser) {
      throw new Error('User not found');
    }

    const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winner.elo - loser.elo) / 400));
  
    const actualWinner = isDraw ? 0.5 : 1;
    const actualLoser = isDraw ? 0.5 : 0;

    winner.elo = Math.round(winner.elo + K * (actualWinner - expectedWinner));
    loser.elo = Math.round(loser.elo + K * (actualLoser - expectedLoser));
  
    await Promise.all([winner.save(), loser.save()]);
    
    return { winner, loser };
  };

  userSchema.methods.updateAverageScore = async function(newScore) {
    this.gamesPlayed += 1;
    
    const totalOldScore = this.averageScore * (this.gamesPlayed - 1);
    this.averageScore = Math.round((totalOldScore + newScore) / this.gamesPlayed);
    
    await this.save();
    return this;
  };


  userSchema.statics.getLeaderboard = async function() {
    return await this.find({ gamesPlayed: { $gt: 0 } })
      .select('username elo averageScore gamesPlayed')
      .sort({ elo: -1 })
  };

module.exports = mongoose.model('User', userSchema);