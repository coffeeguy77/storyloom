/** @type {import('next').NextConfig} */
const nextConfig = {
    
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
