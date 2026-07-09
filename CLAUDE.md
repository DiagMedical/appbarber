# AppBarber - Claude Guide (Operating Manual for AI Agents)

> 🚨 **IMPORTANT**: READ THIS BEFORE TAKING ANY ACTION.
> Any AI agent accessing this codebase MUST follow this guide. Do not reverse, rewrite, or roll back features from completed sessions.

## Current State (Session 12 Complete — Admin Panel + RLS Fix)

All code fully written, validated with `npm run build`, and pushed to GitHub (`origin/main`).

### Completed in Session 11 — RHF+Zod Forms
- **`src/pages/Barbers.tsx`**, **`Clients.tsx`**, **`Services.tsx`**, **`ShopSettings.tsx`**: Formulários migrados para React Hook Form + Zod
- **`src/components/ui/form.tsx`**: Reescrito com `FormField` usando `useFormContext()` internamente

### Completed in Session 12 — Admin Panel + RLS Fix
- **`supabase/fix_rls_policies.sql`**: SQL que adiciona colunas faltantes, cria `admins` table + `is_admin()` function, corrige políticas RLS (SELECT/UPDATE/DELETE com suporte a admin)
- **`src/lib/shop.ts`**: `resolveActiveShop` simplificado — só busca por `owner_user_id`. Sem auto-criação, sem claim de loja sem dono
- **`src/providers/AuthProvider.tsx`**: Adicionado `error`, `clearError()`, `isAdmin` (por email: `welloliver@gmail.com`); try/catch no `loadShop`
- **`src/components/ShopSetup.tsx`**: Tela de onboarding com formulário de criação de barbearia (qualquer usuário logado cria a sua)
- **`src/components/AppLayout.tsx`**: Guardas: loading → spinner; não-admin sem loja → ShopSetup; admin sem loja → /admin
- **`src/pages/AdminPage.tsx`**: Painel admin com lista de todas as lojas, criar nova (nome + UUID do dono), excluir
- **`src/App.tsx`**: Rota `/admin` adicionada
- **Nav dinâmico**: Admin vê Admin + Configurações; clientes só veem operacional (sem Config, sem Admin)

---

## 🚨 Arquitetura de Usuários (CRÍTICO — LEIA ANTES DE QUALQUER ALTERAÇÃO)

### Dois tipos de usuário
1. **Admin** (`welloliver@gmail.com` — hardcoded em `AuthProvider.tsx` `ADMIN_EMAILS`)
   - Não tem `shop` próprio
   - Sidebar: itens operacionais + Admin + Configurações
   - Redirecionado para `/admin` se não tiver shop
   - Cria barbearias para clientes no painel Admin
   - Precisa estar na tabela `admins` do banco (INSERT com UUID do auth.users)

2. **Cliente (barbeiro/dono de barbearia)**
   - Tem exatamente 1 `shop` com `owner_user_id = seu auth.uid()`
   - Sidebar: só itens operacionais (sem Admin, sem Configurações)
   - Se não tiver shop, vê tela de onboarding para criar a própria barbearia

### Fluxo de criação de barbearia
- **Admin cria para o cliente**: 1) Cria usuário em Supabase Auth 2) Pega UUID 3) Vai em /admin → Nova Barbearia → cola UUID
- **Cliente se cadastra sozinho**: Faz login → onboarding → digita nome → cria própria barbearia

---

## 🚨 GIT / DEPLOY — REGRA FIXA

> **O agente NUNCA deve tentar executar `git push` diretamente.**
> O push sempre trava aguardando credenciais no terminal background.
> **Sempre forneça o comando abaixo para o usuário executar manualmente no terminal dele:**

```powershell
git push origin main
```

Após o push, a Vercel faz o deploy automaticamente via webhook. Se não atualizar sozinha, o usuário deve ir em **vercel.com → projeto → Deployments → Redeploy**.

---

## 🚨 NEXT STEPS FOR ANY AGENT (DO NOT SKIP OR REORDER)

### STEP 1: SQL Pendente
Verificar se o usuário já executou `supabase/fix_rls_policies.sql` + INSERT na tabela `admins`.
Se não: pedir para executar.

### STEP 2: QA Operacional
Validar em produção:
1. Criar conta nova → onboarding → criar barbearia → usar app normalmente
2. Admin logar → ver /admin com lista de lojas
3. Admin criar loja para cliente (UUID)
4. Cliente logar e ver apenas itens operacionais

### STEP 3: Phase 3 — Novas Features (só após QA validado)
1. **[FEAT-4] Multi-serviço no Admin**: `Appointments.tsx` + `Booking.tsx` — múltiplos serviços por agendamento
2. **[FEAT-5] `price_at_booking`**: Histórico de preços nos relatórios
3. **[FEAT-6] Reagendamento em `ManageBooking`**: Autosserviço pelo cliente

---

## Hard Rules & Conventions

1. **No direct shadcn/ui edits**: Não modificar arquivos em `src/components/ui/` — exceto `form.tsx`
2. **Form Standards**: Sempre React Hook Form + Zod. Nunca `useState` isolado para campos de formulário
3. **Timezone**: UTC-3 (`America/Sao_Paulo` / offset `-03:00`)
4. **Build verification**: Sempre `npm run build` após qualquer mudança. Zero erros TypeScript
5. **Types**: TypeScript estrito. Evitar `any` — exceto `form.tsx` (`rules` e `control`)
6. **Git push**: NUNCA executar `git push` — sempre fornecer comando para o usuário
7. **Admin**: Identificado por email em `ADMIN_EMAILS` no `AuthProvider.tsx`

---

## Relationship to other files
- `ROADMAP.md`: Checklist vivo com tarefas granulares
- `AGENTS.md` (no `user_rules`): Histórico técnico completo de todas as sessões
