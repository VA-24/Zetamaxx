// REST calls are proxied through the Next.js server so the browser only talks
// to this origin. WebSockets can't be proxied by rewrites, so the game socket
// connects to the backend directly via NEXT_PUBLIC_WS_URL (see src/lib/socket.js).
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

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
