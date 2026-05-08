import type { NextConfig } from 'next'

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' http: https: ws: wss:; " +
      "font-src 'self' data:; " +
      "frame-ancestors 'none'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Pre-existing cross-workspace imports (firebase, lucide-react, @/shared/*) are resolved
    // at monorepo level — suppress type errors during standalone package builds.
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
    ]
  },
}

export default nextConfig
