// REST calls are proxied through the Next.js server so the browser only talks
// to this origin. WebSockets can't be proxied by rewrites, so the game socket
// connects to the backend directly via NEXT_PUBLIC_WS_URL (see src/lib/socket.js).
// Defaults are production; .env.local overrides them for local development.
const backendUrl = process.env.BACKEND_URL || 'https://zetamaxx-server.onrender.com';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
