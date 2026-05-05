/**
 * Default Next.js `fetch` revalidate (seconds) for admin server data.
 * Also used for `experimental.staleTimes.dynamic` so soft navigations match
 * the RSC data cache window. Keep this module dependency-free so
 * `next.config.ts` can import it safely.
 */
export const WILDFIRE_SERVER_REVALIDATE_SECONDS = 600;
