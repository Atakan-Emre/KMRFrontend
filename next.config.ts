import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/KMRProject' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/KMRProject/' : '',
};

export default nextConfig;