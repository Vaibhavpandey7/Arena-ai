/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Compression & Minification ─────────────────────────────────────────────
  // Enables gzip/brotli compression on all server responses (HTML, JSON, SSE)
  compress: true,

  // Use SWC (Rust-based) compiler for faster, smaller JS bundles
  swcMinify: true,

  // Remove the X-Powered-By header (security + ~20 bytes per response)
  poweredByHeader: false,

  // ── Image Optimization ─────────────────────────────────────────────────────
  images: {
    // Serve AVIF (smallest) with WebP fallback for all next/image usage
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for 1 hour on CDN / browser
    minimumCacheTTL: 3600,
  },

  // ── CDN Support ────────────────────────────────────────────────────────────
  // If NEXT_PUBLIC_CDN_URL is set (e.g. https://cdn.example.com), all static
  // assets (_next/static/*) are served from CDN. Leave unset for localhost.
  assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || "",

  // ── CSS Optimization ───────────────────────────────────────────────────────
  // Inlines critical (above-the-fold) CSS into the <head> and defers the rest.
  // Uses critters internally. Eliminates the render-blocking 143KB globals.css.
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;

