/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use standalone output in production
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
