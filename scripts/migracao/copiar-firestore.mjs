#!/usr/bin/env node
/**
 * Copia o Firestore de um projeto Firebase para outro e confere o resultado.
 * Roteiro completo: docs/MIGRACAO-FIREBASE.md
 *
 * Uso (rodar dentro de scripts/migracao, depois de `npm install`):
 *
 *   # 1) Ensaio: só conta os documentos dos dois lados. Não grava nada.
 *   node copiar-firestore.mjs \
 *     --origem chave-origem.json  --origem-db ai-studio-0703a7bd-0c96-4411-94f0-747479362cad \
 *     --destino chave-destino.json --destino-db "(default)"
 *
 *   # 2) Cópia de verdade: acrescente --executar
 *   # 3) Conferência: acrescente --conferir (compara documento por documento)
 *   # Virada (destino já tem a cópia de ensaio): --executar --sobrescrever --espelhar
 *   #   --espelhar apaga do destino o que não existe mais na origem.
 *   # Opcional: --conferir-logins compara os usuários do Authentication dos dois projetos.
 *
 * As chaves (.json de conta de serviço) dão acesso TOTAL ao projeto: guarde-as
 * só no seu computador, nunca no Git nem em chat, e apague-as depois.
 *
 * Testes com os emuladores: com FIRESTORE_EMULATOR_HOST definido, --origem e
 * --destino recebem o ID do projeto em vez do arquivo de chave.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, DocumentReference, Timestamp, GeoPoint } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ---------- argumentos ----------
const args = process.argv.slice(2);
const opcao = (nome) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const tem = (nome) => args.includes(`--${nome}`);

const origem = opcao('origem');
const destino = opcao('destino');
const origemDb = opcao('origem-db') || '(default)';
const destinoDb = opcao('destino-db') || '(default)';
const executar = tem('executar');
const conferir = tem('conferir') || executar;
const sobrescrever = tem('sobrescrever');
const espelhar = tem('espelhar');
const conferirLogins = tem('conferir-logins');

if (!origem || !destino) {
  console.error('Uso: node copiar-firestore.mjs --origem <chave.json> --origem-db <id> --destino <chave.json> --destino-db <id> [--executar] [--conferir] [--conferir-logins] [--sobrescrever]');
  process.exit(1);
}

const usandoEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

function abrirProjeto(ref, nomeApp) {
  if (usandoEmulador) {
    return initializeApp({ projectId: ref }, nomeApp);
  }
  const chave = JSON.parse(readFileSync(ref, 'utf8'));
  return initializeApp({ credential: cert(chave), projectId: chave.project_id }, nomeApp);
}

const appOrigem = abrirProjeto(origem, 'origem');
const appDestino = abrirProjeto(destino, 'destino');
const dbOrigem = getFirestore(appOrigem, origemDb);
const dbDestino = getFirestore(appDestino, destinoDb);
const idOrigem = appOrigem.options.projectId;
const idDestino = appDestino.options.projectId;

if (idOrigem === idDestino && origemDb === destinoDb) {
  console.error('Origem e destino são o MESMO banco. Nada a fazer.');
  process.exit(1);
}

// ---------- utilidades ----------

/** Lista todos os documentos (com subcoleções) de uma coleção. */
async function listarDocs(colecaoRef, saida = []) {
  const docs = await colecaoRef.listDocuments(); // inclui docs "vazios" que só têm subcoleções
  for (const ref of docs) {
    const snap = await ref.get();
    if (snap.exists) saida.push(snap);
    const subcolecoes = await ref.listCollections();
    for (const sub of subcolecoes) await listarDocs(sub, saida);
  }
  return saida;
}

/** Referências a outros documentos passam a apontar para o banco de destino. */
function converter(valor) {
  if (valor instanceof DocumentReference) return dbDestino.doc(valor.path);
  if (valor instanceof Timestamp || valor instanceof GeoPoint || valor instanceof Buffer || valor === null) return valor;
  if (Array.isArray(valor)) return valor.map(converter);
  if (typeof valor === 'object') {
    const novo = {};
    for (const [k, v] of Object.entries(valor)) novo[k] = converter(v);
    return novo;
  }
  return valor;
}

/** Impressão digital estável de um documento, para comparar origem e destino. */
function digital(dados) {
  const normalizar = (v) => {
    if (v instanceof DocumentReference) return { __ref: v.path };
    if (v instanceof Timestamp) return { __ts: [v.seconds, v.nanoseconds] };
    if (v instanceof GeoPoint) return { __geo: [v.latitude, v.longitude] };
    if (v instanceof Buffer) return { __bytes: v.toString('base64') };
    if (Array.isArray(v)) return v.map(normalizar);
    if (v && typeof v === 'object') {
      return Object.keys(v).sort().reduce((o, k) => { o[k] = normalizar(v[k]); return o; }, {});
    }
    return v;
  };
  return createHash('sha256').update(JSON.stringify(normalizar(dados))).digest('hex');
}

async function contarPorColecao(db) {
  const contagem = {};
  for (const col of await db.listCollections()) {
    contagem[col.id] = (await listarDocs(col)).length;
  }
  return contagem;
}

function tabela(titulo, linhas) {
  console.log(`\n${titulo}`);
  console.table(linhas);
}

// ---------- 1. ensaio: contagens ----------
console.log(`Origem : projeto ${idOrigem}, banco ${origemDb}`);
console.log(`Destino: projeto ${idDestino}, banco ${destinoDb}`);
console.log(usandoEmulador ? '(usando EMULADORES)' : '');

const antesOrigem = await contarPorColecao(dbOrigem);
const antesDestino = await contarPorColecao(dbDestino);
const colecoes = Object.keys(antesOrigem).sort(); // as contagens incluem subcoleções
tabela('Documentos por coleção (antes):', colecoes.map((c) => ({ coleção: c, origem: antesOrigem[c], destino: antesDestino[c] || 0 })));

const destinoComDados = Object.values(antesDestino).some((n) => n > 0);
if (executar && destinoComDados && !sobrescrever) {
  console.error('\nO destino JÁ TEM documentos. Para copiar por cima (mesmos IDs são substituídos), rode de novo com --sobrescrever.');
  process.exit(1);
}

// ---------- 2. cópia ----------
if (executar) {
  console.log('\nCopiando...');
  const escritor = dbDestino.bulkWriter();
  let falhas = 0;
  escritor.onWriteError((erro) => {
    if (erro.failedAttempts < 5) return true; // tenta de novo
    falhas++;
    console.error(`  falhou: ${erro.documentRef.path}: ${erro.message}`);
    return false;
  });
  let total = 0;
  for (const c of colecoes) {
    const docs = await listarDocs(dbOrigem.collection(c));
    for (const snap of docs) {
      escritor.set(dbDestino.doc(snap.ref.path), converter(snap.data()));
      total++;
    }
    console.log(`  ${c}: ${docs.length} documento(s) enviados`);
  }
  if (espelhar) {
    // Apaga do destino o que foi excluído na origem depois da cópia de ensaio.
    let apagados = 0;
    for (const col of await dbDestino.listCollections()) {
      const caminhosOrigem = new Set((await listarDocs(dbOrigem.collection(col.id))).map((s) => s.ref.path));
      for (const s of await listarDocs(col)) {
        if (!caminhosOrigem.has(s.ref.path)) { escritor.delete(s.ref); apagados++; }
      }
    }
    console.log(`  espelhar: ${apagados} documento(s) que não existem mais na origem serão apagados do destino`);
  }
  await escritor.close();
  console.log(`Cópia terminada: ${total} documento(s), ${falhas} falha(s).`);
  if (falhas > 0) process.exitCode = 1;
}

// ---------- 3. conferência documento por documento ----------
if (conferir) {
  console.log('\nConferindo documento por documento...');
  const resumo = [];
  let problemas = 0;
  for (const c of colecoes) {
    const docsOrigem = await listarDocs(dbOrigem.collection(c));
    const docsDestino = await listarDocs(dbDestino.collection(c));
    const mapaDestino = new Map(docsDestino.map((s) => [s.ref.path, s]));
    let faltando = 0, diferentes = 0;
    for (const s of docsOrigem) {
      const d = mapaDestino.get(s.ref.path);
      if (!d) { faltando++; continue; }
      // Referências apontam para bancos diferentes; comparamos só o caminho.
      if (digital(s.data()) !== digital(d.data())) diferentes++;
    }
    const sobrando = docsDestino.length - (docsOrigem.length - faltando);
    if (faltando || diferentes || sobrando) problemas++;
    resumo.push({ coleção: c, origem: docsOrigem.length, destino: docsDestino.length, faltando, diferentes, 'só no destino': sobrando });
  }
  tabela('Conferência:', resumo);
  console.log(problemas === 0
    ? 'OK: o destino tem exatamente os mesmos documentos da origem.'
    : `ATENÇÃO: ${problemas} coleção(ões) com diferença. Não vire a chave antes de entender o motivo.`);
  if (problemas > 0) process.exitCode = 1;
}

// ---------- 4. (opcional) logins ----------
if (conferirLogins) {
  const listar = async (app) => {
    const usuarios = new Map();
    let pagina;
    do {
      const r = await getAuth(app).listUsers(1000, pagina);
      r.users.forEach((u) => usuarios.set(u.uid, u));
      pagina = r.pageToken;
    } while (pagina);
    return usuarios;
  };
  const uo = await listar(appOrigem);
  const ud = await listar(appDestino);
  const faltando = [...uo.keys()].filter((uid) => !ud.has(uid));
  const semSenha = [...uo.values()].filter((u) => u.passwordHash && ud.has(u.uid) && !ud.get(u.uid).passwordHash);
  console.log(`\nLogins: origem ${uo.size}, destino ${ud.size}, faltando no destino ${faltando.length}, importados sem senha ${semSenha.length}.`);
  faltando.slice(0, 20).forEach((uid) => console.log(`  faltando: ${uid} ${uo.get(uid).email || ''}`));
  // Os documentos users/{uid} precisam bater com os logins (o app procura o perfil pelo uid).
  const perfis = await listarDocs(dbDestino.collection('users'));
  const perfisSemLogin = perfis.filter((s) => !ud.has(s.id));
  console.log(`Perfis em users/ sem login correspondente no destino: ${perfisSemLogin.length}`);
  if (faltando.length || semSenha.length || perfisSemLogin.length) process.exitCode = 1;
}
