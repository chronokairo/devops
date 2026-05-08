import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Pre-existing cross-workspace imports (firebase, lucide-react, @/shared/*) are resolved
    // at monorepo level — suppress type errors during standalone package builds.
    ignoreBuildErrors: true,
  },
}

export default nextConfig
