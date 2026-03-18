"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function approveAllBoardingProfiles() {
    console.log('═'.repeat(70));
    console.log('🔍 FINDING PENDING BOARDING PROFILES...');
    console.log('═'.repeat(70));
    console.log('');
    const pending = await prisma.boardingProfile.findMany({
        where: { isApproved: false },
        include: {
            host: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
    if (pending.length === 0) {
        console.log('✅ No pending profiles found. All profiles are already approved!');
        console.log('');
        return;
    }
    console.log(`📋 Found ${pending.length} pending profile(s):\n`);
    pending.forEach((p, i) => {
        console.log(`${i + 1}. ${p.location}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Host: ${p.host.name} (${p.host.email})`);
        console.log(`   Capacity: ${p.capacity} pets`);
        console.log(`   Price: KES ${p.pricePerDay}/day`);
        console.log(`   Coordinates: ${p.latitude ?? 'Not set'}, ${p.longitude ?? 'Not set'}`);
        if (p.description) {
            console.log(`   Description: ${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}`);
        }
        console.log('');
    });
    console.log('═'.repeat(70));
    console.log(`⏳ APPROVING ALL ${pending.length} PROFILE(S)...`);
    console.log('═'.repeat(70));
    console.log('');
    const approved = await prisma.boardingProfile.updateMany({
        where: {
            id: {
                in: pending.map(p => p.id),
            },
        },
        data: {
            isApproved: true,
        },
    });
    console.log(`✅ Successfully approved ${approved.count} profile(s)!\n`);
    const total = await prisma.boardingProfile.count();
    const approvedTotal = await prisma.boardingProfile.count({
        where: { isApproved: true },
    });
    console.log('═'.repeat(70));
    console.log('📊 SUMMARY:');
    console.log('═'.repeat(70));
    console.log(`   Total profiles: ${total}`);
    console.log(`   ✅ Approved: ${approvedTotal}`);
    console.log(`   ⏳ Pending: ${total - approvedTotal}`);
    console.log('');
    console.log('✨ All boarding profiles are now visible in search!');
    console.log('═'.repeat(70));
    console.log('');
    console.log('🌐 NEXT STEPS:');
    console.log('   1. Go to /boarding on the owner dashboard');
    console.log('   2. Your profiles should now appear in search results');
    console.log('   3. Click "Show Map" to see markers on the map');
    console.log('   4. Test booking one of your profiles');
    console.log('');
}
approveAllBoardingProfiles()
    .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=approve-all-boarding.js.map