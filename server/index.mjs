// Minimal in-memory REST API for FoodLoop. Run with: pnpm api  (http://localhost:4000)
// Data is loaded from data/foodloop-seed.json and reset on every restart; no database or auth.
import express from 'express'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const seed = JSON.parse(readFileSync(new URL('../data/foodloop-seed.json', import.meta.url), 'utf8'))

const db = {
  users: seed.users.map(({ password, ...u }) => u),
  donations: seed.donations.map(({ deadlineInHours, createdHoursAgo, ...d }) => ({
    ...d,
    pickupDeadline: new Date(Date.now() + deadlineInHours * 3_600_000).toISOString(),
    createdAt: new Date(Date.now() - createdHoursAgo * 3_600_000).toISOString(),
  })),
  requirements: seed.requirements,
  reviews: seed.reviews,
}

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
app.get('/api/donations', (req, res) => {
  const { status, category, donorId } = req.query
  res.json(
    db.donations.filter(
      (d) =>
        (!status || d.status === status) &&
        (!category || d.category === category) &&
        (!donorId || d.donorId === donorId),
    ),
  )
})

app.get('/api/donations/:id', (req, res) => {
  const donation = db.donations.find((d) => d.id === req.params.id)
  if (!donation) return res.status(404).json({ error: 'Donation not found' })
  res.json(donation)
})

app.post('/api/donations', (req, res) => {
  const errors = validateDonation(req.body)
  if (!db.users.some((u) => u.id === req.body.donorId && u.role === 'donor')) errors.push('donorId must reference a donor')
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
  db.donations.unshift(donation)
  res.status(201).json(donation)
})

app.patch('/api/donations/:id', (req, res) => {
  const donation = db.donations.find((d) => d.id === req.params.id)
  if (!donation) return res.status(404).json({ error: 'Donation not found' })
  if (donation.status !== 'posted') return res.status(409).json({ error: 'Only posted listings can be edited' })
  const errors = validateDonation(req.body, true)
  if (errors.length) return res.status(400).json({ errors })
  for (const key of ['foodName', 'quantity', 'category', 'diet', 'storage', 'placeId', 'pickupDeadline', 'notes'])
    if (req.body[key] !== undefined) donation[key] = req.body[key]
  res.json(donation)
})

// Move a donation one step along the workflow (or reject it from "posted")
app.patch('/api/donations/:id/status', (req, res) => {
  const donation = db.donations.find((d) => d.id === req.params.id)
  if (!donation) return res.status(404).json({ error: 'Donation not found' })
  const { status, acceptorId, volunteerId, reason } = req.body
  if (status === 'rejected') {
    if (donation.status !== 'posted') return res.status(409).json({ error: 'Only posted listings can be rejected' })
    Object.assign(donation, { status, rejectionReason: String(reason ?? '').slice(0, 200) })
    return res.json(donation)
  }
  const expected = WORKFLOW[WORKFLOW.indexOf(donation.status) + 1]
  if (status !== expected)
    return res.status(409).json({ error: `Invalid transition ${donation.status} → ${status}; expected ${expected}` })
  if (status === 'claimed') {
    if (!db.users.some((u) => u.id === acceptorId && u.role === 'acceptor')) return res.status(400).json({ error: 'acceptorId required' })
    donation.acceptorId = acceptorId
  }
  if (status === 'assigned') {
    if (!db.users.some((u) => u.id === volunteerId && u.role === 'volunteer')) return res.status(400).json({ error: 'volunteerId required' })
    donation.volunteerId = volunteerId
  }
  donation.status = status
  res.json(donation)
})

app.delete('/api/donations/:id', (req, res) => {
  const index = db.donations.findIndex((d) => d.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Donation not found' })
  db.donations.splice(index, 1)
  res.status(204).end()
})

app.get('/api/requirements', (_req, res) => res.json(db.requirements))
app.get('/api/users', (req, res) => res.json(db.users.filter((u) => !req.query.role || u.role === req.query.role)))

app.post('/api/reviews', (req, res) => {
  const { donationId, rating, comment = '' } = req.body
  const donation = db.donations.find((d) => d.id === donationId)
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
  db.reviews.unshift(review)
  donation.status = 'completed'
  res.status(201).json(review)
})

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

const port = Number(process.env.PORT) || 4000
app.listen(port, () => console.log(`FoodLoop API listening on http://localhost:${port}`))
