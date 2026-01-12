"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const node_server_1 = require("@hono/node-server");
require("dotenv/config");
const auth_1 = require("./lib/auth");
const transactions_1 = __importDefault(require("./routes/transactions"));
const app = new hono_1.Hono();
// CORS configuration
app.use('/*', (0, cors_1.cors)({
    origin: 'https://vessify-front-a1m9.vercel.app', // Frontend URL - must be specific when using credentials
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
}));
// Health check
app.get('/', (c) => {
    return c.json({
        message: 'Transaction Parser API',
        status: 'running',
        version: '1.0.0'
    });
});
// Better Auth routes - handles all authentication endpoints
// Includes: /api/auth/sign-in, /api/auth/sign-up, /api/auth/sign-out, 
// /api/auth/session, /api/auth/token (JWT), /api/auth/jwks, etc.
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
    return auth_1.auth.handler(c.req.raw);
});
// Transaction routes
app.route('/api/transactions', transactions_1.default);
// Error handling
app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json({
        error: 'Internal server error',
        message: err.message
    }, 500);
});
// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
});
const port = parseInt(process.env.PORT || '3000');
console.log(`🚀 Server starting on http://localhost:${port}`);
(0, node_server_1.serve)({
    fetch: app.fetch,
    port,
});
