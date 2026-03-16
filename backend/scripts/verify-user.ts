import { PrismaClient } from '@prisma/client';

async function verifyUser(email: string) {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true, verificationToken: null, verificationTokenExpires: null },
    });
    console.log(`User ${user.email} verified successfully`);
  } catch (error) {
    console.error(`Failed to verify user ${email}:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address');
  process.exit(1);
}

verifyUser(email);
