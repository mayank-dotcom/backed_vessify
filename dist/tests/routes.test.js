"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const hono_1 = require("hono");
const globals_1 = require("@jest/globals");
// Mock dependencies
const mockPrisma = {
    transaction: {
        create: globals_1.jest.fn(),
        findMany: globals_1.jest.fn(),
    },
    member: {
        findFirst: globals_1.jest.fn(),
    }
};
const mockAuth = {
    api: {
        getSession: globals_1.jest.fn(),
    }
};
// Mock modules
globals_1.jest.mock('../lib/db', () => ({
    prisma: mockPrisma
}));
globals_1.jest.mock('../lib/auth', () => ({
    auth: mockAuth
}));
// Import app/routes after mocking (Need to import the specific router or construct a test app)
// Since we want to test the full flow including middleware, we will mock the middleware or dependencies.
// Let's rely on mocking the auth library which the middleware uses.
const transactions_1 = __importDefault(require("../routes/transactions"));
// Setup Hono app for testing
const app = new hono_1.Hono();
// Mock Auth Middleware
app.use('*', async (c, next) => {
    // Manually setting context for tests
    c.set('user', { id: 'user1', email: 'test@example.com', name: 'Test User' });
    c.set('session', { id: 'session1', userId: 'user1', expiresAt: new Date() });
    await next();
});
// Helper to mock getCurrentOrganization
globals_1.jest.mock('../middleware/auth', () => ({
    authMiddleware: async (c, next) => {
        // Mock successful auth
        c.set('user', { id: 'user1', email: 'test@example.com', name: 'Test User' });
        await next();
    },
    getCurrentOrganization: async (c) => {
        const header = c.req.header('X-Organization-Id');
        if (header)
            return header;
        return 'org1'; // Default mock org
    }
}));
app.route('/api/transactions', transactions_1.default);
describe('Transaction Routes', () => {
    // Test 6: POST /extract (Success)
    test('POST /api/transactions/extract - Creates transaction successfully', async () => {
        const payload = {
            text: `Date: 11 Dec 2025\nDescription: TEST\nAmount: 100.00\nBalance after transaction: 1000.00`
        };
        // Mock Prisma create
        mockPrisma.transaction.create.mockResolvedValue({
            id: 'txn1',
            userId: 'user1',
            organizationId: 'org1',
            date: new Date('2025-12-11'),
            description: 'TEST',
            amount: 100.00,
            balance: 1000.00,
            confidence: 100,
            createdAt: new Date(),
        });
        const res = await app.request('/api/transactions/extract', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: new Headers({ 'Content-Type': 'application/json', 'X-Organization-Id': 'org1' })
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.transaction.amount).toBe(100);
        expect(mockPrisma.transaction.create).toHaveBeenCalled();
    });
    // Test 7: POST /extract (Validation Error)
    test('POST /api/transactions/extract - Fails with invalid text', async () => {
        const res = await app.request('/api/transactions/extract', {
            method: 'POST',
            body: JSON.stringify({ text: "Not a transaction" }),
            headers: new Headers({ 'Content-Type': 'application/json' })
        });
        expect(res.status).toBe(400); // Bad Request
    });
    // Test 8: GET /transactions (Isolation & Pagination)
    test('GET /api/transactions - Filters by Organization', async () => {
        mockPrisma.transaction.findMany.mockResolvedValue([
            { id: 'txn1', amount: 100, organizationId: 'org1' }
        ]);
        const res = await app.request('/api/transactions?limit=5', {
            method: 'GET',
            headers: new Headers({ 'X-Organization-Id': 'org1' })
        });
        expect(res.status).toBe(200);
        // precise verify that findMany was called with correct filter
        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                organizationId: 'org1'
            })
        }));
    });
});
