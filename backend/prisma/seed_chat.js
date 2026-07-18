// prisma/seed_chat.js
// Creates a demo trip + messages for testing the chat feature.
// Run: node prisma/seed_chat.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  console.log('🌱 Seeding chat demo data...');

  // Fetch existing seeded users
  const driver = await prisma.user.findUnique({ where: { email: 'priya@acme.com' } });
  const passenger = await prisma.user.findUnique({ where: { email: 'rohan@acme.com' } });

  if (!driver || !passenger) {
    throw new Error('Run the main seed first: npx prisma db seed');
  }

  // Fetch or create a vehicle for the driver
  let vehicle = await prisma.vehicle.findFirst({ where: { userId: driver.id } });
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: {
        userId: driver.id,
        model: 'Maruti Swift',
        registrationNumber: 'KA01AB1234',
        seatingCapacity: 4,
        status: 'active',
      },
    });
    console.log('✅ Vehicle created');
  }

  // Create a demo ride
  const ride = await prisma.ride.create({
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      pickupAddress: 'Koramangala, Bengaluru',
      pickupLat: 12.9352,
      pickupLng: 77.6245,
      destAddress: 'MG Road, Bengaluru',
      destLat: 12.9757,
      destLng: 77.6011,
      datetime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      availableSeats: 3,
      farePerSeat: 80,
      status: 'active',
    },
  });
  console.log(`✅ Ride created: ${ride.id}`);

  // Create a booking for the passenger
  await prisma.booking.create({
    data: {
      rideId: ride.id,
      passengerId: passenger.id,
      seatsBooked: 1,
      status: 'confirmed',
    },
  });

  // Create a trip (the active session)
  const trip = await prisma.trip.create({
    data: {
      rideId: ride.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      status: 'started',
      fare: 80,
      startedAt: new Date(),
    },
  });
  console.log(`✅ Trip created: ${trip.id}`);

  // Add passenger to TripPassenger join table
  await prisma.tripPassenger.upsert({
    where: { tripId_userId: { tripId: trip.id, userId: passenger.id } },
    update: {},
    create: { tripId: trip.id, userId: passenger.id },
  });

  // Seed dummy chat messages
  const messages = [
    { senderId: driver.id,    text: 'Hi Rohan! I\'m on my way. Should be there in ~5 mins 🚗' },
    { senderId: passenger.id, text: 'Great! I\'m waiting at the gate.' },
    { senderId: driver.id,    text: 'Stuck at a signal near Koramangala 7th block, 2 min delay.' },
    { senderId: passenger.id, text: 'No worries, take your time!' },
    { senderId: driver.id,    text: 'Almost there! Can see the building.' },
  ];

  for (const msg of messages) {
    await prisma.message.create({
      data: {
        tripId: trip.id,
        senderId: msg.senderId,
        text: msg.text,
      },
    });
  }
  console.log(`✅ ${messages.length} chat messages seeded`);

  console.log('\n🎉 Chat demo data ready!');
  console.log(`  Trip ID  : ${trip.id}`);
  console.log(`  Driver   : priya@acme.com  / Priya@123`);
  console.log(`  Passenger: rohan@acme.com  / Rohan@123`);
  console.log(`\n  Test chat history:`);
  console.log(`  GET /api/trips/${trip.id}/messages`);
  console.log(`  (Authenticate as either user first)`);
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
