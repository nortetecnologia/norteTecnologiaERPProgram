-- Migration: Add os_type to erp_service_orders
-- Distinguishes between technical service orders and product delivery orders

ALTER TABLE erp_service_orders
  ADD COLUMN IF NOT EXISTS os_type TEXT NOT NULL DEFAULT 'service'
    CHECK (os_type IN ('service', 'delivery'));

COMMENT ON COLUMN erp_service_orders.os_type IS
  'service = ordem de serviço técnico; delivery = entrega de produto';
