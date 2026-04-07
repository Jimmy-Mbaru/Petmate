/**
 * Seed test users (admin + owners) for local / staging.
 * Run: npx ts-node scripts/seed-users.ts
 * Password for all seeded accounts: password123 (same as seed-boarding hosts)
 */

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';

const seedUsers: Array<{
  email: string;
  name: string;
  role: Role;
}> = [
  { email: 'admin@petmate.com', name: 'PetMate Admin', role: Role.ADMIN },
  { email: 'owner@petmate.com', name: 'Test Owner', role: Role.OWNER },
  { email: 'owner2@petmate.com', name: 'Second Owner', role: Role.OWNER },
];

async function upsertUser(
  email: string,
  name: string,
  role: Role,
  passwordHash: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        role,
        password: passwordHash,
        isActive: true,
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });
    console.log(`Updated user: ${email} (${role})`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      role,
      password: passwordHash,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`Created user: ${email} (${role})`);
}

async function seed() {
  console.log('🌱 Seeding users...\n');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const u of seedUsers) {
    await upsertUser(u.email, u.name, u.role, passwordHash);
  }

  console.log('\n✨ Users seeded!\n');
  console.log('🔑 Test logins (password: password123):');
  console.log('   admin@petmate.com   — ADMIN');
  console.log('   owner@petmate.com   — OWNER');
  console.log('   owner2@petmate.com  — OWNER');
  console.log('   (hosts: host1@petmate.com … host5@petmate.com — run seed:boarding)\n');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
