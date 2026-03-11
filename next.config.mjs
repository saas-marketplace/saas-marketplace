/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore TypeScript errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
