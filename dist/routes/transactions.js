"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const auth_1 = require("../middleware/auth");
const parser_1 = require("../lib/parser");
const db_1 = require("../lib/db");
const transactionRoutes = new hono_1.Hono();
// Apply auth middleware to all transaction routes
transactionRoutes.use('/*', auth_1.authMiddleware);
/**
 * POST /api/transactions/extract
 * Parse raw bank statement text and save to database
 * Scoped to user's organization
 */
transactionRoutes.post('/extract', async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();
        const { text } = body;
        if (!text || typeof text !== 'string') {
            return c.json({ error: 'Text field is required' }, 400);
        }
        // Parse the transaction
        const parseResult = (0, parser_1.parseTransaction)(text);
        if (!parseResult.success || !parseResult.data) {
            return c.json({
                error: 'Failed to parse transaction',
                details: parseResult.error
            }, 400);
        }
        // Get user's organization
        const organizationId = await (0, auth_1.getCurrentOrganization)(c);
        // Save to database
        const transaction = await db_1.prisma.transaction.create({
            data: {
                userId: user.id,
                organizationId,
                date: parseResult.data.date,
                description: parseResult.data.description,
                amount: parseResult.data.amount,
                balance: parseResult.data.balance,
                rawText: text,
                confidence: parseResult.data.confidence,
            }
        });
        return c.json({
            success: true,
            transaction: {
                id: transaction.id,
                date: transaction.date,
                description: transaction.description,
                amount: transaction.amount,
                balance: transaction.balance,
                confidence: transaction.confidence,
                createdAt: transaction.createdAt,
            }
        }, 201);
    }
    catch (error) {
        console.error('Transaction extraction error:', error);
        return c.json({
            error: 'Failed to extract transaction',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * GET /api/transactions
 * Get user's transactions with cursor-based pagination
 * Filtered by organization
 */
transactionRoutes.get('/', async (c) => {
    try {
        const user = c.get('user');
        const organizationId = await (0, auth_1.getCurrentOrganization)(c);
        // Pagination parameters
        const cursor = c.req.query('cursor'); // Transaction ID to start from
        const limit = parseInt(c.req.query('limit') || '10');
        if (limit > 100) {
            return c.json({ error: 'Limit cannot exceed 100' }, 400);
        }
        // Build query
        const where = {
            organizationId,
        };
        const queryOptions = {
            where,
            take: limit + 1, // Fetch one extra to check if there are more
            orderBy: {
                createdAt: 'desc',
            },
        };
        if (cursor) {
            queryOptions.cursor = {
                id: cursor,
            };
            queryOptions.skip = 1; // Skip the cursor itself
        }
        const transactions = await db_1.prisma.transaction.findMany(queryOptions);
        // Check if there are more results
        const hasMore = transactions.length > limit;
        const items = hasMore ? transactions.slice(0, limit) : transactions;
        return c.json({
            success: true,
            transactions: items.map(t => ({
                id: t.id,
                date: t.date,
                description: t.description,
                amount: t.amount,
                balance: t.balance,
                confidence: t.confidence,
                createdAt: t.createdAt,
            })),
            pagination: {
                hasMore,
                nextCursor: hasMore ? items[items.length - 1].id : null,
            }
        });
    }
    catch (error) {
        console.error('Get transactions error:', error);
        return c.json({
            error: 'Failed to fetch transactions',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
exports.default = transactionRoutes;
