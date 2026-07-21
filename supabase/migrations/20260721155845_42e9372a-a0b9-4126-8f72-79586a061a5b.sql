
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Recreate has_role in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate approve_user in private schema
CREATE OR REPLACE FUNCTION private.approve_user(_user_id uuid, _approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;
  UPDATE public.profiles SET approved = _approved, updated_at = now() WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION private.approve_user(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.approve_user(uuid, boolean) TO authenticated, service_role;

-- Update RLS policies to reference private.has_role
DROP POLICY IF EXISTS "admins see all roles" ON public.user_roles;
CREATE POLICY "admins see all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "moduls admin read" ON public.moduls;
CREATE POLICY "moduls admin read" ON public.moduls
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles admin select all" ON public.profiles;
CREATE POLICY "profiles admin select all" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles admin update all" ON public.profiles;
CREATE POLICY "profiles admin update all" ON public.profiles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Drop the old public copies now that nothing references them
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.approve_user(uuid, boolean);

-- handle_new_user stays in public because its trigger lives on auth.users, but revoke API execute
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
