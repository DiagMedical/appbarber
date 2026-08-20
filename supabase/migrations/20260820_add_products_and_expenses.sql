-- Criação da tabela de Produtos
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

-- Criação da tabela de Produtos Vendidos nos Agendamentos (Checkout)
CREATE TABLE IF NOT EXISTS appointment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criação da tabela de Despesas da Barbearia
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'outros',
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_shop ON products (shop_id);
CREATE INDEX IF NOT EXISTS idx_appointment_products_appt ON appointment_products (appointment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON expenses (shop_id, expense_date);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies Products
CREATE POLICY "Permitir leitura de produtos para todos"
  ON products FOR SELECT USING (true);

CREATE POLICY "Permitir gerenciamento de produtos para autenticados"
  ON products FOR ALL USING (auth.role() = 'authenticated');

-- Policies Appointment Products
CREATE POLICY "Permitir leitura de itens de agendamento"
  ON appointment_products FOR SELECT USING (true);

CREATE POLICY "Permitir gerenciamento de itens para autenticados"
  ON appointment_products FOR ALL USING (auth.role() = 'authenticated');

-- Policies Expenses
CREATE POLICY "Permitir gerenciamento de despesas para autenticados"
  ON expenses FOR ALL USING (auth.role() = 'authenticated');
