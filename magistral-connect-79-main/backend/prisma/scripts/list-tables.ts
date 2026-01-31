import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const tables: any[] = await prisma.$queryRaw`SHOW TABLES`;
    console.log('Tabelas no banco de dados:');
    console.log(JSON.stringify(tables, null, 2));
  } catch (error) {
    console.error('Erro ao listar tabelas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
