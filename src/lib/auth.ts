import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { organization, jwt } from "better-auth/plugins"
import { prisma } from "./db"

// Debug: Check if jwks is available on prisma instance
console.log('Auth.ts Prisma Keys:', Object.keys(prisma))
// @ts-ignore
if (prisma.jwks) { console.log('Prisma.jwks exists in auth.ts') } else { console.error('Prisma.jwks MISSING in auth.ts') }

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5 // 5 minutes
        }
    },
    advanced: {
        // Cookie settings for cross-origin requests
        cookiePrefix: "better_auth",
        crossSubDomainCookies: {
            enabled: true
        },
        useSecureCookies: true, // Required for HTTPS
        generateId: () => crypto.randomUUID()
    },
    plugins: [
        jwt({
            // JWT will be automatically generated and available via /api/auth/token endpoint
            // Tokens are signed using Ed25519 algorithm by default
        }),
        organization({
            async sendInvitationEmail(data) {
                // TODO: Implement email sending in production
                console.log("Invitation email:", data)
            },
            allowUserToCreateOrganization: true,
            creatorRole: "owner",
            createOnSignUp: false, // Automatically create an organization for new users
        })
    ],
    secret: process.env.BETTER_AUTH_SECRET || "secret-key-change-in-production",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001/api/auth",
    trustedOrigins: ["http://localhost:3000", "https://vessify-front-a1m9.vercel.app"], // Frontend URL
})

export type Auth = typeof auth
