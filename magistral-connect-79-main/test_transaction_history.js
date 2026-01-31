const https = require('https');

// Teste simples do endpoint transactionHistory
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/marketplace/transactions/history',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer SEU_TOKEN_AQUI', // Você precisará de um token válido
    'Content-Type': 'application/json'
  }
};

console.log('Testando endpoint transactionHistory...');

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Resposta completa:', data);
    
    // Verificar se houve erro de headers duplicados
    if (res.headers['x-powered-by'] && data.includes('successful') && data.includes('unsuccessful')) {
      console.log('✅ SUCESSO: Endpoint está respondendo corretamente sem duplicação de headers!');
    } else if (res.statusCode === 401) {
      console.log('ℹ️  Autenticação necessária - endpoint está acessível (erro esperado sem token válido)');
    } else {
      console.log('⚠️  Verificar resposta - pode haver problema');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ ERRO na requisição:', e.message);
  
  if (e.message.includes('ECONNREFUSED')) {
    console.log('Servidor não está rodando na porta 3001');
  }
});

req.end();