# PRD - AppBarber

## Visao do produto

AppBarber e um SaaS para operacao diaria de barbearias, com foco em agendamento, gestao de clientes, controle de servicos e comunicacao automatizada via WhatsApp. A proposta e simplificar a rotina do negocio sem perder controle sobre horarios, confirmacoes e atendimento.

## Problema que resolve

Barbearias costumam operar com combinacoes de caderno, conversa no WhatsApp e memoria da equipe. Isso cria retrabalho, falhas de agendamento, perda de visibilidade da agenda e confirmacoes manuais demais. O AppBarber organiza esse fluxo em um unico sistema, com disponibilidade confiavel e notificacoes automaticas.

## Publico-alvo

- Donos e gestores de barbearias que precisam centralizar operacao e agenda
- Barbeiros que dependem de uma visao clara dos proprios horarios
- Clientes finais que querem reservar sem troca excessiva de mensagens

## Experiencia principal

1. O cliente acessa o link publico da barbearia.
2. Escolhe barbeiro, servico e data.
3. Enxerga apenas os horarios realmente disponiveis.
4. Informa nome e WhatsApp.
5. Confirma o agendamento.
6. A barbearia recebe a confirmacao automaticamente.
7. O cliente recebe a confirmacao e, depois, o lembrete antes do horario.

## Escopo do MVP

- Autenticacao por email e senha
- Cadastro e gestao de barbearias, barbeiros, servicos e clientes
- Agenda com verificacao real de disponibilidade
- Fluxo de agendamento para o cliente final
- Notificacoes via WhatsApp usando Evolution API
- Lembrete automatico antes do horario marcado
- Dashboard com visao operacional da agenda
- Relatorios basicos de desempenho

## Ja entregue

- Base do frontend em Vite + React + TypeScript
- Interface em TailwindCSS v4 + shadcn/ui v4
- Dark mode como padrao visual
- Tema visual em azul/indigo com identidade propria
- Validacao de horarios disponiveis por barbeiro
- Fluxo de booking com selecao de slots disponiveis
- Dialog de horarios por barbeiro na area administrativa
- Edge functions para notificacao e lembrete
- Agenda semanal visual na dashboard
- Pagina de relatorios
- Dashboard com prioridade operacional, proximos atendimentos e carga por barbeiro
- Booking com resumo fixo, mascara de WhatsApp e confirmacao mais clara
- Tela de detalhes de agendamento com acoes rapidas
- CRUDs de barbeiros, servicos e clientes com busca, filtro e melhor densidade visual
- Login, WhatsApp e relatorios alinhados ao mesmo padrao visual do produto

## Fora de escopo por enquanto

- Integracao com Google Calendar
- Multishop avancado
- Automacoes complexas de marketing
- BI profundo ou analises preditivas
- App mobile nativo

## Roadmap

### Curto prazo

- Consolidar o fluxo de CRUDs com uma experiencia mais polida
- Revisar consistencia de estados vazios, loading e feedback visual
- Fechar pequenos ajustes de UX no booking e nos dialogs administrativos

### Medio prazo

- Evoluir relatorios com indicadores mais uteis para gestao
- Melhorar notificacoes e mensagens de confirmacao
- Refinar permissoes e estados de autenticacao

### Longo prazo

- Integrar Google Calendar
- Expandir automacoes ligadas a retencao e recorrencia
- Evoluir o produto para multiplas unidades, se necessario

## Decisoes tecnicas

| Area | Escolha | Motivo |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript | Boa velocidade de desenvolvimento e tipagem forte |
| UI | TailwindCSS v4 + shadcn/ui v4 | Consistencia visual e composicao flexivel |
| Backend | Supabase | Auth, banco e storage no mesmo ecossistema |
| Notificacoes | Evolution API | Comunicacao via WhatsApp sem depender de fluxos manuais |
| Deploy | Vercel | Simplicidade de deploy e manutencao |
| Timezone | UTC-3 na exibicao | Alinhado com a operacao das barbearias no Brasil |

## Modelagem principal

```sql
-- Barbearias
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barbeiros
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Horarios de trabalho
CREATE TABLE barber_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE(barber_id, day_of_week)
);

-- Servicos
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relacao barbeiro-servico
CREATE TABLE barber_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(barber_id, service_id)
);

-- Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agendamentos
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuracao WhatsApp
CREATE TABLE whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tokens Google Calendar
CREATE TABLE google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Regras de operacao

- Horarios sempre sao exibidos em UTC-3
- O cliente nunca deve ver horarios ocupados como opcoes validas
- Agendamentos precisam ser confirmados com dupla verificacao de conflito
- Notificacoes devem ser disparadas no servidor, nao no navegador
- Componentes de interface devem seguir a identidade visual do AppBarber

## Observacoes de produto

O AppBarber nao precisa parecer um sistema generico de agenda. Ele precisa parecer confiavel, rapido e claro para quem vive a rotina da barbearia. A experiencia deve transmitir controle da operacao, previsibilidade nos horarios e reducao de mensagens manuais.
