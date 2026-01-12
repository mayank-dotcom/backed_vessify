import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import 'dotenv/config'
import { auth } from './lib/auth'
import transactionRoutes from './routes/transactions'
import authRoutes from './routes/auth'

const app = new Hono()

// CORS configuration
app.use('/*', cors({
  origin: 'https://vessify-front-a1m9.vercel.app', // Frontend URL - must be specific when using credentials
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id', 'Cookie'],
  exposeHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours
}))

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Transaction Parser API',
    status: 'running',
    version: '1.0.0'
  })
})

// Custom auth routes (token-based, no cookies)
app.route('/api/auth', authRoutes)

// Better Auth routes - for organization management and other features
// Includes: /api/auth/organization/*, etc.
app.all('/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

// Transaction routes
app.route('/api/transactions', transactionRoutes)

// Error handling
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({
    error: 'Internal server error',
    message: err.message
  }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 Server starting on port ${port}`)

serve({
  fetch: app.fetch,
  port: port,
  hostname: '0.0.0.0'
})
