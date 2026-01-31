const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'magistral_connect'
    });
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Conexão MySQL bem-sucedida! Resultado:', rows);
    await connection.end();
  } catch (error) {
    console.error('❌ Erro ao conectar ao MySQL:', error.message);
    console.error('Verifique se o XAMPP está rodando e o MySQL está ativo na porta 3306');
  }
}

testConnection();