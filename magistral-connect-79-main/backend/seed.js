// Seed em JavaScript puro - pode ser executado diretamente com Node.js
// Execute: node seed.js

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Iniciando seed completo...\n');

  // Verificar se já existe usuário master
  const existingMaster = await prisma.user.findFirst({
    where: { role: 'master' },
  });

  let usersCreated = false;
  if (!existingMaster) {

  console.log('Gerando hashes de senha...');
  const adminPassword = await hashPassword('admin123');
  const coopPassword = await hashPassword('coop123');
  const userPassword = await hashPassword('user123');
  const naturalPassword = await hashPassword('natural123');
  const farmagnaPassword = await hashPassword('farmagna123');
  const roseirasPassword = await hashPassword('roseiras123');

    console.log('Criando usuários...\n');
    await prisma.user.createMany({
    data: [
      {
        name: 'Administrador',
        email: 'admin@magistral.com',
        password: adminPassword,
        role: 'master',
        company: 'Cooperativa Magistral',
        approved: true,
        status: 'active',
      },
      {
        name: 'Dr. Carlos Silva',
        email: 'cooperado@magistral.com',
        password: coopPassword,
        role: 'cooperado',
        company: 'Farmácia Vida Natural',
        cnpj: '12.345.678/0001-90',
        approved: true,
        status: 'active',
        contribution: 50000,
        currentValue: 52500,
      },
      {
        name: 'Maria Santos',
        email: 'usuario@magistral.com',
        password: userPassword,
        role: 'padrao',
        company: 'Farmácia Popular',
        approved: true,
        status: 'active',
      },
      {
        name: 'Natural (Araraquara)',
        email: 'natural@magistral.com',
        password: naturalPassword,
        role: 'cooperado',
        company: 'Natural (Araraquara)',
        cnpj: '11.222.333/0001-44',
        approved: true,
        status: 'active',
        contribution: 100000,
        currentValue: 105000,
      },
      {
        name: 'Farmagna (Araraquara)',
        email: 'farmagna@magistral.com',
        password: farmagnaPassword,
        role: 'cooperado',
        company: 'Farmagna (Araraquara)',
        cnpj: '22.333.444/0001-55',
        approved: true,
        status: 'active',
        contribution: 75000,
        currentValue: 78750,
      },
      {
        name: 'Roseiras (Araraquara)',
        email: 'roseiras@magistral.com',
        password: roseirasPassword,
        role: 'cooperado',
        company: 'Roseiras (Araraquara)',
        cnpj: '11.222.333/0001-44',
        approved: true,
        status: 'active',
        contribution: 100000,
        currentValue: 105000,
      },
    ],
    skipDuplicates: true,
  });
    usersCreated = true;
    console.log('✅ 6 usuários criados');
  } else {
    console.log('⚠️  Usuários já existem, pulando...');
  }

  // Buscar o admin para usar como criador
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@magistral.com' },
  });

  if (!admin) {
    throw new Error('Admin não encontrado. Execute o seed completo primeiro.');
  }

  // Verificar se já existem substâncias
  const existingSubstances = await prisma.substance.count();
  if (existingSubstances === 0) {
    console.log('Criando substâncias iniciais...\n');
    const substances = [
    { name: 'Vitamina C (Ácido Ascórbico)', synonyms: ['Ácido Ascórbico', 'Vitamina C', 'Ascorbic Acid'] },
    { name: 'Colágeno Hidrolisado', synonyms: ['Colágeno', 'Hydrolyzed Collagen', 'Collagen Peptides'] },
    { name: 'Ácido Hialurônico', synonyms: ['Hyaluronic Acid', 'Ácido Hialurónico', 'HA'] },
    { name: 'Magnésio Quelato', synonyms: ['Magnesium Chelate', 'Magnésio', 'Mg Quelato'] },
    { name: 'Coenzima Q10', synonyms: ['CoQ10', 'Ubiquinona', 'Ubiquinone'] },
    { name: 'Vitamina D3', synonyms: ['Colecalciferol', 'Cholecalciferol', 'Vitamina D'] },
    { name: 'Vitamina B12', synonyms: ['Cianocobalamina', 'Cyanocobalamin', 'Cobalamina'] },
    { name: 'Ácido Fólico', synonyms: ['Folato', 'Folic Acid', 'Vitamina B9'] },
    { name: 'Ferro Quelato', synonyms: ['Iron Chelate', 'Ferro', 'Iron Bisglycinate'] },
    { name: 'Zinco Quelato', synonyms: ['Zinc Chelate', 'Zinco', 'Zinc Bisglycinate'] },
    { name: 'Cálcio Carbonato', synonyms: ['Calcium Carbonate', 'Carbonato de Cálcio'] },
    { name: 'Ômega 3', synonyms: ['Omega 3', 'Ácidos Graxos', 'EPA/DHA'] },
    { name: 'Probióticos', synonyms: ['Lactobacillus', 'Bifidobacterium', 'Probiótico'] },
    { name: 'Glucosamina', synonyms: ['Glucosamine', 'Glucosamina Sulfato'] },
    { name: 'Condroitina', synonyms: ['Chondroitin', 'Condroitina Sulfato'] },
    { name: 'Melatonina', synonyms: ['Melatonin', 'Melatonina'] },
    { name: 'Curcumina', synonyms: ['Curcumin', 'Cúrcuma', 'Turmeric'] },
    { name: 'Resveratrol', synonyms: ['Resveratrol'] },
    { name: 'Spirulina', synonyms: ['Espirulina', 'Spirulina'] },
    { name: 'Chlorella', synonyms: ['Clorela', 'Chlorella'] },
  ];

    await prisma.substance.createMany({
      data: substances.map(s => ({
        name: s.name,
        synonyms: s.synonyms,
        createdBy: admin.id,
      })),
      skipDuplicates: true,
    });

    console.log(`✅ ${substances.length} substâncias criadas`);
  } else {
    console.log(`⚠️  ${existingSubstances} substâncias já existem, pulando...`);
  }

  // Configuração financeira
  const existingConfig = await prisma.financialConfig.findFirst();
  if (!existingConfig) {
    console.log('\nCriando configuração financeira...\n');
    await prisma.financialConfig.create({
      data: {
        totalApplied: 325000, // Soma dos aportes: 50000 + 100000 + 75000 + 100000
        cdiRate: 0.12, // 12% ao ano
        lastUpdate: new Date(),
      },
    });
    console.log('✅ Configuração financeira criada');
  } else {
    console.log('⚠️  Configuração financeira já existe');
  }

  // Fornecedores de exemplo
  const cooperado = await prisma.user.findFirst({
    where: { email: 'cooperado@magistral.com' },
  });

  if (cooperado) {
    const existingSuppliers = await prisma.supplier.count({
      where: { userId: cooperado.id },
    });
    if (existingSuppliers === 0) {
      console.log('\nCriando fornecedores de exemplo...\n');
      await prisma.supplier.createMany({
        data: [
          {
            userId: cooperado.id,
            name: 'Fornecedor ABC Ltda',
            contact: 'contato@abc.com',
            whatsapp: '(11) 99999-9999',
            notes: 'Fornecedor confiável de matérias-primas',
          },
          {
            userId: cooperado.id,
            name: 'Distribuidora XYZ',
            contact: 'vendas@xyz.com.br',
            whatsapp: '(11) 88888-8888',
            notes: 'Especializada em vitaminas e suplementos',
          },
        ],
        skipDuplicates: true,
      });
      console.log('✅ 2 fornecedores de exemplo criados');
    } else {
      console.log(`⚠️  ${existingSuppliers} fornecedores já existem para este usuário`);
    }
  }

  // Solicitações de exemplo
  const existingRequests = await prisma.substanceSuggestion.count();
  if (existingRequests === 0 && cooperado) {
    console.log('\nCriando solicitações de exemplo...\n');

    // Sugestões de substâncias (algumas pendentes, algumas aprovadas)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    await prisma.substanceSuggestion.createMany({
      data: [
        {
          name: 'Ácido Alfa Lipoico',
          userId: cooperado.id,
          userName: cooperado.name,
          status: 'pending',
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
          expiresAt,
        },
        {
          name: 'Niacinamida',
          userId: cooperado.id,
          userName: cooperado.name,
          status: 'pending',
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
          expiresAt,
        },
      ],
      skipDuplicates: true,
    });
    console.log('✅ 2 sugestões de substâncias criadas (pendentes)');

    // Solicitações de fornecedor
    await prisma.supplierRequest.createMany({
      data: [
        {
          name: 'Fornecedor Premium Ltda',
          userId: cooperado.id,
          userName: cooperado.name,
          company: cooperado.company,
          status: 'pending',
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          name: 'Distribuidora Nacional',
          userId: cooperado.id,
          userName: cooperado.name,
          company: cooperado.company,
          status: 'pending',
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        },
      ],
      skipDuplicates: true,
    });
    console.log('✅ 2 solicitações de fornecedor criadas (pendentes)');

    // Solicitações de alteração de dados bancários
    await prisma.bankDataChangeRequest.createMany({
      data: [
        {
          userId: cooperado.id,
          userName: cooperado.name,
          newPixKey: 'cooperado@magistral.com',
          pixBank: 'Banco do Brasil',
          reason: 'Atualização de chave PIX',
          status: 'pending',
          createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        },
      ],
      skipDuplicates: true,
    });
    console.log('✅ 1 solicitação de alteração bancária criada (pendente)');

    // Solicitações de usuários extras
    await prisma.extraUserRequest.createMany({
      data: [
        {
          userId: cooperado.id,
          userName: cooperado.name,
          requestedUsers: [
            { name: 'João Silva', email: 'joao@vida-natural.com', role: 'socio', position: 'Gerente' },
            { name: 'Ana Costa', email: 'ana@vida-natural.com', role: 'funcionario', position: 'Farmacêutica' },
          ],
          reason: 'Expansão da equipe',
          status: 'pending',
          createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        },
      ],
      skipDuplicates: true,
    });
    console.log('✅ 1 solicitação de usuários extras criada (pendente)');
  } else if (existingRequests > 0) {
    console.log(`⚠️  ${existingRequests} solicitações já existem, pulando...`);
  }

  // Resumo final
  const totalUsers = await prisma.user.count();
  const totalSubstances = await prisma.substance.count();
  const totalSuppliers = await prisma.supplier.count();
  const hasConfig = await prisma.financialConfig.count() > 0;
  const totalSubstanceSuggestions = await prisma.substanceSuggestion.count();
  const totalSupplierRequests = await prisma.supplierRequest.count();
  const totalBankDataRequests = await prisma.bankDataChangeRequest.count();
  const totalExtraUserRequests = await prisma.extraUserRequest.count();

  console.log('\n📊 Resumo do banco de dados:\n');
  console.log(`   👥 ${totalUsers} usuários`);
  console.log(`   📦 ${totalSubstances} substâncias`);
  console.log(`   💰 Configuração financeira: ${hasConfig ? 'Sim' : 'Não'}`);
  console.log(`   🏢 ${totalSuppliers} fornecedores`);
  console.log(`   📝 ${totalSubstanceSuggestions} sugestões de substâncias`);
  console.log(`   📋 ${totalSupplierRequests} solicitações de fornecedor`);
  console.log(`   💳 ${totalBankDataRequests} solicitações de dados bancários`);
  console.log(`   👤 ${totalExtraUserRequests} solicitações de usuários extras`);
  console.log('\n✅ Seed concluído!');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
