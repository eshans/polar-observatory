import type { PoleId } from '../types/polar'

export interface StationMeta {
  id: string
  name: string
  place: string
  lat: number
  lon: number
  tz: string
  note: string
}

/** Research stations and outposts watched in the Station Weather section, and pinned on the satellite view. */
export const STATIONS: Record<PoleId, StationMeta[]> = {
  north: [
    { id: 'np', name: 'North Pole', place: 'Arctic Ocean', lat: 90, lon: 0, tz: 'UTC', note: 'Drifting sea ice over 4 km of ocean' },
    { id: 'alert', name: 'Alert', place: 'Nunavut, Canada', lat: 82.5, lon: -62.35, tz: 'America/Toronto', note: 'Northernmost permanently inhabited place' },
    { id: 'nyalesund', name: 'Ny-Ålesund', place: 'Svalbard', lat: 78.92, lon: 11.93, tz: 'Europe/Oslo', note: 'International research town' },
    { id: 'summit', name: 'Summit Station', place: 'Greenland Ice Sheet', lat: 72.58, lon: -38.46, tz: 'America/Nuuk', note: '3,200 m up on the ice cap' },
    { id: 'utqiagvik', name: 'Utqiaġvik', place: 'Alaska, USA', lat: 71.29, lon: -156.79, tz: 'America/Anchorage', note: '65 days of polar night a year' },
    { id: 'oymyakon', name: 'Oymyakon', place: 'Yakutia, Russia', lat: 63.46, lon: 142.79, tz: 'Asia/Vladivostok', note: 'Northern Pole of Cold, −67.7 °C' },
  ],
  south: [
    { id: 'sp', name: 'Amundsen–Scott', place: 'Geographic South Pole', lat: -90, lon: 0, tz: 'Pacific/Auckland', note: 'Six months of day, six of night' },
    { id: 'vostok', name: 'Vostok', place: 'East Antarctic Plateau', lat: -78.46, lon: 106.84, tz: 'Asia/Almaty', note: 'Coldest reading on Earth, −89.2 °C' },
    { id: 'concordia', name: 'Concordia', place: 'Dome C', lat: -75.1, lon: 123.33, tz: 'Asia/Singapore', note: 'Used as a Mars-mission analogue' },
    { id: 'mcmurdo', name: 'McMurdo', place: 'Ross Island', lat: -77.85, lon: 166.67, tz: 'Pacific/Auckland', note: 'Largest station, ~1,000 in summer' },
    { id: 'halley', name: 'Halley VI', place: 'Brunt Ice Shelf', lat: -75.58, lon: -26.66, tz: 'UTC', note: 'On skis, towed inland as ice calves' },
    { id: 'rothera', name: 'Rothera', place: 'Antarctic Peninsula', lat: -67.57, lon: -68.13, tz: 'America/Punta_Arenas', note: 'Fastest-warming part of Antarctica' },
  ],
}

/** Well-known aurora viewing spots, scored against the live OVATION forecast. */
export const AURORA_SPOTS: Record<PoleId, { name: string; lat: number; lon: number }[]> = {
  north: [
    { name: 'Tromsø, Norway', lat: 69.65, lon: 18.96 },
    { name: 'Fairbanks, Alaska', lat: 64.84, lon: -147.72 },
    { name: 'Yellowknife, Canada', lat: 62.45, lon: -114.37 },
    { name: 'Reykjavík, Iceland', lat: 64.15, lon: -21.94 },
    { name: 'Kiruna, Sweden', lat: 67.86, lon: 20.23 },
    { name: 'Rovaniemi, Finland', lat: 66.5, lon: 25.73 },
  ],
  south: [
    { name: 'Hobart, Tasmania', lat: -42.88, lon: 147.33 },
    { name: 'Invercargill, NZ', lat: -46.41, lon: 168.35 },
    { name: 'Ushuaia, Argentina', lat: -54.8, lon: -68.3 },
    { name: 'Macquarie Island', lat: -54.5, lon: 158.94 },
    { name: 'Mawson Station', lat: -67.6, lon: 62.87 },
    { name: 'McMurdo Station', lat: -77.85, lon: 166.67 },
  ],
}
