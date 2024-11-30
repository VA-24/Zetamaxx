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
    case '–':
      firstNumber = Math.floor(seededRandom(seed + 1) * 100);
      secondNumber = Math.floor(seededRandom(seed + 2) * firstNumber);
      correctAnswer = firstNumber - secondNumber;
      break;
    case '×':
      firstNumber = Math.floor(seededRandom(seed + 1) * 12);
      secondNumber = Math.floor(seededRandom(seed + 2) * 12);
      correctAnswer = firstNumber * secondNumber;
      break;
    case '÷':
      secondNumber = Math.floor(seededRandom(seed + 1) * 11) + 1;
      correctAnswer = Math.floor(seededRandom(seed + 2) * 12);
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

export default function Game({ params }) {
  const router = useRouter();
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [matchData, setMatchData] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/matches/${params.gameId}`);
        const match = await response.json();
        const isChallenger = match.challenger === matchData?.challenger;
        setOpponentScore(isChallenger ? match.challengedScore : match.challengerScore);
      } catch (error) {
        console.error('Error polling match:', error);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [gameStatus, params.gameId, matchData]);

  useEffect(() => {
    const fetchMatch = async () => {
      const response = await fetch(`/api/matches/${params.gameId}`);
      const match = await response.json();
      setMatchData(match);
      setTimeLeft(match.duration);
      
      const initialProblems = Array(200).fill(null).map((_, i) => 
        generateProblem(match.seed + i)
      );
      setProblems(initialProblems);
      setGameStatus('playing');

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    };
    fetchMatch();
  }, [params.gameId]);

  const handleAnswerChange = (e) => {
    const newAnswer = e.target.value;
    setAnswer(newAnswer);

    if (gameStatus !== 'playing') return;

    const currentProblem = problems[currentProblemIndex];
    if (parseInt(newAnswer) === currentProblem.correctAnswer) {
      setScore(prev => prev + 1);
      setCurrentProblemIndex(prev => prev + 1);
      setAnswer('');

      fetch(`/api/matches/${params.gameId}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ score: score + 1 })
      }).catch(error => console.error('Error updating score:', error));
    }
  };

  const currentProblem = problems[currentProblemIndex];

  return (
    <div className="text-center p-8">
      <div className="mb-8">
        <div className="flex justify-center gap-8 mb-4">
          <h2 className="text-2xl font-bold">Your score: {score}</h2>
          <h2 className="text-2xl font-bold">Opponent's score: {opponentScore}</h2>
        </div>
        <p className="text-xl">Time left: {timeLeft}s</p>
      </div>

      {currentProblem && gameStatus === 'playing' && (
        <div className="max-w-md mx-auto">
          <div className="text-4xl mb-8">
            {currentProblem.firstNumber} {currentProblem.operator} {currentProblem.secondNumber}
          </div>
          
          <input
            type="number"
            value={answer}
            onChange={handleAnswerChange}
            className="w-full p-2 border rounded mb-4"
            autoFocus
          />
        </div>
      )}
      
      {gameStatus === 'completed' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">
              {gameResult?.won ? 'You win' : gameResult?.isDraw ? "It's a draw" : 'You lose'}
            </h2>
            <p className="mb-2">Your Score: {score}</p>
            <p className="mb-4">Opponent's Score: {opponentScore}</p>
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
