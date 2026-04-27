import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // API proxy is handled by app/api/proxy/[...path]/route.ts which
  // rewrites Set-Cookie paths so refresh-token cookies survive the
  // /api/proxy prefix.
  experimental: {
    optimizePackageImports: [
      "@tabler/icons-react",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-text-align",
      "@tiptap/extension-text-style",
      "@tiptap/extension-underline",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@ai-sdk/react",
      "@base-ui/react",
      "radix-ui",
      "sonner",
      "nuqs",
      "shiki",
      "streamdown",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
