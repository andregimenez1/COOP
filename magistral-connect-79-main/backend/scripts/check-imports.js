#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_DIR = path.join(__dirname, '..', 'src', 'routes');
const MIDDLEWARE_DIR = path.join(__dirname, '..', 'src', 'middleware');
const CONTROLLERS_DIR = path.join(__dirname, '..', 'src', 'controllers');

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function getExportsFromFile(filePath) {
  if (!checkFileExists(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf8');
  const exports = [];
  
  // Procurar exports nomeados
  const exportRegex = /export\s+(?:const|function|class)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Procurar export { name1, name2 }
  const exportBraceRegex = /export\s*\{([^}]+)\}/g;
  while ((match = exportBraceRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim());
    exports.push(...names);
  }
  
  return exports;
}

function checkRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const errors = [];
  
  lines.forEach((line, index) => {
    // Verificar imports de arquivos locais sem extensão .js
    const importMatch = line.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch && importMatch[1].startsWith('../')) {
      const importPath = importMatch[1];
      const fullPath = path.resolve(path.dirname(filePath), importPath);
      
      // Se não tem extensão, adicionar .js
      if (!path.extname(importPath)) {
        const jsPath = fullPath + '.js';
        const tsPath = fullPath + '.ts';
        
        if (checkFileExists(tsPath) && !checkFileExists(jsPath)) {
          errors.push({
            line: index + 1,
            type: 'missing-js-extension',
            message: `Import '${importPath}' deve ter extensão .js`,
            suggestion: line.replace(importPath, importPath + '.js')
          });
        }
      }
      
      // Verificar se o que está sendo importado existe
      const namedImportsMatch = line.match(/import\s*\{([^}]+)\}/);
      if (namedImportsMatch) {
        const imports = namedImportsMatch[1].split(',').map(i => i.trim());
        const targetFile = importPath.endsWith('.js') ? fullPath : fullPath + '.js';
        
        if (checkFileExists(targetFile)) {
          const exports = getExportsFromFile(targetFile);
          imports.forEach(imp => {
            if (!exports.includes(imp)) {
              errors.push({
                line: index + 1,
                type: 'missing-export',
                message: `'${imp}' não existe em ${importPath}`,
                suggestion: `Exports disponíveis: ${exports.join(', ')}`
              });
            }
          });
        }
      }
    }
  });
  
  return errors;
}

function main() {
  console.log('🔍 Verificando imports de rotas...\n');
  
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts'));
  let totalErrors = 0;
  
  routeFiles.forEach(file => {
    const filePath = path.join(ROUTES_DIR, file);
    const errors = checkRouteFile(filePath);
    
    if (errors.length > 0) {
      console.log(`❌ ${file}:`);
      errors.forEach(error => {
        console.log(`  Linha ${error.line}: ${error.message}`);
        if (error.suggestion) {
          console.log(`  💡 Sugestão: ${error.suggestion}`);
        }
        console.log('');
      });
      totalErrors += errors.length;
    } else {
      console.log(`✅ ${file}`);
    }
  });
  
  console.log(`\n📊 Resultado: ${totalErrors === 0 ? '✅ Todos os imports estão corretos!' : `❌ ${totalErrors} erro(s) encontrado(s)`}`);
  
  if (totalErrors > 0) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}