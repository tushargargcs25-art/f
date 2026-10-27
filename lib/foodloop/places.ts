import type { Place } from './types'

export const PLACES: Place[] = [
  { id: 'indiranagar', name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { id: 'koramangala', name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { id: 'mg-road', name: 'MG Road', lat: 12.9756, lng: 77.6066 },
  { id: 'jayanagar', name: 'Jayanagar', lat: 12.925, lng: 77.5938 },
  { id: 'hsr-layout', name: 'HSR Layout', lat: 12.9116, lng: 77.6474 },
  { id: 'whitefield', name: 'Whitefield', lat: 12.9698, lng: 77.75 },
  { id: 'malleshwaram', name: 'Malleshwaram', lat: 13.0035, lng: 77.5709 },
  { id: 'hebbal', name: 'Hebbal', lat: 13.0358, lng: 77.597 },
  { id: 'btm-layout', name: 'BTM Layout', lat: 12.9166, lng: 77.6101 },
  { id: 'electronic-city', name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
]

export function getPlace(id: string): Place {
  return PLACES.find((p) => p.id === id) ?? PLACES[0]
}
