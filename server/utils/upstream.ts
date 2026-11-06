/** Fetch JSON from a third-party API, turning failures into a readable 502. */
export async function upstreamFetch<T>(
  source: string,
  url: string,
  query: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  try {
    // Nitro's $fetch types responses from internal routes; these are external URLs, so assert T.
    return (await $fetch<T>(url, { query, timeout: 15_000, retry: 1 })) as T
  } catch (err: any) {
    const status: number | undefined = err?.response?.status
    if (status === 404) throw createError({ statusCode: 404, statusMessage: `${source}: not found` })
    throw createError({
      statusCode: 502,
      statusMessage: `${source} is not responding${status ? ` (${status})` : ''}. Try again shortly.`,
    })
  }
}

/** YYYY-MM-DD in UTC, offset by `days`. */
export function isoDay(days = 0): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
