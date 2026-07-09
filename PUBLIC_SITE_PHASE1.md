# AppBarber - Fase 1: Site Publico no VPS + SaaS de Gestao

## Objetivo
Entregar um site publico para cada barbearia no seu VPS, acessado por subdominio, enquanto o SaaS continua sendo o painel privado de operacao.

O cliente deve entrar no site, ver a barbearia, servicos, barbeiros e fazer o agendamento ali mesmo. O barbeiro usa o SaaS para gerenciar agenda, clientes, servicos, WhatsApp e relatorios.

## Direcao
- Site publico e SaaS devem compartilhar a mesma base, mas com experiencias separadas.
- A primeira versao deve usar **subdominio** por barbearia.
- O site publico deve ser a porta de entrada; o painel interno fica isolado.

## Ordem de Implementacao

### 1) Base de dados
- Adicionar um identificador publico da barbearia em `shops`.
- Garantir valor automatico para novos cadastros.
- Fazer backfill dos registros existentes.
- Manter a ligacao entre `public_slug` e `shop_id`.

### 2) Resolucao do host
- Detectar se a navegacao veio do host publico ou do SaaS privado.
- No host publico, carregar a loja pelo subdominio.
- No host privado, manter login e dashboard como estao.

### 3) Site publico
- Criar a vitrine da barbearia com:
  - nome e identidade
  - endereco e contato
  - servicos
  - barbeiros
  - CTA de agendamento
- O layout deve ser simples, premium e focado em conversao.

### 4) Agendamento publico
- Reaproveitar disponibilidade, criacao de cliente e criacao de agendamento.
- Validar o horario novamente antes de salvar.
- Disparar confirmacao via WhatsApp quando configurado.

### 5) Painel do barbeiro
- Exibir o link publico da barbearia no SaaS.
- Deixar claro qual e o endereco que o barbeiro deve divulgar.
- Manter o painel interno separado do fluxo publico.

## Arquivos que provavelmente vao mudar
- `src/App.tsx`
- `src/lib/site.ts`
- `src/lib/public-site.ts`
- `src/pages/PublicSite.tsx`
- `src/lib/shop.ts`
- `src/types/database.ts`
- `supabase/migrations/20260708194000_multitenancy_rls.sql`

## Teste
- Abrir um subdominio valido e confirmar que ele carrega a barbearia correta.
- Verificar se a vitrine mostra apenas dados daquela loja.
- Fazer um agendamento pelo site publico e confirmar:
  - `shop_id` correto
  - cliente certo
  - horario disponivel
  - WhatsApp funcionando
- Confirmar que o SaaS privado continua separado.
- Testar um subdominio invalido e confirmar resposta segura.

## Assumptions
- A hospedagem da fase 1 vai ficar no seu VPS.
- O acesso publico vai usar subdominio, por exemplo `barbearia.seudominio.com`.
- O SaaS privado vai seguir separado, por exemplo `app.seudominio.com`.
- O mesmo backend Supabase continua servindo os dois lados.
- O cadastro inicial da barbearia pode ficar simples, com os campos que ja existem mais o identificador publico.

## Observacao para o proximo agente
Se ja existirem arquivos parciais desta fase no workspace, preferir completar e conectar o fluxo antes de criar outra estrutura paralela. A meta e terminar um caminho unico e claro, nao abrir duas implementacoes concorrentes.
