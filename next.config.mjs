/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.FOODLOOP_API_URL || 'http://localhost:4000'
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
