// Current conditions at polar research stations, from Open-Meteo (keyless; model data, refreshed every 15 min).
// https://open-meteo.com/en/docs
interface RawLocation {
  elevation: number
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    wind_speed_10m: number
    wind_gusts_10m: number
    wind_direction_10m: number
    relative_humidity_2m: number
    weather_code: number
  }
  hourly: { time: string[]; temperature_2m: (number | null)[] }
}

export default defineCachedEventHandler(
  async (event): Promise<Stations> => {
    const pole = getPole(event)
    const list = STATIONS[pole]
    const raw = await upstreamFetch<RawLocation[] | RawLocation>('Open-Meteo', 'https://api.open-meteo.com/v1/forecast', {
      latitude: list.map((s) => s.lat).join(','),
      longitude: list.map((s) => s.lon).join(','),
      current: 'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,relative_humidity_2m,weather_code',
      hourly: 'temperature_2m',
      past_days: 1,
      forecast_days: 2,
      timezone: 'UTC',
    })
    const locations = Array.isArray(raw) ? raw : [raw]

    const now = Date.now()
    return {
      pole,
      stations: list.map((s, i) => {
        const loc = locations[i]!
        const c = loc.current
        const hourly = loc.hourly.time
          .map((t, k) => ({ time: `${t}Z`, temp: loc.hourly.temperature_2m[k] }))
          .filter((h): h is { time: string; temp: number } => {
            const dt = Date.parse(h.time) - now
            return h.temp !== null && dt > -24 * 3_600_000 && dt <= 24 * 3_600_000
          })
        return {
          ...s,
          elevation: loc.elevation,
          time: `${c.time}Z`,
          temp: c.temperature_2m,
          feelsLike: c.apparent_temperature,
          wind: c.wind_speed_10m,
          gusts: c.wind_gusts_10m,
          windDir: c.wind_direction_10m,
          humidity: c.relative_humidity_2m,
          code: c.weather_code,
          hourly,
        }
      }),
    }
  },
  { base: 'kv', name: 'stations', maxAge: 60 * 15, swr: true, getKey: (event) => getPole(event) },
)
