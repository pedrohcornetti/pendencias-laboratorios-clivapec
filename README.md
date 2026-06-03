# Clivapec — Pendências, Rebate e Premiações

Aplicativo web (React + Vite) com banco de dados **Supabase** (login real, dados na nuvem e
armazenamento de fotos). Substitui a versão de arquivo único.

---

## ✅ O que você precisa
- **Node.js** instalado (você já tem). Para conferir, abra o PowerShell e rode: `node -v`
- Uma conta gratuita no **Supabase**: https://supabase.com

---

## Passo a passo (faça uma vez)

### 1) Criar o projeto no Supabase
1. Entre em https://supabase.com e clique em **New project**.
2. Dê um nome (ex.: `clivapec`), defina uma senha do banco e crie.
3. Espere ~1 minuto até o projeto ficar pronto.

### 2) Criar as tabelas
1. No menu lateral do Supabase, abra **SQL Editor** → **New query**.
2. Abra o arquivo **`supabase/schema.sql`** deste projeto, copie TODO o conteúdo, cole e clique em **Run**.
   - Isso cria as tabelas, a segurança (RLS) e as permissões das fotos.

### 3) Criar o "balde" das fotos (Storage)
1. No menu lateral, abra **Storage** → **New bucket**.
2. Nome do bucket: **`apuracoes`** (exatamente assim) e marque **Public bucket**. Crie.
   *(As permissões já foram criadas pelo schema.sql no passo 2.)*

### 4) Pegar as chaves de conexão
1. No menu, abra **Project Settings** (engrenagem) → **API**.
2. Copie o **Project URL** e a chave **anon public**.
3. Na pasta do projeto, faça uma cópia do arquivo **`.env.example`** e renomeie para **`.env`**.
4. Abra o `.env` e preencha:
   ```
   VITE_SUPABASE_URL=cole-aqui-o-project-url
   VITE_SUPABASE_ANON_KEY=cole-aqui-a-anon-public-key
   ```

### 5) Criar o seu usuário de login
1. No Supabase, abra **Authentication** → **Users** → **Add user** → **Create new user**.
2. Informe seu **e-mail** e uma **senha**, e marque **Auto Confirm User** (importante!).
3. Esse será o login que você usará no app. (Pode criar mais de um usuário se quiser.)

---

## ▶️ Como rodar no seu computador
Abra o **PowerShell** dentro da pasta `clivapec-app` e rode:

```powershell
npm install      # só na primeira vez (baixa as dependências)
npm run dev      # inicia o aplicativo
```

Vai aparecer um endereço tipo `http://localhost:5173`. Abra no navegador, faça login com o
usuário criado no passo 5 e pronto. **Na primeira vez, os 130 laboratórios são cadastrados
automaticamente.**

Para parar o servidor: tecle `Ctrl + C` no PowerShell.

---

## ☁️ Publicar na internet (opcional, para acessar de qualquer lugar)
1. Rode `npm run build` (gera a pasta `dist`).
2. Suba para o **Netlify** ou **Vercel** (arraste a pasta, ou conecte um repositório do GitHub).
3. Nas configurações do site, adicione as mesmas variáveis `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.

---

## 🔒 Sobre segurança
- O login é o **Auth do Supabase** (de verdade). Só quem tem usuário criado consegue entrar.
- Como não há link de "criar conta" no app, ninguém se cadastra sozinho — os usuários são
  criados por você no painel do Supabase.
- Os dados ficam no seu projeto Supabase (na nuvem), com backup do próprio Supabase.

## 🗂️ Estrutura do projeto
```
clivapec-app/
├─ index.html              # página base
├─ package.json            # dependências e comandos
├─ .env                    # suas chaves do Supabase (você cria)
├─ supabase/schema.sql     # cria tabelas + segurança + permissões de foto
├─ public/logo.png         # logo da Clivapec
└─ src/
   ├─ App.jsx              # login, carregamento e navegação
   ├─ supabaseClient.js    # conexão com o Supabase
   ├─ lib/                 # api (banco), helpers e lista padrão de fornecedores
   └─ components/          # Header, Login, Pendências, Rebate, Premiações, Modal
```
