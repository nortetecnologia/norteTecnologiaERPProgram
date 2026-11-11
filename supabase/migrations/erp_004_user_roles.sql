-- ERP User Roles
-- Only users listed here can access the ERP system.
-- To add the first admin, run after migration:
--   INSERT INTO erp_user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'seu@email.com';

CREATE TABLE IF NOT EXISTS erp_user_roles (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT    NOT NULL DEFAULT 'operador'
                     CHECK (role IN ('admin', 'operador')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE erp_user_roles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own role (used by middleware)
CREATE POLICY "erp_roles_read_own"
  ON erp_user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service_role (server actions / admin client) can write
CREATE POLICY "erp_roles_service_all"
  ON erp_user_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
