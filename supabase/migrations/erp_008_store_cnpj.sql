-- Adiciona coluna cnpj na store_settings para exibição na OS e documentos impressos
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS cnpj TEXT;
