/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow reading config/ and docs/ from the project root as static imports
  webpack(config) {
    return config;
  },
};

module.exports = nextConfig;
