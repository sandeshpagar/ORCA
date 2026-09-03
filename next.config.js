const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin workspace root strictly to D:\ORCA so Turbopack does not detect D:\package-lock.json
  // or attempt to load stray files like D:\src\middleware.ts outside of this project.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "contribution.usercontent.google.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
