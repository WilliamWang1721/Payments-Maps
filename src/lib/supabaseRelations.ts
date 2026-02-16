type MaybeArray<T> = T | T[] | null | undefined

export const unwrapSupabaseRelation = <T>(value: MaybeArray<T>): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

export const normalizeSupabaseRelation = <
  T extends Record<string, unknown>,
  K extends keyof T
>(
  rows: readonly T[] | null | undefined,
  relationKey: K
): T[] => {
  return (rows ?? []).map((row) => ({
    ...row,
    [relationKey]: unwrapSupabaseRelation(row[relationKey] as MaybeArray<T[K]>),
  })) as T[]
}
