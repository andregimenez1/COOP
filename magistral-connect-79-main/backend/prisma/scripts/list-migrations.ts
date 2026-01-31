import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const migrations: any[] = await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations`;
    console.log('Migrações aplicadas:');
    console.log(migrations);
  } catch (error) {
    console.error('Erro ao listar migrações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
