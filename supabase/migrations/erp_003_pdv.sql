-- Migration: ERP PDV (Ponto de Venda)

CREATE TABLE IF NOT EXISTS erp_pdv_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number SERIAL UNIQUE NOT NULL,
  customer_id UUID REFERENCES erp_customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_pdv_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES erp_pdv_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_pdv_sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES erp_pdv_sales(id) ON DELETE CASCADE,
  method TEXT NOT NULL
    CHECK (method IN ('dinheiro', 'pix', 'debito', 'credito_1x', 'credito_2x', 'credito_3x', 'credito_6x', 'credito_12x')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS erp_pdv_sales_created_at_idx ON erp_pdv_sales (created_at DESC);
CREATE INDEX IF NOT EXISTS erp_pdv_sales_customer_idx ON erp_pdv_sales (customer_id);
CREATE INDEX IF NOT EXISTS erp_pdv_sale_items_sale_idx ON erp_pdv_sale_items (sale_id);
CREATE INDEX IF NOT EXISTS erp_pdv_sale_payments_sale_idx ON erp_pdv_sale_payments (sale_id);

-- RLS
ALTER TABLE erp_pdv_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_pdv_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_pdv_sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_pdv_sales_authenticated" ON erp_pdv_sales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "erp_pdv_sale_items_authenticated" ON erp_pdv_sale_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "erp_pdv_sale_payments_authenticated" ON erp_pdv_sale_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Adicionar coluna stock_quantity à tabela products caso não exista
-- (pode já existir dependendo da versão do site)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
