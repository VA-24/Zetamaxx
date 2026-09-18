'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSession } from '../../lib/session';

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!getSession()) {
        setLoggedOut(true);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });

        if (response.status === 401) {
          setLoggedOut(true);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const heading = loggedOut
    ? 'Log in to see stats'
    : loadError
      ? 'Unable to load stats'
      : `${userData.username}'s Profile`;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">
          {heading}
        </h1>
        <p className="text-sm mb-8 text-center">
          <Link href="/">Home</Link>
        </p>

        {userData && (
          <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Singleplayer Section */}
          <div className="bg-gray-200 p-6 rounded-lg shadow">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold mb-2">Singleplayer Stats</h2>
              <p className="text-xl font-bold">
                Average Score: {userData?.averageScore || 0}
              </p>
            </div>

            <div className="space-y-2">
              {userData?.singleplayerResults?.map((result, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-2"
                >
                  <div className="flex justify-between bg-gray-300 border rounded items-center px-3 py-2">
                    <span className="text-lg font-semibold">
                      Score: {result.score}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(result.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multiplayer Section */}
          <div className="bg-gray-200 mx-2 p-6 rounded-lg shadow">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold mb-2">Multiplayer Stats</h2>
              <p className="text-xl font-bold">
                Current Rating: {userData?.elo || 1000}
              </p>
            </div>

            <div className="space-y-4">
              {userData?.multiplayerResults?.map((match, index) => (
                <div 
                  key={index} 
                  className="bg-gray-300 border rounded-lg p-2 "
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">
                        {match.players.challenger} vs {match.players.challenged}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>
                        {match.finalScore.challengerScore} - {match.finalScore.challengedScore}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(match.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
