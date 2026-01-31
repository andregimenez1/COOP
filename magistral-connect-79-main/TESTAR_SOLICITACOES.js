// ============================================================
// SCRIPT DE TESTE: Verificar Solicitações
// ============================================================
// 
// Execute no console do navegador para diagnosticar
// por que as solicitações não aparecem para o admin
//
// ============================================================

(async function testarSolicitacoes() {
  console.log('🔍 Iniciando diagnóstico de solicitações...\n');

  // 1. Verificar autenticação
  const auth = JSON.parse(localStorage.getItem('magistral_auth_user') || 'null');
  if (!auth) {
    console.error('❌ Você precisa estar logado!');
    return;
  }

  console.log('✅ Usuário autenticado:');
  console.log('   Email:', auth.user.email);
  console.log('   Role:', auth.user.role);
  console.log('   Token:', auth.token ? '✅ Presente' : '❌ Ausente');
  console.log('');

  // 2. Verificar se o backend está rodando
  try {
    const healthCheck = await fetch('http://localhost:3001/api/health').catch(() => null);
    if (!healthCheck) {
      console.warn('⚠️  Não foi possível verificar saúde do backend (pode estar offline)');
    } else {
      console.log('✅ Backend está respondendo');
    }
  } catch (e) {
    console.warn('⚠️  Backend pode estar offline');
  }
  console.log('');

  // 3. Listar solicitações como usuário atual
  try {
    console.log('📋 Listando solicitações como usuário atual...');
    const res = await fetch('http://localhost:3001/api/requests/bank-data', {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Erro ao listar solicitações:', res.status, errorText);
      return;
    }

    const data = await res.json();
    console.log('✅ Solicitações encontradas:', data.requests.length);
    console.log('');

    if (data.requests.length === 0) {
      console.log('⚠️  Nenhuma solicitação encontrada no banco de dados');
      console.log('');
      console.log('💡 Possíveis causas:');
      console.log('   1. Nenhuma solicitação foi criada ainda');
      console.log('   2. As solicitações foram criadas com outro usuário');
      console.log('   3. Problema de permissão (role não é master)');
      return;
    }

    // Detalhes das solicitações
    console.log('📊 Detalhes das solicitações:');
    data.requests.forEach((req, idx) => {
      console.log(`\n   ${idx + 1}. ID: ${req.id}`);
      console.log(`      Usuário: ${req.userName} (${req.userId})`);
      console.log(`      Status: ${req.status || '(sem status)'}`);
      console.log(`      Criada em: ${new Date(req.createdAt).toLocaleString('pt-BR')}`);
      if (req.newPixKey) console.log(`      PIX: ${req.newPixKey}`);
      if (req.newCnpj) console.log(`      CNPJ: ${req.newCnpj}`);
      if (req.newRazaoSocial) console.log(`      Razão Social: ${req.newRazaoSocial}`);
    });
    console.log('');

    // Verificar status
    const pendentes = data.requests.filter(r => !r.status || r.status === 'pending' || r.status === '');
    const aprovadas = data.requests.filter(r => r.status === 'approved');
    const rejeitadas = data.requests.filter(r => r.status === 'rejected');
    const semStatus = data.requests.filter(r => !r.status || r.status === '');

    console.log('📊 Estatísticas:');
    console.log(`   ⏳ Pendentes: ${pendentes.length}`);
    console.log(`   ✅ Aprovadas: ${aprovadas.length}`);
    console.log(`   ❌ Rejeitadas: ${rejeitadas.length}`);
    console.log(`   ⚠️  Sem status: ${semStatus.length}`);
    console.log('');

    // 4. Se for master, verificar se está vendo todas
    if (auth.user.role === 'master') {
      console.log('👑 Você é MASTER - deve ver TODAS as solicitações');
      console.log(`   Total encontrado: ${data.requests.length}`);
      
      if (data.requests.length === 0) {
        console.log('');
        console.log('❌ PROBLEMA: Master não está vendo nenhuma solicitação!');
        console.log('');
        console.log('🔍 Verificações:');
        console.log('   1. Verifique no phpMyAdmin se há registros na tabela BankDataChangeRequest');
        console.log('   2. Verifique se o backend está retornando dados corretamente');
        console.log('   3. Verifique se há erro no console do backend');
      } else {
        console.log('✅ Master está vendo solicitações corretamente');
      }
    } else {
      console.log('👤 Você é usuário comum - deve ver apenas suas próprias solicitações');
      const minhas = data.requests.filter(r => r.userId === auth.user.id);
      console.log(`   Suas solicitações: ${minhas.length}`);
    }

    // 5. Teste de criação (opcional)
    console.log('');
    console.log('🧪 Para testar criação de solicitação, execute:');
    console.log('   testarCriarSolicitacao()');

  } catch (error) {
    console.error('❌ Erro ao testar:', error);
  }
})();

// Função para testar criação
window.testarCriarSolicitacao = async function() {
  const auth = JSON.parse(localStorage.getItem('magistral_auth_user') || 'null');
  if (!auth) {
    console.error('❌ Você precisa estar logado!');
    return;
  }

  console.log('🧪 Testando criação de solicitação...');

  try {
    const res = await fetch('http://localhost:3001/api/requests/bank-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        newPixKey: 'teste@teste.com',
        reason: 'Teste de criação de solicitação'
      })
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('❌ Erro ao criar:', res.status, error);
      return;
    }

    const data = await res.json();
    console.log('✅ Solicitação criada com sucesso:', data.request);
    console.log('📋 ID:', data.request.id);
    console.log('📋 Status:', data.request.status);
    
    // Verificar se aparece na listagem
    console.log('');
    console.log('🔄 Verificando se aparece na listagem...');
    const listRes = await fetch('http://localhost:3001/api/requests/bank-data', {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });
    
    const listData = await listRes.json();
    const encontrada = listData.requests.find(r => r.id === data.request.id);
    
    if (encontrada) {
      console.log('✅ Solicitação aparece na listagem!');
    } else {
      console.error('❌ PROBLEMA: Solicitação criada mas NÃO aparece na listagem!');
      console.log('   Isso indica um problema no backend ou na query');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

console.log('💡 Funções disponíveis:');
console.log('   testarSolicitacoes() - Já executado acima');
console.log('   testarCriarSolicitacao() - Para testar criação');
