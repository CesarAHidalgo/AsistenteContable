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
  async rewrites() {
    return [
      { source: "/resumen", destination: "/?tab=overview" },
      { source: "/movimientos", destination: "/?tab=transactions" },
      { source: "/recurrentes", destination: "/?tab=recurring" },
      { source: "/analisis", destination: "/?tab=analysis" },
      { source: "/deudas", destination: "/?tab=debts" },
      { source: "/tarjetas", destination: "/?tab=cards" },
      { source: "/simulacion", destination: "/?tab=simulation" },
      { source: "/recordatorios", destination: "/?tab=reminders" }
    ];
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
