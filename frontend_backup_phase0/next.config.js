/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // Required for optimal Docker builds
  transpilePackages: ['react-plotly.js', 'plotly.js'],
  webpack: (config) => {
    // Deck.gl / Mapbox / Plotly optimizations for Next.js
    config.resolve.fallback = { fs: false, path: false, crypto: false };
    config.resolve.alias = {
      ...config.resolve.alias,
      'plotly.js/dist/plotly': 'plotly.js-dist-min',
    };
    return config;
  },
};

module.exports = nextConfig;
