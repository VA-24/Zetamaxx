'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

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

  // matchmaking polling
  useEffect(() => {
    let pollInterval;
    if (isMatchmaking) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/matchmaking/search', {
            headers: {
              'x-auth-token': localStorage.getItem('token')
            }
          });
          const data = await response.json();
          
          if (data.found) {
            setIsMatchmaking(false);
            router.push(`/multiplayer/${data.matchId}`);
          }
        } catch (error) {
          console.error('Error checking matchmaking status:', error);
        }
      }, 2000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isMatchmaking, router]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMatchmaking) {
        fetch('/api/matchmaking/cancel', {
          method: 'POST',
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        }).catch(console.error);
      }
    };
  }, [isMatchmaking]);

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
          seed: Math.floor(Math.random() * 1000000),
          challenger: null,
          challenged: null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create match');
      }
      
      const link = `${window.location.origin}/multiplayer/${gameId}`;
      setGeneratedLink(link);
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Failed to create match: ' + error.message);
    }
  };

  const findRandomMatch = async () => {
    try {
      setIsMatchmaking(true);
      const response = await fetch('/api/matchmaking/initiate', {
        method: 'POST',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start matchmaking');
      }
    } catch (error) {
      console.error('Error starting matchmaking:', error);
      setIsMatchmaking(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gray-200 p-8 w-full max-w-lg mx-auto transition-all duration-200">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Multiplayer
        </h1>
        <p className="text-sm mb-8 text-center"><a href='/'>Home</a></p>
        
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
                  onClick={() => {
                    setIsMatchmaking(false);
                    fetch('/api/matchmaking/cancel', {
                      method: 'POST',
                      headers: {
                        'x-auth-token': localStorage.getItem('token')
                      }
                    }).catch(console.error);
                  }}
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
                      {user.gamesPlayed}
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
