// @ts-nocheck
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { jest } from '@jest/globals';

// Mock dependencies
const mockPrisma = {
    transaction: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    member: {
        findFirst: jest.fn(),
    }
};

const mockAuth = {
    api: {
        getSession: jest.fn(),
    }
};

// Mock modules
jest.mock('../lib/db', () => ({
    prisma: mockPrisma
}));

jest.mock('../lib/auth', () => ({
    auth: mockAuth
}));

// Import app/routes after mocking (Need to import the specific router or construct a test app)
// Since we want to test the full flow including middleware, we will mock the middleware or dependencies.
// Let's rely on mocking the auth library which the middleware uses.

import transactionRoutes from '../routes/transactions';

// Custom type for variables
type Variables = {
    user: { id: string; email: string; name: string | null };
    session: { id: string; userId: string; expiresAt: Date };
};

// Setup Hono app for testing
const app = new Hono<{ Variables: Variables }>();

// Mock Auth Middleware
app.use('*', async (c, next) => {
    // Manually setting context for tests
    c.set('user', { id: 'user1', email: 'test@example.com', name: 'Test User' });
    c.set('session', { id: 'session1', userId: 'user1', expiresAt: new Date() });
    await next();
});

// Helper to mock getCurrentOrganization
jest.mock('../middleware/auth', () => ({
    authMiddleware: async (c: any, next: any) => {
        // Mock successful auth
        c.set('user', { id: 'user1', email: 'test@example.com', name: 'Test User' });
        await next();
    },
    getCurrentOrganization: async (c: any) => {
        const header = c.req.header('X-Organization-Id');
        if (header) return header;
        return 'org1'; // Default mock org
    }
}));

app.route('/api/transactions', transactionRoutes);

describe('Transaction Routes', () => {

    // Test 6: POST /extract (Success)
    test('POST /api/transactions/extract - Creates transaction successfully', async () => {
        const payload = {
            text: `Date: 11 Dec 2025\nDescription: TEST\nAmount: 100.00\nBalance after transaction: 1000.00`
        };

        // Mock Prisma create
        (mockPrisma.transaction.create as unknown as jest.Mock).mockResolvedValue({
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
        (mockPrisma.transaction.findMany as unknown as jest.Mock).mockResolvedValue([
            { id: 'txn1', amount: 100, organizationId: 'org1' }
        ]);

        const res = await app.request('/api/transactions?limit=5', {
            method: 'GET',
            headers: new Headers({ 'X-Organization-Id': 'org1' })
        });

        expect(res.status).toBe(200);

        // precise verify that findMany was called with correct filter
        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    organizationId: 'org1'
                })
            })
        );
    });
});
