'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import { createSeedState } from './mock-data'
import { getPlace } from './places'
import type { Donation, DonationStatus, Requirement, Review, User } from './types'
import { findBestMatch, uid } from './utils'

export interface FoodLoopState {
  users: User[]
  donations: Donation[]
  requirements: Requirement[]
  reviews: Review[]
  currentUserId: string | null
  sessionRestored: boolean
  donationLoadError: string | null
  now: number
}

export type NewRequirement = Omit<Requirement, 'id' | 'status' | 'createdAt'>

type Action =
  | { type: 'LOGIN'; userId: string }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; userId: string | null }
  | { type: 'TICK'; now: number }
  | { type: 'SYNC_DONATIONS'; donations: Donation[] }
  | { type: 'DONATION_LOAD_ERROR'; message: string }
  | { type: 'DELETE_DONATION'; donationId: string }
  | { type: 'APPROVE'; donationId: string }
  | { type: 'REJECT'; donationId: string; reason: string }
  | { type: 'AUTO_MATCH' }
  | { type: 'ADD_REQUIREMENT'; requirement: NewRequirement }
  | { type: 'CLAIM'; donationId: string }
  | { type: 'DECLINE_MATCH'; donationId: string }
  | { type: 'ASSIGN_VOLUNTEER'; donationId: string; volunteerId: string }
  | { type: 'ADVANCE'; donationId: string; status: Extract<DonationStatus, 'picked_up' | 'delivered'> }
  | { type: 'COMPLETE'; donationId: string; rating: number; comment: string }
  | { type: 'TOGGLE_AVAILABILITY'; userId: string }

function withStatus(d: Donation, status: DonationStatus, now: number): Donation {
  return { ...d, status, history: [...d.history, { status, at: new Date(now).toISOString() }] }
}

function updateDonation(state: FoodLoopState, id: string, fn: (d: Donation) => Donation) {
  return { ...state, donations: state.donations.map((d) => (d.id === id ? fn(d) : d)) }
}

function runAutoMatch(state: FoodLoopState): FoodLoopState {
  let requirements = state.requirements
  const donations = state.donations.map((d) => {
    if (d.status !== 'approved' || d.matchedRequirementId) return d
    const match = findBestMatch(d, requirements, state.now)
    if (!match) return d
    requirements = requirements.map((r) =>
      r.id === match.id ? { ...r, status: 'matched' as const } : r,
    )
    return { ...d, matchedRequirementId: match.id }
  })
  return { ...state, donations, requirements }
}

function reducer(state: FoodLoopState, action: Action): FoodLoopState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUserId: action.userId }
    case 'LOGOUT':
      return { ...state, currentUserId: null }
    case 'RESTORE_SESSION':
      return {
        ...state,
        currentUserId: state.users.some((user) => user.id === action.userId) ? action.userId : null,
        sessionRestored: true,
      }
    case 'TICK':
      return { ...state, now: action.now }

    case 'SYNC_DONATIONS': {
      const syncedById = new Map(action.donations.map((donation) => [donation.id, donation]))
      const localDonations = state.donations.filter((donation) => !syncedById.has(donation.id))
      return {
        ...state,
        donations: [...action.donations, ...localDonations],
        donationLoadError: null,
      }
    }

    case 'DONATION_LOAD_ERROR':
      return { ...state, donationLoadError: action.message }

    case 'DELETE_DONATION':
      return {
        ...state,
        donations: state.donations.filter(
          (d) => !(d.id === action.donationId && d.status === 'posted'),
        ),
      }

    case 'APPROVE': {
      const approved = updateDonation(state, action.donationId, (d) =>
        d.status === 'posted' ? withStatus(d, 'approved', state.now) : d,
      )
      return runAutoMatch(approved)
    }

    case 'REJECT':
      return updateDonation(state, action.donationId, (d) =>
        d.status === 'posted'
          ? { ...withStatus(d, 'rejected', state.now), rejectionReason: action.reason }
          : d,
      )

    case 'AUTO_MATCH':
      return runAutoMatch(state)

    case 'ADD_REQUIREMENT': {
      const requirement: Requirement = {
        ...action.requirement,
        id: uid('r'),
        status: 'open',
        createdAt: new Date(state.now).toISOString(),
      }
      return runAutoMatch({ ...state, requirements: [requirement, ...state.requirements] })
    }

    case 'CLAIM': {
      const donation = state.donations.find((d) => d.id === action.donationId)
      const requirement = state.requirements.find((r) => r.id === donation?.matchedRequirementId)
      if (!donation || !requirement || donation.status !== 'approved') return state
      return updateDonation(state, donation.id, (d) => ({
        ...withStatus(d, 'claimed', state.now),
        acceptorId: requirement.acceptorId,
      }))
    }

    case 'DECLINE_MATCH': {
      const donation = state.donations.find((d) => d.id === action.donationId)
      const reqId = donation?.matchedRequirementId
      if (!donation || !reqId || donation.status !== 'approved') return state
      const next: FoodLoopState = {
        ...state,
        donations: state.donations.map((d) =>
          d.id === donation.id
            ? {
                ...d,
                matchedRequirementId: undefined,
                declinedRequirementIds: [...d.declinedRequirementIds, reqId],
              }
            : d,
        ),
        requirements: state.requirements.map((r) =>
          r.id === reqId ? { ...r, status: 'open' as const } : r,
        ),
      }
      return runAutoMatch(next)
    }

    case 'ASSIGN_VOLUNTEER':
      return updateDonation(state, action.donationId, (d) =>
        d.status === 'claimed'
          ? { ...withStatus(d, 'assigned', state.now), volunteerId: action.volunteerId }
          : d,
      )

    case 'ADVANCE':
      return updateDonation(state, action.donationId, (d) => {
        const valid =
          (d.status === 'assigned' && action.status === 'picked_up') ||
          (d.status === 'picked_up' && action.status === 'delivered')
        return valid ? withStatus(d, action.status, state.now) : d
      })

    case 'COMPLETE': {
      const donation = state.donations.find((d) => d.id === action.donationId)
      if (!donation || donation.status !== 'delivered' || !donation.acceptorId) return state
      const rating = Math.min(5, Math.max(1, Math.round(action.rating)))
      const review: Review = {
        id: uid('rv'),
        donationId: donation.id,
        donorId: donation.donorId,
        acceptorId: donation.acceptorId,
        rating,
        comment: action.comment.trim().slice(0, 500),
        createdAt: new Date(state.now).toISOString(),
      }
      return {
        ...state,
        donations: state.donations.map((d) =>
          d.id === donation.id ? withStatus(d, 'completed', state.now) : d,
        ),
        requirements: state.requirements.map((r) =>
          r.id === donation.matchedRequirementId ? { ...r, status: 'fulfilled' as const } : r,
        ),
        users: state.users.map((u) =>
          u.id === donation.volunteerId
            ? { ...u, completedDeliveries: (u.completedDeliveries ?? 0) + 1 }
            : u,
        ),
        reviews: [review, ...state.reviews],
      }
    }

    case 'TOGGLE_AVAILABILITY':
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.userId ? { ...u, available: !u.available } : u,
        ),
      }

    default:
      return state
  }
}

function init(): FoodLoopState {
  const now = Date.now()
  return {
    ...createSeedState(now),
    currentUserId: null,
    sessionRestored: false,
    donationLoadError: null,
    now,
  }
}

interface FoodLoopContextValue {
  state: FoodLoopState
  dispatch: Dispatch<Action>
  currentUser: User | null
  getUser: (id?: string) => User | undefined
}

const FoodLoopContext = createContext<FoodLoopContextValue | null>(null)

export function FoodLoopProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  useEffect(() => {
    const userId = window.localStorage.getItem('foodloop-user-id')
    dispatch({ type: 'RESTORE_SESSION', userId })
  }, [])

  useEffect(() => {
    if (!state.sessionRestored) return
    if (state.currentUserId) window.localStorage.setItem('foodloop-user-id', state.currentUserId)
    else window.localStorage.removeItem('foodloop-user-id')
  }, [state.currentUserId, state.sessionRestored])

  useEffect(() => {
    let active = true
    fetch('/api/donations', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load listings (${response.status})`)
        return (await response.json()) as ApiDonation[]
      })
      .then((records) => {
        if (active) dispatch({ type: 'SYNC_DONATIONS', donations: records.map(toDonation) })
      })
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Could not load saved listings'
        dispatch({ type: 'DONATION_LOAD_ERROR', message })
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), 30_000)
    return () => clearInterval(timer)
  }, [])

  const getUser = useCallback(
    (id?: string) => (id ? state.users.find((u) => u.id === id) : undefined),
    [state.users],
  )

  const value = useMemo(
    () => ({
      state,
      dispatch,
      currentUser: getUser(state.currentUserId ?? undefined) ?? null,
      getUser,
    }),
    [state, getUser],
  )

  return <FoodLoopContext.Provider value={value}>{children}</FoodLoopContext.Provider>
}

export interface ApiDonation {
  id: string
  donorId: string
  foodName: string
  quantity: number
  category: Donation['category']
  diet: Donation['diet']
  storage: Donation['storage']
  placeId: string
  pickupDeadline: string
  notes?: string
  status: DonationStatus
  createdAt: string
  matchedRequirementId?: string
  declinedRequirementIds?: string[]
  acceptorId?: string
  volunteerId?: string
  rejectionReason?: string
}

export function toDonation(record: ApiDonation): Donation {
  const statuses: DonationStatus[] =
    record.status === 'rejected'
      ? ['posted', 'rejected']
      : ['posted', 'approved', 'claimed', 'assigned', 'picked_up', 'delivered', 'completed']
  const statusIndex = statuses.indexOf(record.status)
  return {
    id: record.id,
    donorId: record.donorId,
    foodName: record.foodName,
    quantity: record.quantity,
    category: record.category,
    diet: record.diet,
    storage: record.storage,
    location: getPlace(record.placeId),
    pickupDeadline: record.pickupDeadline,
    notes: record.notes,
    status: record.status,
    createdAt: record.createdAt,
    history: statuses.slice(0, Math.max(statusIndex + 1, 1)).map((status) => ({
      status,
      at: record.createdAt,
    })),
    matchedRequirementId: record.matchedRequirementId,
    declinedRequirementIds: record.declinedRequirementIds ?? [],
    acceptorId: record.acceptorId,
    volunteerId: record.volunteerId,
    rejectionReason: record.rejectionReason,
  }
}

export function useFoodLoop() {
  const ctx = useContext(FoodLoopContext)
  if (!ctx) throw new Error('useFoodLoop must be used within FoodLoopProvider')
  return ctx
}
