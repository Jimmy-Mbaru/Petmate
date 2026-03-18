"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const boardingProfiles = [
    {
        hostEmail: 'host1@petmate.com',
        location: 'Nairobi, Kenya',
        latitude: -1.2921,
        longitude: 36.8219,
        capacity: 3,
        maxPetsPerNight: 2,
        pricePerDay: 15.5,
        description: 'Cozy apartment with a spacious backyard. Daily walks included. Love all friendly dogs!',
        photoUrls: [
            'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=800',
            'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=800',
        ],
        documentUrls: [],
        isApproved: true,
    },
    {
        hostEmail: 'host2@petmate.com',
        location: 'Mombasa, Kenya',
        latitude: -4.0435,
        longitude: 39.6682,
        capacity: 5,
        maxPetsPerNight: 3,
        pricePerDay: 25.0,
        description: 'Beach house with large compound. Perfect for active dogs who love swimming and running.',
        photoUrls: [
            'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=800',
        ],
        documentUrls: [],
        isApproved: true,
    },
    {
        hostEmail: 'host3@petmate.com',
        location: 'Kisumu, Kenya',
        latitude: -0.0917,
        longitude: 34.7680,
        capacity: 2,
        maxPetsPerNight: 1,
        pricePerDay: 12.0,
        description: 'Quiet home near Lake Victoria. Great for cats and small dogs. Indoor boarding available.',
        photoUrls: [
            'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800',
        ],
        documentUrls: [],
        isApproved: true,
    },
    {
        hostEmail: 'host4@petmate.com',
        location: 'Nakuru, Kenya',
        latitude: -0.3031,
        longitude: 36.0800,
        capacity: 4,
        maxPetsPerNight: 2,
        pricePerDay: 18.0,
        description: 'Farm setting with plenty of space for dogs to run. Experienced with large breeds.',
        photoUrls: [
            'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
        ],
        documentUrls: [],
        isApproved: true,
    },
    {
        hostEmail: 'host5@petmate.com',
        location: 'Eldoret, Kenya',
        latitude: 0.5143,
        longitude: 35.2698,
        capacity: 3,
        maxPetsPerNight: 2,
        pricePerDay: 14.0,
        description: 'Family home with kids and other pets. Great socialization opportunities for your furry friend.',
        photoUrls: [
            'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800',
        ],
        documentUrls: [],
        isApproved: true,
    },
];
async function getOrCreateHost(email, name, password) {
    let host = await prisma.user.findUnique({
        where: { email },
    });
    if (!host) {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        host = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: 'HOST',
                isActive: true,
                emailVerified: true,
            },
        });
        console.log(`Created host: ${name} (${email})`);
    }
    else {
        console.log(`Host exists: ${name} (${email})`);
    }
    return host;
}
async function seed() {
    console.log('🌱 Seeding boarding profiles...\n');
    const hosts = await Promise.all([
        getOrCreateHost('host1@petmate.com', 'John Kamau', 'password123'),
        getOrCreateHost('host2@petmate.com', 'Sarah Wanjiku', 'password123'),
        getOrCreateHost('host3@petmate.com', 'Peter Omondi', 'password123'),
        getOrCreateHost('host4@petmate.com', 'Mary Chebet', 'password123'),
        getOrCreateHost('host5@petmate.com', 'David Kipchoge', 'password123'),
    ]);
    console.log('\n📝 Creating boarding profiles...\n');
    for (let i = 0; i < boardingProfiles.length; i++) {
        const profile = boardingProfiles[i];
        const host = hosts[i];
        const existing = await prisma.boardingProfile.findUnique({
            where: { hostId: host.id },
        });
        if (existing) {
            console.log(`Profile exists for ${host.name}`);
            continue;
        }
        await prisma.boardingProfile.create({
            data: {
                hostId: host.id,
                location: profile.location,
                latitude: profile.latitude,
                longitude: profile.longitude,
                capacity: profile.capacity,
                maxPetsPerNight: profile.maxPetsPerNight,
                pricePerDay: profile.pricePerDay,
                description: profile.description,
                photoUrls: profile.photoUrls,
                documentUrls: profile.documentUrls,
                isApproved: profile.isApproved,
            },
        });
        console.log(`✅ Created boarding profile: ${profile.location}`);
    }
    console.log('\n✨ Boarding profiles seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${hosts.length} hosts`);
    console.log(`   - ${boardingProfiles.length} boarding profiles (all approved)`);
    console.log('\n🔑 Test credentials:');
    console.log('   Email: host1@petmate.com (or host2, host3, etc.)');
    console.log('   Password: password123');
}
seed()
    .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-boarding.js.map