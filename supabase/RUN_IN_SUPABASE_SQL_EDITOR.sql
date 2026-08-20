-- ==============================================================================
-- 🚀 APPBARBER — SCRIPT UNIFICADO DE ATUALIZAÇÃO DO BANCO (SUPABASE)
-- Execute este script completo no Supabase Dashboard > SQL Editor > Run
-- ==============================================================================

-- 1. COMISSÕES E FECHAMENTO DE PAGAMENTOS
ALTER TABLE barbers 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 50.00;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'cash', 'other')),
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. BLOQUEIOS DE HORÁRIOS & FOLGAS DE BARBEIROS
CREATE TABLE IF NOT EXISTS barber_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'Indisponível',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barber_blocks_barber_date ON barber_blocks (barber_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_barber_blocks_shop ON barber_blocks (shop_id);

ALTER TABLE barber_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'barber_blocks' AND policyname = 'Permitir leitura de bloqueios para todos') THEN
    CREATE POLICY "Permitir leitura de bloqueios para todos" ON barber_blocks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'barber_blocks' AND policyname = 'Permitir gerenciamento de bloqueios para autenticados') THEN
    CREATE POLICY "Permitir gerenciamento de bloqueios para autenticados" ON barber_blocks FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 3. PRODUTOS BALCÃO, CHECKOUT E GESTÃO DE DESPESAS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'outros',
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_shop ON products (shop_id);
CREATE INDEX IF NOT EXISTS idx_appointment_products_appt ON appointment_products (appointment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON expenses (shop_id, expense_date);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Permitir leitura de produtos para todos') THEN
    CREATE POLICY "Permitir leitura de produtos para todos" ON products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Permitir gerenciamento de produtos para autenticados') THEN
    CREATE POLICY "Permitir gerenciamento de produtos para autenticados" ON products FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointment_products' AND policyname = 'Permitir leitura de itens de agendamento') THEN
    CREATE POLICY "Permitir leitura de itens de agendamento" ON appointment_products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointment_products' AND policyname = 'Permitir gerenciamento de itens para autenticados') THEN
    CREATE POLICY "Permitir gerenciamento de itens para autenticados" ON appointment_products FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Permitir gerenciamento de despesas para autenticados') THEN
    CREATE POLICY "Permitir gerenciamento de despesas para autenticados" ON expenses FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. GOOGLE REVIEWS & GOOGLE CALENDAR
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_review_url TEXT;

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

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id TEXT;

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_calendar_tokens' AND policyname = 'Permitir gerenciamento de tokens para autenticados') THEN
    CREATE POLICY "Permitir gerenciamento de tokens para autenticados" ON google_calendar_tokens FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 5. RECARREGAR O SCHEMA CACHE DO POSTGREST
NOTIFY pgrst, 'reload schema';
