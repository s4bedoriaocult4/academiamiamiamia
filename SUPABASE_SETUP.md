# Guia de Configuração: Nuvem (Supabase) + Vercel (PC e Celular)

Este sistema funciona em **Modo Local (Offline-First)** imediatamente após o deploy, e ativa a **Sincronização em Tempo Real entre Computador e Celular** quando conectado a um projeto gratuito no **Supabase**.

---

## Passo 1 — Criar o Projeto no Supabase (Gratuito)

1. Acesse [https://supabase.com](https://supabase.com) e crie uma conta / novo projeto.
2. No menu lateral do projeto, abra **SQL Editor** → **New query**.
3. Copie e cole **todo o conteúdo** do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
   - Isso cria todas as tabelas (`students`, `payments`, `attendance`, `expenses`, `plans`, `personal_plans`, `daily_notes`, `monthly_snapshots`, `settings`), habilita segurança RLS (somente usuários logados) e ativa o Realtime.

---

## Passo 2 — Criar o Login de Acesso da Academia (E-mail ou Google)

### Opção A: E-mail e Senha (sem precisar confirmar e-mail)
1. No painel do Supabase, acesse **Authentication** → **Users**.
2. Clique em **Add user** → **Create new user**.
3. Informe o **E-mail** e a **Senha** que você e sua equipe usarão para entrar pelo computador e pelo celular, e marque **Auto Confirm User**.

### Opção B: Login com Google (Gratuito)
1. No **Google Cloud Console**, crie um OAuth Client ID (*Aplicativo da Web*) com o URI de redirecionamento do Supabase:
   `https://<SEU-PROJETO>.supabase.co/auth/v1/callback`
   - Se o app no **OAuth Consent Screen** ainda estiver em modo *Testing* ("Em teste"), adicione os e-mails autorizados em **Test users** (ou publique o app clicando em **Publish App**).
2. No **Supabase** → **Authentication** → **Sign In / Providers** → **Google**, ative e informe **Client ID** e **Client Secret**.
3. Em **Authentication** → **URL Configuration**, defina a **Site URL** (ex.: `https://seu-site.vercel.app`) e adicione em **Redirect URLs** `https://seu-site.vercel.app/**`.
4. **Segurança obrigatória:** cadastre o Gmail autorizado na tabela `allowed_users` (no **Table Editor** ou SQL Editor):
   ```sql
   INSERT INTO public.allowed_users (email, role)
   VALUES ('seu-email@gmail.com', 'admin')
   ON CONFLICT (email) DO NOTHING;
   ```

---

## Passo 3 — Configurar Variáveis na Vercel

1. No Supabase, vá em **Project Settings** → **API** (ou **Data API / API Keys**) e copie:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon / public key**
2. No painel do projeto na **Vercel** → **Settings** → **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = *(sua Project URL)*
   - `VITE_SUPABASE_ANON_KEY` = *(sua anon key)*
3. Faça um **Redeploy** na Vercel (para as variáveis entrarem no build).

---

## Passo 4 — Restaurar e Higienizar seu Backup de Produção

1. Abra o sistema atualizado no computador e faça login com seu e-mail e senha do Supabase.
2. Vá em **Configurações** → **Backup & Limpeza** → **Importar & Higienizar Backup**.
3. Selecione seu arquivo `.json` atual (ex: `backup_academia_2026-11-13 (1).json`).
4. O assistente vai revisar e corrigir automaticamente:
   - As datas de vencimento com diferença de +1 dia (erro histórico de fuso horário);
   - Espaços extras nos nomes;
   - Categorização dos planos **Mensal**, **Trimestral** e **Semestral**;
   - Possíveis alunos duplicados (você escolhe quais remover);
   - Fechamentos de meses passados divergentes.
5. Após confirmar a importação, se estiver conectado na nuvem, os dados limpos sobem para o Supabase automaticamente (ou clique em **Configurações → Nuvem & Celular → Enviar Dados Locais → Nuvem**).
6. Abra o mesmo site da Vercel no **celular**, entre com o mesmo e-mail e senha e todos os alunos aparecerão sincronizados!

---

## Dica: Instalar como Aplicativo no Celular

- **Android (Chrome):** Abra o site da Vercel → Menu `⋮` → **Adicionar à tela inicial** / **Instalar aplicativo**.
- **iPhone (Safari):** Abra o site → Ícone de **Compartilhar** → **Adicionar à Tela de Início**.
