import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/api/proxy";

export async function POST(request: NextRequest): Promise<Response> {
  const aiProviderKey = request.headers.get("x-ai-provider-key");
  const extraHeaders: Record<string, string> = {};
  if (aiProviderKey) {
    extraHeaders["x-ai-provider-key"] = aiProviderKey;
  }

  return proxyToBackend({
    method: "POST",
    path: "/ai/chat",
    authHeader: request.headers.get("Authorization"),
    body: await request.text(),
    streamResponse: true,
    extraHeaders,
  });
}
