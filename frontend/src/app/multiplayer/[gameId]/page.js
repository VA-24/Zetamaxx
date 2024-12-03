'use client';
import { useState, useEffect, useRef } from 'react';
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
      firstNumber = Math.floor(seededRandom(seed + 1) * 99) + 2;
      secondNumber = Math.floor(seededRandom(seed + 2) * 99) + 2;
      if (secondNumber > firstNumber) {
        [firstNumber, secondNumber] = [secondNumber, firstNumber];
      }
      correctAnswer = firstNumber + secondNumber;
      break;
    case '–':
      firstNumber = Math.floor(seededRandom(seed + 1) * 199) + 2;
      secondNumber = Math.floor(seededRandom(seed + 2) * (firstNumber - 1)) + 1;
      correctAnswer = firstNumber - secondNumber;
      break;
    case '×':
      firstNumber = Math.floor(seededRandom(seed + 1) * 11) + 2;
      secondNumber = Math.floor(seededRandom(seed + 2) * 99) + 2;
      if (secondNumber > firstNumber) {
        [firstNumber, secondNumber] = [secondNumber, firstNumber];
      }
      correctAnswer = firstNumber * secondNumber;
      break;
    case '÷':
      secondNumber = Math.floor(seededRandom(seed + 1) * 11) + 2;
      correctAnswer = Math.floor(seededRandom(seed + 2) * 84) + 2;
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
  const endGameRef = useRef(false);

  //joinmatch
  useEffect(() => {
    const joinMatch = async () => {
      try {
        const response = await fetch(`/api/matches/${params.gameId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to join match');
        }
      } catch (error) {
        console.error('Error joining match:', error);
      }
    };
    joinMatch();
  }, [params.gameId]);

  //start match
  useEffect(() => {
    if (gameStatus === 'playing') return;

    const checkMatchStatus = setInterval(async () => {
      try {
        const response = await fetch(`/api/matches/${params.gameId}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          }
        });
        const match = await response.json();
        
        if (match.challenger && match.challenged) {
          setMatchData(match);
          setGameStatus('playing');
          console.log('opponent joined - match started')
          
          const initialProblems = Array(200).fill(null).map((_, i) => 
            generateProblem(match.seed + i)
          );
          setProblems(initialProblems);
        }
      } catch (error) {
        console.error('Error checking match status:', error);
      }
    }, 1000);

    return () => clearInterval(checkMatchStatus);
  }, [gameStatus, params.gameId]);

  //set opponent score
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/matches/${params.gameId}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          }
        });
        const match = await response.json();
        const isChallenger = match.challenger === matchData?.challenger;
        setOpponentScore(isChallenger ? match.challengedScore : match.challengerScore);
      } catch (error) {
        console.error('Error polling match:', error);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [gameStatus, params.gameId, matchData]);

  //timer
  useEffect(() => {
    if (gameStatus !== 'playing' || !matchData?.startTime) return;

    const calculateTimeLeft = () => {
      const startTime = new Date(matchData.startTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(120 - elapsed, 0);
      
      if (remaining === 0 && !endGameRef.current) {
        endGameRef.current = true;
        endGame();
      }
      
      return remaining;
    };

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
    }, 100);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [gameStatus, matchData?.startTime]);

  //complete game
  const endGame = async () => {
    if (gameStatus !== 'playing') return;
    setGameStatus('completed');

    try {
      const response = await fetch(`/api/matches/${params.gameId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        }
      });

      if (!response.ok) {
        throw new Error('Failed to complete match');
      }

      const match = await response.json();
      const isChallenger = match.challenger === matchData?.challenger;
      const playerScore = isChallenger ? match.challengerScore : match.challengedScore;
      const opponentFinalScore = isChallenger ? match.challengedScore : match.challengerScore;

      setGameResult({
        won: playerScore > opponentFinalScore,
        isDraw: playerScore === opponentFinalScore
      });
    } catch (error) {
      console.error('Error completing match:', error);
    }
  };

  //answer logic
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
    <div className="text-center">
      {gameStatus === 'waiting' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">Waiting for opponent...</h2>
        </div>
      )}

      {gameStatus === 'playing' && (
        <div className="flex justify-between items-center mb-8 px-8 pt-4">
          <p className="text-xl">Seconds left: {timeLeft}</p>
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Your score: {score}</h2>
            <h2 className="text-xl">Opponent's score: {opponentScore}</h2>
          </div>
          
        </div>
      )}

      
    <div className="w-full bg-gray-200 py-4 mt-52 justify-center">
      {gameStatus === 'playing' && currentProblem && (
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
            <h2 className="text-md font-bold mb-4">
              {gameResult?.won ? 'You win' : gameResult?.isDraw ? "It's a draw" : 'You lose'}
            </h2>
            <p className="mb-2 text-md">Your Score: {score}</p>
            <p className="mb-2 text-md">Opponent's Score: {opponentScore}</p>
            <button
              onClick={() => router.push('/multiplayer')}
              className="game-button text-sm underline text-blue-800"
            >
              Try again
            </button>
          </div>

      )}
      </div>
    </div>
  );
}
