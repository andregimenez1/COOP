
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPrismaKeys() {
    const keys = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));

    console.log('--- MODELS ---');
    keys.forEach(k => console.log(k));
    console.log('--- END MODELS ---');

    console.log('TESTS:');
    console.log('inventoryItem:', !!prisma.inventoryItem);
    console.log('inventoryitem:', !!prisma.inventoryitem);
    console.log('marketplaceOffer:', !!prisma.marketplaceOffer);
    console.log('marketplaceoffer:', !!prisma.marketplaceoffer);
    console.log('bankDataChangeRequest:', !!prisma.bankDataChangeRequest);
    console.log('bankdatachangerequest:', !!prisma.bankdatachangerequest);
    console.log('offerProposal:', !!prisma.offerProposal);
    console.log('offerproposal:', !!prisma.offerproposal);
    console.log('substanceSuggestion:', !!prisma.substanceSuggestion);
    console.log('substancesuggestion:', !!prisma.substancesuggestion);

    await prisma.$disconnect();
}

checkPrismaKeys();
