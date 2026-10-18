CREATE OR REPLACE FUNCTION public.crm_guard_lead_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct/privileged contexts (no authenticated user) bypass the guard.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NOT public.crm_is_admin() THEN
    RAISE EXCEPTION 'Somente administradores podem atribuir responsáveis.';
  END IF;
  IF (NEW.followup_date IS DISTINCT FROM OLD.followup_date
      OR NEW.followup_time IS DISTINCT FROM OLD.followup_time
      OR NEW.followup_note IS DISTINCT FROM OLD.followup_note
      OR NEW.followup_done IS DISTINCT FROM OLD.followup_done)
     AND NOT (public.crm_is_admin() OR OLD.assigned_to = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para atualizar o follow-up deste lead.';
  END IF;
  RETURN NEW;
END;
$$;