// FoodLoop REST API. Run with: pnpm api (http://localhost:4000)
import dotenv from 'dotenv'
import express from 'express'
import { randomUUID } from 'node:crypto'
import {
  closeDatabases,
  connectDatabases,
  createDonation,
  createReview,
  deleteDonation,
  getDonation,
  getDonations,
  getRequirements,
  getUsers,
  updateDonation,
} from './database.mjs'

dotenv.config({ path: ['.env.local', '.env'] })

const WORKFLOW = ['posted', 'approved', 'claimed', 'assigned', 'picked_up', 'delivered', 'completed']
const CATEGORIES = ['cooked', 'bakery', 'produce', 'dairy', 'packaged']

const app = express()
app.use(express.json({ limit: '20kb' }))

function validateDonation(body, partial = false) {
  const errors = []
  const has = (k) => body[k] !== undefined
  if (!partial || has('foodName'))
    if (typeof body.foodName !== 'string' || body.foodName.trim().length < 3) errors.push('foodName must be at least 3 characters')
  if (!partial || has('quantity'))
    if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 5000) errors.push('quantity must be an integer 1-5000')
  if (!partial || has('category'))
    if (!CATEGORIES.includes(body.category)) errors.push(`category must be one of ${CATEGORIES.join(', ')}`)
  if (!partial || has('pickupDeadline'))
    if (Number.isNaN(Date.parse(body.pickupDeadline))) errors.push('pickupDeadline must be an ISO date')
  return errors
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// List donations with optional ?status=&category=&donorId= filters
app.get('/api/donations', async (req, res) => {
  const { status, category, donorId } = req.query
  const filters = Object.fromEntries(
    Object.entries({ status, category, donorId }).filter(([, value]) => typeof value === 'string'),
  )
  res.json(await getDonations(filters))
})

app.get('/api/donations/:id', async (req, res) => {
  const donation = await getDonation(req.params.id)
  if (!donation) return res.status(404).json({ error: 'Donation not found' })
  res.json(donation)
})

app.post('/api/donations', async (req, res) => {
  const errors = validateDonation(req.body)
  if (!(await getUsers('donor')).some((u) => u.id === req.body.donorId)) errors.push('donorId must reference a donor')
  if (errors.length) return res.status(400).json({ errors })
  const { donorId, foodName, quantity, category, diet = 'veg', storage = 'room', placeId, pickupDeadline, notes } = req.body
  const donation = {
    id: `d-${randomUUID().slice(0, 8)}`,
    donorId,
    foodName: foodName.trim(),
    quantity,
    category,
    diet,
    storage,
    placeId,
    pickupDeadline,
    notes,
    status: 'posted',
    createdAt: new Date().toISOString(),
  }
  await createDonation(donation)
  res.status(201).json(donation)
})

app.patch('/api/donations/:id', async (req, res) => {
  const donation = await getDonation(req.params.id)
  if (!donation) return res.status(404).json({ error: 'Donation not found' })
  if (donation.status !== 'posted') return res.status(409).json({ error: 'Only posted listings can be edited' })
  const errors = validateDonation(req.body, true)
  if (errors.length) return res.status(400).json({ errors })
  const changes = Object.fromEntries(
    ['foodName', 'quantity', 'category', 'diet', 'storage', 'placeId', 'pickupDeadline', 'notes']
      .filter((key) => req.body[key] !== undefined)
      .map((key) => [key, req.body[key]]),
  )
  if (!(await updateDonation(req.params.id, changes, 'posted')))
    return res.status(409).json({ error: 'Only posted listings can be edited' })
  res.json({ ...donation, ...changes })
})

// Move a donation one step along the workflow (or reject it from "posted")
app.patch('/api/donations/:id/status', async (req, res) => {
  const donation = await getDonation(req.params.id)
  if (!donation) return res.status(404).json({ error: 'Donation not found' })
  const { status, acceptorId, volunteerId, reason } = req.body
  if (status === 'rejected') {
    if (donation.status !== 'posted') return res.status(409).json({ error: 'Only posted listings can be rejected' })
    const changes = { status, rejectionReason: String(reason ?? '').slice(0, 200) }
    if (!(await updateDonation(req.params.id, changes, 'posted')))
      return res.status(409).json({ error: 'Only posted listings can be rejected' })
    return res.json({ ...donation, ...changes })
  }
  const expected = WORKFLOW[WORKFLOW.indexOf(donation.status) + 1]
  if (status !== expected)
    return res.status(409).json({ error: `Invalid transition ${donation.status} → ${status}; expected ${expected}` })
  if (status === 'claimed') {
    if (!(await getUsers('acceptor')).some((u) => u.id === acceptorId)) return res.status(400).json({ error: 'acceptorId required' })
  }
  if (status === 'assigned') {
    if (!(await getUsers('volunteer')).some((u) => u.id === volunteerId)) return res.status(400).json({ error: 'volunteerId required' })
  }
  const changes = {
    status,
    ...(status === 'claimed' && { acceptorId }),
    ...(status === 'assigned' && { volunteerId }),
  }
  if (!(await updateDonation(req.params.id, changes, donation.status)))
    return res.status(409).json({ error: 'Donation status changed; reload and try again' })
  res.json({ ...donation, ...changes })
})

app.delete('/api/donations/:id', async (req, res) => {
  if (!(await deleteDonation(req.params.id))) return res.status(404).json({ error: 'Donation not found' })
  res.status(204).end()
})

app.get('/api/requirements', async (_req, res) => res.json(await getRequirements()))
app.get('/api/users', async (req, res) => {
  const role = typeof req.query.role === 'string' ? req.query.role : undefined
  res.json(await getUsers(role))
})

app.post('/api/reviews', async (req, res) => {
  const { donationId, rating, comment = '' } = req.body
  const donation = await getDonation(donationId)
  if (!donation) return res.status(404).json({ error: 'Donation not found' })
  if (donation.status !== 'delivered') return res.status(409).json({ error: 'Donation must be delivered before review' })
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' })
  const review = {
    id: `rv-${randomUUID().slice(0, 8)}`,
    donationId,
    donorId: donation.donorId,
    acceptorId: donation.acceptorId,
    rating,
    comment: String(comment).slice(0, 500),
    createdAt: new Date().toISOString(),
  }
  if (!(await updateDonation(donationId, { status: 'completed' }, 'delivered')))
    return res.status(409).json({ error: 'Donation status changed; reload and try again' })
  try {
    await createReview(review)
  } catch (error) {
    await updateDonation(donationId, { status: 'delivered' }, 'completed')
    throw error
  }
  res.status(201).json(review)
})

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

app.use((error, _req, res, _next) => {
  console.error('FoodLoop API error:', error)
  res.status(500).json({ error: 'Internal server error' })
})

const port = Number(process.env.PORT) || 4000
await connectDatabases()
const server = app.listen(port, () => console.log(`FoodLoop API listening on http://localhost:${port}`))

async function shutdown() {
  server.close(async () => {
    await closeDatabases()
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
