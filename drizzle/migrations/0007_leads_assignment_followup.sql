ALTER TABLE public.leads
  ADD COLUMN assigned_to uuid,
  ADD COLUMN followup_date date,
  ADD COLUMN followup_time text,
  ADD COLUMN followup_note text,
  ADD COLUMN followup_done boolean NOT NULL DEFAULT false;

GRANT UPDATE (assigned_to, followup_date, followup_time, followup_note, followup_done) ON public.leads TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_guard_lead_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

CREATE TRIGGER leads_guard_team
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.crm_guard_lead_team();