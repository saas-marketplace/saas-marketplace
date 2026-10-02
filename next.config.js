/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
        pathname: "/**",
      },
    ],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 820, 1080, 1200, 1920, 2048],
    imageSizes: [16, 48, 96, 128, 256, 384],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  output: "standalone",
  webpack: (config, { isServer }) => {
    // Optimize client cache to avoid large string serialization warnings
    if (!isServer) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: path.resolve(__dirname, '.next/cache/webpack'),
        store: 'pack',
        compression: 'gzip', // compress cache files
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
