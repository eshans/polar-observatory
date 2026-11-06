// Large Antarctic icebergs tracked by the U.S. National Ice Center (keyless CSV, updated most days).
// https://usicecenter.gov/Products/AntarcIcebergs
const NM = 1.852

export default defineCachedEventHandler(
  async (): Promise<Iceberg[]> => {
    let text: string
    try {
      text = await $fetch<string>('https://usicecenter.gov/File/DownloadCurrent?pId=134', { responseType: 'text', timeout: 20_000, retry: 1 })
    } catch (err: any) {
      const status: number | undefined = err?.response?.status
      throw createError({ statusCode: 502, statusMessage: `U.S. National Ice Center is not responding${status ? ` (${status})` : ''}. Try again shortly.` })
    }
    // Iceberg,Length (NM),Width (NM),Latitude,Longitude,Area (sqMI),Area (sqNM),Area (sqKM),Last Update
    return text
      .replace(/^﻿/, '')
      .split(/\r?\n/)
      .slice(1)
      .map((l) => l.split(',').map((c) => c.trim()))
      .filter((c) => c.length >= 9 && c[0])
      .map(([name, len, wid, lat, lon, , , km2, updated]) => {
        const [m, d, y] = updated!.split('/')
        return {
          name: name!,
          lengthKm: Math.round(Number(len) * NM),
          widthKm: Math.round(Number(wid) * NM),
          lat: Number(lat),
          lon: Number(lon),
          areaKm2: Number(km2),
          updated: `${y}-${m}-${d}`,
        }
      })
      .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.areaKm2))
      .sort((a, b) => b.areaKm2 - a.areaKm2)
  },
  { base: 'kv', name: 'icebergs', maxAge: 60 * 60 * 6, swr: true },
)
