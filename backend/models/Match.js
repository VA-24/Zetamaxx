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
  challenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challenged: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: Number,
    enum: [30, 60, 120],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
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
  endTime: Date
});

module.exports = mongoose.model('Match', matchSchema);