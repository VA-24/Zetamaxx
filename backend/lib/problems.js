// Deterministic problem generation. The server generates every match's problem
// list from the room seed and sends it to both clients, so there is exactly one
// source of truth and no cross-engine floating point drift.

const OPERATORS = ['+', '–', '×', '÷'];

// mulberry32: small, fast, deterministic 32-bit PRNG.
function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Integer in [min, max].
function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Ranges match the original game (Zetamac defaults).
function generateProblem(rng) {
  const operator = OPERATORS[Math.floor(rng() * OPERATORS.length)];
  let firstNumber;
  let secondNumber;
  let correctAnswer;

  switch (operator) {
    case '+':
      firstNumber = randInt(rng, 2, 100);
      secondNumber = randInt(rng, 2, 100);
      if (secondNumber > firstNumber) [firstNumber, secondNumber] = [secondNumber, firstNumber];
      correctAnswer = firstNumber + secondNumber;
      break;
    case '–':
      firstNumber = randInt(rng, 2, 200);
      secondNumber = randInt(rng, 1, firstNumber - 1);
      correctAnswer = firstNumber - secondNumber;
      break;
    case '×':
      firstNumber = randInt(rng, 2, 12);
      secondNumber = randInt(rng, 2, 100);
      if (secondNumber > firstNumber) [firstNumber, secondNumber] = [secondNumber, firstNumber];
      correctAnswer = firstNumber * secondNumber;
      break;
    case '÷':
      secondNumber = randInt(rng, 2, 12);
      correctAnswer = randInt(rng, 2, 85);
      firstNumber = correctAnswer * secondNumber;
      break;
  }

  return { firstNumber, secondNumber, operator, correctAnswer };
}

function generateProblems(seed, count) {
  const rng = createRng(seed);
  const problems = new Array(count);
  for (let i = 0; i < count; i++) problems[i] = generateProblem(rng);
  return problems;
}

module.exports = { generateProblems };
