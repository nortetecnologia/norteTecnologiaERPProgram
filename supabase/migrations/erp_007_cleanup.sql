-- Migration: erp_007_cleanup
-- Remove colunas duplicadas adicionadas pela erp_003_pdv que nunca foram usadas pelo código.
-- Adiciona updated_at em erp_pdv_sales para consistência com as demais tabelas ERP.

-- 1. Remover stock_quantity de products (o código usa 'stock'; esta coluna nunca foi lida/escrita)
ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity;

-- 2. Remover active de products (o código usa 'is_active'; esta coluna nunca foi lida/escrita)
ALTER TABLE products DROP COLUMN IF EXISTS active;

-- 3. Adicionar updated_at em erp_pdv_sales (ausente enquanto todas as outras tabelas ERP têm)
ALTER TABLE erp_pdv_sales
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. Trigger updated_at para erp_pdv_sales
--    A função update_updated_at_column já existe (criada em erp_001_customers.sql)
CREATE TRIGGER erp_pdv_sales_updated_at
  BEFORE UPDATE ON erp_pdv_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
