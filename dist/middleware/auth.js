"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.getCurrentOrganization = getCurrentOrganization;
const auth_1 = require("../lib/auth");
async function authMiddleware(c, next) {
    try {
        // Use Better Auth's session validation
        // Better Auth can validate both session tokens and JWTs
        const session = await auth_1.auth.api.getSession({
            headers: c.req.raw.headers
        });
        if (!session || !session.user) {
            return c.json({ error: 'Unauthorized - Invalid or expired session' }, 401);
        }
        // Attach user and session to context
        c.set('user', {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
        });
        c.set('session', {
            id: session.session.id,
            userId: session.session.userId,
            expiresAt: new Date(session.session.expiresAt)
        });
        await next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return c.json({ error: 'Unauthorized - Authentication failed' }, 401);
    }
}
// Helper to get current organization from context
async function getCurrentOrganization(c) {
    const user = c.get('user');
    if (!user) {
        throw new Error('User not authenticated');
    }
    // Get user's active organization
    const orgHeader = c.req.header('X-Organization-Id');
    if (orgHeader) {
        return orgHeader;
    }
    // If no org header, get user's first organization
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/db')));
    const member = await prisma.member.findFirst({
        where: { userId: user.id },
        include: { organization: true }
    });
    if (!member) {
        throw new Error('User is not a member of any organization');
    }
    return member.organizationId;
}
