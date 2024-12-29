/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'https://zetamaxx-server.vercel.app/api/:path*'
        }
      ]
    }
  }
  
  export default nextConfig