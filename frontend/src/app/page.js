'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Analytics } from "@vercel/analytics/react"
import { getSession } from '../lib/session';

export default function Home() {
  const router = useRouter();
  // undefined until localStorage has been read (after hydration), then
  // null when logged out or { username } when logged in.
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const startSinglePlayer = () => {
    const gameId = crypto.randomUUID();
    router.push(`/singleplayer/${gameId}`);
  };

  const heading = session === undefined
    ? '\u00a0'
    : session === null
      ? 'Log in to get started'
      : `Welcome to zetamaxx${session.username ? `, ${session.username}` : ''}`;

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gray-200 p-8 w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          {heading}
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
        <p className="text-sm mt-8">
          Inspired by <a href="https://zetamac.com">zetamac.com</a>
        </p>
      </div>
      <Analytics />
    </main>
  );
}