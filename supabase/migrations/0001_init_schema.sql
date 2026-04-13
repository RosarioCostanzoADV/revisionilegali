-- =========================================================================
-- Revisioni Legali — initial schema
-- Creates: plans, tenants, user_profiles
-- Adds: updated_at triggers, auth.user -> user_profiles bootstrap trigger
-- =========================================================================

-- Utility: generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- plans
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  max_assignments INT NOT NULL,
  max_users INT NOT NULL,
  storage_gb INT NOT NULL,
  ai_quota INT, -- NULL = unlimited
  vigilance_module BOOLEAN NOT NULL DEFAULT false,
  ai_drafts_module BOOLEAN NOT NULL DEFAULT false,
  advanced_import BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- tenants
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  referent_name TEXT,
  phone TEXT,
  vat_number TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Rome',
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'trial')),
  plan_id UUID REFERENCES public.plans(id),
  plan_expires_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tenants_set_updated_at ON public.tenants;
CREATE TRIGGER tenants_set_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS tenants_status_idx ON public.tenants(status);

-- =========================================================================
-- user_profiles
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'collaborator'
    CHECK (role IN ('super_admin', 'tenant_owner', 'revisor', 'collaborator', 'syndic')),
  full_name TEXT,
  phone TEXT,
  signature_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- super_admin must have NULL tenant, everyone else must have a tenant
  CONSTRAINT user_profiles_tenant_consistency CHECK (
    (role = 'super_admin' AND tenant_id IS NULL) OR
    (role <> 'super_admin' AND tenant_id IS NOT NULL)
  )
);

DROP TRIGGER IF EXISTS user_profiles_set_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS user_profiles_tenant_idx ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);

-- =========================================================================
-- Bootstrap: auto-create a stub user_profile when an auth user is created.
--
-- The real tenant_id / role / full_name are set by the admin-side flow
-- (service_role) via a second update right after createUser. Until then the
-- profile exists with is_active=false and no tenant, so the middleware will
-- bounce the user out.
--
-- NOTE: this uses app_metadata so admin flows can pre-seed values.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  -- Pull optional metadata passed at createUser time
  v_tenant_id := NULLIF(NEW.raw_app_meta_data ->> 'tenant_id', '')::UUID;
  v_role := COALESCE(NEW.raw_app_meta_data ->> 'role', 'collaborator');
  v_full_name := NEW.raw_user_meta_data ->> 'full_name';

  INSERT INTO public.user_profiles (id, tenant_id, role, full_name, is_active)
  VALUES (
    NEW.id,
    v_tenant_id,
    v_role,
    v_full_name,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
