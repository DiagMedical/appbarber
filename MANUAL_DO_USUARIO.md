# 💈 Manual do Usuário — AppBarber

Guia prático e completo para proprietários, recepcionistas e barbeiros utilizarem o sistema no dia a dia da barbearia.

---

## 📑 Sumário Rápido

1. [Como Acessar o Sistema (Login)](#1-como-acessar-o-sistema-login)
2. [Dashboard (Agenda do Dia & Semanal)](#2-dashboard-agenda-do-dia--semanal)
3. [Barbeiros, Comissões e Bloqueio de Folgas](#3-barbeiros-comissões-e-bloqueio-de-folgas)
4. [Serviços & Combos](#4-serviços--combos)
5. [Produtos Balcão & Estoque (Pomadas, Bebidas)](#5-produtos-balcão--estoque)
6. [Agendamentos & Conclusão de Atendimento (Caixa)](#6-agendamentos--conclusão-de-atendimento-caixa)
7. [Site Público de Agendamento (Link para os Clientes)](#7-site-público-de-agendamento)
8. [WhatsApp Automático & Avaliações Google](#8-whatsapp-automático--avaliações-google)
9. [Relatórios Financeiros, Despesas & Lucro Real](#9-relatórios-financeiros-despesas--lucro-real)
10. [Guia Rápido de Bolso para o Barbeiro](#10-guia-rápido-de-bolso-para-o-barbeiro)

---

## 1. Como Acessar o Sistema (Login)

Existem duas formas simples de entrar no painel:

1. **Acesso da Barbearia (Padrão para Barbeiros e Donos):**
   - Acesse o link do sistema (ex: `https://appbarber-rose.vercel.app/login`).
   - No campo **Nome da Barbearia**, digite o nome exato cadastrado (ex: `Studio Lima`).
   - Digite sua **Senha de Acesso**.
   - Clique em **Entrar**.

2. **Acesso do Administrador Global:**
   - No rodapé da tela de login, clique em *"Sou o administrador do sistema"*.
   - Entre com seu email e senha de administrador para gerenciar todas as lojas.

---

## 2. Dashboard (Agenda do Dia & Semanal)

A Dashboard é a central de comando da barbearia.

* **Cards de Atenção Imediata:** Mostra atendimentos nas próximas 2 horas, agendamentos pendentes, concluídos e faturamento do mês.
* **Próximos Atendimentos:** Lista sequencial de clientes com nome, serviço, horário, barbeiro e telefone com link direto para chamar no WhatsApp.
* **Agenda Semanal (Grade Horária):**
  - Visualize a semana inteira em colunas (08h às 20h).
  - Filtre por **"Todos os Barbeiros"** ou selecione um profissional específico.
  - Navegue pelas semanas usando as setas `<` e `>`.
  - Agendamentos aparecem coloridos por status:
    - 🔵 **Índigo:** Confirmado
    - 🟡 **Âmbar:** Pendente
    - 🟢 **Verde:** Concluído
    - 🔒 **Cinza:** Horário Bloqueado / Folga do Barbeiro

---

## 3. Barbeiros, Comissões e Bloqueio de Folgas

Acesse o menu **Barbeiros** para gerenciar a equipe:

### A. Cadastrar ou Editar um Barbeiro
- Clique em **"+ Novo Barbeiro"** ou no ícone de lápis ✏️.
- Preencha:
  - **Nome** do profissional.
  - **WhatsApp** (com DDD, ex: `5511999999999`).
  - **Comissão Padrão (%)**: Percentual de repasse que ele recebe sobre os serviços (ex: `50%`).
  - **Foto de Perfil** e **Bio** (aparecerão no site público para os clientes).

### B. Definir Dias e Horários de Trabalho Fixos
- No card do barbeiro, clique no ícone de relógio 🕒 (**Horários Semanais**).
- Marque os dias da semana em que ele atende (ex: Terça a Sábado) e ajuste o horário de entrada e saída (ex: `09:00` às `19:00`).

### C. Bloquear Horário / Registrar Folga Pontual
*Se o barbeiro precisar sair 2 horas mais cedo para o médico ou folgar em um dia específico:*
1. No card do barbeiro, clique no ícone **Bloqueios & Folgas** 🚫 (`CalendarOff`).
2. Escolha a **Data**, o **Horário de Início** e o **Horário de Término**.
3. Digite o **Motivo** (ex: *"Consulta Médica"*, *"Folga"*).
4. Clique em **"Adicionar Bloqueio"**.
5. *Pronto! O sistema bloqueia esses horários automaticamente no site público, impedindo que clientes agendem nessa faixa.*

---

## 4. Serviços & Combos

Acesse o menu **Serviços** para cadastrar o cardápio de atendimentos:

- **Nome do Serviço:** Ex: `Corte Degradê`, `Barboterapia`, `Corte + Barba`.
- **Preço (R$):** Valor cobrado do cliente.
- **Duração (minutos):** Tempo de atendimento (ex: 30 min, 45 min, 60 min).
- **Tempo de Intervalo / Buffer:** Minutos extras de respiro/limpeza antes do próximo cliente (ex: 5 min).
- **Marcar como Combo:** Destaca o serviço como pacote especial no site público.

---

## 5. Produtos Balcão & Estoque

Acesse o menu **Produtos** para cadastrar itens que a barbearia vende no balcão:

- **Itens:** Pomadas modeladoras, óleos para barba, shampoos, cervejas, energéticos, refrigerantes.
- **Preço de Venda:** Valor cobrado no caixa.
- **Preço de Custo (Opcional):** Para cálculo de lucro real.
- **Estoque:** Quantidade disponível. Quando restar $\le 3$ unidades, o sistema emite um alerta de **Estoque Baixo**.

---

## 6. Agendamentos & Conclusão de Atendimento (Caixa)

Acesse o menu **Agendamentos** para acompanhar todos os atendimentos e realizar o fechamento do caixa.

### Como Concluir um Atendimento (Checkout):
1. Quando o barbeiro terminar o corte, clique no botão **"Concluir"** ou abra os detalhes do agendamento.
2. Na janela de **Conclusão de Atendimento**:
   - **Produtos Consumidos (Opcional):** Se o cliente comprou uma pomada ou cerveja, clique no produto para adicioná-lo. O total é somado na hora e o estoque é debitado.
   - **Valor Total Cobrado:** Confira o valor final (Serviços + Produtos). Você pode ajustar manualmente se deu algum desconto.
   - **Forma de Pagamento:** Selecione como o cliente pagou (**Pix**, **Cartão de Crédito**, **Cartão de Débito**, **Dinheiro** ou **Outro**).
   - **Divisão de Comissão:** O sistema calcula na hora quanto vai para o barbeiro e quanto fica de lucro para a barbearia.
3. Clique em **"Confirmar e Finalizar Atendimento"**.
4. O cliente recebe uma mensagem no WhatsApp confirmando a conclusão com o convite para avaliar no Google.

---

## 7. Site Público de Agendamento

Cada barbearia tem um site exclusivo e moderno para os clientes agendarem sozinhos 24 horas por dia.

* **Seu link público:** `https://appbarber-rose.vercel.app/public/SEU-SLUG`
* **Como divulgar:** Coloque esse link na bio do Instagram, no status do WhatsApp e nas mensagens automáticas.
* **Como o cliente agenda:**
  1. Escolhe o serviço desejado.
  2. Escolhe o barbeiro de preferência.
  3. Escolhe a data e clica em um dos horários livres disponíveis.
  4. Digita o nome e WhatsApp e clica em Confirmar.
  5. O agendamento cai instantaneamente na Dashboard da barbearia e o cliente recebe a confirmação.

---

## 8. WhatsApp Automático & Avaliações Google

O sistema possui integrações inteligentes para economizar tempo:

1. **Lembretes Automáticos:** Notifica o cliente antes do horário para evitar faltas (*no-shows*).
2. **Link de Reagendamento:** O cliente pode reagendar ou cancelar pelo link seguro recebido no WhatsApp.
3. **Avaliações 5 Estrelas no Google:**
   - Acesse **Configurações** no menu lateral.
   - Cole o link do seu **Google Meu Negócio** no campo *"Link de Avaliação Google"*.
   - Ao concluir o corte, o WhatsApp envia automaticamente um convite para o cliente avaliar a barbearia com 5 estrelas no Google Maps, subindo sua barbearia para o topo da sua cidade!

---

## 9. Relatórios Financeiros, Despesas & Lucro Real

Acesse o menu **Relatórios** para ter visão total da saúde financeira:

* **Faturamento Bruto:** Soma total de todos os serviços prestados e produtos vendidos no período.
* **Comissões a Pagar:** Total a ser repassado para cada barbeiro.
* **Tabela de Fechamento por Barbeiro:** Mostra exatamente quanto cada profissional faturou e quanto deve receber de comissão.
* **Despesas da Barbearia:**
  - Clique em **"+ Nova Despesa"** para lançar contas pagas (Aluguel, Água/Luz, Compras de Insumos, Manutenção, Marketing).
* **Lucro Líquido Real:**
  $$\text{Lucro Real da Loja} = \text{Faturamento Bruto} - \text{Comissões Pagas} - \text{Despesas Lançadas}$$
* **Gráfico de Formas de Pagamento:** Veja quanto entrou via Pix, Cartão de Crédito, Débito e Dinheiro.

---

## 10. Guia Rápido de Bolso para o Barbeiro

> 💡 **Dica:** Copie e envie este trecho no WhatsApp da sua equipe de barbeiros:

```
💈 GUIA RÁPIDO DO BARBEIRO — APPBARBER

1. ACESSO:
- Entre no link do app, digite o nome da barbearia e a senha.

2. VER SUA AGENDA:
- Na Dashboard, veja a lista de clientes do dia e a agenda semanal.

3. PRECISOU FOLGAR OU SAIR MAIS CEDO?
- Vá em "Barbeiros" > Ícone "Bloqueios & Folgas" (🚫) > Escolha data e horário e salve. O site não deixará nenhum cliente agendar nesse horário.

4. AO TERMINAR UM CORTE:
- Vá em "Agendamentos", clique em "Concluir", adicione produtos se o cliente comprou (pomada/bebida), marque a forma de pagamento (Pix/Cartão/Dinheiro) e confirme.
- Sua comissão é calculada automaticamente na hora!

5. ENVIAR LINK PARA SEUS CLIENTES:
- Envie o link do site da barbearia para seus clientes agendarem direto com você pelo celular!
```
