import seed from '@/data/foodloop-seed.json'
import { getPlace } from './places'
import {
  WORKFLOW,
  type Donation,
  type DonationStatus,
  type Requirement,
  type Review,
  type User,
} from './types'

const HOUR = 3_600_000

function buildHistory(status: DonationStatus, createdAt: number, now: number) {
  if (status === 'rejected') {
    return [
      { status: 'posted' as const, at: new Date(createdAt).toISOString() },
      { status: 'rejected' as const, at: new Date(createdAt + HOUR / 2).toISOString() },
    ]
  }
  const steps = WORKFLOW.slice(0, WORKFLOW.indexOf(status) + 1)
  const span = Math.max(now - createdAt, HOUR) / steps.length
  return steps.map((s, i) => ({ status: s, at: new Date(createdAt + span * i).toISOString() }))
}

export function createSeedState(now: number) {
  const users: User[] = seed.users.map(({ placeId, ...u }) => ({
    ...u,
    role: u.role as User['role'],
    location: getPlace(placeId),
  }))

  const donations: Donation[] = seed.donations.map(
    ({ placeId, deadlineInHours, createdHoursAgo, ...d }) => {
      const createdAt = now - createdHoursAgo * HOUR
      const status = d.status as DonationStatus
      return {
        ...d,
        category: d.category as Donation['category'],
        diet: d.diet as Donation['diet'],
        storage: d.storage as Donation['storage'],
        status,
        location: getPlace(placeId),
        pickupDeadline: new Date(now + deadlineInHours * HOUR).toISOString(),
        createdAt: new Date(createdAt).toISOString(),
        history: buildHistory(status, createdAt, now),
        declinedRequirementIds: [],
      }
    },
  )

  const requirements: Requirement[] = seed.requirements.map(
    ({ neededInHours, createdHoursAgo, ...r }) => {
      const acceptor = users.find((u) => u.id === r.acceptorId)
      return {
        ...r,
        diet: r.diet as Requirement['diet'],
        categories: r.categories as Requirement['categories'],
        status: r.status as Requirement['status'],
        location: acceptor?.location ?? getPlace('jayanagar'),
        neededBy: new Date(now + neededInHours * HOUR).toISOString(),
        createdAt: new Date(now - createdHoursAgo * HOUR).toISOString(),
      }
    },
  )

  const reviews: Review[] = seed.reviews.map(({ createdHoursAgo, ...r }) => ({
    ...r,
    createdAt: new Date(now - createdHoursAgo * HOUR).toISOString(),
  }))

  return { users, donations, requirements, reviews }
}
