/**
 * Script de Migração Completo: localStorage → MySQL via API
 * 
 * Este script migra TODOS os dados existentes do localStorage para o MySQL.
 * Execute no console do navegador após fazer login como master.
 * 
 * Uso:
 * 1. Abra o console do navegador (F12)
 * 2. Copie e cole este script
 * 3. Execute: migrateAllLocalStorageToAPI()
 */

export async function migrateAllLocalStorageToAPI() {
  const results = {
    substances: { migrated: 0, skipped: 0, errors: 0 },
    suggestions: { migrated: 0, skipped: 0, errors: 0 },
    suppliers: { migrated: 0, skipped: 0, errors: 0 },
    users: { migrated: 0, skipped: 0, errors: 0 },
    bankDataRequests: { migrated: 0, skipped: 0, errors: 0 },
    extraUserRequests: { migrated: 0, skipped: 0, errors: 0 },
    exitRequests: { migrated: 0, skipped: 0, errors: 0 },
    supplierRequests: { migrated: 0, skipped: 0, errors: 0 },
  };

  console.log('🚀 Iniciando migração completa do localStorage para MySQL...\n');

  // Verificar autenticação
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
    const { substanceService } = await import('@/services/substance.service');
    const { supplierService } = await import('@/services/supplier.service');
    const { userService } = await import('@/services/user.service');
    const { requestService } = await import('@/services/request.service');

    // 1. Substâncias
    console.log('\n📦 Migrando substâncias...');
    const substancesStored = localStorage.getItem('magistral_substances');
    if (substancesStored) {
      try {
        const substances = JSON.parse(substancesStored);
        const existing = await substanceService.getAll();
        const existingNames = new Set(existing.map(s => s.name));
        
        for (const substance of substances) {
          try {
            if (existingNames.has(substance.name)) {
              results.substances.skipped++;
              continue;
            }
            await substanceService.create({
              name: substance.name,
              synonyms: substance.synonyms || [],
            });
            results.substances.migrated++;
            console.log(`  ✅ Migrada: ${substance.name}`);
          } catch (error: any) {
            results.substances.errors++;
            console.error(`  ❌ Erro: ${substance.name} - ${error.message}`);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar substâncias:', error);
      }
    }

    // 2. Sugestões de substâncias
    console.log('\n💡 Migrando sugestões de substâncias...');
    const suggestionsStored = localStorage.getItem('magistral_substance_suggestions');
    if (suggestionsStored) {
      try {
        const suggestions = JSON.parse(suggestionsStored);
        const existing = await substanceService.getSuggestions();
        const existingNames = new Set(existing.map(s => s.name));
        
        for (const suggestion of suggestions) {
          try {
            if (existingNames.has(suggestion.name) || suggestion.status !== 'pending') {
              results.suggestions.skipped++;
              continue;
            }
            await substanceService.createSuggestion(suggestion.name);
            results.suggestions.migrated++;
            console.log(`  ✅ Migrada: ${suggestion.name}`);
          } catch (error: any) {
            results.suggestions.errors++;
            console.error(`  ❌ Erro: ${suggestion.name} - ${error.message}`);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar sugestões:', error);
      }
    }

    // 3. Fornecedores
    console.log('\n🏢 Migrando fornecedores...');
    const suppliersStored = localStorage.getItem('magistral_suppliers');
    if (suppliersStored) {
      try {
        const suppliers = JSON.parse(suppliersStored);
        const existing = await supplierService.getAll();
        const existingNames = new Set(existing.map(s => s.name));
        
        for (const supplier of suppliers) {
          try {
            if (existingNames.has(supplier.name)) {
              results.suppliers.skipped++;
              continue;
            }
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
            console.error(`  ❌ Erro: ${supplier.name} - ${error.message}`);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar fornecedores:', error);
      }
    }

    // 4. Solicitações de fornecedor
    console.log('\n📋 Migrando solicitações de fornecedor...');
    const supplierRequestsStored = localStorage.getItem('magistral_supplier_requests');
    if (supplierRequestsStored) {
      try {
        const requests = JSON.parse(supplierRequestsStored);
        const existing = await supplierService.getRequests();
        const existingIds = new Set(existing.map(r => r.id));
        
        for (const request of requests) {
          try {
            if (existingIds.has(request.id) || request.status !== 'pending') {
              results.supplierRequests.skipped++;
              continue;
            }
            await supplierService.createRequest(request.name);
            results.supplierRequests.migrated++;
            console.log(`  ✅ Migrada: ${request.name}`);
          } catch (error: any) {
            results.supplierRequests.errors++;
            console.error(`  ❌ Erro: ${request.name} - ${error.message}`);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar solicitações de fornecedor:', error);
      }
    }

    // 5. Solicitações de dados bancários
    console.log('\n💳 Migrando solicitações de dados bancários...');
    const bankDataStored = localStorage.getItem('magistral_bank_data_requests');
    if (bankDataStored) {
      try {
        const requests = JSON.parse(bankDataStored);
        const existing = await requestService.getBankDataRequests();
        const existingIds = new Set(existing.map(r => r.id));
        
        for (const request of requests) {
          try {
            if (existingIds.has(request.id) || request.status !== 'pending') {
              results.bankDataRequests.skipped++;
              continue;
            }
            await requestService.createBankDataRequest({
              newPixKey: request.newPixKey,
              pixBank: request.pixBank,
              bankName: request.bankName,
              accountType: request.accountType,
              agency: request.agency,
              account: request.account,
              accountHolder: request.accountHolder,
              newCnpj: request.newCnpj,
              newRazaoSocial: request.newRazaoSocial,
              reason: request.reason,
            });
            results.bankDataRequests.migrated++;
            console.log(`  ✅ Migrada: ${request.userName}`);
          } catch (error: any) {
            results.bankDataRequests.errors++;
            console.error(`  ❌ Erro: ${request.userName} - ${error.message}`);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar solicitações bancárias:', error);
      }
    }

    // 6. Solicitações de usuários extras
    console.log('\n👤 Migrando solicitações de usuários extras...');
    const extraUsersStored = localStorage.getItem('magistral_extra_users_requests');
    if (extraUsersStored) {
      try {
        const requests = JSON.parse(extraUsersStored);
        const existing = await requestService.getExtraUserRequests();
        const existingIds = new Set(existing.map(r => r.id));
        
        for (const request of requests) {
          try {
            if (existingIds.has(request.id) || request.status !== 'pending') {
              results.extraUserRequests.skipped++;
              continue;
            }
            await requestService.createExtraUserRequest({
              requestedUsers: request.requestedUsers,
              reason: request.reason,
            });
            results.extraUserRequests.migrated++;
            console.log(`  ✅ Migrada: ${request.userName}`);
          } catch (error: any) {
            results.extraUserRequests.errors++;
            console.error(`  ❌ Erro: ${request.userName} - ${error.message}`);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar solicitações de usuários extras:', error);
      }
    }

    // 7. Solicitações de saída
    console.log('\n🚪 Migrando solicitações de saída...');
    const exitStored = localStorage.getItem('magistral_exit_requests');
    if (exitStored) {
      try {
        const requests = JSON.parse(exitStored);
        const existing = await requestService.getExitRequests();
        const existingIds = new Set(existing.map(r => r.id));
        
        for (const request of requests) {
          try {
            if (existingIds.has(request.id) || request.status !== 'pending') {
              results.exitRequests.skipped++;
              continue;
            }
            await requestService.createExitRequest({
              reason: request.reason,
            });
            results.exitRequests.migrated++;
            console.log(`  ✅ Migrada: ${request.userName}`);
          } catch (error: any) {
            results.exitRequests.errors++;
            console.error(`  ❌ Erro: ${request.userName} - ${error.message}`);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar solicitações de saída:', error);
      }
    }

    // 8. Usuários (atualizar dados)
    console.log('\n👥 Migrando dados de usuários...');
    const usersStored = localStorage.getItem('magistral_users');
    if (usersStored) {
      try {
        const users = JSON.parse(usersStored);
        const existing = await userService.getAll();
        const existingEmails = new Map(existing.map(u => [u.email, u]));
        
        for (const userData of users) {
          try {
            const existingUser = existingEmails.get(userData.email);
            if (!existingUser) {
              results.users.skipped++;
              console.log(`  ⚠️  Usuário ${userData.email} não existe na API (criar via registro)`);
              continue;
            }
            // Atualizar apenas campos permitidos
            await userService.update(existingUser.id, {
              name: userData.name,
              company: userData.company,
              cnpj: userData.cnpj,
              contribution: userData.contribution || 0,
              currentValue: userData.currentValue || userData.contribution || 0,
            });
            results.users.migrated++;
            console.log(`  ✅ Atualizado: ${userData.email}`);
          } catch (error: any) {
            results.users.errors++;
            console.error(`  ❌ Erro: ${userData.email} - ${error.message}`);
          }
        }
      } catch (error) {
        console.error('  ❌ Erro ao processar usuários:', error);
      }
    }

    // Resumo final
    console.log('\n📊 Resumo Completo da Migração:\n');
    console.log('Substâncias:');
    console.log(`  ✅ ${results.substances.migrated} migradas, ⏭️  ${results.substances.skipped} ignoradas, ❌ ${results.substances.errors} erros`);
    console.log('Sugestões:');
    console.log(`  ✅ ${results.suggestions.migrated} migradas, ⏭️  ${results.suggestions.skipped} ignoradas, ❌ ${results.suggestions.errors} erros`);
    console.log('Fornecedores:');
    console.log(`  ✅ ${results.suppliers.migrated} migrados, ⏭️  ${results.suppliers.skipped} ignorados, ❌ ${results.suppliers.errors} erros`);
    console.log('Solicitações de Fornecedor:');
    console.log(`  ✅ ${results.supplierRequests.migrated} migradas, ⏭️  ${results.supplierRequests.skipped} ignoradas, ❌ ${results.supplierRequests.errors} erros`);
    console.log('Solicitações Bancárias:');
    console.log(`  ✅ ${results.bankDataRequests.migrated} migradas, ⏭️  ${results.bankDataRequests.skipped} ignoradas, ❌ ${results.bankDataRequests.errors} erros`);
    console.log('Solicitações de Usuários Extras:');
    console.log(`  ✅ ${results.extraUserRequests.migrated} migradas, ⏭️  ${results.extraUserRequests.skipped} ignoradas, ❌ ${results.extraUserRequests.errors} erros`);
    console.log('Solicitações de Saída:');
    console.log(`  ✅ ${results.exitRequests.migrated} migradas, ⏭️  ${results.exitRequests.skipped} ignoradas, ❌ ${results.exitRequests.errors} erros`);
    console.log('Usuários:');
    console.log(`  ✅ ${results.users.migrated} atualizados, ⏭️  ${results.users.skipped} ignorados, ❌ ${results.users.errors} erros`);
    console.log('\n✅ Migração completa concluída!');

    return results;
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    throw error;
  }
}

// Para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).migrateAllLocalStorageToAPI = migrateAllLocalStorageToAPI;
  console.log('💡 Função migrateAllLocalStorageToAPI() disponível. Execute no console para migrar todos os dados.');
}
