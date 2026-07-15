# Changelog — AppBarber

## [1.x] — 2026

### Sessão 32 (2026-07-15)
- **feat:** Confirmação ao sair com dados não salvos — hook `useUnsavedChanges` em diálogos e formulário inline
- **feat:** Galeria adaptável no site público (grid dinâmico conforme número de fotos)
- **feat:** Paginação em listas longas — Clientes e Agendamentos (20 por página)
- **docs:** SETUP.md + CHANGELOG.md criados

### Sessão 28-31 (2026-07-12 a 2026-07-14)
- **feat:** Realtime no Dashboard (atualização automática via Supabase Realtime)
- **feat:** Botão .ics também no fluxo `/booking`
- **fix:** Tradução labels de filtro em Serviços, Barbeiros e Clientes (i18n)
- **docs:** Migração `is_combo` confirmada no Cloud

### Sessão 27 (2026-07-12)
- **feat:** ErrorBoundary global — erro de runtime não derruba o SPA inteiro
- **docs:** Roadmap atualizado (FEAT-4/5/6 já concluídos)

### Sessão 25-26 (2026-07-12)
- **feat:** Download .ics (calendário) na tela de sucesso do site público
- **fix:** Layout da tela de confirmação — botões em grid 2×2

### Sessão 24 (2026-07-12)
- **feat:** Checkbox "Combo" funcional em Serviços (componente Checkbox reescrito)

### Sessão 23 (2026-07-11)
- **fix:** Card de Faturamento responsivo (sem corte em valores > R$ 100)

### Sessão 22 (2026-07-11)
- **fix:** Dialog de Barbeiros com scroll vertical + correção FormField

### Sessão 21 (2026-07-11)
- **feat:** Notificações push para barbeiros (PWA + Web Push + VAPID)
- **feat:** Service Worker, NotificationContext, hook `useBarberPush`
- **feat:** Edge Function `notify-barber-push`

### Sessão 20 (2026-07-10)
- **feat:** Depoimentos dinâmicos (tabela `testimonials` com CRUD)
- **feat:** Portfólio de fotos por barbeiro (upload + galeria)

### Sessão 19 (2026-07-10)
- **feat:** Horários "Fechado" por dia + card de contato + Waze

### Sessão 18 (2026-07-10)
- **feat:** Upload de logo com auto-save + hero/galeria com auto-save

### Sessão 17 (2026-07-10)
- **feat:** Coluna `price_at_booking` em appointments
- **feat:** Card "Faturamento do Mês" na Dashboard

### Sessão 16 (2026-07-10)
- **fix:** 8 bugs técnicos (timezone, RLS, buffer, empty arrays, etc.)

### Sessão 15 (2026-07-10)
- **fix:** Upload de imagens (hero, galeria, logo) — bucket gallery + RLS + fallback admin

### Sessão 14 (2026-07-09)
- **fix:** RLS do site público liberado para qualquer loja
- **fix:** Trigger `notify_appointment_webhook` com body jsonb
- **fix:** Dias da semana em pt-BR no Dashboard

### Sessão 13 (2026-07-09)
- **feat:** Login por nome da barbearia + senha
- **feat:** Edge Function `create-auth-user`
- **feat:** Sidebar dinâmica (admin vs cliente)

### Sessão 12 (2026-07-09)
- **feat:** Painel Admin (listar/criar/excluir lojas)
- **feat:** Correção RLS para multi-tenant
- **feat:** ShopSetup (onboarding)

### Sessão 11 (2026-07-09)
- **feat:** Migração de formulários para React Hook Form + Zod

### Sessão 10 (2026-07-09)
- **feat:** `buffer_minutes` em serviços
- **feat:** Reengage automático com intervalo configurável
- **feat:** Cancel token em appointments
- **feat:** Telefone do barbeiro + ShopSettings

### Sessão 8-9 (2026-07-08)
- **feat:** Site público premium (tema escuro, wizard 4 etapas)
- **feat:** Galeria, hero photo, Instagram, Waze

### Sessão 5-7 (2026-07-07)
- **feat:** Grade visual de agenda semanal
- **feat:** Relatórios com gráficos
- **feat:** Polimento operacional (indicadores, busca, filtros)

### Sessão 4 (2026-07-07)
- **feat:** Edge Functions (notify-appointment, reminder, reengage)
- **feat:** WhatsApp via Evolution API

### Sessão 3 (2026-07-07)
- **feat:** Validação de horários disponíveis (getAvailableSlots)

### Sessão 2 (2026-07-06)
- **feat:** Tema índigo completo + logo
- **feat:** Dark/Light mode

### Sessão 1 (2026-07-06)
- **init:** Setup inicial do projeto (Vite + React + Supabase)
