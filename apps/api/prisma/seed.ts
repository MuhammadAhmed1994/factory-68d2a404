import { randomBytes } from 'node:crypto';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  // Never persist or print the generated fallback secret. Operators may provide an
  // initial admin password via the environment, but the seed does not expose it.
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || randomBytes(32).toString('base64url');
  const customerPassword = randomBytes(32).toString('base64url');
  const [adminPasswordHash, customerPasswordHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(customerPassword, 12),
  ]);

  await prisma.user.upsert({
    where: { email: 'admin@simpledesk.local' },
    create: {
      email: 'admin@simpledesk.local',
      name: 'SimpleDesk Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    update: {},
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
    update: {},
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
