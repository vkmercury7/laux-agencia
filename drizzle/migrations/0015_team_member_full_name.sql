ALTER TABLE public.team_members ADD COLUMN full_name text;

CREATE OR REPLACE FUNCTION public.crm_update_team_member_name(member_id uuid, new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.crm_is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito aos administradores.' USING ERRCODE = '42501';
  END IF;
  IF new_name IS NULL OR length(btrim(new_name)) = 0 OR length(btrim(new_name)) > 200 THEN
    RAISE EXCEPTION 'Informe um nome com até 200 caracteres.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.team_members SET full_name = btrim(new_name) WHERE id = member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membro não encontrado.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_update_team_member_name(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_update_team_member_name(uuid, text) TO authenticated;
