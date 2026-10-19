import { createHash, randomBytes } from 'node:crypto'

type Bucket = { timestamps: number[]; touched: number }

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10
const MAX_BUCKETS = 2048
const buckets = new Map<string, Bucket>()
// A fresh process-local salt prevents stored bucket keys from being reusable
// IP fingerprints across restarts or deployments. No raw address is retained.
const processSalt = randomBytes(32)

function header(event: any, name: string): string {
  const value = event?.node?.req?.headers?.[name]
  return typeof value === 'string' ? value : ''
}

/**
 * Use the socket address by default.  Forwarded headers are trusted only on
 * Vercel requests that carry Vercel's own request marker; arbitrary clients
 * cannot choose a different local key by sending x-forwarded-for in dev.
 */
function clientAddress(event: any): string {
  const socketAddress = String(event?.node?.req?.socket?.remoteAddress || 'unknown')
  const isVercel = process.env.VERCEL === '1' && Boolean(header(event, 'x-vercel-id'))
  if (isVercel) {
    const forwarded = header(event, 'x-forwarded-for').split(',')[0]?.trim()
    const real = header(event, 'x-real-ip').trim()
    if (forwarded) return forwarded
    if (real) return real
  }
  return socketAddress
}

function localKey(event: any): string {
  // Store only a one-way key; raw addresses never enter logs or response data.
  return createHash('sha256').update(processSalt).update(`telebot-chat:${clientAddress(event)}`).digest('hex')
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter(timestamp => timestamp > now - WINDOW_MS)
    if (!bucket.timestamps.length && now - bucket.touched > WINDOW_MS) buckets.delete(key)
  }
}

export function checkChatRateLimit(event: any): { ok: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now()
  prune(now)
  const key = localKey(event)
  if (!buckets.has(key) && buckets.size >= MAX_BUCKETS) {
    // Refuse a new bucket when the bounded process cache is full rather than
    // evicting active limits and letting address churn reset them repeatedly.
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) }
  }
  const bucket = buckets.get(key) ?? { timestamps: [], touched: now }
  bucket.timestamps = bucket.timestamps.filter(timestamp => timestamp > now - WINDOW_MS)
  bucket.touched = now
  if (bucket.timestamps.length >= MAX_REQUESTS) {
    const resetAt = (bucket.timestamps[0] ?? now) + WINDOW_MS
    buckets.set(key, bucket)
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) }
  }
  bucket.timestamps.push(now)
  buckets.set(key, bucket)
  return { ok: true, remaining: Math.max(0, MAX_REQUESTS - bucket.timestamps.length), retryAfterSeconds: 0 }
}

export const chatRateLimit = { max: MAX_REQUESTS, windowMs: WINDOW_MS }
