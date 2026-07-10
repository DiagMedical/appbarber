# AppBarber — Manual de Uso

Sistema de gestão para barbearias com agenda online, notificações WhatsApp e site público para agendamento.

---

## Sumário

1. [Acesso ao Sistema](#1-acesso-ao-sistema)
2. [Visão Geral da Interface](#2-visão-geral-da-interface)
3. [Dashboard](#3-dashboard)
4. [Barbeiros](#4-barbeiros)
5. [Serviços](#5-serviços)
6. [Clientes](#6-clientes)
7. [Agendamentos](#7-agendamentos)
8. [Relatórios](#8-relatórios)
9. [WhatsApp](#9-whatsapp)
10. [Site Público](#10-site-público)
11. [Configurações da Loja](#11-configurações-da-loja)
12. [Painel Admin](#12-painel-admin)
13. [Perfis de Usuário](#13-perfis-de-usuário)
14. [Site Público — Experiência do Cliente](#14-site-público--experiência-do-cliente)
15. [Solução de Problemas](#15-solução-de-problemas)

---

## 1. Acesso ao Sistema

### Login como Cliente (dono da barbearia)

1. Acesse `https://appbarber-rose.vercel.app`
2. No campo **"Nome da barbearia"**, digite o nome exato da sua barbearia
3. No campo **"Senha"**, digite a senha fornecida pelo administrador
4. Clique em **"Entrar"**

> ⚠️ Use o toggle no rodapé do card para alternar entre modo **Barbearia** (padrão) e **Admin** (login por email).

### Login como Administrador

1. Clique no link **"Admin? Login por email"** no rodapé do card de login
2. Digite seu email e senha do Supabase Auth
3. Clique em **"Entrar"**

---

## 2. Visão Geral da Interface

### Sidebar (Desktop)

A barra lateral esquerda exibe:

- **Logo** da AppBarber no topo
- **Menu de navegação** com as páginas disponíveis
- **Status do WhatsApp** (conectado/desconectado) no rodapé

### Mobile Header

No celular, a sidebar é substituída por um menu hambúrguer no topo.

### Itens do Menu por Perfil

| Item | Cliente | Admin (sem loja) | Admin (com loja) |
|---|---|---|---|
| Dashboard | ✅ | — | ✅ |
| Barbeiros | ✅ | — | ✅ |
| Serviços | ✅ | — | ✅ |
| Clientes | ✅ | — | ✅ |
| Agendamentos | ✅ | — | ✅ |
| Relatórios | ✅ | — | ✅ |
| WhatsApp | — | ✅ | ✅ |
| Admin | — | ✅ | ✅ |
| Configurações | — | — | ✅ |
| Site Público | — | — | ✅ |

---

## 3. Dashboard

### Indicadores de Atenção Imediata

Cards no topo mostram:

- **📅 Próximos** — agendamentos das próximas 2 horas
- **⏳ Pendentes** — agendamentos aguardando confirmação
- **✅ Concluídos** — total de hoje
- **❌ Cancelados** — total de hoje

### Próximos Atendimentos

Lista dos próximos agendamentos do dia com horário, cliente, barbeiro e serviço.

### Carga por Barbeiro

Barras de progresso mostrando quantos agendamentos cada barbeiro tem hoje.

### Agenda Semanal

Grade visual com:

- **Colunas** = dias da semana (seg a sáb)
- **Linhas** = horários de 08h às 20h (intervalos de 30min)
- **Blocos coloridos** = agendamentos (verde = confirmado, amarelo = pendente, azul = concluído)
- **Seletor de barbeiro** — filtra por barbeiro ou "Todos"
- **Navegação semanal** — botões << anterior / próxima >>

---

## 4. Barbeiros

### Listagem

- Cards com foto, nome, telefone e status (ativo/inativo)
- Métricas: total de barbeiros, ativos e inativos
- Campo de busca por nome

### Cadastro / Edição

Clique em **"Novo Barbeiro"** ou no ícone de edição no card:

- **Nome** (obrigatório)
- **Telefone WhatsApp** (opcional) — usado para notificar o barbeiro quando um cliente agenda
- **Bio** (opcional) — aparece no site público
- **Foto** (opcional) — upload de imagem

### Horários de Atendimento

No card do barbeiro, clique em **"Horários"** (ícone relógio):

1. Selecione o dia da semana (seg a sáb)
2. Defina horário de **início** e **fim**
3. Clique em **"Salvar"** para salvar todos os dias configurados

> Os horários são usados para gerar slots disponíveis no agendamento (admin e site público).

---

## 5. Serviços

### Listagem

- Cards com nome, duração, preço, buffer e status
- Campo de busca
- Métricas: total, ativos, inativos

### Cadastro / Edição

- **Nome** do serviço
- **Descrição** (opcional)
- **Duração** em minutos
- **Preço** em R$
- **Buffer** (minutos) — intervalo de folga após o serviço antes do próximo agendamento
- **Ativo** — se desativado, não aparece no site público

---

## 6. Clientes

### Listagem

- Cards com nome, WhatsApp, email, notas
- Campo de busca

### Cadastro / Edição

- **Nome**
- **WhatsApp** (com máscara)
- **Email** (opcional)
- **Notas** (opcional)

---

## 7. Agendamentos

### Listagem

Cada item mostra horário, cliente, barbeiro e status com cor indicativa.

### Detalhe + Ações Rápidas

Clique em um agendamento para abrir o painel de detalhes com ações:

| Botão | O que faz |
|---|---|
| ✅ **Confirmar** | Muda status para `confirmed` |
| ✔️ **Concluir** | Muda status para `completed` |
| ❌ **Cancelar** | Muda status para `cancelled` |
| 🗑️ **Excluir** | Remove o registro |

> Ao confirmar ou alterar o status, o sistema dispara notificação WhatsApp automática para o cliente.

### Novo Agendamento

Clique em **"Novo Agendamento"**:

1. Selecione o **barbeiro**
2. Selecione o **serviço**
3. Escolha a **data**
4. Escolha o **horário** entre os slots disponíveis (grade de botões)
5. Selecione o **cliente** (ou crie um novo)
6. Clique em **"Criar"**

> O sistema valida duplamente a disponibilidade antes de salvar.

---

## 8. Relatórios

### Período

Seletor no topo: **Mês**, **3 Meses** ou **Ano**.

### Cards de Resumo

| Card | Descrição |
|---|---|
| 📋 Total | Agendamentos no período |
| ✅ Concluídos | Total de concluídos |
| 💰 Faturamento | Soma dos preços dos serviços concluídos |
| 🎯 Ticket Médio | Média de valor por agendamento |

### Gráficos

- **Barbeiros** — barras com total de atendimentos por barbeiro + porcentagem
- **Faturamento Mensal** — linha do tempo do faturamento mês a mês

---

## 9. WhatsApp

### Configuração da Evolution API

1. **URL do servidor** — URL da sua instância Evolution API (ex: `https://evo.seudominio.com`)
2. **Nome da instância** — nome da instância criada na Evolution API
3. **API Key** — chave de API da instância
4. **Intervalo de re-engajamento (dias)** — dias sem agendar para receber mensagem de reativação (padrão: 22)

### Ações

- **Testar Conexão** — verifica se a instância WhatsApp está conectada
- **Salvar** — persiste as configurações
- **Status** — indicador visual de conectado/desconectado na sidebar

### Site Público (seção)

| Campo | Descrição |
|---|---|
| 📸 **Foto do Herói** | Imagem de fundo do topo do site público |
| 🖼️ **Galeria de Fotos** | Fotos do ambiente (grid "Nosso Ambiente") |
| 🎯 **Instagram** | Link do perfil (ex: `@studiolima`) |
| 🕐 **Horários de Funcionamento** | Dias e horários exibidos no site |
| 🔗 **Copiar Link** | Copia a URL do site público (`/public/seu-slug`)

> **Admin sem loja**: use o dropdown no topo para selecionar qual loja configurar.

---

## 10. Site Público

Acessível em `https://appbarber-rose.vercel.app/public/{slug}` (ex: `/public/studio-lima`).

### Seções

1. **Hero** — foto de fundo + nome da barbearia + botão "Agendar Horário"
2. **Serviços** — cards com nome, descrição, duração e preço
3. **Barbeiros** — fotos, nomes e bios
4. **Agendamento** — wizard em 4 etapas (ver seção 14)
5. **Depoimentos** — depoimentos fixos
6. **Galeria "Nosso Ambiente"** — fotos do espaço
7. **Localização + Horários** — endereço, telefone, Instagram e horários de funcionamento

### Gerenciamento

No painel admin → **WhatsApp → Site Público**:

- Upload da foto do herói
- Upload de fotos da galeria
- Instagram
- Horários de funcionamento

---

## 11. Configurações da Loja

Disponível em **Configurações** (sidebar) para admin com loja.

| Campo | Descrição |
|---|---|
| Nome da Barbearia | Nome exibido no sistema |
| Telefone | Telefone de contato |
| Endereço | Endereço completo |
| Logo | Upload da logo (aparece no site público) |

---

## 12. Painel Admin

Acesso exclusivo do administrador (`welloliver@gmail.com`) em `/admin`.

### Funcionalidades

- **Lista de todas as lojas** cadastradas no sistema
- **Nova Barbearia** — cria nova conta:
  1. Digite o **nome da barbearia**
  2. Digite a **senha de acesso**
  3. O sistema cria o usuário no Supabase Auth e a loja automaticamente
- **Editar** — altera nome da loja
- **Excluir** — remove a loja (com confirmação)
- **Abrir site público** — atalho para o site da loja

> ⚠️ Ao criar uma barbearia, o sistema gera um email interno (`shop-nome-xxxx@appbarber.app`) para autenticação. O dono da barbearia não precisa saber esse email — ele faz login com o **nome da barbearia**.

---

## 13. Perfis de Usuário

### Administrador (`welloliver@gmail.com`)

- **Não tem loja própria** — vende o SaaS para barbearias
- Sidebar: Admin, WhatsApp
- Pode ver e gerenciar todas as lojas
- Configura WhatsApp de qualquer loha via dropdown

### Cliente (dono da barbearia)

- **Tem exatamente 1 loja** vinculada ao seu usuário
- Sidebar: Dashboard, Barbeiros, Serviços, Clientes, Agendamentos, Relatórios
- Gerencia apenas os dados da sua própria barbearia

### Público (sem login)

- Acessa o site público em `/public/{slug}`
- Agenda horários sem necessidade de cadastro

---

## 14. Site Público — Experiência do Cliente

### Wizard de Agendamento (4 Etapas)

**Passo 1 — Serviços**
- Escolha um ou mais serviços
- Busca por nome

**Passo 2 — Barbeiros**
- Escolha o barbeiro desejado
- Veja foto, nome e bio

**Passo 3 — Data e Horário**
- Calendário horizontal com 14 dias disponíveis
- Slots organizados por turno: **Manhã** / **Tarde** / **Noite**

**Passo 4 — Seus Dados**
- Nome (obrigatório)
- WhatsApp (com máscara)
- Notas (opcional)

### Confirmação

- Resumo completo do agendamento
- Botão **"Confirmar Agendamento"**
- Tela de sucesso com opção de **"Novo Agendamento"** ou **"Voltar ao início"**

### Cancelamento

Na mensagem de WhatsApp recebida, o cliente pode clicar no link para cancelar o agendamento automaticamente (sem precisar ligar).

---

## 15. Solução de Problemas

| Problema | Causa | Solução |
|---|---|---|
| Login falha com "Barbearia não encontrada" | Nome da barbearia não existe | Verifique se o nome foi cadastrado pelo admin |
| Erro ao criar agendamento | Conflito de horário | Escolha outro horário disponível |
| Foto de herói não aparece no site | Upload não foi processado | Faça upload novamente e salve |
| WhatsApp não envia mensagem | Evolution API desconectada | Teste a conexão nas configurações |
| Admin não consegue salvar configs | Políticas RLS desatualizadas | Solicite que as migrations sejam aplicadas |
| Site público não carrega | Slug inválido | Verifique se a loja tem `public_slug` |


> **Suporte:** Em caso de problemas, contate o administrador em `welloliver@gmail.com`
