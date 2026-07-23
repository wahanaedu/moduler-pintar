
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_chosen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mapel_terkunci text,
  ADD COLUMN IF NOT EXISTS mapel_changes_remaining integer NOT NULL DEFAULT 1;

-- Anggap profil yang sudah pernah memilih kelas sebagai sudah memilih peran (guru_kelas).
UPDATE public.profiles
  SET role_chosen = true
  WHERE kelas_terkunci IS NOT NULL AND role_chosen = false;
