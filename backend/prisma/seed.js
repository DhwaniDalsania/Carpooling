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

  // Employee 1 — will act as a driver in demos
  const emp1Hash = await bcrypt.hash('Driver@123', SALT_ROUNDS);
  const driver = await prisma.user.upsert({
    where: { email: 'driver@acme.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'driver@acme.com',
      passwordHash: emp1Hash,
      role: 'employee',
      organizationId: org.id,
      department: 'Product',
      managerName: 'Arjun Mehta',
      location: 'Koramangala, Bengaluru',
    },
  });
  console.log(`✅ Driver employee: ${driver.email}`);

  // Employee 2 — will act as a passenger in demos
  const emp2Hash = await bcrypt.hash('Passenger@123', SALT_ROUNDS);
  const passenger = await prisma.user.upsert({
    where: { email: 'passenger@acme.com' },
    update: {},
    create: {
      name: 'Rohan Verma',
      email: 'passenger@acme.com',
      passwordHash: emp2Hash,
      role: 'employee',
      organizationId: org.id,
      department: 'Design',
      managerName: 'Arjun Mehta',
      location: 'Indiranagar, Bengaluru',
    },
  });
  console.log(`✅ Passenger employee: ${passenger.email}`);

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
  console.log('  Admin    → admin@acme.com      / Admin@123');
  console.log('  Driver   → driver@acme.com     / Driver@123');
  console.log('  Passenger→ passenger@acme.com  / Passenger@123');
  console.log('  Org code → DEMO2024');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
