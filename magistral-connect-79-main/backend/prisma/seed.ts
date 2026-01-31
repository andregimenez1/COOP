import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // Verificar se já existe usuário master
  const existingMaster = await prisma.user.findFirst({
    where: { role: 'master' },
  });

  if (existingMaster) {
    console.log('✅ Usuário master já existe. Seed ignorado.');
    return;
  }

  const adminPassword = await hashPassword('admin123');
  const coopPassword = await hashPassword('coop123');
  const userPassword = await hashPassword('user123');
  const naturalPassword = await hashPassword('natural123');
  const farmagnaPassword = await hashPassword('farmagna123');
  const roseirasPassword = await hashPassword('roseiras123');

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
        role: 'cooperado',
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
  });

  await prisma.user.updateMany({
    where: { email: 'usuario@magistral.com' },
    data: { isCooperativaAdmin: true },
  });

  const master = await prisma.user.findFirst({ where: { role: 'master' } });
  if (master) {
    await prisma.transparencyNews.create({
      data: {
        title: 'Vantagens Comerciais, Alertas em Tempo Real e Novidades na Transparência',
        content: `Resumo do que foi implementado:

• Vantagens Comerciais (Estoque Inteligente):
  - Flash Deals: ofertas com tempo e estoque limitados criadas pela Cooperativa. Resgate com opção "Retirar no Hub" ou "Receber via Cooperativa".
  - Reserva Estratégica: cota igual por CNPJ para insumos raros. Período de carência (ex.: 30 dias); após o prazo, sobras em compra livre. Resgate com escolha de entrega.

• Alertas em tempo real (SSE):
  - Quando um Flash Deal é criado, cooperados logados recebem um toast na hora, sem F5, com link direto para a oferta.

• Notificações por e-mail (Nodemailer/SMTP):
  - Flash Deal publicado → e-mail para quem optou nas preferências.
  - Reserva Estratégica acabando → e-mail para quem já resgatou e optou.
  - Crédito de Hub Logístico (aluguel de prateleira) depositado → e-mail ao cooperado, se optou.

• Preferências de notificação (Perfil):
  - Checkboxes para escolher quais alertas receber por e-mail: Flash Deals, Reservas, Hub Credit.

• Novidades na Transparência:
  - Novidades criadas como "pendentes"; só o administrador vê até aprovar.
  - Ao aprovar (ou editar e aprovar), cooperados recebem notificação em tempo real e podem acessar a novidade na aba Novidades.`,
        category: 'update',
        isPinned: true,
        status: 'pending',
        createdBy: master.id,
      },
    });
    console.log('📰 Novidade "Vantagens Comerciais e Alertas" criada (pendente de aprovação).');
  }

  console.log('✅ Seed concluído! Usuários:');
  console.log('   - admin@magistral.com / admin123 (master)');
  console.log('   - cooperado@magistral.com / coop123');
  console.log('   - usuario@magistral.com / user123 (Cooperativa / Market Maker)');
  console.log('   - natural@magistral.com / natural123');
  console.log('   - farmagna@magistral.com / farmagna123');
  console.log('   - roseiras@magistral.com / roseiras123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
