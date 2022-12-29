/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    modularizeImports: {
      lodash: {
        transform: 'lodash/{{member}}',
      },
      '@mui/material': {
        transform: '@mui/material/{{member}}',
      },
      '@mui/icons-material': {
        transform: '@mui/icons-material/{{member}}',
      },
      '@mui/system': {
        transform: '@mui/system/{{member}}',
      },
      '@mui/lab': {
        transform: '@mui/lab/{{member}}',
      },
    },
  },
}

module.exports = nextConfig
