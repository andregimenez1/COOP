// Script para verificar solicitações de fornecedores no banco
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRequests() {
  try {
    console.log('\n========== Verificando Solicitações de Fornecedores ==========\n');
    
    const allRequests = await prisma.supplierRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`Total de solicitações no banco: ${allRequests.length}\n`);
    
    if (allRequests.length === 0) {
      console.log('⚠️  Nenhuma solicitação encontrada no banco.\n');
    } else {
      allRequests.forEach((r, index) => {
        console.log(`Solicitação ${index + 1}:`);
        console.log(`  ID: ${r.id}`);
        console.log(`  Nome: ${r.name}`);
        console.log(`  Usuário: ${r.userName} (${r.userId})`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Criada em: ${r.createdAt}`);
        console.log(`  Revisada em: ${r.reviewedAt || 'Não revisada'}`);
        console.log('');
      });
      
      const pending = allRequests.filter(r => r.status === 'pending');
      const approved = allRequests.filter(r => r.status === 'approved');
      const rejected = allRequests.filter(r => r.status === 'rejected');
      
      console.log('Resumo:');
      console.log(`  Pendentes: ${pending.length}`);
      console.log(`  Aprovadas: ${approved.length}`);
      console.log(`  Rejeitadas: ${rejected.length}`);
      console.log('');
    }
    
    console.log('==================================================\n');
  } catch (error) {
    console.error('❌ Erro ao verificar solicitações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRequests();
