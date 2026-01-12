import { Context, Next } from 'hono'
import { auth } from '../lib/auth'

export interface AuthContext {
    user: {
        id: string
        email: string
        name: string | null
    }
    session: {
        id: string
        userId: string
        expiresAt: Date
    }
}

export async function authMiddleware(c: Context, next: Next) {
    try {
        const authHeader = c.req.header('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized - No token provided' }, 401)
        }

        const token = authHeader.substring(7)

        // Validate token by finding session in database
        const { prisma } = await import('../lib/db')
        const session = await prisma.session.findFirst({
            where: {
                token,
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                user: true
            }
        })

        if (!session) {
            return c.json({ error: 'Unauthorized - Invalid or expired token' }, 401)
        }

        // Attach user and session to context
        c.set('user', {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
        })
        c.set('session', {
            id: session.id,
            userId: session.userId,
            expiresAt: session.expiresAt
        })

        await next()
    } catch (error) {
        console.error('Auth middleware error:', error)
        return c.json({ error: 'Unauthorized - Authentication failed' }, 401)
    }
}

// Helper to get current organization from context
export async function getCurrentOrganization(c: Context) {
    const user = c.get('user') as AuthContext['user']

    if (!user) {
        throw new Error('User not authenticated')
    }

    // Get user's active organization
    const orgHeader = c.req.header('X-Organization-Id')

    if (orgHeader) {
        return orgHeader
    }

    // If no org header, get user's first organization
    const { prisma } = await import('../lib/db')
    const member = await prisma.member.findFirst({
        where: { userId: user.id },
        include: { organization: true }
    })

    if (!member) {
        throw new Error('User is not a member of any organization')
    }

    return member.organizationId
}
