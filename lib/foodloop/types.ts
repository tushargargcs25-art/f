export type Role = 'donor' | 'acceptor' | 'admin' | 'volunteer'

export type DonationStatus =
  | 'posted'
  | 'approved'
  | 'claimed'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'completed'
  | 'rejected'

export const WORKFLOW: DonationStatus[] = [
  'posted',
  'approved',
  'claimed',
  'assigned',
  'picked_up',
  'delivered',
  'completed',
]

export type FoodCategory = 'cooked' | 'bakery' | 'produce' | 'dairy' | 'packaged'
export type StorageCondition = 'room_temp' | 'refrigerated' | 'frozen' | 'hot'
export type DonationDiet = 'veg' | 'vegan' | 'non_veg'
export type RequirementDiet = 'any' | 'veg' | 'vegan'
export type Urgency = 'expired' | 'critical' | 'high' | 'normal'

export interface Place {
  id: string
  name: string
  lat: number
  lng: number
}

export interface User {
  id: string
  role: Role
  name: string
  org: string
  email: string
  password: string
  location: Place
  vehicle?: string
  available?: boolean
  completedDeliveries?: number
  rating?: number
}

export interface StatusEvent {
  status: DonationStatus
  at: string
}

export interface Donation {
  id: string
  donorId: string
  foodName: string
  quantity: number
  category: FoodCategory
  diet: DonationDiet
  storage: StorageCondition
  location: Place
  pickupDeadline: string
  notes?: string
  status: DonationStatus
  createdAt: string
  history: StatusEvent[]
  matchedRequirementId?: string
  declinedRequirementIds: string[]
  acceptorId?: string
  volunteerId?: string
  rejectionReason?: string
}

export interface Requirement {
  id: string
  acceptorId: string
  title: string
  meals: number
  diet: RequirementDiet
  categories: FoodCategory[]
  transportAvailable: boolean
  neededBy: string
  location: Place
  notes?: string
  status: 'open' | 'matched' | 'fulfilled'
  createdAt: string
}

export interface Review {
  id: string
  donationId: string
  donorId: string
  acceptorId: string
  rating: number
  comment: string
  createdAt: string
}
