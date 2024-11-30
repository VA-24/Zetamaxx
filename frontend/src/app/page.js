'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const router = useRouter();

  const startSinglePlayer = () => {
    const gameId = uuidv4();
    router.push(`/singleplayer/${gameId}`);
  };

  return (
    <main className="text-center">
      <h1 className="text-4xl font-bold mb-8">Arithmetic Practice</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-12">
        <button onClick={startSinglePlayer} className="game-button">
          Single Player
        </button>
        <button onClick={() => router.push('/multiplayer')} className="game-button">
          Multiplayer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="game-option">
          <h3 className="font-bold mb-2">30 Seconds</h3>
          <p>Quick Practice</p>
        </div>
        <div className="game-option">
          <h3 className="font-bold mb-2">60 Seconds</h3>
          <p>Standard Game</p>
        </div>
        <div className="game-option">
          <h3 className="font-bold mb-2">120 Seconds</h3>
          <p>Extended Play</p>
        </div>
      </div>
    </main>
  );
}