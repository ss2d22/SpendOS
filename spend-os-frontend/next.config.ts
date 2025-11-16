import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Acknowledge that we are using webpack config with Turbopack
  turbopack: {},
  webpack: (config, { isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;
