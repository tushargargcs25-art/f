import { readFileSync } from 'node:fs'
import mysql from 'mysql2/promise'
import { MongoClient } from 'mongodb'

const seed = JSON.parse(readFileSync(new URL('../data/foodloop-seed.json', import.meta.url), 'utf8'))

let mysqlPool
let mongoClient
let donations
let reviews

function toUserRow(user) {
  return [
    user.id,
    user.role,
    user.name,
    user.org,
    user.email,
    user.placeId,
    user.vehicle ?? null,
    user.available ?? null,
    user.completedDeliveries ?? null,
    user.rating ?? null,
  ]
}

function fromUserRow(row) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    org: row.org,
    email: row.email,
    placeId: row.place_id,
    ...(row.vehicle !== null && { vehicle: row.vehicle }),
    ...(row.available !== null && { available: Boolean(row.available) }),
    ...(row.completed_deliveries !== null && { completedDeliveries: row.completed_deliveries }),
    ...(row.rating !== null && { rating: Number(row.rating) }),
  }
}

function fromRequirementRow(row) {
  return {
    id: row.id,
    acceptorId: row.acceptor_id,
    title: row.title,
    meals: row.meals,
    diet: row.diet,
    categories: typeof row.categories === 'string' ? JSON.parse(row.categories) : row.categories,
    transportAvailable: Boolean(row.transport_available),
    neededInHours: Number(row.needed_in_hours),
    createdHoursAgo: Number(row.created_hours_ago),
    status: row.status,
  }
}

export async function connectDatabases() {
  const databaseName = process.env.MYSQL_DATABASE || 'foodloop'
  if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error('MYSQL_DATABASE must contain only letters, numbers, and underscores')
  }

  const mysqlConfig = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    timezone: 'Z',
  }

  const setupConnection = await mysql.createConnection(mysqlConfig)
  try {
    await setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``)
  } finally {
    await setupConnection.end()
  }

  mysqlPool = mysql.createPool({
    ...mysqlConfig,
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
  })

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      role VARCHAR(20) NOT NULL,
      name VARCHAR(120) NOT NULL,
      org VARCHAR(160) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      place_id VARCHAR(100) NOT NULL,
      vehicle VARCHAR(100),
      available BOOLEAN,
      completed_deliveries INT,
      rating DECIMAL(2, 1)
    )
  `)
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS requirements (
      id VARCHAR(64) PRIMARY KEY,
      acceptor_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      meals INT NOT NULL,
      diet VARCHAR(30) NOT NULL,
      categories JSON NOT NULL,
      transport_available BOOLEAN NOT NULL,
      needed_in_hours DECIMAL(8, 2) NOT NULL,
      created_hours_ago DECIMAL(8, 2) NOT NULL,
      status VARCHAR(30) NOT NULL,
      FOREIGN KEY (acceptor_id) REFERENCES users(id)
    )
  `)

  for (const user of seed.users) {
    await mysqlPool.execute(
      `INSERT IGNORE INTO users
        (id, role, name, org, email, place_id, vehicle, available, completed_deliveries, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      toUserRow(user),
    )
  }
  for (const requirement of seed.requirements) {
    await mysqlPool.execute(
      `INSERT IGNORE INTO requirements
        (id, acceptor_id, title, meals, diet, categories, transport_available, needed_in_hours, created_hours_ago, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requirement.id,
        requirement.acceptorId,
        requirement.title,
        requirement.meals,
        requirement.diet,
        JSON.stringify(requirement.categories),
        requirement.transportAvailable,
        requirement.neededInHours,
        requirement.createdHoursAgo,
        requirement.status,
      ],
    )
  }

  mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017')
  await mongoClient.connect()
  const mongoDatabase = mongoClient.db(process.env.MONGODB_DATABASE || 'foodloop')
  donations = mongoDatabase.collection('donations')
  reviews = mongoDatabase.collection('reviews')
  await donations.createIndex({ id: 1 }, { unique: true })
  await donations.createIndex({ status: 1, category: 1, donorId: 1 })
  await reviews.createIndex({ id: 1 }, { unique: true })

  if (await donations.countDocuments() === 0) {
    const now = Date.now()
    await donations.insertMany(
      seed.donations.map(({ deadlineInHours, createdHoursAgo, ...donation }) => ({
        ...donation,
        pickupDeadline: new Date(now + deadlineInHours * 3_600_000).toISOString(),
        createdAt: new Date(now - createdHoursAgo * 3_600_000).toISOString(),
      })),
    )
  }
  if (await reviews.countDocuments() === 0) {
    const now = Date.now()
    await reviews.insertMany(
      seed.reviews.map(({ createdHoursAgo, ...review }) => ({
        ...review,
        createdAt: new Date(now - createdHoursAgo * 3_600_000).toISOString(),
      })),
    )
  }
}

export async function closeDatabases() {
  await Promise.all([mysqlPool?.end(), mongoClient?.close()])
}

export async function getDonations(filters) {
  return donations.find(filters).toArray()
}

export async function getDonation(id) {
  return donations.findOne({ id })
}

export async function createDonation(donation) {
  await donations.insertOne(donation)
}

export async function updateDonation(id, changes, expectedStatus) {
  const filter = { id, ...(expectedStatus && { status: expectedStatus }) }
  const result = await donations.updateOne(filter, { $set: changes })
  return result.matchedCount > 0
}

export async function deleteDonation(id) {
  const result = await donations.deleteOne({ id })
  return result.deletedCount > 0
}

export async function getRequirements() {
  const [rows] = await mysqlPool.query('SELECT * FROM requirements ORDER BY id')
  return rows.map(fromRequirementRow)
}

export async function getUsers(role) {
  const [rows] = role
    ? await mysqlPool.execute('SELECT * FROM users WHERE role = ? ORDER BY id', [role])
    : await mysqlPool.query('SELECT * FROM users ORDER BY id')
  return rows.map(fromUserRow)
}

export async function createReview(review) {
  await reviews.insertOne(review)
}
