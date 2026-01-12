import { Hono } from 'hono'
import { auth } from '../lib/auth'
import { prisma } from '../lib/db'
import * as bcrypt from 'bcryptjs'

const authRoutes = new Hono()

// Custom sign-in endpoint that returns JWT token
authRoutes.post('/signin', async (c) => {
    try {
        const { email, password } = await c.req.json()

        // Find user with their account (which contains password)
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                accounts: {
                    where: {
                        providerId: 'credential' // Better Auth uses 'credential' for email/password
                    }
                }
            }
        })

        if (!user || user.accounts.length === 0) {
            return c.json({ error: 'Invalid credentials' }, 401)
        }

        const account = user.accounts[0]
        if (!account.password) {
            return c.json({ error: 'Invalid credentials' }, 401)
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, account.password)
        if (!isValidPassword) {
            return c.json({ error: 'Invalid credentials' }, 401)
        }

        // Create session
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                token: crypto.randomUUID(),
                ipAddress: c.req.header('x-forwarded-for') || '',
                userAgent: c.req.header('user-agent') || ''
            }
        })

        // Return user data and session token
        return c.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.emailVerified,
                image: user.image,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            token: session.token,
            session: {
                id: session.id,
                expiresAt: session.expiresAt
            }
        })
    } catch (error) {
        console.error('Sign in error:', error)
        return c.json({ error: 'Sign in failed' }, 500)
    }
})

// Custom sign-up endpoint
authRoutes.post('/signup', async (c) => {
    try {
        const { email, password, name } = await c.req.json()

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return c.json({ error: 'User already exists' }, 400)
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create user, account, organization, and session in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    email,
                    name,
                    emailVerified: false
                }
            })

            // Create account with password
            await tx.account.create({
                data: {
                    userId: user.id,
                    accountId: email,
                    providerId: 'credential',
                    password: hashedPassword
                }
            })

            // Create default organization
            const orgName = name ? `${name}'s Organization` : 'My Organization'
            const orgSlug = email.split('@')[0] + '-' + Math.random().toString(36).substring(2, 7)

            const organization = await tx.organization.create({
                data: {
                    name: orgName,
                    slug: orgSlug
                }
            })

            // Add user as organization owner
            await tx.member.create({
                data: {
                    userId: user.id,
                    organizationId: organization.id,
                    role: 'owner'
                }
            })

            // Create session
            const session = await tx.session.create({
                data: {
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    token: crypto.randomUUID(),
                    ipAddress: c.req.header('x-forwarded-for') || '',
                    userAgent: c.req.header('user-agent') || ''
                }
            })

            return { user, session }
        })

        return c.json({
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                emailVerified: result.user.emailVerified,
                image: result.user.image,
                createdAt: result.user.createdAt,
                updatedAt: result.user.updatedAt
            },
            token: result.session.token,
            session: {
                id: result.session.id,
                expiresAt: result.session.expiresAt
            }
        })
    } catch (error) {
        console.error('Sign up error:', error)
        return c.json({ error: 'Sign up failed' }, 500)
    }
})

// Get current session
authRoutes.get('/session', async (c) => {
    try {
        const authHeader = c.req.header('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        const token = authHeader.substring(7)

        // Find session
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
            return c.json({ error: 'Invalid or expired session' }, 401)
        }

        return c.json({
            user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                emailVerified: session.user.emailVerified,
                image: session.user.image,
                createdAt: session.user.createdAt,
                updatedAt: session.user.updatedAt
            },
            session: {
                id: session.id,
                expiresAt: session.expiresAt
            }
        })
    } catch (error) {
        console.error('Session error:', error)
        return c.json({ error: 'Session check failed' }, 500)
    }
})

// Sign out
authRoutes.post('/signout', async (c) => {
    try {
        const authHeader = c.req.header('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        const token = authHeader.substring(7)

        // Delete session
        await prisma.session.deleteMany({
            where: { token }
        })

        return c.json({ success: true })
    } catch (error) {
        console.error('Sign out error:', error)
        return c.json({ error: 'Sign out failed' }, 500)
    }
})

export default authRoutes
