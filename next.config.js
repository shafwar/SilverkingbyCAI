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
    // Log invalid image requests instead of silently returning null — surfaces
    // broken asset paths (e.g. hero-fallback.jpg) without causing 5xx responses.
    onError(err) {
      console.error("[next/image] validation error:", err.message, "| url:", err.url ?? "unknown");
    },
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
  reactStrictMode: true,
  // Keep native canvas bindings out of the webpack graph (API routes only).
  serverExternalPackages: ["canvas", "@napi-rs/canvas"],
  // Optimize page loading and prefetching
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const nativeCanvasPackages = [
        "canvas",
        "@napi-rs/canvas",
        "@napi-rs/canvas/node-canvas",
      ];
      config.externals = config.externals || [];
      for (const pkg of nativeCanvasPackages) {
        if (!config.externals.includes(pkg)) {
          config.externals.push(pkg);
        }
      }
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
