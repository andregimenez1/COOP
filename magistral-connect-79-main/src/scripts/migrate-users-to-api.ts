/**
 * Script de Migração: Usuários do localStorage → MySQL via API
 * 
 * Este script migra dados de usuários existentes do localStorage para o MySQL.
 * Execute no console do navegador após fazer login como master.
 * 
 * Uso:
 * 1. Abra o console do navegador (F12)
 * 2. Copie e cole este script
 * 3. Execute: migrateUsersToAPI()
 */

export async function migrateUsersToAPI() {
  console.log('🚀 Iniciando migração de usuários do localStorage para MySQL...');

  // Verificar se está autenticado
  const authUser = localStorage.getItem('magistral_auth_user');
  if (!authUser) {
    console.error('❌ Você precisa estar logado para migrar dados!');
    return;
  }

  const currentUser = JSON.parse(authUser);
  if (currentUser.role !== 'master') {
    console.error('❌ Apenas usuários master podem migrar dados!');
    return;
  }

  try {
    const { userService } = await import('@/services/user.service');
    const { authService } = await import('@/services/auth.service');

    // Carregar usuários do localStorage
    const usersStored = localStorage.getItem('magistral_users');
    if (!usersStored) {
      console.log('⚠️  Nenhum dado de usuários encontrado no localStorage');
      return;
    }

    const users = JSON.parse(usersStored);
    console.log(`📦 Encontrados ${users.length} usuários no localStorage`);

    const results = {
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    // Buscar usuários existentes na API
    const existingUsers = await userService.getAll();
    const existingEmails = new Set(existingUsers.map(u => u.email));

    for (const userData of users) {
      try {
        // Verificar se já existe na API
        if (existingEmails.has(userData.email)) {
          // Atualizar dados do usuário existente
          const existing = existingUsers.find(u => u.email === userData.email);
          if (existing) {
            // Atualizar apenas campos que não são gerenciados pelo backend
            // (como pixKey, razaoSocial, etc. que vêm de BankDataChangeRequest)
            await userService.update(existing.id, {
              name: userData.name,
              company: userData.company,
              cnpj: userData.cnpj,
              contribution: userData.contribution || 0,
              currentValue: userData.currentValue || userData.contribution || 0,
            });
            results.updated++;
            console.log(`  ✅ Atualizado: ${userData.email}`);
          } else {
            results.skipped++;
            console.log(`  ⏭️  Já existe: ${userData.email}`);
          }
        } else {
          // Usuário não existe na API - não podemos criar sem senha
          console.log(`  ⚠️  Usuário ${userData.email} não existe na API. Crie manualmente ou via registro.`);
          results.skipped++;
        }
      } catch (error: any) {
        results.errors++;
        console.error(`  ❌ Erro ao migrar ${userData.email}:`, error.message);
      }
    }

    // Resumo
    console.log('\n📊 Resumo da Migração de Usuários:');
    console.log(`  Atualizados: ${results.updated}`);
    console.log(`  Ignorados: ${results.skipped}`);
    console.log(`  Erros: ${results.errors}`);
    console.log('\n✅ Migração de usuários concluída!');

    return results;
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    throw error;
  }
}

// Para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).migrateUsersToAPI = migrateUsersToAPI;
  console.log('💡 Função migrateUsersToAPI() disponível. Execute no console para migrar usuários.');
}
