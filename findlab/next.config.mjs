/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "gray-matter", "node-ical"],
  },
};
export default nextConfig;
