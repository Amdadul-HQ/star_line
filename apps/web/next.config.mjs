/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@starline/shared', '@starline/i18n'],
  // Leaflet map containers don't survive React 18 strict-mode double mounting
  // in dev; realtime sockets also behave better without it. Re-enable once
  // react-leaflet v5 lands with the app's React 19 upgrade.
  reactStrictMode: false,
};

export default nextConfig;
