/**
 * Remove o usuário Natural (Araraquara) completamente — sem recriar.
 *
 * Execute: npm run reset-natural (na pasta backend)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const NATURAL_EMAIL = 'natural@magistral.com';

async function main() {
  const natural = await prisma.user.findUnique({
    where: { email: NATURAL_EMAIL },
    select: { id: true, name: true },
  });

  if (!natural) {
    console.log('⚠️ Usuário Natural não encontrado. Nada a fazer.');
    return;
  }

  const id = natural.id;
  console.log(`🔄 Removendo usuário Natural (id: ${id}) e dependências...`);

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.substanceSuggestion.deleteMany({ where: { userId: id } });
    await tx.supplierRequest.deleteMany({ where: { userId: id } });
    await tx.vote.deleteMany({ where: { userId: id } });
    await tx.purchaseItem.deleteMany({ where: { userId: id } });
    await tx.quotation.deleteMany({ where: { userId: id } });
    await tx.financialMovement.deleteMany({ where: { createdBy: id } });
    await tx.bankDataChangeRequest.deleteMany({ where: { userId: id } });
    await tx.extraUserRequest.deleteMany({ where: { userId: id } });
    await tx.exitRequest.deleteMany({ where: { userId: id } });

    await tx.offerProposal.deleteMany({ where: { proposerId: id } });
    await tx.transaction.deleteMany({
      where: { OR: [{ sellerId: id }, { buyerId: id }] },
    });
    await tx.marketplaceOffer.deleteMany({ where: { userId: id } });
    await tx.rawMaterial.deleteMany({ where: { createdBy: id } });

    const supplierIds = (await tx.supplier.findMany({ where: { userId: id }, select: { id: true } })).map((s) => s.id);
    if (supplierIds.length > 0) {
      await tx.supplierQualificationRequest.deleteMany({ where: { supplierId: { in: supplierIds } } });
      await tx.supplierQualification.deleteMany({ where: { supplierId: { in: supplierIds } } });
    }
    await tx.supplier.deleteMany({ where: { userId: id } });

    await tx.transparencyNews.updateMany(
      { where: { approvedBy: id } },
      { data: { approvedBy: null, approvedAt: null } }
    );
    await tx.transparencyNews.deleteMany({ where: { createdBy: id } });

    // Deletar InventoryItem (ownerId e holderId)
    await tx.inventoryItem.deleteMany({
      where: { OR: [{ ownerId: id }, { holderId: id }] },
    });

    // Deletar FlashDealClaim
    await tx.flashDealClaim.deleteMany({ where: { userId: id } });

    // Deletar StrategicReserveClaim
    await tx.strategicReserveClaim.deleteMany({ where: { userId: id } });

    await tx.user.delete({ where: { id } });
  });

  console.log('✅ Usuário Natural removido completamente.');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
