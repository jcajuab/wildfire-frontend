import type { NextRequest } from "next/server";

function getBackendUrl(): string {
  const backendUrl =
    process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";
  const trimmed = backendUrl.replace(/\/$/, "");
  return `${trimmed}/api/${apiVersion}`;
}

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
