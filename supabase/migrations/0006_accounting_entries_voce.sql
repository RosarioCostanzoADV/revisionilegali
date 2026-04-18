-- Aggiunge mappatura civilistica alle voci contabili (prodotta da Gemini AI)
ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS voce_standard      TEXT,
  ADD COLUMN IF NOT EXISTS schema_civilistico TEXT;
