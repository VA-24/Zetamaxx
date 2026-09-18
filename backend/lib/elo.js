const K = 32;

function expectedScore(rating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
}

// outcomeA is 1 (A won), 0.5 (draw) or 0 (A lost). Returns [newA, newB].
function updateElo(ratingA, ratingB, outcomeA) {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  const outcomeB = 1 - outcomeA;
  return [
    Math.round(ratingA + K * (outcomeA - expectedA)),
    Math.round(ratingB + K * (outcomeB - expectedB)),
  ];
}

module.exports = { updateElo };
