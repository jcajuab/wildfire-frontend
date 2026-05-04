export interface BulkActionFailure<TItem> {
  readonly item: TItem;
  readonly error: unknown;
}

export interface BulkActionResult<TItem> {
  readonly successfulItems: readonly TItem[];
  readonly failedItems: readonly BulkActionFailure<TItem>[];
}

export async function runBulkAction<TItem>(
  items: readonly TItem[],
  action: (item: TItem) => Promise<void>,
  concurrency = 4,
): Promise<BulkActionResult<TItem>> {
  const maxWorkers = Math.max(1, Math.min(concurrency, items.length));
  const successfulItems: TItem[] = [];
  const failedItems: BulkActionFailure<TItem>[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      if (item === undefined) continue;

      try {
        await action(item);
        successfulItems.push(item);
      } catch (error) {
        failedItems.push({ item, error });
      }
    }
  }

  await Promise.all(Array.from({ length: maxWorkers }, () => worker()));

  return { successfulItems, failedItems };
}
