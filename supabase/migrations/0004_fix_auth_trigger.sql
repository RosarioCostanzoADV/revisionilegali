-- =========================================================================
-- Fix: make handle_new_auth_user more tolerant.
--
-- With the new Supabase SDK key format, app_metadata may not be merged
-- into raw_app_meta_data immediately. To avoid the CHECK constraint
-- (tenant_id IS NOT NULL for non-super_admin) failing during user creation,
-- we skip the profile insert when role != super_admin and tenant_id IS NULL.
-- The admin API flow will insert/upsert the profile explicitly after the
-- auth user is created.
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
  v_tenant_id := NULLIF(NEW.raw_app_meta_data ->> 'tenant_id', '')::UUID;
  v_role      := COALESCE(NULLIF(NEW.raw_app_meta_data ->> 'role', ''), 'collaborator');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_app_meta_data  ->> 'full_name'
  );

  -- Skip automatic profile creation for non-super_admin users without a tenant.
  -- The admin API will upsert the profile right after createUser() succeeds.
  IF v_role <> 'super_admin' AND v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_profiles (id, tenant_id, role, full_name, is_active)
  VALUES (NEW.id, v_tenant_id, v_role, v_full_name, TRUE)
  ON CONFLICT (id) DO UPDATE
    SET tenant_id  = EXCLUDED.tenant_id,
        role       = EXCLUDED.role,
        full_name  = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
        is_active  = TRUE,
        updated_at = now();

  RETURN NEW;
END;
$$;
