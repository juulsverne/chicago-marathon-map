import type { NextConfig } from "next";

// The lab router (lab.elijahos.com) proxies /chicago-marathon-map/* to this
// origin at the same path, so every page and asset lives under this prefix.
// src/lib/base-path.ts holds the same value for client code (a unit test checks).
const BASE_PATH = "/chicago-marathon-map";

const isDev = process.env.NODE_ENV === "development";

// Next's prerendered App Router pages carry inline scripts and style attributes, so
// a nonce-free static page needs 'unsafe-inline' for both. MapLibre needs nothing
// beyond 'self': its worker, GeoJSON and label fonts are same-origin files, and the
// fonts load through fetch + FontFace (connect-src, not font-src). Dev adds
// 'unsafe-eval' for React's dev tooling.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/", destination: BASE_PATH, basePath: false, permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
      // As in v1: the share image is regenerated rarely and fetched by link-preview bots.
      { source: "/og.png", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      // MapLibre starts its worker as a module worker, which needs a JavaScript MIME type
      // (and nosniff forbids guessing). next start already serves .mjs that way; this pins
      // it for any host that might not.
      // The path carries MapLibre's version, so a file there never changes: cache it for a year.
      {
        source: "/vendor/maplibre/:version/:file*",
        headers: [
          { key: "Content-Type", value: "text/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
