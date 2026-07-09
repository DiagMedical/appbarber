# AppBarber - Proxima Sessao

## Objetivo
Validar a multitenancy real e garantir que a loja ativa, as permissoes e os dados estejam consistentes antes de seguir para os formulrios restantes.

## Ordem de Execucao

### 1) Confirmar a loja ativa do usuario logado
- Entrar com um usuario real.
- Verificar se a loja carregada em `AuthProvider` e `src/lib/shop.ts` pertence ao usuario.
- Se existir uma loja antiga sem dono, ela deve ser assumida pelo primeiro usuario logado.
- Confirmar que `shops.owner_user_id` ficou preenchido com o `auth.uid()` correto.

### 2) Validar isolamento por loja
- Abrir `Barbers`, `Services`, `Clients`, `Appointments` e `WhatsAppSettings`.
- Confirmar que cada tela mostra somente registros da loja ativa.
- Conferir que nao aparecem dados de outra loja.
- Confirmar que criar, editar e excluir continuam funcionando com `shop_id` correto.

### 3) Testar fluxo ponta a ponta
- Criar um cliente.
- Criar um barbeiro.
- Criar um servico.
- Criar um agendamento.
- Recarregar a pagina e verificar se os dados continuam associados a mesma loja.
- Confirmar que confirmar, concluir e cancelar continuam funcionando.

### 4) Validar o caminho publico
- Abrir o fluxo de booking sem usuario logado.
- Confirmar que ele continua usando a loja publica esperada.
- Verificar se slots, cliente e agendamento publico continuam gravando com o `shop_id` correto.

### 5) Fechar critério de pronto
- Nao existe cruzamento entre lojas.
- A loja ativa fica coerente apos login, refresh e navegação.
- O build continua passando.
- So depois disso seguir para os formularios restantes com `React Hook Form + Zod`.

## Regra de Sequencia
Nao avancar para a proxima etapa tecnica antes de fechar esta verificacao.
Se algo falhar, corrigir primeiro `resolveActiveShop`, RLS ou os filtros por `shop_id`.
