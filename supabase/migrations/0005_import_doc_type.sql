-- Add doc_type to accounting_imports
ALTER TABLE public.accounting_imports
ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'bilancio_verifica';
