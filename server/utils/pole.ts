import type { H3Event } from 'h3'

/** Read and validate ?pole=north|south (defaults to north). */
export function getPole(event: H3Event): PoleId {
  const pole = getQuery(event).pole
  if (pole === undefined || pole === 'north') return 'north'
  if (pole === 'south') return 'south'
  throw createError({ statusCode: 400, statusMessage: 'pole must be "north" or "south"' })
}
