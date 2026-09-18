'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function SinglePlayer() {
  const router = useRouter();
  const [duration, setDuration] = useState(120);

  // Singleplayer runs entirely in the browser; the result is posted when it ends.
  const startGame = () => {
    router.push(`/singleplayer/${uuidv4()}`);
  };

  return (
    <main className="text-center p-8">
      <h1 className="text-4xl font-bold mb-8">Single Player</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
        {[30, 60, 120].map((time) => (
          <div
            key={time}
            onClick={() => setDuration(time)}
            className={`game-option ${duration === time ? 'bg-[#4a90e2] text-white' : ''}`}
          >
            <h3 className="font-bold mb-2">{time} Seconds</h3>
            <p>{time === 30 ? 'Quick' : time === 60 ? 'Standard' : 'Extended'}</p>
          </div>
        ))}
      </div>

      <button
        onClick={startGame}
        className="game-button mx-auto"
      >
        Start Game
      </button>
    </main>
  );
}
