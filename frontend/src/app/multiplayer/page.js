'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Analytics } from "@vercel/analytics/react"
import Link from 'next/link';
import { getSocket } from '../../lib/socket';

export default function MultiPlayer() {
  const router = useRouter();
  const [generatedLink, setGeneratedLink] = useState('');
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);


  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/auth/leaderboard');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        setLeaderboardUsers(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchLeaderboard();
  }, []);

  // matchmaking: sit in the server's queue while isMatchmaking is true. The
  // server pushes match_found; leaving the page or cancelling dequeues us.
  useEffect(() => {
    if (!isMatchmaking) return;

    const socket = getSocket();
    const unsubscribe = [
      socket.whenOpen(() => socket.send({ type: 'queue_join' })),
      socket.on('match_found', ({ matchId }) => {
        setIsMatchmaking(false);
        router.push(`/multiplayer/${matchId}`);
      }),
      socket.on('auth_error', () => setIsMatchmaking(false)),
    ];

    return () => {
      unsubscribe.forEach((off) => off());
      socket.send({ type: 'queue_leave' });
    };
  }, [isMatchmaking, router]);

  const generateLink = async () => {
    try {
      const { matchId } = await getSocket().request({ type: 'create_room' });
      const link = `${window.location.origin}/multiplayer/${matchId}`;
      setGeneratedLink(link);
    } catch (error) {
      console.error('Error creating match:', error);
      alert('You must log in before accessing multiplayer and the profile page;  ' + error.message);
    }
  };

  const findRandomMatch = () => {
    setIsMatchmaking(true);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gray-200 p-8 w-full max-w-lg mx-auto transition-all duration-200">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Multiplayer
        </h1>
        <p className="text-sm mb-8 text-center">
          <Link href="/">Home</Link>
        </p>
        
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

          <div className="flex flex-col items-center">
            <button 
              onClick={findRandomMatch}
              className={`game-button w-48 h-fit ${isMatchmaking ? 'opacity-50' : ''}`}
              disabled={isMatchmaking}
            >
              {isMatchmaking ? 'Finding Match...' : 'Vs. random'}
            </button>
            {isMatchmaking && (
              <div className="mt-4 text-center">
                <p>Matchmaking in progress...</p>
                <button 
                  onClick={() => setIsMatchmaking(false)}
                  className="text-red-500 underline mt-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 w-full max-w-lg mx-auto">
          <div className="bg-white overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Games</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(leaderboardUsers) && leaderboardUsers.map((user, index) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.elo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.multiplayerGamesPlayed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
