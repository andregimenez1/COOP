import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const offersCount = await prisma.marketplaceOffer.count();
  console.log('Total offers in DB:', offersCount);
  if (offersCount > 0) {
    const offers = await prisma.marketplaceOffer.findMany({ take: 5 });
    console.log('Sample offers:', JSON.stringify(offers, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
