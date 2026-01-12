import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import 'dotenv/config'
import { auth } from './lib/auth'
import transactionRoutes from './routes/transactions'

const app = new Hono()

// CORS configuration
app.use('/*', cors({
  origin: 'https://vessify-front-a1m9.vercel.app', // Frontend URL - must be specific when using credentials
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
}))

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Transaction Parser API',
    status: 'running',
    version: '1.0.0'
  })
})

// Better Auth routes - handles all authentication endpoints
// Includes: /api/auth/sign-in, /api/auth/sign-up, /api/auth/sign-out, 
// /api/auth/session, /api/auth/token (JWT), /api/auth/jwks, etc.
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

console.log(`🚀 Server starting on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
