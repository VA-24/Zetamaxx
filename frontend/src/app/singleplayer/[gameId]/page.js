'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function generateProblem() {
  const operators = ['+', '–', '×', '÷'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let firstNumber, secondNumber, correctAnswer;

  switch(operator) {
    case '+':
      firstNumber = Math.floor(Math.random() * 99) + 2;
      secondNumber = Math.floor(Math.random() * 99) + 2;
      if (secondNumber > firstNumber) {
        [firstNumber, secondNumber] = [secondNumber, firstNumber];
      }
      correctAnswer = firstNumber + secondNumber;
      break;
    case '–':
      firstNumber = Math.floor(Math.random() * 199) + 2;
      secondNumber = Math.floor(Math.random() * (firstNumber - 1)) + 1;
      correctAnswer = firstNumber - secondNumber;
      break;
    case '×':
      firstNumber = Math.floor(Math.random() * 11) + 2;
      secondNumber = Math.floor(Math.random() * 99) + 2;
      if (secondNumber > firstNumber) {
        [firstNumber, secondNumber] = [secondNumber, firstNumber];
      }
      correctAnswer = firstNumber * secondNumber;
      break;
    case '÷':
      secondNumber = Math.floor(Math.random() * 11) + 2;
      correctAnswer = Math.floor(Math.random() * 84) + 2;
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
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const endGameRef = useRef(false);

  useEffect(() => {
    const initialProblems = Array(200).fill(null).map(() => generateProblem());
    setProblems(initialProblems);
    setGameStatus('playing');
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1 && !endGameRef.current) {
          clearInterval(timer);
          endGameRef.current = true;
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const endGame = async () => {
    if (isSubmitting || gameStatus === 'completed') return;
    
    setIsSubmitting(true);
    setGameStatus('completed');

    const finalScore = await new Promise(resolve => {
      setScore(currentScore => {
        resolve(currentScore);
        return currentScore;
      });
    });



    const endTime = new Date().toISOString();

    try {
      const response = await fetch('/api/matches/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({
          score: finalScore,
          timestamp: endTime
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit score');
      }

      const data = await response.json();
      console.log('Score submitted:', data);
    } catch (error) {
      console.error('Error ending game:', error);
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="min-h-screen">
      <div className="flex justify-between px-8 pt-4">
        <p className="text-xl">Seconds left: {timeLeft}</p>
        <h2 className="text-xl">Score: {score}</h2>
      </div>

      <div className="w-full bg-gray-200 py-4 mt-52 justify-center">
    {currentProblem && gameStatus === 'playing' && (
          <div className="flex items-center justify-center space-x-4">
            <div className="text-4xl">
              {currentProblem.firstNumber} {currentProblem.operator} {currentProblem.secondNumber} = 
            </div>
            
            <input
              value={answer}
              onChange={handleAnswerChange}
              className="w-32 p-2 border rounded text-4xl"
              autoFocus
            />
          </div>
        )}

    {gameStatus === 'completed' && (
          <div className="text-center">
            <h2 className="text-4xl mb-2">Score: {score}</h2>
            <p 
              className="text-blue-800 underline cursor-pointer text-sm"
              onClick={() => router.push('/')}
            >
              Try again?
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
