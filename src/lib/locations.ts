// Location data for personas and resources.
// Hardcoded for now — TODO: migrate to API custom columns.

export interface LatLng {
  lat: number
  lng: number
}

// Keyed by persona `id` from DemoContext
export const PERSONA_LOCATIONS: Record<string, { area: string } & LatLng> = {
  "sarah-johnson": { area: "Headingley", lat: 53.819, lng: -1.582 },
  "james-wilson": { area: "Armley", lat: 53.797, lng: -1.579 },
  "priya-patel": { area: "Chapel Allerton", lat: 53.828, lng: -1.539 },
  "steve-drake": { area: "City Centre", lat: 53.801, lng: -1.549 },
}

// Keyed by resource name (matching seed data)
export const RESOURCE_LOCATIONS: Record<string, LatLng> = {
  // Leisure Centres
  "Armley Leisure Centre — Gym": { lat: 53.797, lng: -1.579 },
  "Armley Leisure Centre — Pool": { lat: 53.797, lng: -1.579 },
  "Armley Leisure Centre — Studio": { lat: 53.797, lng: -1.579 },
  "Fearnville Leisure Centre": { lat: 53.822, lng: -1.498 },
  "Holt Park Active": { lat: 53.844, lng: -1.577 },
  "John Charles Centre for Sport": { lat: 53.775, lng: -1.537 },
  "Kirkstall Leisure Centre": { lat: 53.812, lng: -1.598 },
  "Morley Leisure Centre": { lat: 53.746, lng: -1.600 },
  "Scott Hall Leisure Centre": { lat: 53.824, lng: -1.541 },

  // Recycling Centres
  "Kirkstall Road Recycling Centre": { lat: 53.806, lng: -1.592 },
  "Seacroft Recycling Centre": { lat: 53.821, lng: -1.469 },
  "Meanwood Recycling Centre": { lat: 53.832, lng: -1.564 },
  "Middleton Recycling Centre": { lat: 53.756, lng: -1.545 },
  "Pudsey Recycling Centre": { lat: 53.797, lng: -1.662 },

  // Sports Pitches
  "Roundhay Park \u2014 Football Pitch 1": { lat: 53.838, lng: -1.498 },
  "Roundhay Park \u2014 Football Pitch 2": { lat: 53.837, lng: -1.497 },
  "John Charles 3G Pitch": { lat: 53.775, lng: -1.538 },
  "Beckett Park \u2014 Cricket Square": { lat: 53.825, lng: -1.588 },

  // Community Hubs
  "Armley Community Hub": { lat: 53.798, lng: -1.580 },
  "Compton Centre Community Hub": { lat: 53.815, lng: -1.546 },
  "Reginald Centre Community Hub": { lat: 53.828, lng: -1.539 },
  "Bramley Community Hub": { lat: 53.806, lng: -1.631 },

  // Libraries
  "Leeds Central Library \u2014 Study Room A": { lat: 53.800, lng: -1.549 },
  "Leeds Central Library \u2014 Meeting Room": { lat: 53.800, lng: -1.549 },
  "Chapel Allerton Library \u2014 Community Room": { lat: 53.829, lng: -1.537 },

  // Register Office
  "Leeds Register Office \u2014 Births & Deaths": { lat: 53.799, lng: -1.553 },
  "Leeds Register Office \u2014 Marriages & Civil Partnerships": { lat: 53.799, lng: -1.553 },
  "Leeds Register Office \u2014 Citizenship Ceremonies": { lat: 53.799, lng: -1.553 },
}

const EARTH_RADIUS_MILES = 3958.8
const DEG_TO_RAD = Math.PI / 180

/** Haversine distance between two points, in miles. */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD
  const dLng = (b.lng - a.lng) * DEG_TO_RAD
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * sinLng * sinLng
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
}

export function getPersonaLocation(personaId: string): (LatLng & { area: string }) | undefined {
  return PERSONA_LOCATIONS[personaId]
}

export function getResourceLocation(resourceName: string): LatLng | undefined {
  return RESOURCE_LOCATIONS[resourceName]
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return "<0.1 mi"
  return `${miles.toFixed(1)} mi`
}
