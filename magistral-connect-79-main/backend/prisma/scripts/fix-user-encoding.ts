/**
 * Script para corrigir encoding de um usuário específico
 * Uso: npx tsx prisma/scripts/fix-user-encoding.ts "Farm?cia Natural" "Farmácia Natural"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserEncoding() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Uso: npx tsx prisma/scripts/fix-user-encoding.ts <nome_errado> <nome_correto>');
    console.log('Exemplo: npx tsx prisma/scripts/fix-user-encoding.ts "Farm?cia Natural" "Farmácia Natural"');
    process.exit(1);
  }

  const wrongName = args[0];
  const correctName = args[1];

  console.log('🔧 Corrigindo encoding do usuário...\n');
  console.log(`Nome errado: "${wrongName}"`);
  console.log(`Nome correto: "${correctName}"\n`);

  try {
    // Buscar usuário pelo nome errado
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: wrongName } },
          { company: { contains: wrongName } },
        ],
      },
    });

    if (!user) {
      console.log(`❌ Usuário não encontrado com nome contendo "${wrongName}"`);
      process.exit(1);
    }

    console.log(`✅ Usuário encontrado: ${user.id}`);
    console.log(`   Nome atual: "${user.name}"`);
    console.log(`   Empresa atual: "${user.company || '(vazio)'}"`);
    console.log(`   Razão Social atual: "${user.razaoSocial || '(vazio)'}"\n`);

    const updateData: any = {};

    // Corrigir name
    if (user.name && user.name.includes('?')) {
      const corrected = user.name.replace(wrongName, correctName);
      updateData.name = corrected;
      console.log(`   📝 Nome será atualizado para: "${corrected}"`);
    }

    // Corrigir company
    if (user.company && user.company.includes('?')) {
      const corrected = user.company.replace(wrongName, correctName);
      updateData.company = corrected;
      console.log(`   📝 Empresa será atualizada para: "${corrected}"`);
    }

    // Corrigir razaoSocial
    if (user.razaoSocial && user.razaoSocial.includes('?')) {
      const corrected = user.razaoSocial.replace(wrongName, correctName);
      updateData.razaoSocial = corrected;
      console.log(`   📝 Razão Social será atualizada para: "${corrected}"`);
    }

    if (Object.keys(updateData).length === 0) {
      console.log('⚠️  Nenhuma correção necessária. O usuário não contém o texto problemático.');
      process.exit(0);
    }

    // Atualizar usuário
    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    console.log('\n✅ Usuário atualizado com sucesso!');
    
    // Verificar atualização
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, company: true, razaoSocial: true },
    });
    
    console.log('\n📋 Dados atualizados:');
    console.log(`   Nome: "${updated?.name}"`);
    console.log(`   Empresa: "${updated?.company || '(vazio)'}"`);
    console.log(`   Razão Social: "${updated?.razaoSocial || '(vazio)'}"`);
  } catch (error) {
    console.error('❌ Erro ao corrigir encoding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixUserEncoding()
  .then(() => {
    console.log('\n✨ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
