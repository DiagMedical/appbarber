# AppBarber — Plano de Ação: Site Público Studio Lima

## Instrução para qualquer agente de IA

Este documento contém o plano completo e executável para implementar o site público do Studio Lima + integração com o SaaS existente.

**Pré-leitura obrigatória antes de começar:**
- `AGENTS.md` — contexto do projeto, regras, stack
- `CLAUDE.md` — guia operacional (hard rules)
- `prd.md` — visão do produto
- `PUBLIC_SITE_PHASE1.md` — visão original da fase pública
- `NEXT_SESSION_QA.md` — validação de multitenancy
- `PUBLIC_SITE_PLAN.md` (este arquivo) — plano de ação detalhado

**Arquivos-fonte a ler:**
- `src/lib/site.ts`
- `src/lib/public-site.ts`
- `src/lib/shop.ts`
- `src/pages/PublicSite.tsx`
- `src/App.tsx`
- `src/types/database.ts`
- `src/components/AppLayout.tsx`
- `src/providers/AuthProvider.tsx`
- `src/pages/WhatsAppSettings.tsx`
- `src/lib/availability.ts`
- `src/lib/evolution.ts`
- `supabase/migrations/20260708194000_multitenancy_rls.sql`

---

## Dados da Barbearia

| Campo | Valor |
|---|---|
| Nome | Studio Lima |
| Endereço | R. Américo Vespúcio, 173 - Vila América, Santo André - SP, 09110-200 |
| Instagram | @studioliima_barbearia |
| WhatsApp | (configurar no SaaS) |
| Segunda a Sexta | 09:00–19:00 |
| Sábado | 08:00–18:00 |
| Domingo | Fechado |
| Hero Photo | `https://lh3.googleusercontent.com/gps-cs-s/APNQkAG4gXIloAanRxMqN693rtw-chUa4wzTBG21DzQCm0ezCxAAR6cqt3z-V6jmbSQuDcGE2opAuZUCIEsPOGSbkUSOaXzF_aV-mYpIuhPe8AI1UlEDIhEw62J8hBQ4NkybAV1jx8ytng=s294-w294-h220-n-k-no` |

---

## Regras Obrigatórias

1. **Não modificar componentes do shadcn/ui** (`src/components/ui/`)
2. **Dark mode como padrão** (bg-slate-950, texto branco)
3. **Todos horários em UTC-3** (Brasília)
4. **TypeScript estrito, sem `any`**
5. **Identidade visual:** gradientes `from-indigo-500 to-blue-600`, tracking `[0.2em]` em labels, cards com `border-white/10 bg-white/5 backdrop-blur`
6. **React Hook Form + Zod** para formulários
7. **Supabase client singleton via contexto**
8. **Auth state gerenciado via provider**
9. **Preferir composição via `className` e `asChild`** em vez de modificar shadcn

---

## Etapas de Implementação (ordem obrigatória)

### Etapa 1 — Migration SQL

**Arquivo:** `supabase/migrations/<timestamp>_public_site_data.sql`

Adicionar colunas na tabela `shops`:
- `instagram TEXT`
- `working_hours JSONB DEFAULT '{}'`
- `gallery_photos JSONB DEFAULT '[]'`
- `hero_photo TEXT`

```sql
alter table shops
  add column if not exists instagram text,
  add column if not exists working_hours jsonb default '{}',
  add column if not exists gallery_photos jsonb default '[]',
  add column if not exists hero_photo text;
```

---

### Etapa 2 — Tipos TypeScript

**Arquivo:** `src/types/database.ts`

Adicionar na interface `Shop`:
```ts
instagram: string | null
working_hours: Record<string, string> | null  // ex: {"segunda": "09:00-19:00", "sabado": "08:00-18:00"}
gallery_photos: string[] | null
hero_photo: string | null
```

Atualizar `Database.Tables.shops` Row/Insert/Update para incluir os novos campos.

---

### Etapa 3 — Assets

Salvar a foto do hero em:
- `public/images/studio-lima/hero.jpg` (download da URL fornecida)

Se houver mais fotos fornecidas, salvar como:
- `public/images/studio-lima/logo.png`
- `public/images/studio-lima/gallery-1.jpg`
- `public/images/studio-lima/gallery-2.jpg`
- etc.

Se não houver fotos para galeria, o site funciona com placeholders (ícones gradientes).

---

### Etapa 4 — PublicSite.tsx (reescrever)

**Arquivo:** `src/pages/PublicSite.tsx`

Substituir completamente por uma página com **7 seções**:

#### 4.1 — Hero Section
- Background: radial gradient + overlay escuro + foto `hero_photo` (se existir) como background image com `bg-cover bg-center`
- Badge "Site oficial" com `Sparkles`
- Logo (ícone gradiente `Scissors`) + nome "Studio Lima" com gradiente `from-indigo-200 to-blue-200 bg-clip-text text-transparent`
- Subtítulo: experiência em barbearia premium
- Botões: "Agendar agora" (`#agendar`) + "Falar no WhatsApp" (link wa.me)
- Chips de endereço (`MapPin`) e telefone (`Phone`)

#### 4.2 — Serviços Section
- Título: "Serviços" + "Escolha o corte ou serviço certo"
- Grid responsivo (2-3 colunas) com cards
- Cada card: ícone gradiente `Scissors`, nome, descrição, preço (formatado `formatMoney`), duração
- Estilo: `border-white/10 bg-white/5 backdrop-blur`, hover `border-indigo-400/40`

#### 4.3 — Equipe Section
- Título: "Equipe" + "Quem atende na barbearia"
- Grid 2-3 colunas com cards
- Cada card: foto circular grande (`size-20 rounded-full`), nome, bio
- Placeholder: ícone `User` em gradiente quando sem foto

#### 4.4 — Galeria Section (NOVA)
- Título: "Galeria" + "Conheça nosso espaço"
- Se `gallery_photos` vazio: mostrar mensagem "Em breve" com ícone `Image`
- Grid de fotos 2-3 colunas com `object-cover aspect-square rounded-2xl`
- Hover zoom scale(105) transition

#### 4.5 — Localização + Horários Section (NOVA)
- Card com backdrop blur
- Endereço completo com `MapPin`
- Tabela de horários (dia da semana + horário), vindo de `working_hours`
- Links: "Abrir no Google Maps" (maps.google.com), WhatsApp, Instagram
- Horários em formato legível

#### 4.6 — Agendamento Section
- Reaproveitar **toda a lógica existente**:
  - Seleção de serviço (`select`)
  - Seleção de barbeiro (`select`)
  - Seleção de data (`input type="date"`)
  - Slots disponíveis via `getAvailableSlots()` (grid de botões)
  - Nome + WhatsApp (com máscara `formatPhoneInput`)
  - Resumo fixo ao lado (sticky sidebar)
  - Dupla verificação de conflito antes de salvar
  - Criação de cliente com `shop_id` (busca por phone existente)
  - Criação de appointment com status `pending`
  - Disparo de WhatsApp via `sendText()`
  - Tela de sucesso com `CheckCircle`

#### 4.7 — Footer
- Logo + nome "Studio Lima"
- Instagram link (@studioliima_barbearia)
- WhatsApp link
- "© 2026 Studio Lima — Santo André/SP"
- "Feito com AppBarber" (link sutil)

#### Tratamento de estados (em toda a página):
- **Loading:** spinner + "Carregando site..."
- **Error:** mensagem + fallback com ícone
- **Empty (sem barbeiros/serviços):** "Nenhum registro encontrado"
- **Success (agendamento):** tela de confirmação com resumo + botões "Novo agendamento" e "WhatsApp"

---

### Etapa 5 — Roteamento App.tsx

**Arquivo:** `src/App.tsx`

```tsx
import { shouldRenderPublicSite } from '@/lib/site'
import PublicSite from '@/pages/PublicSite'

function App() {
  if (shouldRenderPublicSite()) {
    return <PublicSite />
  }
  // rotas existentes (BrowserRouter, Routes, etc.)
}
```

`shouldRenderPublicSite()` detecta automaticamente:
- Query param `?public=1`
- Subdomínio diferente de `app` (ex: `studio-lima.seudominio.com`)

---

### Etapa 6 — Configurações no SaaS

**Arquivo:** `src/pages/WhatsAppSettings.tsx`

Adicionar após as configurações de WhatsApp uma seção **"Site Público"**:
- Campo: Instagram (text input)
- Campo: Hero Photo URL (text input)
- Campo: Gallery Photos (múltiplos inputs de URL)
- Campo: Working Hours (inputs para cada dia da semana: start/end time)
- Botão: "Salvar configurações do site"
- Botão: "Copiar link do site público" — chama `buildPublicSiteUrl(shop.public_slug)`
- Preview do link público

Todos os campos salvos na tabela `shops`.

---

### Etapa 7 — Link na sidebar

**Arquivo:** `src/components/AppLayout.tsx`

- Importar `Globe` de lucide-react
- Importar `buildPublicSiteUrl` de `@/lib/site`
- Importar `useAuth` para acessar `shop`
- Adicionar no `navItems`:
  ```ts
  { href: '#', label: 'Site Público', icon: Globe, onClick: () => window.open(buildPublicSiteUrl(shop.public_slug), '_blank') }
  ```
- Renderizar como `<a>` externo ou botão com `onClick`
- O link abre em nova aba

---

### Etapa 8 — Atualizar loadPublicShopContext

**Arquivo:** `src/lib/public-site.ts`

Nenhuma mudança necessária — o `select *` já carrega todos os campos da shop, incluindo os novos.

Verificar se `loadPublicShopContext` precisa tipar os novos campos corretamente.

---

### Etapa 9 — Build e QA

```bash
npm run build
```

**Checklist de validação:**
- [ ] Site público carrega com `?public=1&shop=<slug>`
- [ ] Hero exibe foto (ou placeholder gradiente)
- [ ] Serviços listados corretamente
- [ ] Barbeiros com foto/bio
- [ ] Galeria exibe fotos (ou "Em breve")
- [ ] Localização + horários corretos
- [ ] Agendamento: seleciona serviço → barbeiro → data → slots → dados → confirma
- [ ] Cliente criado com `shop_id` correto
- [ ] Appointment criado com status `pending`
- [ ] WhatsApp dispara (se configurado)
- [ ] Tela de sucesso aparece
- [ ] SaaS privado continua funcionando (rotas protegidas)
- [ ] Subdomínio público não quebra rotas do app
- [ ] Nenhum erro de TypeScript
- [ ] Dark mode consistente
- [ ] Mobile responsivo

---

## Referências Visuais

- **Sancho Barbearia** (`https://sanchobarbearia.lovable.app`): layout limpo, escuro, premium, seções enxutas (hero → serviços → espaço → localização/horários → footer)
- **Barbearia Sky** (`https://barbeariasky.com.br`): galeria de cortes, perfis de barbeiros com foto grande + bio detalhada, depoimentos

Ambos usam dark mode, CTA WhatsApp forte, fotos reais como elemento central.

---

## Arquivos que vão mudar (resumo)

| Arquivo | Ação |
|---|---|
| `supabase/migrations/*_public_site.sql` | **CRIAR** |
| `src/types/database.ts` | **EDITAR** |
| `public/images/studio-lima/hero.jpg` | **CRIAR** |
| `src/pages/PublicSite.tsx` | **REESCREVER** |
| `src/App.tsx` | **EDITAR** |
| `src/pages/WhatsAppSettings.tsx` | **EDITAR** |
| `src/components/AppLayout.tsx` | **EDITAR** |
| `src/lib/public-site.ts` | **VERIFICAR** |

---

## Observações Finais

- A multitenancy (shop isolado por usuário) já está implementada — o site público usa `public_slug` para carregar a shop correta
- As RLS policies já permitem `anon` insert em clients e appointments para a shop pública
- O fluxo de booking existente em `PublicSite.tsx` já faz dupla verificação de conflito e disparo de WhatsApp — reaproveitar ao máximo
- Manter consistência: cores, espaçamentos, tipografia e tom do SaaS existente
