
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kelas_terkunci text,
  ADD COLUMN IF NOT EXISTS kelas_changes_remaining integer NOT NULL DEFAULT 1;
