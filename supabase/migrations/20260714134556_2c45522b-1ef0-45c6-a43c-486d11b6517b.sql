
-- 1. Add approved flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- 2. Update handle_new_user so profile default keeps approved=false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approved)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), false);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- 3. Admin RLS policies on profiles
DROP POLICY IF EXISTS "profiles admin select all" ON public.profiles;
CREATE POLICY "profiles admin select all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles admin update all" ON public.profiles;
CREATE POLICY "profiles admin update all" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Approve function (admin only)
CREATE OR REPLACE FUNCTION public.approve_user(_user_id uuid, _approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  UPDATE public.profiles SET approved = _approved, updated_at = now() WHERE id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_user(uuid, boolean) TO authenticated;

-- 5. Seed demo accounts (admin + guru), idempotent
DO $$
DECLARE
  admin_id uuid;
  guru_id uuid;
BEGIN
  -- Admin account
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@modul.demo';
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@modul.demo', crypt('Admin12345!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Administrator Demo"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@modul.demo', 'email_verified', true),
      'email', now(), now(), now());
  END IF;

  -- Guru account
  SELECT id INTO guru_id FROM auth.users WHERE email = 'guru@modul.demo';
  IF guru_id IS NULL THEN
    guru_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', guru_id, 'authenticated', 'authenticated',
      'guru@modul.demo', crypt('Guru12345!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Guru Demo"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), guru_id, guru_id::text,
      jsonb_build_object('sub', guru_id::text, 'email', 'guru@modul.demo', 'email_verified', true),
      'email', now(), now(), now());
  END IF;

  -- Ensure profiles + approved status
  UPDATE public.profiles SET approved = true, full_name = 'Administrator Demo' WHERE id = admin_id;
  UPDATE public.profiles SET approved = true, full_name = 'Guru Demo' WHERE id = guru_id;

  -- Ensure admin role
  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
