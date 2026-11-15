/**
 * EXPORTAÇÃO DO PROJETO ANTIGO (v2 — reusa a sessão de login do app)
 *
 * COMO USAR:
 * 1. Abra o app rodando contra o projeto ANTIGO e faça login como ADMIN.
 * 2. Aperte F12 → aba Console → digite "permitir colar" e Enter (se pedir).
 * 3. Cole TODO o conteúdo deste arquivo e pressione Enter.
 * 4. Um arquivo "backup-firebase.json" será baixado.
 */
(async () => {
  console.log('⏳ Exportando dados do Firestore...');

  const { initializeApp } = await import(
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'
  );
  const {
    getFirestore,
    collection,
    getDocs,
  } = await import(
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
  );
  const {
    getAuth,
    onAuthStateChanged,
  } = await import(
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'
  );

  const cfg = window.__firebase_config ||
    JSON.parse(localStorage.getItem('firebase-config') || 'null');

  if (!cfg) {
    console.error('❌ Rode primeiro no console:\n' +
      'localStorage.setItem("firebase-config", JSON.stringify({ projectId: "project-5c707c77-a3d7-4999-882", appId: "1:773801403304:web:36072c55888161c848739d", apiKey: "AIzaSyBERqaD3OFvby8mB88t57L_L28eXbZ5xx4" }))\n' +
      '...e depois rode este script de novo.');
    return;
  }

  // Usa o app DEFAULT: é a mesma chave de persistência (IndexedDB) que o app
  // da página usa, então o Firebase Auth recupera a sessão do usuário logado.
  let app;
  try {
    app = initializeApp(cfg);
  } catch (e) {
    const { getApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    app = getApp();
  }
  const auth = getAuth(app);

  // Espera o Firebase restaurar a sessão do usuário logado
  const user = await new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (u) => {
      stop();
      resolve(u);
    });
  });

  if (!user) {
    console.error('❌ Nenhum usuário logado nesta sessão. Faça login no app e rode de novo.');
    return;
  }
  console.log(`👤 Sessão restaurada: ${user.email || user.uid}`);

  const DB_ID = 'ai-studio-0703a7bd-0c96-4411-94f0-747479362cad';
  const db = getFirestore(app, DB_ID);

  const COLECOES = ['people', 'families', 'structures', 'users', 'logs'];
  const backup = {};

  for (const nome of COLECOES) {
    const snap = await getDocs(collection(db, nome));
    backup[nome] = {};
    snap.forEach((d) => {
      backup[nome][d.id] = JSON.parse(JSON.stringify(d.data()));
    });
    console.log(`✅ ${nome}: ${Object.keys(backup[nome]).length} documentos`);
  }

  backup.__meta = {
    exportedAt: new Date().toISOString(),
    sourceProjectId: cfg.projectId,
    databaseId: DB_ID,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup-firebase.json';
  a.click();

  console.log('🎉 Pronto! Arquivo backup-firebase.json baixado.');
})();
