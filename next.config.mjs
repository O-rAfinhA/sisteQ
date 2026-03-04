/** @type {import('next').NextConfig} */
import path from 'node:path'

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  webpack: config => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      'react-router': path.resolve('./src/router.tsx'),
    }
    return config
  },
}

export default nextConfig
