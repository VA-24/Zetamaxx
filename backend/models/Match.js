const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  firstNumber: Number,
  secondNumber: Number,
  operator: {
    type: String,
    enum: ['+', '–', '×', '÷']
  },
  correctAnswer: Number,
  userAnswer: Number,
  answeredAt: Date
});

const matchSchema = new mongoose.Schema({
  _id: String,
  challenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  challenged: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  duration: {
    type: Number,
    enum: [30, 60, 120],
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'ready', 'in_progress', 'completed'],
    default: 'waiting'
  },
  challengerProblems: [problemSchema],
  challengedProblems: [problemSchema],
  challengerScore: {
    type: Number,
    default: 0
  },
  challengedScore: {
    type: Number,
    default: 0
  },
  startTime: Date,
  endTime: Date,
  seed: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('Match', matchSchema);