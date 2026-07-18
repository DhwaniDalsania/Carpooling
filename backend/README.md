# Enterprise Carpooling Platform — Backend

Node.js + Express + Prisma + PostgreSQL (Neon)

## Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with the shared DATABASE_URL from the team channel

# 3. Apply DB migrations (safe to run — idempotent)
npx prisma migrate dev

# 4. Seed demo data
npx prisma db seed

# 5. Start dev server
npm run dev
# → http://localhost:3001
```

## Demo Credentials (after seed)

| Role      | Email                  | Password       |
|-----------|------------------------|----------------|
| Admin     | admin@acme.com         | Admin@123      |
| Driver    | driver@acme.com        | Driver@123     |
| Passenger | passenger@acme.com     | Passenger@123  |

Org code: **DEMO2024**

## API Endpoints

| Method | Path                | Auth | Description                     |
|--------|---------------------|------|---------------------------------|
| POST   | /api/auth/register  | —    | Create account / join org       |
| POST   | /api/auth/login     | —    | Returns JWT token               |
| GET    | /api/auth/me        | JWT  | Returns current user + wallet   |
| GET    | /health             | —    | Server health check             |

## Socket.io Namespaces

- `/tracking` — Real-time GPS location during trips
  - Client emits: `join:trip(tripId)`, `location:update({tripId, lat, lng})`
  - Server broadcasts: `location:update` to trip room
- `/chat` — In-trip messaging
  - Client emits: `join:trip(tripId)`, `message:send({tripId, senderId, text})`
  - Server broadcasts: `message:new` to trip room

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma    ← All 13 DB models
│   ├── seed.js          ← Demo data seeder
│   └── migrations/      ← Auto-generated, commit these!
├── src/
│   ├── index.js         ← Express app + Socket.io setup
│   ├── lib/
│   │   └── prisma.js    ← Singleton Prisma client
│   ├── middleware/
│   │   └── auth.js      ← JWT verify + role guard
│   └── routes/
│       └── auth.js      ← /api/auth/* routes
├── .env.example
└── package.json
```
