import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUMMARY_TITLE = 'Vantagens Comerciais, Alertas em Tempo Real e Novidades na Transparência';
const SUMMARY_CONTENT = `Resumo do que foi implementado:

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
  - Ao aprovar (ou editar e aprovar), cooperados recebem notificação em tempo real e podem acessar a novidade na aba Novidades.`;

async function main() {
  const master = await prisma.user.findFirst({ where: { role: 'master' } });
  if (!master) {
    console.log('❌ Nenhum usuário master encontrado. Execute o seed principal antes.');
    return;
  }
  const existing = await prisma.transparencyNews.findFirst({
    where: { title: { contains: 'Vantagens Comerciais' } },
  });
  if (existing) {
    console.log('✅ Novidade-resumo já existe. Nada a fazer.');
    return;
  }
  await prisma.transparencyNews.create({
    data: {
      title: SUMMARY_TITLE,
      content: SUMMARY_CONTENT,
      category: 'update',
      isPinned: true,
      status: 'pending',
      createdBy: master.id,
    },
  });
  console.log('📰 Novidade "Vantagens Comerciais e Alertas" criada (pendente de aprovação).');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
