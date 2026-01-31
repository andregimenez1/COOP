/**
 * Migração de userId/createdBy legados (demo/localStorage) para user.id do backend (UUID).
 * Resolve "dados sumiram" quando o usuário passou a logar via API e os laudos/ofertas
 * ainda estão com IDs ou nomes antigos.
 *
 * Histórico: Natural (Araraquara) era o antigo Roseiras (Araraquara). Os dados legados
 * podem estar como "Roseiras (Araraquara)" ou com IDs '4' ou '7'. O novo Roseiras (Araraquara)
 * é outro usuário — não migramos dados legados para ele.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Natural: ID legado. NÃO usar '7' nem "Roseiras" — isso misturava ofertas de outros (Roseiras, Manipulação Express). */
const NATURAL_LEGACY_IDS = ['4'];
const NATURAL_LEGACY_NAMES = ['Natural (Araraquara)'];

/** Farmagna: ID e nome legados. */
const FARMAGNA_LEGACY_IDS = ['5'];
const FARMAGNA_LEGACY_NAMES = ['Farmagna (Araraquara)'];

/** Novo Roseiras: sem dados legados (não migrar nada para ele). */
// Roseiras: [] e []

export function isUuid(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}

/** Retorna os IDs legados do usuário atual (por name ou company). Natural → ['4','7'], Farmagna → ['5'], Roseiras → []. */
export function getLegacyIdsForUser(name?: string, company?: string): string[] {
  const key = (name || company || '').trim();
  if (!key) return [];
  if (key === 'Natural (Araraquara)') return [...NATURAL_LEGACY_IDS];
  if (key === 'Farmagna (Araraquara)') return [...FARMAGNA_LEGACY_IDS];
  return [];
}

/** Retorna os nomes legados (seller/buyer) do usuário. Natural → Natural + Roseiras, Farmagna → Farmagna, Roseiras → []. */
export function getLegacyNamesForUser(name?: string, company?: string): string[] {
  const key = (name || company || '').trim();
  if (!key) return [];
  if (key === 'Natural (Araraquara)') return [...NATURAL_LEGACY_NAMES];
  if (key === 'Farmagna (Araraquara)') return [...FARMAGNA_LEGACY_NAMES];
  return [];
}

/** Retorna o primeiro ID legado (para compatibilidade). */
export function getLegacyIdForUser(name?: string, company?: string): string | null {
  const ids = getLegacyIdsForUser(name, company);
  return ids.length > 0 ? ids[0] : null;
}

/** Ordena chaves de backup por timestamp numérico (mais recente primeiro). */
export function sortBackupKeysNewestFirst(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const tA = parseInt((a.match(/_backup_(\d+)$/)?.[1] ?? '0'), 10);
    const tB = parseInt((b.match(/_backup_(\d+)$/)?.[1] ?? '0'), 10);
    return tB - tA;
  });
}
