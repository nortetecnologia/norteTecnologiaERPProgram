-- Migration: ERP Service Orders (Ordens de Serviço)

CREATE TABLE IF NOT EXISTS erp_service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number SERIAL UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES erp_customers(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting'
    CHECK (status IN ('awaiting', 'in_progress', 'done', 'delivered', 'cancelled')),
  equipment TEXT,
  serial_number TEXT,
  labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  estimated_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES erp_service_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS erp_service_orders_customer_idx ON erp_service_orders (customer_id);
CREATE INDEX IF NOT EXISTS erp_service_orders_status_idx ON erp_service_orders (status);
CREATE INDEX IF NOT EXISTS erp_service_orders_created_at_idx ON erp_service_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS erp_service_order_items_so_idx ON erp_service_order_items (service_order_id);

-- RLS
ALTER TABLE erp_service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_service_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_service_orders_authenticated" ON erp_service_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "erp_service_order_items_authenticated" ON erp_service_order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER erp_service_orders_updated_at
  BEFORE UPDATE ON erp_service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Estoque: tabela de movimentações
CREATE TABLE IF NOT EXISTS erp_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS erp_stock_movements_product_idx ON erp_stock_movements (product_id);
CREATE INDEX IF NOT EXISTS erp_stock_movements_created_at_idx ON erp_stock_movements (created_at DESC);

ALTER TABLE erp_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_stock_movements_authenticated" ON erp_stock_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
