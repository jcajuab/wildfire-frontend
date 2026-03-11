import type { NextRequest } from "next/server";
import { getBackendUrl } from "@/lib/api/backend-url";

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.text();

  const response = await fetch(`${getBackendUrl()}/ai/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body,
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
