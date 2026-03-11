import type { NextRequest } from "next/server";

function getBackendUrl(): string {
  const backendUrl =
    process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";
  const trimmed = backendUrl.replace(/\/$/, "");
  return `${trimmed}/api/${apiVersion}`;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { provider } = await params;

  const response = await fetch(
    `${getBackendUrl()}/ai/credentials/${provider}`,
    {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    },
  );

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
