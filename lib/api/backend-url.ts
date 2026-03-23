export function getBackendUrl(): string {
  const backendUrl =
    process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";
  const trimmed = backendUrl.replace(/\/$/, "");
  return `${trimmed}/${apiVersion}`;
}
