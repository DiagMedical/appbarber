-- Adiciona taxa de comissão padrão para barbeiros (ex: 50.00%)
ALTER TABLE barbers 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 50.00;

-- Adiciona campos de pagamento e valor congelado de comissão aos agendamentos
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'cash', 'other')),
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
