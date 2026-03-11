/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages configuration
  basePath: '/saas-marketplace',
  trailingSlash: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
