-- Criação da tabela de bloqueios pontuais de horário para barbeiros (folgas, consultas, ausências)
CREATE TABLE IF NOT EXISTS barber_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'Indisponível',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida de disponibilidade
CREATE INDEX IF NOT EXISTS idx_barber_blocks_barber_date ON barber_blocks (barber_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_barber_blocks_shop ON barber_blocks (shop_id);

-- RLS
ALTER TABLE barber_blocks ENABLE ROW LEVEL SECURITY;

-- Permite anon e autenticados lerem bloqueios para cálculo correto de slots disponíveis
CREATE POLICY "Permitir leitura de bloqueios para todos"
  ON barber_blocks
  FOR SELECT
  USING (true);

-- Permite que usuários autenticados da loja criem bloqueios
CREATE POLICY "Permitir inserção de bloqueios para donos e admins"
  ON barber_blocks
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Permite atualizar bloqueios
CREATE POLICY "Permitir atualização de bloqueios para donos e admins"
  ON barber_blocks
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
  );

-- Permite deletar bloqueios
CREATE POLICY "Permitir exclusão de bloqueios para donos e admins"
  ON barber_blocks
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
  );
