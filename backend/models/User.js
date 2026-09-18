const mongoose = require('mongoose');

// Accounts are username + password only. Older documents still carry an
// `email` field from before; it is ignored, and index.js syncs indexes at boot
// so the old unique index on it is dropped.
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  elo: { type: Number, default: 1000 },
  // Running average is maintained atomically in routes/matches.js.
  singleplayerGamesPlayed: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  singleplayerResults: [{ score: Number, timestamp: Date }],
  multiplayerResults: [{
    finalScore: { challengerScore: Number, challengedScore: Number },
    timestamp: Date,
    players: { challenger: String, challenged: String },
    rating: Number,
  }],
  createdAt: { type: Date, default: Date.now },
});

// Ranked list of everyone who has played at least one multiplayer match.
// Games played is derived from the results array so it can never drift.
userSchema.statics.leaderboard = function leaderboard() {
  return this.aggregate([
    { $match: { 'multiplayerResults.0': { $exists: true } } },
    {
      $project: {
        username: 1,
        elo: 1,
        averageScore: 1,
        multiplayerGamesPlayed: { $size: '$multiplayerResults' },
      },
    },
    { $sort: { elo: -1 } },
  ]);
};

module.exports = mongoose.model('User', userSchema);
