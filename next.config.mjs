/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  outputFileTracingIncludes: {
    "/*": ["./.next/server/chunks/static/wasm/**/*.wasm"]
  },
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    };
    config.module.rules.push({
      test: /\.wasm$/i,
      type: "webassembly/async"
    });

    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
