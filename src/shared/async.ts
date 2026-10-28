export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    let index = 0;

    while (true) {
      const current = index;
      index += 1;

      if (current >= items.length) {
        return;
      }

      await task(items[current]);
    }
  });

  await Promise.all(workers);
}
