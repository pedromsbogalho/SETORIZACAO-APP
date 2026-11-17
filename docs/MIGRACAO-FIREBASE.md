# Migração para outro projeto Firebase

Roteiro para mover o app de um projeto Firebase para outro, por exemplo para outra conta Google. O código do app não muda: mudam a configuração, os dados e os logins.

- **Projeto antigo:** `project-5c707c77-a3d7-4999-882`, banco `ai-studio-0703a7bd-0c96-4411-94f0-747479362cad`, criado pelo AI Studio.
- **Projeto novo:** será criado na conta nova. Neste roteiro aparece como `NOVO-PROJETO`.

Tempo total: algumas horas de preparação e cerca de **30 minutos de virada**, com o app parado para edição.

> ⚠️ **Chaves de conta de serviço e o arquivo de usuários exportado dão acesso total aos dados.** Guarde-os só no computador de quem roda a migração. Nunca coloque no Git, em chat ou em e-mail, e apague tudo no fim (passo 12).

---

## O que você precisa

- [ ] Acesso de **dono** ao projeto antigo. Hoje é a conta do Pedro.
- [ ] A conta Google nova, onde o projeto novo vai ficar.
- [ ] Node.js 18 ou mais novo e o Firebase CLI (`npm install -g firebase-tools`, depois `firebase login`). O CLI precisa enxergar os dois projetos: faça login com uma conta que tenha acesso aos dois, ou rode `firebase login:add` para a segunda.
- [ ] Este repositório no computador, com `npm install` rodado dentro de `scripts/migracao`.

---

## Parte A — Preparação (pode ser feita dias antes, sem afetar ninguém)

### 1. Criar o projeto novo
No [Console do Firebase](https://console.firebase.google.com), entrando com a conta nova:
1. **Adicionar projeto**, no plano gratuito (Spark).
2. **Firestore Database → Criar banco de dados** → modo produção.
   - **Local: `southamerica-east1` (São Paulo).** Essa escolha não pode ser mudada depois.
   - Pode ser o banco `(default)`.
3. **Authentication → Começar**. Ative **E-mail/senha** e **Google**.
4. **Authentication → Configurações → Domínios autorizados**: adicione o domínio do app na Vercel, por exemplo `jc-caraguatatuba.vercel.app`, e qualquer domínio próprio.
5. **Configurações do projeto → Seus apps → Web (`</>`)**: registre um app web e anote o objeto de configuração (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). Esses valores **não são segredo**: vão no JavaScript do navegador.

### 2. Publicar as regras no projeto novo
**Firestore → Regras** → cole o conteúdo de `firestore.rules`, na versão do `main` no dia → **Publicar**.

### 3. Gerar as chaves de conta de serviço (uma por projeto)
Em cada projeto: **Configurações do projeto → Contas de serviço → Gerar nova chave privada**.

Salve os arquivos em `scripts/migracao/` com estes nomes:
- `chave-origem.json`: projeto antigo. **Quem gera é o dono, o Pedro.**
- `chave-destino.json`: projeto novo.

O `.gitignore` dessa pasta já impede que esses arquivos entrem no Git.

### 4. Pegar os parâmetros de senha do projeto antigo
Projeto **antigo** → **Authentication → Usuários** → menu **⋮** acima da lista → **Parâmetros de hash de senha**. Anote os quatro valores: `base64_signer_key`, `base64_salt_separator`, `rounds` e `mem_cost`. **Também só o dono vê.**

> Sem esses parâmetros, os logins de usuário e senha não podem ser migrados com a senha atual. Nesse caso, o admin precisa definir senhas novas para cada usuário depois da virada. Os e-mails `@jornadajc.app.local` são fictícios e não recebem "redefinir senha". O login com Google não é afetado.

### 5. Ensaio completo (sem parar o app)
Dentro de `scripts/migracao`:

```bash
# 5a. Ensaio: só conta os documentos dos dois lados. Não grava nada.
node copiar-firestore.mjs --origem chave-origem.json --origem-db ai-studio-0703a7bd-0c96-4411-94f0-747479362cad \
  --destino chave-destino.json --destino-db "(default)"

# 5b. Cópia de ensaio + conferência documento por documento
node copiar-firestore.mjs --origem chave-origem.json --origem-db ai-studio-0703a7bd-0c96-4411-94f0-747479362cad \
  --destino chave-destino.json --destino-db "(default)" --executar
```
O final precisa mostrar **"OK: o destino tem exatamente os mesmos documentos da origem."**

```bash
# 5c. Logins (troque NOVO-PROJETO e os quatro valores do passo 4)
firebase auth:export usuarios.json --format=json --project project-5c707c77-a3d7-4999-882
firebase auth:import usuarios.json --project NOVO-PROJETO \
  --hash-algo=SCRYPT --hash-key=<base64_signer_key> --salt-separator=<base64_salt_separator> \
  --rounds=<rounds> --mem-cost=<mem_cost>

# 5d. Conferir os logins: mesmos usuários, com senha, e cada perfil em users/ com o seu login
node copiar-firestore.mjs --origem chave-origem.json --origem-db ai-studio-0703a7bd-0c96-4411-94f0-747479362cad \
  --destino chave-destino.json --destino-db "(default)" --conferir-logins
```
O resultado esperado é `faltando no destino 0`, `importados sem senha 0` e `Perfis ... sem login correspondente: 0`.

### 6. Testar o app no projeto novo antes da virada
Use uma **prévia da Vercel**: um branch qualquer com as variáveis do passo 9 configuradas só para **Preview**. Ou rode localmente com um `.env.local` contendo essas variáveis.

Confira:
- [ ] login com usuário e senha, **com a senha de sempre**;
- [ ] login com Google;
- [ ] a lista de pessoas carrega;
- [ ] uma edição salva;
- [ ] a foto de uma pessoa aparece;
- [ ] a edição com IA responde.

As edições feitas nesse teste ficam só no projeto novo e serão sobrescritas na virada.

---

## Parte B — Virada (cerca de 30 minutos, com o app parado para edição)

### 7. Avisar e congelar
Combine um horário e peça que **ninguém edite nada** do início ao fim da virada.

### 8. Cópia final
```bash
# Dados: copia por cima do ensaio e apaga o que foi excluído na origem desde então
node copiar-firestore.mjs --origem chave-origem.json --origem-db ai-studio-0703a7bd-0c96-4411-94f0-747479362cad \
  --destino chave-destino.json --destino-db "(default)" --executar --sobrescrever --espelhar

# Logins: exporta de novo e importa (usuários criados desde o ensaio)
firebase auth:export usuarios.json --format=json --project project-5c707c77-a3d7-4999-882
firebase auth:import usuarios.json --project NOVO-PROJETO --hash-algo=SCRYPT --hash-key=... --salt-separator=... --rounds=... --mem-cost=...
node copiar-firestore.mjs --origem chave-origem.json --origem-db ai-studio-0703a7bd-0c96-4411-94f0-747479362cad \
  --destino chave-destino.json --destino-db "(default)" --conferir-logins
```
**Só siga se aparecer "OK" e os logins vierem sem faltas.**

### 9. Trocar a configuração na Vercel
**Vercel → projeto → Settings → Environment Variables**, para **Production** e **Preview**:

| Variável | Valor |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` do passo 1.5 |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_DATABASE_ID` | `(default)` |
| `FIREBASE_PROJECT_ID` | `projectId` (usado pela rota da IA) |
| `FIRESTORE_DATABASE_ID` | `(default)` (usado pela rota da IA) |

`GEMINI_API_KEY` e `GOOGLE_MAPS_PLATFORM_KEY` continuam como estão.

Depois: **Deployments → último deploy de produção → Redeploy**. As variáveis `VITE_*` só valem depois de um build novo.

### 10. Conferir em produção
- [ ] Todos precisarão **entrar de novo** uma vez, com a mesma senha.
- [ ] Login com usuário e senha e com Google.
- [ ] A lista de pessoas tem o tamanho de sempre.
- [ ] Uma edição salva e aparece em outro navegador.
- [ ] Uma foto aparece.
- [ ] A edição com IA responde.
- [ ] A tela de aprovação de usuários lista todo mundo.

Tudo certo: libere o uso.

### 11. Atualizar o repositório
Abra um PR trocando os valores do projeto antigo pelos do novo em:
- `firebase-applet-config.json`, usado no desenvolvimento local e como valor padrão;
- os valores padrão de `FIREBASE_PROJECT_ID` e `FIRESTORE_DATABASE_ID` em `api/ai/bulk-edit.ts`.

---

## Depois

### 12. Limpeza (no mesmo dia)
- Apague `chave-origem.json`, `chave-destino.json` e `usuarios.json` do computador.
- No Console, em cada projeto, **Contas de serviço → Gerenciar permissões**: desative as chaves geradas no passo 3.

### 13. Manter o projeto antigo por algumas semanas
**Não apague o projeto antigo** logo. Ele é a cópia de segurança.

Para não haver edição nele por engano, deixe as regras em **somente leitura**: troque `allow ... write`, `create`, `update` e `delete` por `if false`.

### Se der errado: voltar ao projeto antigo
1. Na Vercel, apague as variáveis do passo 9, ou volte os valores antigos, e faça **Redeploy**. O app volta a usar o projeto antigo, que ainda tem todos os dados até o momento da virada.
2. Se já houve edições no projeto novo, copie de volta invertendo origem e destino:
   `--origem chave-destino.json --origem-db "(default)" --destino chave-origem.json --destino-db ai-studio-... --executar --sobrescrever`
