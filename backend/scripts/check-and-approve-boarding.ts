/**
 * Script to check and approve boarding profiles
 * Run with: npx ts-node scripts/check-and-approve-boarding.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Result shape when including host in findMany (script use only). */
interface BoardingProfileWithHost {
  id: string;
  location: string;
  capacity: number;
  pricePerDay: number;
  description: string | null;
  isApproved: boolean;
  documentUrls: string[];
  latitude: number | null;
  longitude: number | null;
  photoUrls: string[];
  maxPetsPerNight: number | null;
  hostId: string;
  host: { id: string; name: string; email: string };
}

async function checkAndApproveBoarding() {
  console.log('='.repeat(70));
  console.log('🔍 BOARDING PROFILE STATUS CHECK');
  console.log('='.repeat(70));
  console.log('');

  // Get ALL boarding profiles (BoardingProfile has no createdAt; order by id)
  const allProfiles = (await prisma.boardingProfile.findMany({
    include: {
      host: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      id: 'desc',
    },
  })) as BoardingProfileWithHost[];

  console.log(`📊 TOTAL PROFILES: ${allProfiles.length}`);
  console.log('');

  // Separate by approval status
  const approved = allProfiles.filter(p => p.isApproved);
  const pending = allProfiles.filter(p => !p.isApproved);

  console.log(`✅ APPROVED: ${approved.length}`);
  console.log(`⏳ PENDING: ${pending.length}`);
  console.log('');

  // Show pending profiles
  if (pending.length > 0) {
    console.log('='.repeat(70));
    console.log('⏳ PENDING APPROVAL:');
    console.log('='.repeat(70));
    
    pending.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.location}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Host: ${p.host.name} (${p.host.email})`);
      console.log(`   Capacity: ${p.capacity} pets`);
      console.log(`   Price: KES ${p.pricePerDay}/day`);
      console.log(`   Description: ${p.description ? p.description.substring(0, 80) + '...' : 'N/A'}`);
      console.log(`   Coordinates: ${p.latitude}, ${p.longitude}`);
      console.log(`   Photos: ${p.photoUrls?.length || 0}`);
    });
    
    console.log('');
  }

  // Show approved profiles
  if (approved.length > 0) {
    console.log('='.repeat(70));
    console.log('✅ ALREADY APPROVED:');
    console.log('='.repeat(70));
    
    approved.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.location}`);
      console.log(`   Host: ${p.host.name}`);
      console.log(`   Price: KES ${p.pricePerDay}/day`);
    });
    
    console.log('');
  }

  // Ask user what to do
  if (pending.length > 0) {
    console.log('='.repeat(70));
    console.log('💡 ACTION NEEDED');
    console.log('='.repeat(70));
    console.log('');
    console.log('To approve ALL pending profiles, run:');
    console.log('  npx ts-node scripts/approve-all-boarding.ts');
    console.log('');
    console.log('Or approve a specific profile via admin dashboard:');
    console.log('  1. Login as admin');
    console.log('  2. Go to /app/admin/dashboard');
    console.log('  3. Find boarding profiles');
    console.log('  4. Click "Approve" on the profile');
    console.log('');
    console.log('='.repeat(70));
  } else {
    console.log('✨ All boarding profiles are approved and visible in search!');
    console.log('');
  }

  // Check specifically for Chuka
  const chukaProfiles = allProfiles.filter(p => 
    p.location.toLowerCase().includes('chuka')
  );

  if (chukaProfiles.length > 0) {
    console.log('='.repeat(70));
    console.log('📍 CHUKA PROFILES STATUS:');
    console.log('='.repeat(70));
    
    chukaProfiles.forEach((p, i) => {
      const status = p.isApproved ? '✅ APPROVED' : '⏳ PENDING';
      console.log(`\n${i + 1}. ${p.location}`);
      console.log(`   Status: ${status}`);
      console.log(`   Host: ${p.host.name}`);
      console.log(`   Price: KES ${p.pricePerDay}/day`);
      console.log(`   Coordinates: ${p.latitude}, ${p.longitude}`);
      
      if (!p.isApproved) {
        console.log(`   ⚠️  THIS PROFILE IS NOT VISIBLE TO OWNERS!`);
        console.log(`   👉 Run: npx ts-node scripts/approve-all-boarding.ts`);
      } else {
        console.log(`   ✅ This profile is visible in search`);
      }
    });
    
    console.log('');
  }
}

checkAndApproveBoarding()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
