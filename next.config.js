/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
    appDir: true,
      },
        images: {
    remotePatterns: [
{
        protocol: 'https',
                  hostname: 'fal.media',
                  port: '',
                  pathname: '/**',
          },
          ],
      },
      }

      module.exports = nextConfig
