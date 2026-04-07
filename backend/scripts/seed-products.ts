/**
 * Sample store products for local / staging.
 * Run: npm run seed:products   (or via npm run seed:all / prisma db seed)
 */
import { PrismaClient, ProductCategory } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Premium Dog Food',
    description: 'High-quality kibble for adult dogs.',
    price: 4500,
    stock: 50,
    category: ProductCategory.FOOD,
    imageUrl:
      'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800',
  },
  {
    name: 'Cat Litter 10kg',
    description: 'Super absorbent and odor-locking.',
    price: 1200,
    stock: 30,
    category: ProductCategory.OTHER,
    imageUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
  },
  {
    name: 'Chew Toy',
    description: 'Durable rubber toy for heavy chewers.',
    price: 800,
    stock: 100,
    category: ProductCategory.TOYS,
    imageUrl:
      'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800',
  },
];

async function seed() {
  console.log('🌱 Seeding products...');
  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { name: p.name },
    });
    if (existing) {
      console.log(`Product ${p.name} already exists`);
      continue;
    }
    await prisma.product.create({
      data: p,
    });
    console.log(`✅ Created product: ${p.name}`);
  }
  console.log('✨ Products seeded!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
