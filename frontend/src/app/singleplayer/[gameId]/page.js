'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function Game({ params }) {
  const router = useRouter();
  const { gameId } = params;
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameStatus, setGameStatus] = useState('waiting');

  useEffect(() => {
    const initialProblems = Array(200).fill(null).map(() => generateProblem());
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
  }, []);

  const endGame = async () => {
    setGameStatus('completed');
    try {
      await fetch('/api/matches/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({
          matchId: gameId,
          score,
          problemsSolved: currentProblemIndex
        })
      });
    } catch (error) {
      console.error('Error ending game:', error);
    }
    router.push('/');
  };

  const handleAnswerChange = (e) => {
    const newAnswer = e.target.value;
    setAnswer(newAnswer);

    if (gameStatus !== 'playing') return;

    const currentProblem = problems[currentProblemIndex];
    if (parseInt(newAnswer) === currentProblem.correctAnswer) {
      setScore(prev => prev + 1);
      setCurrentProblemIndex(prev => prev + 1);
      setAnswer('');
    }
  };

  const currentProblem = problems[currentProblemIndex];

  return (
    <div className="text-center p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Score: {score}</h2>
        <p className="text-xl">Time Left: {timeLeft}s</p>
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
    </div>
  );
}
