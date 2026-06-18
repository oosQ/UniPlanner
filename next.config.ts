import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pdfjs-dist'],
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
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        minimumCacheTTL: 60,
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
};

export default nextConfig;
