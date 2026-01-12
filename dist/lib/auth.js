"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const better_auth_1 = require("better-auth");
const prisma_1 = require("better-auth/adapters/prisma");
const plugins_1 = require("better-auth/plugins");
const db_1 = require("./db");
// Debug: Check if jwks is available on prisma instance
console.log('Auth.ts Prisma Keys:', Object.keys(db_1.prisma));
// @ts-ignore
if (db_1.prisma.jwks) {
    console.log('Prisma.jwks exists in auth.ts');
}
else {
    console.error('Prisma.jwks MISSING in auth.ts');
}
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, prisma_1.prismaAdapter)(db_1.prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
        updateAge: 60 * 60 * 24, // 1 day
    },
    plugins: [
        (0, plugins_1.jwt)({
            // JWT will be automatically generated and available via /api/auth/token endpoint
            // Tokens are signed using Ed25519 algorithm by default
        }),
        (0, plugins_1.organization)({
            async sendInvitationEmail(data) {
                // TODO: Implement email sending in production
                console.log("Invitation email:", data);
            },
            allowUserToCreateOrganization: true,
            creatorRole: "owner",
            createOnSignUp: false, // Automatically create an organization for new users
        })
    ],
    secret: process.env.BETTER_AUTH_SECRET || "secret-key-change-in-production",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001/api/auth",
    trustedOrigins: ["http://localhost:3000", "https://vessify-front-a1m9.vercel.app"], // Frontend URL
});
