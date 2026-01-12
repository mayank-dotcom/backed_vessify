# 🚀 Financial Transaction Parser - Backend

[![Hono](https://img.shields.io/badge/Hono-000000?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

The backend core of the Financial Transaction Parser, built for speed, performance, and type-safety.

## 🏗️ Architecture

```mermaid
graph TD
  API[Hono API]
  Auth[Better Auth]
  ORM[Prisma ORM]
  DB[(PostgreSQL)]

  API --> Auth
  API --> ORM
  ORM --> DB
  Auth --> DB
```

## 🛠️ Tech Stack

- **Framework:** [Hono](https://hono.dev/) - Ultra-fast web framework for Node.js, Bun, and more.
- **ORM:** [Prisma](https://www.prisma.io/) - Next-generation ORM for Node.js and TypeScript.
- **Auth:** [Better Auth](https://www.better-auth.com/) - Modern authentication for the whole stack.
- **Testing:** [Jest](https://jestjs.io/) - Delightful testing framework.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- A PostgreSQL instance

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/hono_assignment"
   BETTER_AUTH_SECRET="your-secure-random-secret"
   BETTER_AUTH_URL="http://localhost:3001/api/auth"
   PORT=3001
   ```

3. **Database Migration**
   ```bash
   npx prisma db push
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🧪 Testing

We believe in reliable code. Our test suite covers authentication, organization isolation, and transaction logic.

```bash
npm test
```

## 🔐 Multi-Tenancy Logic

Every request is scoped to an **Organization ID**. The backend ensures that:
1. The user is a member of the organization.
2. Data is never leaked between organizations.
3. Transactions are strictly stored within the active organization context.

```mermaid
sequenceDiagram
    participant App as Frontend
    participant Mid as Middleware
    participant Srv as Hono Handler
    participant DB as Database

    App->>Mid: Request + X-Organization-Id
    Mid->>Mid: Validate Session & Membership
    Mid->>Srv: Process Request
    Srv->>DB: Query WHERE organizationId = ?
    DB-->>Srv: Scoped Data
    Srv-->>App: JSON Response
```
