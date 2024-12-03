'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function MultiPlayer() {
  const router = useRouter();
  const [generatedLink, setGeneratedLink] = useState('');

  const generateLink = async () => {
    const gameId = uuidv4();
    try {
      const response = await fetch('/api/matches/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({
          matchId: gameId,
          duration: 120,
          status: 'waiting',
          seed: Math.floor(Math.random() * 1000000)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create match');
      }
      
      const link = `${window.location.origin}/multiplayer/${gameId}`;
      setGeneratedLink(link);
    } catch (error) {
      console.error('Error creating match:', error);
    }
  };

  const findRandomMatch = async () => {
    try {
      const response = await fetch('/api/matches/available-players', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch available players');
      }

      const players = await response.json();
      if (players.length === 0) {
        alert('No players available right now');
        return;
      }

      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      const matchResponse = await fetch('/api/matches/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({
          challengedId: randomPlayer._id,
          duration: 120
        })
      });

      const match = await matchResponse.json();
      router.push(`/multiplayer/${match.id}`);
    } catch (error) {
      console.error('Error finding match:', error);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gray-200 p-8 w-full max-w-lg mx-auto transition-all duration-200">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Multiplayer
        </h1>
        
        <div className="flex flex-row justify-center gap-8">
          <div className="flex flex-col items-center">
            <button 
              onClick={generateLink}
              className="game-button w-48"
            >
              Vs. friend
            </button>
            {generatedLink && (
              <div className="mt-4 p-4 bg-white rounded-lg">
                <p className="mb-2 font-semibold">Share this link:</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={generatedLink} 
                    readOnly 
                    className="w-full p-2 border rounded"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedLink)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={findRandomMatch}
            className="game-button w-48 h-fit"
          >
            Vs. random
          </button>
        </div>
      </div>
    </main>
  );
}
