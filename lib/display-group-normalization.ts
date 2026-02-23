export const collapseDisplayGroupWhitespace = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

export const toDisplayGroupKey = (value: string): string =>
  collapseDisplayGroupWhitespace(value).toLowerCase();

export const dedupeDisplayGroupNames = (names: readonly string[]): string[] => {
  const seenKeys = new Set<string>();
  const deduped: string[] = [];

  for (const name of names) {
    const normalizedName = collapseDisplayGroupWhitespace(name);
    if (normalizedName.length === 0) continue;
    const key = toDisplayGroupKey(normalizedName);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduped.push(normalizedName);
  }

  return deduped;
};
