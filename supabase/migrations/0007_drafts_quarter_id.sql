-- Aggiunge quarter_id opzionale ai verbali/bozze
-- Permette di creare verbali trimestrali oltre a quelli annuali

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS quarter_id UUID REFERENCES public.quarters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS drafts_quarter_id_idx ON public.drafts(quarter_id)
  WHERE quarter_id IS NOT NULL;
