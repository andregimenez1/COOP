/**
 * Utilitários para formatação e parsing de CNPJ.
 * Formato: XX.XXX.XXX/XXXX-XX (14 dígitos)
 */

/**
 * Formata o valor digitado como CNPJ conforme a contagem de caracteres.
 * Apenas dígitos são aceitos; máx. 14. Ex.: 12345678000199 → 12.345.678/0001-99
 */
export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Retorna apenas os dígitos do CNPJ (para validação ou envio ao backend).
 */
export function parseCnpj(value: string): string {
  return value.replace(/\D/g, '');
}
