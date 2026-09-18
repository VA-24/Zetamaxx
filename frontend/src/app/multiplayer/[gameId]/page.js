'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSocket } from '../../../lib/socket';

export default function Game() {
  const router = useRouter();
  const { gameId } = useParams();
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [isMatchEnded, setIsMatchEnded] = useState(false);
  const [isGameFull, setIsGameFull] = useState(false);
  // Server-issued deadline, in local clock terms.
  const endsAtRef = useRef(null);

  // Room membership: take (or retake, after a reconnect) our seat while
  // mounted, and give it up when leaving the page. The server pushes every
  // state change; nothing is polled.
  useEffect(() => {
    const socket = getSocket();
    const unsubscribe = [
      socket.whenOpen(() => socket.send({ type: 'join', matchId: gameId })),
      socket.on('full', () => setIsGameFull(true)),
      // Sent when the match starts and as a snapshot on rejoin.
      socket.on('match_start', (msg) => {
        endsAtRef.current = Date.now() + msg.remainingMs;
        setProblems(msg.problems);
        setScore(msg.you);
        setCurrentProblemIndex(msg.you);
        setOpponentScore(msg.opponent);
        setIsMatchEnded(false);
        setGameStatus('playing');
      }),
      socket.on('score', (msg) => setOpponentScore(msg.opponent)),
      socket.on('match_end', (msg) => {
        setScore(msg.you);
        setOpponentScore(msg.opponent);
        setIsMatchEnded(true);
        setGameStatus('completed');
      }),
    ];

    return () => {
      unsubscribe.forEach((off) => off());
      socket.send({ type: 'leave' });
    };
  }, [gameId]);

  //timer
  useEffect(() => {
    if (gameStatus !== 'playing' || isMatchEnded) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        // Stop taking input now; the server's match_end carries final scores.
        setGameStatus('completed');
        setIsMatchEnded(true);
      }
    };

    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [gameStatus, isMatchEnded]);

  //answer logic
  const handleAnswerChange = (e) => {
    const newAnswer = e.target.value;
    setAnswer(newAnswer);

    if (gameStatus !== 'playing') return;

    const currentProblem = problems[currentProblemIndex];
    if (currentProblem && parseInt(newAnswer) === currentProblem.correctAnswer) {
      setScore(prev => prev + 1);
      setCurrentProblemIndex(prev => prev + 1);
      setAnswer('');

      getSocket().send({ type: 'answer', index: currentProblemIndex, value: currentProblem.correctAnswer });
    }
  };

  const currentProblem = problems[currentProblemIndex];

  return (
    <div className="text-center">

  {isGameFull ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">This game is full</h2>
          <button
            onClick={() => router.push('/multiplayer')}
            className="game-button text-sm underline text-blue-800"
          >
            Return to Homepage
          </button>
        </div>
      ) : (
        <>

      {gameStatus === 'waiting' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">Waiting for opponent...</h2>
        </div>
      )}

      {gameStatus === 'playing' && !isMatchEnded && (
        <>
          <div className="flex justify-between items-center mb-8 px-8 pt-4">
            <p className="text-xl">Seconds left: {timeLeft}</p>
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold">Your score: {score}</h2>
              <h2 className="text-xl">Opponent&apos;s score: {opponentScore}</h2>
            </div>
          </div>

          <div className="w-full bg-gray-200 py-4 mt-52 justify-center">
            {currentProblem && (
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
          </div>
        </>
      )}
      
      
      {(gameStatus === 'completed' || isMatchEnded) && (
        <div className="w-full bg-gray-200 py-4 mt-52 justify-center">
        <div className="text-center">

          <p className="text-md mb-4 font-bold">You: {score} | Opponent: {opponentScore}</p>
          <button
            onClick={() => router.push('/multiplayer')}
            className="game-button text-sm underline text-blue-800"
          >
            Play Again
          </button>
        </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
