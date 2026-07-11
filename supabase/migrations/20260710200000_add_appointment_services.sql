-- Tabela de junção para multi-serviço por agendamento
CREATE TABLE IF NOT EXISTS appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(appointment_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment ON appointment_services(appointment_id);

ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;

-- Anon pode inserir (vindo do site público)
CREATE POLICY "appointment_services_anon_insert" ON appointment_services
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN shops s ON a.shop_id = s.id
      WHERE a.id = appointment_services.appointment_id
    )
  );

-- Dono da loja pode ver tudo
CREATE POLICY "appointment_services_shop_select" ON appointment_services
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_services.appointment_id
      AND (a.shop_id = (SELECT id FROM shops WHERE owner_user_id = auth.uid() LIMIT 1)
        OR public.is_admin())
    )
  );

-- Admin tem permissão total
CREATE POLICY "appointment_services_admin_all" ON appointment_services
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
