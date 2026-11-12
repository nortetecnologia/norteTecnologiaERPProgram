-- Migration: função atômica para baixa de estoque
-- Evita race condition do padrão read-then-write quando há vendas concorrentes.
-- Clamp em 0 (estoque não fica negativo), consistente com o PDV e o ajuste manual.

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_qty INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  UPDATE products
  SET stock = GREATEST(0, COALESCE(stock, 0) - p_qty),
      updated_at = NOW()
  WHERE id = p_product_id
  RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$;
