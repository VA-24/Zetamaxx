'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const startSinglePlayer = () => {
    const gameId = uuidv4();
    router.push(`/singleplayer/${gameId}`);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gray-300 p-8 w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Welcome to zetamaxx{username ? `, ${username}` : ''}
        </h1>
        
        <div className="flex flex-row space-x-4">
          <button 
            onClick={() => router.push('/login')} 
            
          >
            Login/Register
          </button>

          <button 
            onClick={startSinglePlayer} 
          >
            Singleplayer
          </button>

          <button 
            onClick={() => router.push('/multiplayer')} 
          >
            Multiplayer
          </button>

          <button 
            onClick={() => router.push('/profile')} 
          >
            Profile
          </button>
        </div>
      </div>
    </main>
  );
}