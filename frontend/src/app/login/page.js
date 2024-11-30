'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', formData.username);
      router.push('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main class="flex min-h-screen flex-col items-center justify-center p-8">
      <div class="w-full max-w-md">
        <h1 class="text-4xl font-bold mb-8 text-center">Login</h1>
        
        {error && (
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4 mb-4">
          <div>
            <label htmlFor="username" class="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              class="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label htmlFor="password" class="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              class="w-full p-2 border rounded"
              required
            />
          </div>

          <button
            type="submit"
          >
            Login
          </button>
        </form>

          <Link href="/register">
            Create an account instead
          </Link>

      </div>
    </main>
  );
}
