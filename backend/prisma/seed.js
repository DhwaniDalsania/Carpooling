// prisma/seed.js
// Run via: npx prisma db seed   OR   node prisma/seed.js
// Creates 1 demo org + 3 users (1 admin, 2 employees) for demo/testing.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert demo organisation (idempotent — safe to re-run)
  const org = await prisma.organization.upsert({
    where: { code: 'DEMO2024' },
    update: {},
    create: {
      name: 'Acme Technologies Pvt Ltd',
      registeredAddress: '123 Tech Park, Bengaluru, Karnataka 560001',
      industry: 'Information Technology',
      adminContact: 'admin@acme.com',
      code: 'DEMO2024',
      fuelCostPerLitre: 105.0,
      costPerKm: 8.0,
      travelCostPerKm: 6.5,
    },
  });
  console.log(`✅ Organization: ${org.name} (code: ${org.code})`);

  const SALT_ROUNDS = 10;

  // Admin user
  const adminHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      name: 'Arjun Mehta',
      email: 'admin@acme.com',
      passwordHash: adminHash,
      role: 'admin',
      organizationId: org.id,
      department: 'Engineering',
      managerName: 'CEO',
      location: 'Bengaluru',
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // Employee 1 — Priya Sharma
  const emp1Hash = await bcrypt.hash('Priya@123', SALT_ROUNDS);
  const driver = await prisma.user.upsert({
    where: { email: 'priya@acme.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'priya@acme.com',
      passwordHash: emp1Hash,
      role: 'employee',
      organizationId: org.id,
      department: 'Product',
      managerName: 'Arjun Mehta',
      location: 'Koramangala, Bengaluru',
    },
  });
  console.log(`✅ Employee 1: ${driver.email}`);

  // Employee 2 — Rohan Verma
  const emp2Hash = await bcrypt.hash('Rohan@123', SALT_ROUNDS);
  const passenger = await prisma.user.upsert({
    where: { email: 'rohan@acme.com' },
    update: {},
    create: {
      name: 'Rohan Verma',
      email: 'rohan@acme.com',
      passwordHash: emp2Hash,
      role: 'employee',
      organizationId: org.id,
      department: 'Design',
      managerName: 'Arjun Mehta',
      location: 'Indiranagar, Bengaluru',
    },
  });
  console.log(`✅ Employee 2: ${passenger.email}`);

  // Create wallets for all seeded users
  for (const u of [admin, driver, passenger]) {
    await prisma.wallet.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, balance: 500.0 },
    });
  }
  console.log('✅ Wallets created (₹500 each)');

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('  Admin      → admin@acme.com      / Admin@123');
  console.log('  Employee 1 → priya@acme.com      / Priya@123');
  console.log('  Employee 2 → rohan@acme.com      / Rohan@123');
  console.log('  Org code   → DEMO2024');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
