/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  },
}

export default nextConfig