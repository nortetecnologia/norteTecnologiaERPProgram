-- Migration: adiciona coluna phone_number em store_settings
-- Separa o número de telefone fixo/comercial do WhatsApp da empresa.
-- O phone_number é exibido na OS impressa e demais documentos.
-- O whatsapp_number continua sendo usado para links de contato wa.me.

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS phone_number TEXT;
