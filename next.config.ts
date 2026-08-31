import type { NextConfig } from "next";

function getApiOrigin() {
  const apiOrigin = process.env.API_ORIGIN?.replace(/\/$/, "");
  if (apiOrigin) return apiOrigin;

  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!publicApiUrl) return undefined;

  try {
    return new URL(publicApiUrl).origin;
  } catch {
    return undefined;
  }
}

const apiOrigin = getApiOrigin();

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiOrigin) return [];

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${apiOrigin}/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;
