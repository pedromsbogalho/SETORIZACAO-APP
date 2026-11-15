/**
 * IMPORTAÇÃO PARA O PROJETO NOVO
 *
 * COMO USAR:
 * 1. Coloque o arquivo da service account (json) do projeto NOVO na pasta "secrets"
 *    desta raiz do projeto, com o nome: new-project-sa.json
 * 2. Coloque o backup-firebase.json (gerado pelo export-from-browser.js) nesta
 *    mesma raiz do projeto.
 * 3. No terminal, rode:
 *      npm install firebase-admin
 *      node scripts/import-to-new-project.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ---------- Configuração ----------
const SA_PATH = resolve('secrets/new-project-sa.json');
const BACKUP_PATH = resolve('backup-firebase.json');
const DATABASE_ID = '(default)'; // banco padrão do projeto novo

if (!existsSync(SA_PATH)) {
  console.error(
    `❌ Não achei a service account em: ${SA_PATH}\n` +
    '   Crie a pasta "secrets" e coloque o arquivo .json baixado do Firebase\n' +
    '   (Configurações do projeto → Contas de serviço → Gerar nova chave privada)\n' +
    '   com o nome new-project-sa.json'
  );
  process.exit(1);
}
if (!existsSync(BACKUP_PATH)) {
  console.error(`❌ Não achei o backup em: ${BACKUP_PATH}\n   Rode primeiro o export no navegador.`);
  process.exit(1);
}
// ----------------------------------

const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
const backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const db = getFirestore(app, DATABASE_ID);

const COLECOES = ['people', 'families', 'structures', 'users', 'logs'];

console.log(`\n🚀 Importando para o projeto: ${serviceAccount.project_id}\n`);

for (const nome of COLECOES) {
  const docs = backup[nome];
  if (!docs || Object.keys(docs).length === 0) {
    console.log(`⚠️  ${nome}: nada para importar, pulando.`);
    continue;
  }

  let count = 0;
  const entries = Object.entries(docs);
  const CHUNK = 400;

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const [docId, data] of chunk) {
      batch.set(db.collection(nome).doc(docId), data);
    }
    await batch.commit();
    count += chunk.length;
  }

  console.log(`✅ ${nome}: ${count} documentos importados.`);
}

console.log('\n🎉 Migração concluída! Verifique o console do Firebase do projeto novo.');
