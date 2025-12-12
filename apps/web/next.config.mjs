/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {},
  env: {
    ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://localhost:8000",
    MLFLOW_URL: process.env.MLFLOW_URL || "http://localhost:5000",
  },
  async rewrites() {
    return [
      {
        source: "/models/:path*",
        destination: `${process.env.MLFLOW_URL || "http://localhost:5000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
