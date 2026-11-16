-- Migration: vincular funcionários a OS e Vendas PDV
-- Aplicar no Supabase SQL Editor

-- Emissor da OS (quem abriu a OS)
ALTER TABLE erp_service_orders
  ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES erp_employees(id) ON DELETE SET NULL;

-- Responsável pelo serviço (técnico que executou)
ALTER TABLE erp_service_orders
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES erp_employees(id) ON DELETE SET NULL;

-- Vendedor da venda PDV
ALTER TABLE erp_pdv_sales
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES erp_employees(id) ON DELETE SET NULL;

-- Prestador de serviço da venda PDV (quando a venda inclui serviço)
ALTER TABLE erp_pdv_sales
  ADD COLUMN IF NOT EXISTS service_provider_id UUID REFERENCES erp_employees(id) ON DELETE SET NULL;
