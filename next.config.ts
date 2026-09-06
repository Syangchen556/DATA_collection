import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Quick Tunnel hostnames change on every run. Permit their browser origin
  // while using the Next.js development server for phone camera capture.
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default nextConfig;
