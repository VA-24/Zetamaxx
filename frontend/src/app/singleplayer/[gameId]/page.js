'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Game({ gameId, mode }) {
  const router = useRouter();
  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting');

  useEffect(() => {
    startGame();
    // Add game initialization logic
  }, []);

  const startGame = async () => {
    try {
      const response = await fetch(`/api/matches/${gameId}/start`, {
        method: 'POST',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProblem(data.problem);
        setGameStatus('playing');
        // Start timer
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const submitAnswer = async () => {
    if (!answer || gameStatus !== 'playing') return;

    try {
      const response = await fetch(`/api/matches/${gameId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ answer: parseInt(answer) })
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();

      if (data.message === 'Match completed') {
        setGameStatus('completed');
        router.push('/');
        return;
      }

      if (data.isCorrect) {
        setScore(prev => prev + 1);
      }

      setProblem(data.nextProblem);
      setAnswer('');
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  return (
    <div className="text-center p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Score: {score}</h2>
        <p className="text-xl">Time Left: {timeLeft}s</p>
      </div>

      {problem && (
        <div className="max-w-md mx-auto">
          <div className="text-4xl mb-8">
            {problem.firstNumber} {problem.operator} {problem.secondNumber}
          </div>
          
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
