import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.NODE_ENV === 'production' ? '/KMRFrontend' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/KMRFrontend/' : '',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
