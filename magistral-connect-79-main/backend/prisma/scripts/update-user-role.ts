import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'natural@magistral.com';
  const role = process.argv[3] || 'cooperado';

  console.log(`🔄 Atualizando usuário ${email} para role '${role}'...`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`❌ Usuário ${email} não encontrado.`);
    process.exit(1);
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { role },
  });

  console.log(`✅ Usuário atualizado com sucesso:`, updatedUser);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
