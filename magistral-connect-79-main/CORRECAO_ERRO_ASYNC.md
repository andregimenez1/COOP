# 🔧 Correção: Erro "await isn't allowed in non-async function"

## Problema
A função `handleSubmitBankDataRequest` estava usando `await` mas não estava marcada como `async`.

## ✅ Correção Aplicada

A função foi atualizada de:
```typescript
const handleSubmitBankDataRequest = () => {
```

Para:
```typescript
const handleSubmitBankDataRequest = async () => {
```

## 🔄 Se o erro persistir

Se você ainda ver o erro após a correção, pode ser cache do Vite. Tente:

1. **Parar o servidor** (Ctrl+C no terminal onde o `npm run dev` está rodando)
2. **Limpar cache do Vite**:
   ```bash
   rm -rf node_modules/.vite
   # ou no Windows PowerShell:
   Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
   ```
3. **Reiniciar o servidor**:
   ```bash
   npm run dev
   ```

Ou simplesmente:
- **Recarregue a página com Ctrl+Shift+R** (hard refresh)
- **Feche e reabra o navegador**

## 📝 Verificação

A função está correta na linha 630 do arquivo `src/pages/Perfil.tsx`:
```typescript
const handleSubmitBankDataRequest = async () => {
  // ... código com await
}
```
