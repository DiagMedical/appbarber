# AppBarber — Contexto do Projeto

## Stack
- **Frontend:** Vite + React 19 + TypeScript
- **UI:** TailwindCSS v4 + shadcn/ui v4 + dark mode (padrão escuro)
- **Backend:** Supabase (Auth, PostgreSQL, Storage)
- **Notificações:** Evolution API (WhatsApp, self-hosted)
- **Deploy:** Vercel
- **Timezone:** UTC-3 (Brasília)

## Tema Visual
- **Paleta:** Índigo vibrante como cor primária (HSL 239 84% 57%)
- **Light mode:** Fundo azul clarinho (226 100% 97%), sidebar gradiente índigo escuro
- **Dark mode:** Fundo azul muito escuro (240 30% 6%), sidebar gradiente índigo escuro
- **Gradientes:** `from-indigo-500 to-blue-600` em ícones, botões e cards
- **Logo:** Nome com gradiente `from-indigo-200 to-blue-200` + `bg-clip-text text-transparent`, subtítulo "GESTÃO" caixa alta espaçada
- **Animações:** fade-in-up, scale-in, slide-in-left, bounce-in em cards e listas
- **User prefere:** cores vivas com índigo, sem tons acinzentados/mortos

## Convenções

### Código
- TypeScript estrito, sem `any`
- Componentes em `src/components/` com subpastas por domínio
- Páginas em `src/pages/`
- Hooks customizados em `src/hooks/`
- Utilitários em `src/lib/`
- Tipos em `src/types/`

### Commits
- `feat:` nova funcionalidade
- `fix:` correção
- `chore:` setup, config, deps
- `refactor:` refatoração sem mudança de comportamento

### shadcn/ui
- Componentes em `src/components/ui/`
- Nono-shadowing: não modificar componentes do shadcn diretamente (exceto `form.tsx`)
- Preferir composição via `className` e `asChild`

## Regras
1. Não modificar componentes do shadcn/ui (exceto `form.tsx`)
2. Dark mode ativado por padrão
3. Todos horários exibidos em UTC-3 (Brasília)
4. Zod schemas sempre tipados com inferência
5. React Hook Form + Zod para formulários
6. Supabase client singleton via contexto
7. Auth state gerenciado via provider
8. **Admin identificado por email** (`welloliver@gmail.com`) em `AuthProvider.tsx`
9. **Clientes** não veem Admin nem Configurações na sidebar

## Estrutura
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── AppLayout.tsx    # Sidebar + mobile header + logo + guardas (loading/onboarding/admin)
│   ├── ShopSetup.tsx    # Onboarding: criar barbearia (qualquer usuário logado)
│   └── PageTransition.tsx
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Barbers.tsx
│   ├── Services.tsx
│   ├── Clients.tsx
│   ├── Appointments.tsx
│   ├── Booking.tsx
│   ├── WhatsAppSettings.tsx
│   ├── Reports.tsx
│   ├── AdminPage.tsx    # Painel admin (só admin vê)
│   └── ShopSettings.tsx # Config da loja (só admin vê)
├── hooks/
│   └── useTheme.ts
│   └── useWhatsAppStatus.ts
├── lib/
│   ├── supabase.ts
│   ├── shop.ts          # resolveActiveShop simplificado (só busca por owner_user_id)
│   ├── evolution.ts
│   ├── availability.ts
│   ├── timezone.ts
│   ├── site.ts
│   ├── public-site.ts
│   ├── storage.ts
│   └── utils.ts
├── providers/
│   ├── ThemeProvider.tsx
│   └── AuthProvider.tsx  # isAdmin por email, error state, clearError
├── types/
│   └── database.ts
└── App.tsx               # Rotas: /login, /booking, /public/:slug, /admin, /settings, etc.
```

## Fluxo de Usuários

### Admin (welloliver@gmail.com)
1. Login → `resolveActiveShop` retorna null (admin não tem shop) → AppLayout detecta `isAdmin && !shop` → redireciona para `/admin`
2. Sidebar: Dashboard, Barbeiros, Serviços, Clientes, Agendamentos, WhatsApp, Relatórios, Admin, Configurações
3. Em `/admin`: vê todas as lojas, cria novas (nome + UUID do dono), exclui

### Cliente (dono de barbearia)
1. Login → `resolveActiveShop` busca por `owner_user_id`
2. Se achar shop → app normal
3. Se não achar → onboarding (`ShopSetup`) com formulário "Criar Barbearia"
4. Sidebar: Dashboard, Barbeiros, Serviços, Clientes, Agendamentos, WhatsApp, Relatórios (sem Admin, sem Config)

### Criação de barbearia
- **Pelo admin**: Supabase Auth → cria usuário → copia UUID → `/admin` → Nova Barbearia → cola UUID
- **Pelo cliente**: Login → onboarding → digita nome → INSERT com `owner_user_id = auth.uid()`

## Histórico de Alterações

### Sessão 2 — Tema Índigo + Logo
- **index.css:** Tema refeito com HSL de índigo vibrante, light mode azul clarinho, dark mode azul escuro profundo
- **AppLayout.tsx:** Sidebar gradiente índigo escuro com logo centralizado (ícone gradiente + nome gradiente + "GESTÃO"), mobile header idêntico
- **Login.tsx:** Fundo gradiente índigo escuro, glow radial, card branco/transparente, logo com gradiente
- **Dashboard.tsx:** Cards com ícones gradiente índigo, bordas indigo/20, sombras indigo, hover animations
- **Booking.tsx:** Fundo índigo escuro, inputs foco indigo, botão gradiente
- **Barbers.tsx, Services.tsx, Clients.tsx, Appointments.tsx, WhatsAppSettings.tsx:** Headers com ícone gradiente índigo, cards borda indigo/10, hover indigo/30, botões gradiente, empty states com ícone indigo

### Sessão 3 — Validação de Horários Disponíveis
- **lib/availability.ts:** Utilitário para gerar slots (30min), verificar conflitos com agendamentos existentes e consultar disponibilidade via barber_availability + appointments
- **Barbers.tsx:** Adicionado botão "Horários" (ícone Clock) em cada card; abre dialog com checkboxes para dia da semana + inputs time de início/fim; salva em lote na tabela barber_availability (deleta antigos, insere novos)
- **Booking.tsx:** Ao selecionar barbeiro + serviço + data, busca slots disponíveis e exibe como grade de botões clicáveis (estilo chip); remove input time livre; valida dupla verificação antes de salvar (re-consulta disponibilidade)
- **Appointments.tsx:** Mesmo fluxo no dialog de criação: substitui input time por grade de horários disponíveis; valida conflito antes de inserir; desabilita botão criar sem horário selecionado

### Sessão 4 — Edge Functions (WhatsApp Server-Side + Lembrete)
- **supabase/functions/notify-appointment/index.ts:** Edge Function que recebe webhook do banco (INSERT/UPDATE em appointments) e envia WhatsApp via Evolution API
- **supabase/functions/reminder/index.ts:** Edge Function que busca appointments confirmed começando em ~1h e envia lembretes; chamada a cada 15min via pg_cron
- **supabase/config.toml:** Configuradas ambas as functions (verify_jwt = false para aceitar webhook)
- **schema.sql:** Adicionado trigger `trg_notify_appointment` (AFTER INSERT OR UPDATE OF status) chamando `net.http_post`; adicionado pg_net + pg_cron + cron.schedule('send-reminders', '*/15 * * * *')
- **supabase functions deploy:** ambas deployadas no projeto chtjqqtvvlamrdesaiwp

### Sessão 5 — Grade Visual + Booking Refinado + Relatórios
- **Dashboard.tsx:** Adicionada "Agenda Semanal" com grade visual de horários (colunas = dias, linhas = 08h–20h, appointments como blocos coloridos por status); seletor de barbeiro + navegação entre semanas
- **Booking.tsx:** Refatorado com fluxo em 3 etapas (Passo 1: barbeiro+serviço, Passo 2: data+horários agrupados por Manhã/Tarde/Noite, Passo 3: dados pessoais); indicador de progresso visual; resumo do agendamento na confirmação
- **Reports.tsx:** Nova página de relatórios com cards de resumo (total, concluídos, faturamento, ticket médio); gráfico de barras por barbeiro com %; gráfico de faturamento mensal; seletor de período (mês/3 meses/ano)
- **App.tsx + AppLayout.tsx:** Rota /reports adicionada + item "Relatórios" na sidebar

### Sessão 6 — Polimento Operacional Final
- **Dashboard.tsx:** Adicionados indicadores de atenção imediata (próximas 2h, pendentes, concluídos e cancelados), painel de próximos atendimentos e carga por barbeiro
- **Booking.tsx:** Inserido resumo fixo do agendamento, máscara de WhatsApp, feedback mais claro e data/hora montadas com UTC-3 explícito
- **Appointments.tsx:** Cada item agora abre detalhe completo com ações rápidas (confirmar, concluir, cancelar, excluir) sem sair da lista
- **Barbers.tsx, Services.tsx, Clients.tsx:** Busca, filtros, métricas rápidas e estados vazios mais consistentes para acelerar uso diário
- **Reports.tsx:** Resumos, leitura rápida e carregamento ajustados para ficar mais confiável e legível
- **WhatsAppSettings.tsx:** Estado de configuração e teste de conexão reorganizados com melhor hierarquia visual
- **Login.tsx + AppLayout.tsx:** Primeira impressão e fluxo de entrada alinhados com a identidade do app; redirecionamento ficou declarativo
- **build:** Build de produção validado após o polimento final

### Sessão 7 — Próxima sequência técnica
- **1. Multitenancy real:** base implementada; a loja ativa agora vem do contexto autenticado nas telas principais, e clientes já seguem o mesmo recorte por loja
- **2. RLS de verdade:** trocar políticas genéricas por políticas isoladas por shop/usuário no Supabase
- **3. Timezone consistente:** base auditada nas telas principais; criação, leitura e filtro de datas/hora agora usam UTC-3 de forma explícita
- **4. Formulários padrão:** migrar os fluxos restantes para `React Hook Form + Zod` onde fizer sentido
- **5. QA operacional:** validar webhook, cron, notificações e fluxos críticos depois das mudanças de backend
- **Regra de sequência:** executar nessa ordem; não avançar para o item seguinte sem fechar o anterior

### Sessão 8 — Site Público (Studio Lima)
- **supabase/migrations/20260708194100_public_site_data.sql:** Adicionadas colunas `instagram`, `working_hours` (JSONB), `gallery_photos` (JSONB), `hero_photo` na tabela `shops`
- **supabase/migrations/20260708194200_apply_all_missing.sql:** Unifica todas as colunas pendentes (`owner_user_id`, `public_slug`, instagram, etc.)
- **src/types/database.ts:** Interface `Shop` updated com os novos campos; `public_slug` agora opcional
- **src/lib/site.ts:** `buildPublicSiteUrl` agora retorna `/public/slug` no localhost
- **src/lib/public-site.ts:** `loadPublicShopContext` fallback para primeira loja se `public_slug` não existir; aceita `slug: string | null`
- **src/lib/shop.ts:** `resolveActiveShop` trata colunas faltantes (migration não aplicada)
- **src/lib/storage.ts:** **CRIADO** — upload/delete de fotos (hero + galeria) via Supabase Storage
- **src/pages/PublicSite.tsx:** **REESCRITO** — estilo Sancho Barbearia (fundo neutro escuro, sem índigo, premium), slug extraído de `/public/:slug` (rota) ou subdomínio, galeria com fotos
- **src/App.tsx:** Adicionado rota `<Route path="/public/:slug" element={<PublicSite />} />` + `shouldRenderPublicSite()` para subdomínios
- **src/pages/WhatsAppSettings.tsx:** Seção "Site Público" com upload de fotos (file input + preview), mantidos Instagram, Working Hours, Copiar link
- **src/components/AppLayout.tsx:** Item "Site Público" (ícone Globe) na sidebar
- **build:** Produção validado após mudanças

### Sessão 9 — Redesign Premium do Site Público (Luxury Gold)
- **src/pages/PublicSite.tsx:** Reescrito completamente com tema de luxo escuro (fundo preto absoluto `#050505`, glows radiais dourados e destaques âmbar/ouro). Adicionado wizard de 4 etapas (serviços com categorias/busca, barbeiros com bio, datas horizontais de 14 dias em chips e slots por períodos de turno, formulário de WhatsApp com máscara e resumo flutuante).
- **future_improvements_plan.md:** **CRIADO** — Plano de melhorias futuras para integrar estreitamente o Site Público ao SaaS.
- **build:** Produção validada com sucesso.

### Sessão 10 — Segurança, Notificações e Configurações (2026-07-09)
- **supabase/migrations/20260709200000_add_buffer_minutes_to_services.sql:** Coluna `buffer_minutes INTEGER DEFAULT 0` em `services`
- **supabase/migrations/20260709210000_reengage_cron.sql:** pg_cron `send-reengage` agendado para 13h UTC diariamente
- **supabase/migrations/20260709220000_roadmap_improvements.sql:** Adicionado `cancel_token UUID` em `appointments`, `phone TEXT` em `barbers`, `reengage_interval_days INT DEFAULT 22` em `whatsapp_configs`
- **src/types/database.ts:** Interfaces `Appointment`, `Barber` e `WhatsAppConfig` atualizadas com os novos campos
- **src/lib/storage.ts:** Função `uploadLogoPhoto` adicionada para upload do logo da loja
- **supabase/functions/notify-appointment/index.ts:** Envia link de cancelamento com `cancel_token` (não mais `id`); dispara segunda mensagem ao barbeiro no INSERT com phone
- **supabase/functions/reengage/index.ts:** Lê `reengage_interval_days` do banco por loja antes de filtrar clientes inativos
- **src/pages/Barbers.tsx:** Campo de edição de telefone do barbeiro adicionado
- **src/pages/WhatsAppSettings.tsx:** Input numérico para configurar intervalo de re-engajamento
- **src/pages/ShopSettings.tsx:** **CRIADO** — tela de configurações da loja (nome, telefone, endereço, logo)
- **src/App.tsx:** Rota `/settings` adicionada
- **src/components/AppLayout.tsx:** Item "Configurações" (ícone Settings) adicionado na sidebar
- **src/pages/ManageBooking.tsx:** Busca agendamento via `.eq('cancel_token', token)` em vez de `.eq('id', token)`
- **build:** `npm run build` validado com sucesso (`✓ built in 1.17s`)
- **Commit:** `dda8579` + `0a6b0ea` — locais; push para `origin main` ainda pendente
- **⚠️ PENDENTE:** Todas as 3 migrations + 2 edge function deploys + push precisam ser executados manualmente (ver `ROADMAP.md` Fase 0)
- **✅ RESOLVIDO:** `ShopSettings.tsx` migrado para React Hook Form + Zod; `src/components/ui/form.tsx` criado (shadcn Form sem deps externas)

### Sessão 11 — RHF+Zod Forms (continuação)
- **`src/pages/Barbers.tsx`**: Formulário de cadastro/edição migrado para React Hook Form + Zod (nome e telefone do WhatsApp com validação)
- **`src/pages/Clients.tsx`**: Formulário migrado para RHF + Zod (nome, WhatsApp, email, notas)
- **`src/components/ui/form.tsx`**: Reescrito com `FormField` usando `useFormContext()` internamente para evitar conflito de generics do `react-hook-form` v7+ com `zodResolver`. A prop `control` é aceita mas ignorada (compat. de API). A prop `rules` é tipada como `any`
- **`src/pages/Services.tsx`**: Corrigido `.default('0')` no schema Zod de `buffer_minutes` (eliminava divergência input/output no resolver); removido `asChild` do `DialogTrigger`

### Sessão 12 — Admin Panel + RLS Fix (2026-07-09)
- **`supabase/fix_rls_policies.sql`**: SQL de correção RLS — adiciona colunas faltantes (`public_slug`, `instagram`, etc.), cria tabela `admins` + função `is_admin()`, corrige políticas SELECT/UPDATE/DELETE para permitir que admin veja todas as lojas
- **`src/lib/shop.ts`**: `resolveActiveShop` simplificado — só busca por `owner_user_id`. Remove auto-criação de loja e lógica de claim de loja sem dono
- **`src/providers/AuthProvider.tsx`**: Adicionado `error` (state), `clearError()`, `isAdmin` (checks `ADMIN_EMAILS` = `['welloliver@gmail.com']`); try/catch no `loadShop` para não quebrar o app
- **`src/components/ShopSetup.tsx`**: **CRIADO** — tela de onboarding com formulário "Criar Barbearia" para qualquer usuário logado sem loja. Usa `supabase.from('shops').insert()` diretamente
- **`src/components/AppLayout.tsx`**: Guardas: `loading` → spinner; `!shop && !isAdmin` → ShopSetup; `isAdmin && !shop` → redirect `/admin`. Nav items dinâmicos: admin vê Admin+Config, cliente só vê operacional
- **`src/pages/AdminPage.tsx`**: **CRIADO** — painel admin com listagem de todas as lojas, modal de criação (nome + UUID do dono), exclusão com confirmação
- **`src/App.tsx`**: Rota `/admin` adicionada
- **NavItems**: Separados em `baseNavItems` (Dashboard, Barbeiros, Serviços, Clientes, Agendamentos, WhatsApp, Relatórios) e `adminNavItems` (Admin, Configurações)
- **fix:** Correção do erro 403 (RLS) que impedia cadastro/edição de barbearia + admin sem loja ser redirecionado corretamente
- **build:** `npm run build` validado com sucesso
- **Commits:** `7569d63`, `75a63c5`
