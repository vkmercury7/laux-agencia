CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  user_id uuid,
  role public.app_role NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','revoked')),
  invited_by uuid,
  invited_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  action text NOT NULL,
  target_email text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT ALL ON public.team_audit TO service_role;
ALTER TABLE public.team_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_leads(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','admin','collaborator'))
$$;

DROP POLICY IF EXISTS "Admins read leads" ON public.leads;
CREATE POLICY "Team reads leads" ON public.leads FOR SELECT TO authenticated
  USING (public.can_view_leads(auth.uid()));

CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
  IF lower(new.email) = 'vladmirbtc@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'super_admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END $$;

INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'super_admin' FROM auth.users WHERE lower(email) = 'vladmirbtc@gmail.com'
  ON CONFLICT DO NOTHING;