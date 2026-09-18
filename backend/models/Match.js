const mongoose = require('mongoose');

// Record of a completed multiplayer match. Live match state is held in memory
// by ws/rooms.js; one document is written here when a match ends.
const matchSchema = new mongoose.Schema({
  _id: String,
  type: { type: String, enum: ['vsFriend', 'vsRandom'], required: true },
  challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challenged: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challengerScore: { type: Number, required: true },
  challengedScore: { type: Number, required: true },
  duration: { type: Number, required: true },
  seed: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
});

module.exports = mongoose.model('Match', matchSchema);
