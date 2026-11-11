-- Migration: erp_005_payment_methods
-- Cria tabela relacional de formas de pagamento compartilhada entre ERP e site.
-- Remove o CHECK constraint hardcoded de erp_pdv_sale_payments e substitui por FK.

-- 1. Criar tabela payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id        SERIAL  PRIMARY KEY,
  name      TEXT    NOT NULL UNIQUE,           -- chave de máquina: 'dinheiro', 'pix'
  label     TEXT    NOT NULL,                  -- rótulo exibido:   'Dinheiro', 'PIX'
  is_active BOOLEAN NOT NULL DEFAULT true,
  position  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: leitura pública (checkout do site sem autenticação)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select"
  ON payment_methods FOR SELECT USING (true);

-- 2. Seed — deve cobrir TODOS os valores já gravados em erp_pdv_sale_payments
INSERT INTO payment_methods (name, label, is_active, position) VALUES
  ('dinheiro',    'Dinheiro',         true, 0),
  ('pix',         'PIX',              true, 1),
  ('debito',      'Cartão de Débito', true, 2),
  ('credito_1x',  'Crédito 1x',       true, 3),
  ('credito_2x',  'Crédito 2x',       true, 4),
  ('credito_3x',  'Crédito 3x',       true, 5),
  ('credito_6x',  'Crédito 6x',       true, 6),
  ('credito_12x', 'Crédito 12x',      true, 7)
ON CONFLICT (name) DO NOTHING;

-- 3. Remover o CHECK constraint hardcoded de erp_pdv_sale_payments
--    O nome é gerado pelo Postgres; buscamos dinamicamente para evitar falha.
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT conname INTO v_constraint
  FROM   pg_constraint
  WHERE  conrelid = 'erp_pdv_sale_payments'::regclass
    AND  contype  = 'c'
    AND  pg_get_constraintdef(oid) LIKE '%method%'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE erp_pdv_sale_payments DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

-- 4. Adicionar FK relacional
--    ON UPDATE CASCADE: se o name mudar, as vendas acompanham.
--    ON DELETE RESTRICT: impede remover método com vendas gravadas.
ALTER TABLE erp_pdv_sale_payments
  ADD CONSTRAINT fk_sale_payment_method
  FOREIGN KEY (method) REFERENCES payment_methods(name)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
