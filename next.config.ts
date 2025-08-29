import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  },
  trailingSlash: true
};

export default nextConfig;
