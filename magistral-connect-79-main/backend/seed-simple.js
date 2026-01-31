// Script simples para executar o seed
// Execute: node seed-simple.js

const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 Executando seed do Prisma...\n');

try {
  // Tentar executar via tsx
  console.log('Tentando executar via tsx...');
  execSync('npx tsx prisma/seed.ts', {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  console.log('\n✅ Seed executado com sucesso!');
} catch (error) {
  console.error('\n❌ Erro ao executar seed:', error.message);
  console.log('\n💡 Tente executar manualmente:');
  console.log('   npm run prisma:seed');
  console.log('\n   OU');
  console.log('   npx tsx prisma/seed.ts');
  process.exit(1);
}
