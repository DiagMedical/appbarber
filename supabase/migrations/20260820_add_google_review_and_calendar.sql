-- Adiciona campo de link do Google Reviews na tabela shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_review_url TEXT;

-- Adiciona campos na tabela google_calendar_tokens
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona google_event_id na tabela appointments para rastrear eventos sincronizados
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir gerenciamento de tokens para autenticados"
  ON google_calendar_tokens FOR ALL USING (auth.role() = 'authenticated');
