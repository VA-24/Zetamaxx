'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateProblem(seed) {
  const operators = ['+', '–', '×', '÷'];
  const operator = operators[Math.floor(seededRandom(seed) * operators.length)];
  let firstNumber, secondNumber, correctAnswer;

  switch(operator) {
    case '+':
      firstNumber = Math.floor(seededRandom(seed + 1) * 100);
      secondNumber = Math.floor(seededRandom(seed + 2) * 100);
      correctAnswer = firstNumber + secondNumber;
      break;
    // ... rest of the cases
  }

  return {
    firstNumber,
    secondNumber,
    operator,
    correctAnswer
  };
}

export default function Game({ params }) {
  // ... existing state variables ...
  const [matchData, setMatchData] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    const fetchMatch = async () => {
      const response = await fetch(`/api/matches/${params.gameId}`);
      const match = await response.json();
      setMatchData(match);
      
      const initialProblems = Array(200).fill(null).map((_, i) => 
        generateProblem(match.seed + i)
      );
      setProblems(initialProblems);
      setGameStatus('playing');
    };
    fetchMatch();
  }, [params.gameId]);

  const endGame = async () => {
    setGameStatus('completed');
    try {
      const response = await fetch(`/api/matches/${params.gameId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({
          score,
          problemsSolved: currentProblemIndex
        })
      });
      
      const result = await response.json();
      setGameResult(result);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  return (
    <div className="text-center p-8">
      {/* ... existing game UI ... */}
      
      {gameStatus === 'completed' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">
              {gameResult?.won ? 'You win' : 'You lose'}
            </h2>
            <p className="mb-4">Final Score: {score}</p>
            <button
              onClick={() => router.push('/multiplayer')}
              className="game-button"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
