const MACHINE_ID_STORAGE_KEY = "wildfire.provisionedMachineId";

export async function getProvisionedMachineId(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Provisioned machine ID is only available in the browser.");
  }

  const fromStorage = window.localStorage.getItem(MACHINE_ID_STORAGE_KEY);
  if (fromStorage && fromStorage.trim().length > 0) {
    return fromStorage.trim();
  }

  const fromMeta = document
    .querySelector('meta[name="wildfire-machine-id"]')
    ?.getAttribute("content");
  if (fromMeta && fromMeta.trim().length > 0) {
    const value = fromMeta.trim();
    window.localStorage.setItem(MACHINE_ID_STORAGE_KEY, value);
    return value;
  }

  try {
    const response = await fetch("/machine-id.json", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { machineId?: string };
      if (payload.machineId && payload.machineId.trim().length > 0) {
        const value = payload.machineId.trim();
        window.localStorage.setItem(MACHINE_ID_STORAGE_KEY, value);
        return value;
      }
    }
  } catch {
    // Ignore and fall through to error.
  }

  throw new Error(
    "No provisioned machine ID found. Provision this display before registration.",
  );
}
