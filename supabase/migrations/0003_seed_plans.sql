-- =========================================================================
-- Seed: three base plans
-- =========================================================================
INSERT INTO public.plans (
  name, max_assignments, max_users, storage_gb, ai_quota,
  vigilance_module, ai_drafts_module, advanced_import, is_active
) VALUES
  ('Small',   5,   3,  5,   100,  false, false, false, true),
  ('Medium',  25,  10, 25,  500,  true,  true,  false, true),
  ('Gold',    200, 50, 200, NULL, true,  true,  true,  true)
ON CONFLICT (name) DO NOTHING;
