-- =========================================================================
-- Seed: super admin user
--
-- Run this ONCE after the migrations, inside the Supabase SQL editor
-- (which runs with service_role / superuser privileges).
--
-- Email:    admin@revisionilegali.it
-- Password: ChangeMe!2026   ← change immediately after first login
--
-- The normal path for creating users is via `supabase.auth.admin.createUser`
-- from a Route Handler, but for the very first super_admin (which needs
-- to exist before any auth flow works) we insert directly into auth.users.
--
-- Notes:
-- * We bypass the bootstrap trigger's default role by passing app_metadata.
-- * The password is hashed via Supabase's extensions.crypt() with the
--   bf algorithm — the same format Supabase Auth uses.
-- =========================================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@revisionilegali.it';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin@revisionilegali.it',
      crypt('ChangeMe!2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"super_admin"}'::jsonb,
      '{"full_name":"Super Admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Ensure profile row exists and is flagged as super_admin.
  INSERT INTO public.user_profiles (id, tenant_id, role, full_name, is_active)
  VALUES (v_user_id, NULL, 'super_admin', 'Super Admin', TRUE)
  ON CONFLICT (id) DO UPDATE
    SET role = 'super_admin',
        tenant_id = NULL,
        full_name = COALESCE(public.user_profiles.full_name, 'Super Admin'),
        is_active = TRUE;
END
$$;
