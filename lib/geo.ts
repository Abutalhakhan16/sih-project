import { CustomerLocation } from './types'

/**
 * Calculates the great-circle distance between two points on the Earth
 * using the Haversine formula.
 * @returns distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Formats a distance in kilometers into a friendly human-readable string.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000)
    return `${meters} m`
  }
  return `${distanceKm.toFixed(1)} km`
}

/**
 * Estimates arrival time in minutes based on distance.
 * Assumes average urban speed with base dispatch & prep overhead.
 */
export function estimateEtaMinutes(distanceKm: number): number {
  // ~3.5 min per km + 4 min prep buffer, minimum 5 mins
  return Math.max(5, Math.round(distanceKm * 3.5 + 4))
}

/**
 * Preset customer locations across Bhopal, MP for testing in the prototype.
 */
export const PRESET_LOCATIONS: CustomerLocation[] = [
  {
    lat: 23.2333,
    lng: 77.4334,
    label: 'MP Nagar Zone 1 & 2 (Bhopal)',
    source: 'preset',
  },
  {
    lat: 23.2135,
    lng: 77.4377,
    label: 'Arera Colony (E-3 / 10 No. Market)',
    source: 'preset',
  },
  {
    lat: 23.2384,
    lng: 77.4018,
    label: 'New Market / TT Nagar',
    source: 'preset',
  },
  {
    lat: 23.178,
    lng: 77.419,
    label: 'Kolar Road / Sarvadharma',
    source: 'preset',
  },
  {
    lat: 23.201,
    lng: 77.442,
    label: 'Shahpura / Gulmohar Colony',
    source: 'preset',
  },
  {
    lat: 23.189,
    lng: 77.456,
    label: 'Hoshangabad Road / Misrod',
    source: 'preset',
  },
  {
    lat: 23.271,
    lng: 77.468,
    label: 'Ayodhya Bypass / Anand Nagar',
    source: 'preset',
  },
  {
    lat: 23.305,
    lng: 77.395,
    label: 'Karond / Bhanpur Trade Hub',
    source: 'preset',
  },
  {
    lat: 23.275,
    lng: 77.345,
    label: 'Bairagarh / Lalghati',
    source: 'preset',
  },
  {
    lat: 23.245,
    lng: 77.382,
    label: 'Shyamla Hills / VIP Road',
    source: 'preset',
  },
]

export const DEFAULT_CUSTOMER_LOCATION: CustomerLocation = PRESET_LOCATIONS[0]

