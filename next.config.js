const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Optimize prefetching for faster navigation
    optimizePackageImports: ["lucide-react", "framer-motion"],
    // Disabled optimizeCss - requires 'critters' package and causes build errors
    // optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  swcMinify: true,
  reactStrictMode: true,
  // Optimize page loading and prefetching
  poweredByHeader: false,
  compress: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      if (!config.externals.includes("@napi-rs/canvas")) {
        config.externals.push("@napi-rs/canvas");
      }
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
