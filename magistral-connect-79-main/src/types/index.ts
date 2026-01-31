// User roles for the cooperative system
export type UserRole = 'master' | 'cooperado' | 'padrao';
export type UserStatus = 'active' | 'banned' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  cnpj?: string; // CNPJ do cooperado
  razaoSocial?: string; // Razão social
  approved: boolean;
  status: UserStatus;
  contribution: number; // Valor de aporte inicial
  currentValue: number; // Valor atual (aporte + rendimentos)
  proceeds?: number; // Apenas proventos (sem CDI) - calculado separadamente
  balanceToReceive?: number; // Saldo a receber
  pixKey?: string; // Chave PIX para receber o valor
  pixBank?: string; // Banco da chave PIX
  pixQrCode?: string; // QR Code PIX (base64 ou URL)
  profilePicture?: string; // URL da foto de perfil
  createdAt: Date;
  bannedAt?: Date; // Data do banimento, se aplicável
}

// Gestão de valores a pagar (quando cooperado é removido/banido)
export interface PendingPayment {
  id: string;
  userId: string;
  userName: string;
  company?: string;
  cnpj?: string;
  amount: number; // Valor a ser devolvido
  reason: 'removed' | 'banned' | 'exit_request'; // Motivo
  createdAt: Date;
  paidAt?: Date; // Data do pagamento
  status: 'pending' | 'paid';
  deletedUserSnapshot?: Record<string, unknown>; // Snapshot do usuário removido (para reverter)
}

// Solicitação de saída da cooperativa
export interface ExitRequest {
  id: string;
  userId: string;
  userName: string;
  company?: string;
  cnpj?: string;
  currentValue: number; // Valor atual do cooperado no momento da solicitação
  reason?: string; // Motivo da saída (opcional)
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Date;
  reviewedAt?: Date; // Data da análise pelo master
  reviewedBy?: string; // ID do master que analisou
  rejectionReason?: string; // Motivo da rejeição (se aplicável)
}

// Solicitação de usuários extras (sócios e funcionários)
export interface ExtraUserRequest {
  id: string;
  userId: string; // ID do cooperado que solicitou
  userName: string; // Nome do cooperado
  requestedUsers: Array<{
    name: string;
    email: string;
    role: 'socio' | 'funcionario';
    position?: string; // Cargo/função
  }>;
  reason?: string; // Justificativa para os usuários extras
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

// Solicitação de alteração de dados bancários/PIX
export interface BankDataChangeRequest {
  id: string;
  userId: string;
  userName: string;
  currentPixKey?: string; // PIX atual (se houver)
  newPixKey?: string; // Novo PIX solicitado
  pixBank?: string; // Banco da chave PIX
  bankName?: string; // Nome do banco (para conta bancária)
  accountType?: 'corrente' | 'poupanca'; // Tipo de conta
  agency?: string; // Agência
  account?: string; // Número da conta
  accountHolder?: string; // Titular da conta
  currentCnpj?: string; // CNPJ atual (se houver)
  newCnpj?: string; // Novo CNPJ solicitado
  currentRazaoSocial?: string; // Razão social atual (se houver)
  newRazaoSocial?: string; // Nova razão social solicitada
  reason?: string; // Motivo da alteração
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

// Configuração de aplicação financeira
export interface FinancialConfig {
  totalApplied: number; // Valor total aplicado pela cooperativa
  cdiRate: number; // Taxa CDI atual (em decimal, ex: 0.12 para 12%)
  lastUpdate: Date;
}

// Matéria-prima cadastrada no sistema
export interface Substance {
  id: string;
  name: string;
  synonyms?: string[]; // Sinônimos/variações do nome
  requiresAe?: boolean; // Controlada (requer AE válida)
  requiresPf?: boolean; // Controlada pela PF (requer PF válida)
  createdAt: Date;
  createdBy?: string; // ID do master que aprovou
}

// Laudo de matéria-prima (inventário virtual)
export interface RawMaterial {
  id: string;
  substanceId: string; // ID da matéria-prima cadastrada
  substanceName: string; // Nome da matéria-prima
  batch: string; // Lote
  supplier: string; // Fornecedor
  manufacturer?: string; // Fabricante (opcional)
  manufacturingDate: Date;
  expiryDate: Date;
  pdfUrl?: string; // Laudo PDF
  pdfFileName?: string; // Nome do arquivo PDF
  createdBy: string; // ID do usuário
  createdAt: Date;
  isExpired: boolean; // Se está vencido
  // Campos opcionais de compra
  purchaseDate?: Date; // Data da compra
  purchaseQuantity?: number; // Quantidade comprada
  purchaseUnit?: 'g' | 'mL' | 'kg' | 'L'; // Unidade da compra
  purchasePrice?: number; // Valor pago
  // Novos campos de excesso e liquidação
  excessQuantity?: number; // Quantidade em excesso
  excessUnit?: 'g' | 'mL' | 'kg' | 'L'; // Unidade do excesso
  isMarketplaceOfferActive?: boolean; // Se está disponível no marketplace
  isManualOfferPrice?: boolean; // Se o preço da oferta é manual
  manualPricePerUnit?: number; // Valor manual por unidade (g ou mL)
  allowLiquidation?: boolean; // Habilitar liquidação imediata à cooperativa (10% off)
}

// Sugestão de nova matéria-prima
export interface SubstanceSuggestion {
  id: string;
  name: string; // Nome sugerido pelo cooperado
  suggestedName?: string; // Nome ajustado sugerido pelo master
  userId: string; // ID do cooperado que sugeriu
  userName: string;
  status: 'pending' | 'approved' | 'rejected' | 'adjustment_requested';
  rejectionReason?: string; // Motivo da recusa
  createdAt: Date;
  expiresAt: Date; // 30 dias após criação
  approvedAt?: Date;
  rejectedAt?: Date;
}

// Solicitação de cadastro de fornecedor
export interface SupplierRequest {
  id: string;
  name: string; // Nome do fornecedor solicitado
  userId: string; // ID do cooperado que solicitou
  userName: string;
  company?: string; // Empresa do cooperado
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string; // Motivo da recusa
  createdAt: Date;
  reviewedAt?: Date; // Data da análise pelo master
  reviewedBy?: string; // ID do master que analisou
  supplierId?: string; // ID do fornecedor criado (se aprovado)
}

// Marketplace offer types
export type OfferType = 'sell' | 'buy';

export interface MarketplaceOffer {
  id: string;
  type: OfferType;
  rawMaterialId: string;
  rawMaterialName: string;
  substance?: string; // Nome da substância (usado no Marketplace.tsx)
  substanceId?: string; // ID da substância
  quantity: number;
  unit: 'g' | 'mL' | 'kg' | 'L' | 'un';
  pricePerUnit: number;
  // For sell offers
  expiryDate?: Date;
  pdfUrl?: string;
  // For buy offers
  maxPrice?: number;
  minExpiryDate?: Date;
  acceptShortExpiry?: boolean;
  // Common fields
  userId: string;
  userName: string;
  companyName?: string;
  seller?: string; // Nome do vendedor (usado no Marketplace.tsx)
  hasPdf?: boolean; // Se possui PDF anexado
  status: 'active' | 'completed' | 'cancelled' | 'draft';
  isExcessOffer?: boolean; // Identificador de venda por excesso
  createdAt: Date;
  updatedAt?: Date; // Para rascunhos
}

// Proposta de compra/venda em uma oferta
export interface OfferProposal {
  id: string;
  offerId: string; // ID da oferta
  offerType: OfferType; // Tipo da oferta (sell ou buy)
  proposerId: string; // ID do usuário que fez a proposta
  proposerName: string; // Nome do usuário que fez a proposta
  proposerCompany?: string; // Empresa do proponente
  quantity: number; // Quantidade proposta
  unit: 'g' | 'mL' | 'kg' | 'L';
  productExpiryDate?: Date; // Data de validade do produto (para ofertas de compra)
  status: 'pending' | 'accepted' | 'rejected' | 'counter_proposed';
  counterProposalQuantity?: number; // Quantidade na contraproposta
  counterProposalMessage?: string; // Mensagem da contraproposta
  createdAt: Date;
  respondedAt?: Date; // Data da resposta do autor
  // Campos para transação concluída
  completedByProposer?: boolean; // Se o proponente marcou como concluída
  completedByOfferOwner?: boolean; // Se o dono da oferta marcou como concluída
  completedAt?: Date; // Data em que ambos marcaram como concluída
  laudoId?: string; // ID do laudo associado (do comprador)
  substanceId?: string; // ID da substância da transação
  substanceName?: string; // Nome da substância da transação
  // Campos para acordo (pagamento parcial em dinheiro + matéria-prima)
  isAgreement?: boolean; // Se é um acordo (dinheiro + matéria-prima)
  cashAmount?: number; // Valor em dinheiro (PIX) do acordo
  tradeSubstanceId?: string; // ID da matéria-prima oferecida no acordo
  tradeSubstanceName?: string; // Nome da matéria-prima oferecida no acordo
  tradeQuantity?: number; // Quantidade da matéria-prima oferecida
  tradeUnit?: 'g' | 'mL' | 'kg' | 'L'; // Unidade da matéria-prima oferecida
  tradeLaudoId?: string; // ID do laudo da matéria-prima oferecida
  rejectionReason?: string; // Motivo da rejeição (ex: "Só aceito dinheiro")
}

// Transação concluída (histórico)
export interface Transaction {
  id: string;
  proposalId?: string; // ID da proposta original
  offerId?: string; // ID da oferta
  offerType?: OfferType;
  type?: 'MARKETPLACE' | 'LIQUIDACAO';
  substanceId: string;
  substanceName: string;
  quantity: number;
  unit: 'g' | 'mL' | 'kg' | 'L';
  pricePerUnit?: number; // Preço unitário (para ofertas de venda)
  totalPrice?: number; // Preço total
  sellerId: string; // ID do vendedor
  sellerName: string; // Nome do vendedor
  buyerId: string; // ID do comprador
  buyerName: string; // Nome do comprador
  laudoId?: string; // ID do laudo do comprador
  laudoPdfUrl?: string; // URL do PDF do laudo
  laudoFileName?: string; // Nome do arquivo do laudo
  completedAt: Date; // Data de conclusão
  createdAt: Date; // Data da proposta original
  /**
   * Snapshot da proposta que originou a transação (quando aplicável),
   * usado para exibir o “último estado” da negociação no histórico.
   */
  proposal?: MarketplaceProposalSnapshot;
}

/** Item do histórico “mal-sucedido” (proposta rejeitada em que o usuário participou). */
export interface UnsuccessfulTransactionItem {
  id: string;
  type: 'rejected_proposal';
  proposalId: string;
  offerId: string;
  substanceName: string;
  quantity: number;
  unit: string;
  role: 'proposer' | 'owner';
  otherPartyName: string;
  otherPartyCompany?: string;
  createdAt: Date;
  respondedAt?: Date;
  rejectionReason?: string;
  offerType: 'sell' | 'buy';
  proposal?: MarketplaceProposalSnapshot;
}

export interface MarketplaceProposalSnapshot {
  id: string;
  offerId: string;
  offerType: 'sell' | 'buy';
  proposerId: string;
  proposerName: string;
  proposerCompany?: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'accepted' | 'rejected' | 'counter_proposed';
  counterProposalQuantity?: number;
  counterProposalMessage?: string;
  createdAt: Date;
  respondedAt?: Date;
  completedAt?: Date;
  laudoId?: string;
  substanceId?: string;
  substanceName?: string;
  isAgreement?: boolean;
  cashAmount?: number;
  tradeSubstanceId?: string;
  tradeSubstanceName?: string;
  tradeQuantity?: number;
  tradeUnit?: string;
  tradeLaudoId?: string;
  rejectionReason?: string;
  offer?: {
    userId: string;
    userName: string;
    companyName?: string;
    type: 'sell' | 'buy';
    rawMaterialName: string;
  };
}

// Fornecedor (gerenciado por cada cooperado)
export interface Supplier {
  id: string;
  userId: string; // ID do cooperado que criou
  name: string; // Nome do fornecedor (ex: Galena, Fagron)
  contact?: string; // Contato (opcional)
  whatsapp?: string; // Contato WhatsApp para solicitar documentos
  notes?: string; // Observações
  createdAt: Date;
}

// Documentos essenciais para qualificação de fornecedor
export type SupplierDocumentType = 
  | 'afe' // Autorização de Funcionamento de Empresa
  | 'ae' // Autorização Especial
  | 'licenca_sanitaria' // Licença Sanitária Local
  | 'crt' // Certificado de Regularidade Técnica
  | 'questionario' // (Opcional) Questionário de Qualificação Respondido
  | 'policia_federal'; // (Opcional) Documento/regularidade junto à Polícia Federal

export interface SupplierDocument {
  id: string;
  type: SupplierDocumentType;
  fileName: string;
  fileUrl: string; // URL ou base64 do arquivo PDF
  uploadedAt: Date;
  uploadedBy: string; // ID do cooperado que fez upload
  validUntil?: Date; // validade do documento (se aplica)
  validIndefinitely?: boolean; // documento com validade indeterminada (ex.: AE/AFE/CRT)
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

// Documentos do Perfil do cooperado (exclusivos do usuário)
export type UserProfileDocumentType =
  | 'afe'
  | 'ae'
  | 'licenca_sanitaria'
  | 'corpo_bombeiros'
  | 'policia_federal';

export interface UserProfileDocument {
  id: string;
  userId: string;
  type: UserProfileDocumentType;
  fileName: string;
  fileUrl: string; // URL ou base64 do PDF
  uploadedAt: Date;
  validUntil?: Date;
  validIndefinitely?: boolean;
}

export interface UserProfileDocumentRequest {
  id: string;
  userId: string;
  userName: string;
  type: UserProfileDocumentType;
  fileName: string;
  fileUrl: string;
  createdAt: Date;
  validUntil?: Date;
  validIndefinitely?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

// Solicitação de qualificação de fornecedor
export interface SupplierQualificationRequest {
  id: string;
  supplierId: string; // ID do fornecedor (pode ser novo, então pode ser apenas o nome)
  supplierName: string; // Nome do fornecedor
  requestedBy: string; // ID do cooperado que solicitou
  requestedByName: string; // Nome do cooperado que solicitou
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  requestedAt: Date;
  completedAt?: Date;
  completedBy?: string; // ID do cooperado que completou
  year: number; // Ano da qualificação (qualificações são anuais)
  documents: SupplierDocument[]; // Documentos anexados
  pendingUsers: string[]; // IDs dos usuários que estão aguardando esta qualificação
}

// Qualificação completa de fornecedor
export interface SupplierQualification {
  id: string;
  supplierId: string;
  supplierName: string;
  year: number; // Ano da qualificação
  status: 'complete' | 'incomplete';
  documents: SupplierDocument[];
  qualifiedBy: string; // ID do cooperado que qualificou
  qualifiedByName: string;
  completedAt: Date;
  expiresAt: Date; // Expira pela validade (documento que vence primeiro)
}

// Variação de quantidade/preço em uma cotação
export interface QuotationVariation {
  quantity: number; // Quantidade (ex: 5, 10, 100)
  unit: 'g' | 'mL' | 'kg' | 'L'; // Unidade
  price: number; // Preço para esta quantidade
  packageType?: string; // Tipo de embalagem (ex: "Embalagem de 5g", "Frasco 10mL")
}

// Cotação (histórico de preços)
export interface Quotation {
  id: string;
  userId: string; // ID do cooperado que criou
  userName: string;
  substanceId: string;
  substanceName: string;
  supplierId: string; // ID do fornecedor
  supplierName: string; // Nome do fornecedor
  validity: Date; // Validade da cotação
  variations: QuotationVariation[]; // Variações de quantidade/preço
  quotationDate: Date; // Data da cotação
  notes?: string; // Observações adicionais
}

// Follow/notification preferences
export interface FollowedItem {
  id: string;
  userId: string;
  rawMaterialName: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_quotation' | 'new_buy_offer' | 'new_sell_offer' | 'offer_match';
  title: string;
  message: string;
  relatedItemId?: string;
  read: boolean;
  createdAt: Date;
}

// Item de compra individual (lista pessoal do cooperado)
export interface PurchaseItem {
  id: string;
  userId: string;
  userName: string;
  substanceId: string;
  substanceName: string;
  quantity: number;
  unit: 'g' | 'mL' | 'kg' | 'L';
  deadline: Date; // Prazo necessário
  status: 'pending' | 'in_collective' | 'completed' | 'cancelled';
  createdAt: Date;
  collectivePurchaseId?: string; // ID da compra coletiva, se incluído
}

// Compra coletiva (agrupamento de itens de vários cooperados)
export interface CollectivePurchase {
  id: string;
  name: string; // Nome/descrição da compra coletiva
  deadline: Date; // Prazo final para a compra
  status: 'planning' | 'quotation' | 'ordered' | 'received' | 'completed' | 'cancelled';
  createdBy: string; // ID do master
  createdAt: Date;
  items: PurchaseItem[]; // Itens incluídos nesta compra coletiva
  totalQuantity?: number; // Quantidade total por substância
  quotationId?: string; // ID da cotação relacionada
}

// Movimentação financeira (histórico detalhado)
export interface FinancialMovement {
  id: string;
  type: 'contribution' | 'cdi_yield' | 'proceeds' | 'withdrawal' | 'adjustment' | 'refund';
  userId?: string; // ID do cooperado afetado (se aplicável)
  userName?: string;
  amount: number; // Valor da movimentação (positivo ou negativo)
  description: string; // Descrição detalhada
  relatedItemId?: string; // ID de item relacionado (ex: decisão, votação)
  createdAt: Date;
  createdBy: string; // ID do master que registrou
}

// Novidade/Transparência (comunicações públicas)
export interface TransparencyNews {
  id: string;
  title: string;
  content: string; // Descrição detalhada
  category: 'financial' | 'decision' | 'general' | 'voting' | 'update';
  page?: string; // Página do menu a que a novidade se refere (ex.: marketplace, laudos, perfil...)
  relatedItemId?: string; // ID de item relacionado (ex: decisão, votação)
  createdAt: Date;
  createdBy: string; // ID do master que criou
  isPinned?: boolean; // Se deve aparecer no topo
  status?: 'pending' | 'approved'; // Pendente até admin aprovar
  approvedAt?: Date;
  approvedBy?: string;
}

// Decisão (para diretores/conselho)
export interface Decision {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'operational' | 'strategic' | 'regulatory';
  status: 'draft' | 'published' | 'approved' | 'rejected' | 'implemented';
  createdAt: Date;
  createdBy: string; // ID do master
  publishedAt?: Date;
  approvedAt?: Date;
  implementedAt?: Date;
  notes?: string; // Observações adicionais
}

// Votação (aberta aos cooperados)
export interface Voting {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'operational' | 'strategic' | 'regulatory';
  status: 'draft' | 'open' | 'closed' | 'approved' | 'rejected';
  createdAt: Date;
  createdBy: string; // ID do master
  openedAt?: Date;
  closedAt?: Date;
  deadline?: Date; // Prazo para votação
  requiresQuorum?: boolean; // Se requer quórum mínimo
  quorumPercentage?: number; // Porcentagem mínima de votos (ex: 50)
  result?: 'approved' | 'rejected' | 'tied'; // Resultado final
  yesVotes: number;
  noVotes: number;
  abstentions: number;
  totalEligibleVoters: number; // Total de cooperados elegíveis
}

// Voto individual
export interface Vote {
  id: string;
  votingId: string; // ID da votação
  userId: string; // ID do cooperado que votou
  userName: string;
  choice: 'yes' | 'no' | 'abstain';
  createdAt: Date;
  updatedAt?: Date; // Se o voto foi alterado
}

// Oferta de espaço de prateleira (Hub Regional / Estoque Estratégico)
export interface ShelfSpaceOffering {
  id: string;
  userId: string;
  userName: string;
  companyName?: string;
  region: string; // Cidade/Região
  capacity?: string; // Capacidade (ex: "2 freezers", "10 prateleiras")
  notes?: string; // Observações sobre o espaço
  status: 'pending' | 'approved' | 'rejected' | 'active';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}
