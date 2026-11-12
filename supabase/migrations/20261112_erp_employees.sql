-- Migration: Funcionários e Cargos
-- Tabelas: erp_roles, erp_employees, erp_employee_roles

-- Cargos
CREATE TABLE IF NOT EXISTS public.erp_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT erp_roles_pkey PRIMARY KEY (id),
  CONSTRAINT erp_roles_name_key UNIQUE (name)
);

-- Funcionários
CREATE TABLE IF NOT EXISTS public.erp_employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT erp_employees_pkey PRIMARY KEY (id)
);

-- Relação N:N funcionário ↔ cargo
CREATE TABLE IF NOT EXISTS public.erp_employee_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT erp_employee_roles_pkey PRIMARY KEY (id),
  CONSTRAINT erp_employee_roles_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.erp_employees(id) ON DELETE CASCADE,
  CONSTRAINT erp_employee_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.erp_roles(id) ON DELETE CASCADE,
  CONSTRAINT erp_employee_roles_unique UNIQUE (employee_id, role_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_erp_employee_roles_employee ON public.erp_employee_roles(employee_id);
CREATE INDEX IF NOT EXISTS idx_erp_employee_roles_role ON public.erp_employee_roles(role_id);
