-- Script SQL para criar usuários iniciais
-- Execute este script no phpMyAdmin na base de dados 'magistral_connect'
-- IMPORTANTE: As senhas estão em hash bcrypt. Use o seed do Prisma para gerar hashes corretos.

-- Primeiro, verifique se a tabela User existe
-- Se não existir, execute: npx prisma migrate dev

-- Limpar usuários existentes (opcional - apenas se quiser recriar)
-- DELETE FROM User WHERE email IN ('admin@magistral.com', 'cooperado@magistral.com', 'usuario@magistral.com', 'natural@magistral.com', 'farmagna@magistral.com', 'roseiras@magistral.com');

-- NOTA: Este script SQL não pode gerar hashes bcrypt corretos.
-- Você DEVE usar o seed do Prisma: npm run prisma:seed
-- 
-- Se precisar executar manualmente, use o Node.js:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(h => console.log(h));"

-- Exemplo de estrutura (NÃO EXECUTE - apenas para referência):
/*
INSERT INTO User (id, name, email, password, role, company, approved, status, createdAt, updatedAt) VALUES
('1', 'Administrador', 'admin@magistral.com', '[HASH_BCRYPT_AQUI]', 'master', 'Cooperativa Magistral', true, 'active', NOW(), NOW()),
('2', 'Dr. Carlos Silva', 'cooperado@magistral.com', '[HASH_BCRYPT_AQUI]', 'cooperado', 'Farmácia Vida Natural', true, 'active', NOW(), NOW()),
('3', 'Maria Santos', 'usuario@magistral.com', '[HASH_BCRYPT_AQUI]', 'padrao', 'Farmácia Popular', true, 'active', NOW(), NOW());
*/

-- SOLUÇÃO RECOMENDADA:
-- Execute no terminal do backend:
-- npm run prisma:seed
