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
 * Preset customer locations for quick one-click testing in the prototype.
 */
export const PRESET_LOCATIONS: CustomerLocation[] = [
  {
    lat: 12.9716,
    lng: 77.5946,
    label: 'Indiranagar / MG Road',
    source: 'preset',
  },
  {
    lat: 12.9352,
    lng: 77.6245,
    label: 'Koramangala 4th Block',
    source: 'preset',
  },
  {
    lat: 13.0031,
    lng: 77.5643,
    label: 'Malleshwaram 8th Cross',
    source: 'preset',
  },
  {
    lat: 12.9308,
    lng: 77.5838,
    label: 'Jayanagar 4th Block',
    source: 'preset',
  },
  {
    lat: 12.9698,
    lng: 77.75,
    label: 'Whitefield Main Road',
    source: 'preset',
  },
]

export const DEFAULT_CUSTOMER_LOCATION: CustomerLocation = PRESET_LOCATIONS[0]
