import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/KMRFrontend' : '',
  images: {
    unoptimized: true
  },
  // GitHub Pages için özel yapılandırma
  assetPrefix: process.env.NODE_ENV === 'production' ? '/KMRFrontend/' : '',
  // Build sırasında hataları görmezden gel
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;