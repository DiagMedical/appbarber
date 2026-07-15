# AppBarber — Guia de Setup Local

## 📋 Pré-requisitos

- Node.js 18+
- npm
- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com)
- (Opcional) Instância da [Evolution API](https://evolution-api.com) para WhatsApp

---

## 🚀 Setup Local

### 1. Clone e instale dependências

```bash
git clone https://github.com/DiagMedical/appbarber.git
cd appbarber
npm install
```

### 2. Variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
VITE_ENABLE_BARBER_PUSH=true
VITE_VAPID_PUBLIC_KEY=sua_chave_vapid_publica
```

### 3. Supabase

#### 3.1. Migrations

As migrations estão em `supabase/migrations/`. Para aplicar localmente:

```bash
npx supabase db push --linked
```

Ou execute manualmente os arquivos `.sql` no SQL Editor do Supabase.

#### 3.2. Bucket `gallery` + RLS

Execute o conteúdo de `supabase/migrations/20260710150000_create_gallery_storage.sql` no SQL Editor para criar o bucket e as policies de Storage.

#### 3.3. Tabela `admins` + RLS Admin

Execute `supabase/migrations/20260710160000_fix_admin_rls_update.sql` para criar a tabela `admins`, função `is_admin()` e corrigir as policies de SELECT/UPDATE/INSERT/DELETE.

#### 3.4. RPCs e coluna `auth_email`

Execute `supabase/fix_rpc_only.sql` no SQL Editor para:

- Adicionar coluna `auth_email` em `shops`
- Criar RPC `lookup_shop_auth_email`
- Criar RPC `admin_create_shop`
- Criar RPC `is_admin()`

#### 3.5. Realtime (opcional)

Para o Dashboard atualizar em tempo real:

```sql
alter publication supabase_realtime add table appointments;
```

### 4. Edge Functions

As Edge Functions estão em `supabase/functions/`. Para fazer deploy:

```bash
npx supabase functions deploy create-auth-user --project-ref seu-ref
npx supabase functions deploy notify-appointment --project-ref seu-ref
npx supabase functions deploy reminder --project-ref seu-ref
npx supabase functions deploy reengage --project-ref seu-ref
npx supabase functions deploy notify-barber-push --project-ref seu-ref
```

### 5. VAPID Keys (Push Notification)

Para gerar as chaves VAPID:

```bash
npx web-push generate-vapid-keys
```

Adicione a chave pública em `VITE_VAPID_PUBLIC_KEY` no `.env` e na Vercel.

Adicione a chave privada como secret da Edge Function `notify-barber-push`:

```bash
npx supabase secrets set VAPID_PRIVATE_KEY=sua_chave_privada --project-ref seu-ref
npx supabase secrets set VAPID_PUBLIC_KEY=sua_chave_publica --project-ref seu-ref
npx supabase secrets set NEXT_PUBLIC_BASE_URL=https://appbarber.vercel.app --project-ref seu-ref
```

### 6. Rodar localmente

```bash
npm run dev
```

---

## 🌐 Deploy na Vercel

1. Conecte o repositório na Vercel
2. Configure as variáveis de ambiente (mesmas do `.env`)
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. Deploy automático em cada push na `main`

---

## 📦 Estrutura do Projeto

```
src/
├── components/    # Componentes reutilizáveis
│   └── ui/        # shadcn/ui (não modificar exceto form.tsx)
├── pages/         # Páginas da aplicação
├── hooks/         # Hooks customizados
├── lib/           # Utilitários e integrações
├── providers/     # Providers (Auth, Theme)
└── types/         # Tipos TypeScript

supabase/
├── functions/     # Edge Functions
└── migrations/    # Migrations SQL
```
