type PostgrestErrorLike = {
  message?: string
  code?: string
  details?: string
  hint?: string
}

export function extractMissingColumnFromError(error: unknown): string | null {
  const message = (error as PostgrestErrorLike | null)?.message || ''

  // PostgREST schema cache error (Supabase commonly returns this)
  const schemaCacheMatch = message.match(/Could not find the '([^']+)' column/)
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1]

  // PostgreSQL error variant (rare via PostgREST, but safe to handle)
  const pgMatch = message.match(/column \"([^\"]+)\" of relation \"[^\"]+\" does not exist/)
  if (pgMatch?.[1]) return pgMatch[1]

  return null
}
