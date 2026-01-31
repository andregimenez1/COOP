/**
 * Script de Migração: localStorage → MySQL via API
 * 
 * Este script migra dados existentes do localStorage para o MySQL através da API.
 * Execute no console do navegador após fazer login.
 * 
 * Uso:
 * 1. Abra o console do navegador (F12)
 * 2. Copie e cole este script
 * 3. Execute: migrateLocalStorageToAPI()
 */

export async function migrateLocalStorageToAPI() {
  const results = {
    substances: { migrated: 0, errors: 0 },
    suggestions: { migrated: 0, errors: 0 },
    suppliers: { migrated: 0, errors: 0 },
    users: { migrated: 0, errors: 0 },
  };

  console.log('🚀 Iniciando migração de dados do localStorage para MySQL...');

  // Verificar se está autenticado
  const authUser = localStorage.getItem('magistral_auth_user');
  if (!authUser) {
    console.error('❌ Você precisa estar logado para migrar dados!');
    return;
  }

  try {
    // Importar serviços
    const { substanceService } = await import('@/services/substance.service');
    const { supplierService } = await import('@/services/supplier.service');
    const { userService } = await import('@/services/user.service');

    // 1. Migrar Substâncias
    console.log('\n📦 Migrando substâncias...');
    const substancesStored = localStorage.getItem('magistral_substances');
    if (substancesStored) {
      try {
        const substances = JSON.parse(substancesStored);
        for (const substance of substances) {
          try {
            // Verificar se já existe
            const existing = await substanceService.getAll();
            const exists = existing.some(s => s.name === substance.name);
            
            if (!exists) {
              await substanceService.create({
                name: substance.name,
                synonyms: substance.synonyms || [],
              });
              results.substances.migrated++;
              console.log(`  ✅ Migrada: ${substance.name}`);
            } else {
              console.log(`  ⏭️  Já existe: ${substance.name}`);
            }
          } catch (error: any) {
            results.substances.errors++;
            console.error(`  ❌ Erro ao migrar ${substance.name}:`, error.message);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar substâncias:', error);
      }
    }

    // 2. Migrar Sugestões de Substâncias
    console.log('\n💡 Migrando sugestões de substâncias...');
    const suggestionsStored = localStorage.getItem('magistral_substance_suggestions');
    if (suggestionsStored) {
      try {
        const suggestions = JSON.parse(suggestionsStored);
        for (const suggestion of suggestions) {
          try {
            // Verificar se já existe
            const existing = await substanceService.getSuggestions();
            const exists = existing.some(s => s.id === suggestion.id || s.name === suggestion.name);
            
            if (!exists && suggestion.status === 'pending') {
              await substanceService.createSuggestion(suggestion.name);
              results.suggestions.migrated++;
              console.log(`  ✅ Migrada: ${suggestion.name}`);
            } else {
              console.log(`  ⏭️  Já existe ou processada: ${suggestion.name}`);
            }
          } catch (error: any) {
            results.suggestions.errors++;
            console.error(`  ❌ Erro ao migrar sugestão ${suggestion.name}:`, error.message);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar sugestões:', error);
      }
    }

    // 3. Migrar Fornecedores
    console.log('\n🏢 Migrando fornecedores...');
    const suppliersStored = localStorage.getItem('magistral_suppliers');
    if (suppliersStored) {
      try {
        const suppliers = JSON.parse(suppliersStored);
        for (const supplier of suppliers) {
          try {
            await supplierService.create({
              name: supplier.name,
              contact: supplier.contact,
              whatsapp: supplier.whatsapp,
              notes: supplier.notes,
            });
            results.suppliers.migrated++;
            console.log(`  ✅ Migrado: ${supplier.name}`);
          } catch (error: any) {
            results.suppliers.errors++;
            console.error(`  ❌ Erro ao migrar ${supplier.name}:`, error.message);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar fornecedores:', error);
      }
    }

    // 4. Migrar Usuários (apenas se for master)
    const user = JSON.parse(authUser);
    if (user.role === 'master') {
      console.log('\n👥 Migrando usuários...');
      const usersStored = localStorage.getItem('magistral_users');
      if (usersStored) {
        try {
          const users = JSON.parse(usersStored);
          for (const userData of users) {
            try {
              // Verificar se já existe
              const existing = await userService.getAll();
              const exists = existing.some(u => u.email === userData.email);
              
              if (!exists) {
                // Criar via registro (requer senha, então pode não funcionar)
                console.log(`  ⚠️  Usuário ${userData.email} precisa ser criado manualmente (requer senha)`);
              } else {
                // Atualizar dados
                await userService.update(userData.id, userData);
                results.users.migrated++;
                console.log(`  ✅ Atualizado: ${userData.email}`);
              }
            } catch (error: any) {
              results.users.errors++;
              console.error(`  ❌ Erro ao migrar ${userData.email}:`, error.message);
            }
          }
        } catch (error) {
          console.error('  ❌ Erro ao processar usuários:', error);
        }
      }
    }

    // Resumo
    console.log('\n📊 Resumo da Migração:');
    console.log(`  Substâncias: ${results.substances.migrated} migradas, ${results.substances.errors} erros`);
    console.log(`  Sugestões: ${results.suggestions.migrated} migradas, ${results.suggestions.errors} erros`);
    console.log(`  Fornecedores: ${results.suppliers.migrated} migrados, ${results.suppliers.errors} erros`);
    console.log(`  Usuários: ${results.users.migrated} atualizados, ${results.users.errors} erros`);
    console.log('\n✅ Migração concluída!');

    return results;
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    throw error;
  }
}

// Para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).migrateLocalStorageToAPI = migrateLocalStorageToAPI;
  console.log('💡 Função migrateLocalStorageToAPI() disponível. Execute no console para migrar dados.');
}
