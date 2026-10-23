export function paginateItems<T>(items: readonly T[], page: number, pageSize: number): T[] {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) return [];
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
