/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/embed/(.*)',
        headers: [
          // Allow embedding in any site — modern browsers respect frame-ancestors over X-Frame-Options
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
    ]
  },
}

export default nextConfig
