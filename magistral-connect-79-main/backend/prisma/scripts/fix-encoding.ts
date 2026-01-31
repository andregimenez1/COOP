/**
 * Script para corrigir encoding de dados existentes no banco
 * Converte dados que podem estar salvos com encoding incorreto
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEncoding() {
  console.log('🔧 Iniciando correção de encoding...\n');

  try {
    // Buscar todos os usuários
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        razaoSocial: true,
      },
    });

    console.log(`📋 Encontrados ${users.length} usuários\n`);

    let fixed = 0;

    for (const user of users) {
      let needsUpdate = false;
      const updateData: any = {};

      // Verificar e corrigir name
      if (user.name && user.name.includes('?')) {
        console.log(`⚠️  Nome com problema de encoding: "${user.name}"`);
        // Tentar corrigir se for um problema conhecido
        const corrected = user.name
          .replace(/Farm\?cia/g, 'Farmácia')
          .replace(/Farmácia/g, 'Farmácia'); // Garantir que está correto
        if (corrected !== user.name) {
          updateData.name = corrected;
          needsUpdate = true;
          console.log(`   ✅ Corrigido para: "${corrected}"`);
        }
      }

      // Verificar e corrigir company
      if (user.company && user.company.includes('?')) {
        console.log(`⚠️  Empresa com problema de encoding: "${user.company}"`);
        const corrected = user.company
          .replace(/Farm\?cia/g, 'Farmácia')
          .replace(/Farmácia/g, 'Farmácia');
        if (corrected !== user.company) {
          updateData.company = corrected;
          needsUpdate = true;
          console.log(`   ✅ Corrigido para: "${corrected}"`);
        }
      }

      // Verificar e corrigir razaoSocial
      if (user.razaoSocial && user.razaoSocial.includes('?')) {
        console.log(`⚠️  Razão Social com problema de encoding: "${user.razaoSocial}"`);
        const corrected = user.razaoSocial
          .replace(/Farm\?cia/g, 'Farmácia')
          .replace(/Farmácia/g, 'Farmácia');
        if (corrected !== user.razaoSocial) {
          updateData.razaoSocial = corrected;
          needsUpdate = true;
          console.log(`   ✅ Corrigido para: "${corrected}"`);
        }
      }

      if (needsUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
        fixed++;
        console.log(`   ✅ Usuário ${user.id} atualizado\n`);
      }
    }

    console.log(`\n✅ Correção concluída! ${fixed} usuário(s) corrigido(s).`);
  } catch (error) {
    console.error('❌ Erro ao corrigir encoding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixEncoding()
  .then(() => {
    console.log('\n✨ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
