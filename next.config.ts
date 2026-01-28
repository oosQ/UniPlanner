import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.uob.edu.bh',
            },
            {
                protocol: 'http',
                hostname: '*.uob.edu.bh',
            },
            {
                protocol: 'https',
                hostname: 'uobhomesiteprod.s3.me-south-1.amazonaws.com',
            }
        ],
    },
};

export default nextConfig;
