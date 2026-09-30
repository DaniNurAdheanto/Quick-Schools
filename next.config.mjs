import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Quick Schools Next.js Configuration
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**', 
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**', 
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**', 
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**', 
      }
    ],
  },
  output: 'standalone',
  async redirects() {
    return [
      // Base role roots -> /dashboard
      { source: '/admin', destination: '/dashboard', permanent: false },
      { source: '/guru', destination: '/dashboard', permanent: false },
      { source: '/teacher', destination: '/dashboard', permanent: false },
      { source: '/siswa', destination: '/dashboard', permanent: false },
      { source: '/student', destination: '/dashboard', permanent: false },
      { source: '/orang-tua', destination: '/dashboard', permanent: false },
      { source: '/parent', destination: '/dashboard', permanent: false },
      { source: '/super-admin', destination: '/dashboard', permanent: false },

      // Role subpaths -> /:path* (e.g. /admin/attendance -> /attendance)
      { source: '/admin/:path*', destination: '/:path*', permanent: false },
      { source: '/guru/:path*', destination: '/:path*', permanent: false },
      { source: '/teacher/:path*', destination: '/:path*', permanent: false },
      { source: '/siswa/:path*', destination: '/:path*', permanent: false },
      { source: '/student/:path*', destination: '/:path*', permanent: false },
      { source: '/orang-tua/:path*', destination: '/:path*', permanent: false },
      { source: '/parent/:path*', destination: '/:path*', permanent: false },
      { source: '/super-admin/:path*', destination: '/:path*', permanent: false },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    // Prevent server-side crash on optional native tfjs-node
    config.externals = [...(config.externals || []), '@tensorflow/tfjs-node'];

    // Resolve @vladmandic/human to the browser ESM build and neutralize tfjs-node
    config.resolve.alias = {
      ...config.resolve.alias,
      '@vladmandic/human': path.resolve(__dirname, 'node_modules/@vladmandic/human/dist/human.esm.js'),
      '@tensorflow/tfjs-node': false,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
