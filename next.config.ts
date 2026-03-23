import type { NextConfig } from "next";

const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL
  ? new URL(process.env.NEXT_PUBLIC_STORAGE_URL)
  : null;

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: false,
  images: {
    remotePatterns: storageUrl
      ? [
          {
            protocol: storageUrl.protocol.replace(":", "") as "http" | "https",
            hostname: storageUrl.hostname,
          },
        ]
      : [],
    dangerouslyAllowLocalIP: !storageUrl || storageUrl.hostname === "localhost",
  },
  experimental: {
    optimizePackageImports: [
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-text-align",
      "@tiptap/extension-underline",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@fullcalendar/core",
      "@fullcalendar/daygrid",
      "@fullcalendar/timegrid",
      "@fullcalendar/interaction",
      "@fullcalendar/react",
      "lucide-react",
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

export default nextConfig;
