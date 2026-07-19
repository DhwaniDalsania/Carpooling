// src/lib/prisma.js
// Singleton Prisma client — optimised for Neon serverless (PgBouncer pooler).

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Neon PgBouncer works in transaction mode; disable prepared statements
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Wraps a Prisma call with up to 3 retries on connection/pool errors.
 * Neon auto-suspends compute; the first request after idle may fail.
 * Subsequent retries hit a warm compute and succeed.
 */
async function withRetry(fn, retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isConnErr =
        err.code === 'P1001' ||
        err.code === 'P1002' ||
        err.errorCode === 'P1001' ||
        err.errorCode === 'P1002' ||
        err.message?.includes('connection pool') ||
        err.message?.includes('Timed out') ||
        err.message?.includes('connect') ||
        err.message?.includes("Can't reach") ||
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('ETIMEDOUT');

      if (isConnErr && attempt < retries) {
        console.warn(`[prisma] Connection error (attempt ${attempt}/${retries}), retrying in ${delayMs}ms…`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs = Math.min(delayMs * 1.5, 10000); // cap at 10s
      } else {
        throw err;
      }
    }
  }
}

module.exports = { prisma, withRetry };
