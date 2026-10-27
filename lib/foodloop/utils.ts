import type {
  Donation,
  DonationDiet,
  DonationStatus,
  FoodCategory,
  Place,
  Requirement,
  RequirementDiet,
  StorageCondition,
  Urgency,
} from './types'

export const STATUS_LABEL: Record<DonationStatus, string> = {
  posted: 'Posted',
  approved: 'Approved',
  claimed: 'Claimed',
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  completed: 'Completed',
  rejected: 'Rejected',
}

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  cooked: 'Cooked meals',
  bakery: 'Bakery',
  produce: 'Fruits & veg',
  dairy: 'Dairy',
  packaged: 'Packaged',
}

export const STORAGE_LABEL: Record<StorageCondition, string> = {
  hot: 'Keep hot',
  room_temp: 'Room temp',
  refrigerated: 'Refrigerated',
  frozen: 'Frozen',
}

export const DONATION_DIET_LABEL: Record<DonationDiet, string> = {
  veg: 'Vegetarian',
  vegan: 'Vegan',
  non_veg: 'Non-veg',
}

export const REQUIREMENT_DIET_LABEL: Record<RequirementDiet, string> = {
  any: 'No preference',
  veg: 'Vegetarian only',
  vegan: 'Vegan only',
}

const HOUR = 3_600_000

export function getUrgency(deadline: string, now: number): Urgency {
  const hours = (new Date(deadline).getTime() - now) / HOUR
  if (hours < 0) return 'expired'
  if (hours < 2) return 'critical'
  if (hours < 6) return 'high'
  return 'normal'
}

export const URGENCY_RANK: Record<Urgency, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  expired: 3,
}

export function formatTimeLeft(deadline: string, now: number): string {
  const diff = new Date(deadline).getTime() - now
  if (diff <= 0) return 'Expired'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `${mins}m left`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m left`
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function toLocalInputValue(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function distanceKm(a: Place, b: Place): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  // Road distance is typically ~1.3x straight-line distance in a city.
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.3 * 10) / 10
}

export function isDietCompatible(food: DonationDiet, need: RequirementDiet): boolean {
  if (need === 'any') return true
  if (need === 'veg') return food === 'veg' || food === 'vegan'
  return food === 'vegan'
}

export function findBestMatch(
  donation: Donation,
  requirements: Requirement[],
  now: number,
): Requirement | undefined {
  if (new Date(donation.pickupDeadline).getTime() <= now) return undefined

  const candidates = requirements
    .filter((r) => r.status === 'open')
    .filter((r) => !donation.declinedRequirementIds.includes(r.id))
    .filter((r) => isDietCompatible(donation.diet, r.diet))
    .filter((r) => r.categories.length === 0 || r.categories.includes(donation.category))
    .filter((r) => donation.quantity >= r.meals * 0.5)
    .map((r) => {
      const km = distanceKm(donation.location, r.location)
      return { r, km, score: km + Math.abs(donation.quantity - r.meals) / 20 }
    })
    .filter(({ r, km }) => km <= (r.transportAvailable ? 25 : 15))
    .sort((a, b) => a.score - b.score)

  return candidates[0]?.r
}

export function nextStatus(status: DonationStatus): DonationStatus | undefined {
  if (status === 'assigned') return 'picked_up'
  if (status === 'picked_up') return 'delivered'
  return undefined
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}
