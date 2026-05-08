import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Internal API route for cache tag revalidation.
 *
 * Calling `revalidateTag()` from a Route Handler (via `fetch()`) invalidates
 * the Next.js **Data Cache** for matching tags WITHOUT purging the client-side
 * **Router Cache**. This avoids the global Router Cache wipe that Server
 * Actions trigger, preventing unrelated pages from refetching.
 */

const PREFIX = "wildfire:";
const REVALIDATE_PROFILE = "default" as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body == null ||
    typeof body !== "object" ||
    !Array.isArray((body as { tags?: unknown }).tags)
  ) {
    return NextResponse.json(
      { error: "Expected { tags: string[] }" },
      { status: 400 },
    );
  }

  const { tags } = body as { tags: string[] };

  for (const tag of tags) {
    if (typeof tag === "string" && tag.length > 0) {
      revalidateTag(`${PREFIX}${tag}`, REVALIDATE_PROFILE);
    }
  }

  return NextResponse.json({ revalidated: true });
}
