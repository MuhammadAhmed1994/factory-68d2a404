import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function seed(): Promise<void> {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_SEED_PASSWORD must be set before running the Prisma seed.');
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
  const customerPasswordHash = await bcrypt.hash(
    randomBytes(32).toString('base64url'),
    BCRYPT_ROUNDS,
  );

  await prisma.user.upsert({
    where: { email: 'admin@simpledesk.local' },
    create: {
      email: 'admin@simpledesk.local',
      name: 'SimpleDesk Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    update: {
      name: 'SimpleDesk Admin',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@simpledesk.local' },
    create: {
      email: 'customer@simpledesk.local',
      name: 'SimpleDesk Customer',
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
      isActive: true,
    },
    update: {
      name: 'SimpleDesk Customer',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });
}

seed()
  .catch((error: unknown) => {
    console.error('Prisma seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
