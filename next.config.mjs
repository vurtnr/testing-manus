/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-to-img', 'canvas'],
  webpack: (config) => {
    // pdfjs-dist canvas handling
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
