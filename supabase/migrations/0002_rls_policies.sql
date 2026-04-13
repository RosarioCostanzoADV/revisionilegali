-- =========================================================================
-- Revisioni Legali — Row Level Security policies
--
-- Design notes:
-- * We use a SECURITY DEFINER helper function to fetch the current user's
--   role and tenant_id. This avoids recursive RLS when policies on
--   user_profiles need to read user_profiles.
-- * plans are world-readable (only active rows) for all authenticated users.
-- * tenants / user_profiles are strictly tenant-scoped, except for
--   super_admin which has full access.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Helper: current_user_role + current_user_tenant
-- SECURITY DEFINER bypasses RLS on user_profiles to avoid recursion.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_tenant()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin' FROM public.user_profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- =========================================================================
-- plans
-- =========================================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_select_active ON public.plans;
CREATE POLICY plans_select_active ON public.plans
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE OR public.is_super_admin());

DROP POLICY IF EXISTS plans_write_super_admin ON public.plans;
CREATE POLICY plans_write_super_admin ON public.plans
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- =========================================================================
-- tenants
-- =========================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- SELECT: own tenant, or all if super admin
DROP POLICY IF EXISTS tenants_select_own_or_admin ON public.tenants;
CREATE POLICY tenants_select_own_or_admin ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR id = public.current_user_tenant()
  );

-- INSERT: super admin only
DROP POLICY IF EXISTS tenants_insert_super_admin ON public.tenants;
CREATE POLICY tenants_insert_super_admin ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- UPDATE: super admin unrestricted, tenant_owner can update its own tenant
-- BUT tenant_owner cannot change status / plan_id / plan_expires_at.
--
-- RLS enforces row eligibility; a second layer (API route) or trigger will
-- enforce field-level immutability for those three columns when the caller
-- is not super_admin. We install that trigger below.
DROP POLICY IF EXISTS tenants_update_scope ON public.tenants;
CREATE POLICY tenants_update_scope ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      id = public.current_user_tenant()
      AND public.current_user_role() = 'tenant_owner'
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      id = public.current_user_tenant()
      AND public.current_user_role() = 'tenant_owner'
    )
  );

-- Field-level guard: non-super-admins cannot change status/plan/expiry
CREATE OR REPLACE FUNCTION public.tenants_guard_protected_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify tenant status';
  END IF;
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
    RAISE EXCEPTION 'Cannot modify tenant plan';
  END IF;
  IF NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
    RAISE EXCEPTION 'Cannot modify plan expiration';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_guard_protected_fields ON public.tenants;
CREATE TRIGGER tenants_guard_protected_fields
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tenants_guard_protected_fields();

-- DELETE: super admin only
DROP POLICY IF EXISTS tenants_delete_super_admin ON public.tenants;
CREATE POLICY tenants_delete_super_admin ON public.tenants
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- =========================================================================
-- user_profiles
-- =========================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: same tenant, or super admin
DROP POLICY IF EXISTS user_profiles_select_scope ON public.user_profiles;
CREATE POLICY user_profiles_select_scope ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR tenant_id = public.current_user_tenant()
  );

-- INSERT: only super admin directly (regular signups go through service_role
-- via the auth trigger or admin flow). Tenant owners will create users via
-- a Route Handler using the service_role client.
DROP POLICY IF EXISTS user_profiles_insert_super_admin ON public.user_profiles;
CREATE POLICY user_profiles_insert_super_admin ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- UPDATE: user can only update own row; super admin full
DROP POLICY IF EXISTS user_profiles_update_self ON public.user_profiles;
CREATE POLICY user_profiles_update_self ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin() OR id = auth.uid()
  )
  WITH CHECK (
    public.is_super_admin() OR id = auth.uid()
  );

-- Field-level guard: a user cannot change their own role or tenant_id
CREATE OR REPLACE FUNCTION public.user_profiles_guard_protected_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify own role';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Cannot modify own tenant';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Cannot modify own active state';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_guard_protected_fields ON public.user_profiles;
CREATE TRIGGER user_profiles_guard_protected_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.user_profiles_guard_protected_fields();

-- DELETE: super admin only
DROP POLICY IF EXISTS user_profiles_delete_super_admin ON public.user_profiles;
CREATE POLICY user_profiles_delete_super_admin ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());
