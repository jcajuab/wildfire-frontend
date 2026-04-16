import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api/proxy";

export async function POST(request: NextRequest): Promise<Response> {
  const aiProviderKey = request.headers.get("x-ai-provider-key");
  const authorization =
    request.headers.get("authorization") ??
    request.headers.get("Authorization");
  const extraHeaders: Record<string, string> = {};
  if (aiProviderKey) {
    extraHeaders["x-ai-provider-key"] = aiProviderKey;
  }

  return proxyToBackend({
    method: "POST",
    path: "/ai/chat",
    authorization,
    body: await request.text(),
    streamResponse: true,
    extraHeaders,
  });
}
