-- Migration: ERP Customers
-- Tabela de clientes do ERP (separada dos usuários do site)

CREATE TABLE IF NOT EXISTS erp_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para busca
CREATE INDEX IF NOT EXISTS erp_customers_name_idx ON erp_customers (name);
CREATE INDEX IF NOT EXISTS erp_customers_phone_idx ON erp_customers (phone);
CREATE INDEX IF NOT EXISTS erp_customers_cpf_cnpj_idx ON erp_customers (cpf_cnpj);

-- RLS
ALTER TABLE erp_customers ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados podem acessar (ERP é interno)
CREATE POLICY "erp_customers_authenticated" ON erp_customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER erp_customers_updated_at
  BEFORE UPDATE ON erp_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
