import { Body, Equator, Horizon, Observer, SearchRiseSet, SiderealTime } from 'astronomy-engine'

/** Sun altitude in degrees (refraction included) for an observer at lat/lon. */
export function sunAltitude(lat: number, lon: number, when: Date): number {
  const obs = new Observer(lat, lon, 0)
  const eq = Equator(Body.Sun, when, obs, true, true)
  return Horizon(when, obs, eq.ra, eq.dec, 'normal').altitude
}

export interface PoleSun {
  altitude: number
  up: boolean
  /** next sunrise (if down) or sunset (if up); at the poles these happen once a year */
  next: Date | null
}

export function poleSun(pole: PoleId, when: Date): PoleSun {
  const lat = pole === 'north' ? 89.9999 : -89.9999
  const altitude = sunAltitude(lat, 0, when)
  const up = altitude > -0.833 // upper limb on the horizon
  const event = SearchRiseSet(Body.Sun, new Observer(lat, 0, 0), up ? -1 : +1, when, 200)
  return { altitude, up, next: event?.date ?? null }
}

/** Plain-language description of the light at a given sun altitude. */
export function lightPhase(alt: number): string {
  if (alt > -0.833) return alt < 6 ? 'Golden, low sun' : 'Daylight'
  if (alt > -6) return 'Civil twilight'
  if (alt > -12) return 'Nautical twilight'
  if (alt > -18) return 'Astronomical twilight'
  return 'Full darkness'
}

/** The point on Earth where the sun is directly overhead: [lon, lat] in degrees. */
export function subsolarPoint(when: Date): [number, number] {
  const eq = Equator(Body.Sun, when, new Observer(0, 0, 0), true, true)
  const lon = ((((eq.ra - SiderealTime(when)) * 15) % 360) + 540) % 360 - 180
  return [lon, eq.dec]
}

/**
 * Fast sun altitude (°) from day of year and local solar time, using NOAA's declination series.
 * Accurate to a fraction of a degree, which is plenty for a year-long daylight chart.
 */
export function solarAltitudeFast(lat: number, doy: number, solarHour: number): number {
  const g = ((2 * Math.PI) / 365) * (doy + (solarHour - 12) / 24)
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const phi = (lat * Math.PI) / 180
  const h = ((solarHour - 12) * 15 * Math.PI) / 180
  return (Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(h)) * 180) / Math.PI
}
