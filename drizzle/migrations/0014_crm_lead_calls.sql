CREATE TABLE public.lead_calls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id),
  user_id uuid not null,
  user_email text not null default '',
  resultado text not null check (resultado in ('nao_atendeu','atendeu','interessado','sem_interesse','retornar')),
  observacao text not null default '',
  proximo_contato timestamptz,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.lead_calls TO authenticated;
GRANT ALL ON public.lead_calls TO service_role;
ALTER TABLE public.lead_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_insert_own" ON public.lead_calls FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND crm_has_any_role(auth.uid(), ARRAY['admin','super_admin','collaborator','seller','sdr','attendant','traffic_manager']));
CREATE POLICY "calls_read" ON public.lead_calls FOR SELECT TO authenticated USING (crm_can_consult());
CREATE OR REPLACE FUNCTION public.crm_log_call() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record;
BEGIN
  SELECT name, company, assigned_to INTO l FROM public.leads WHERE id = NEW.lead_id;
  INSERT INTO public.crm_activities (type, entity_id, lead_id, client_name, company, actor_id, actor_name, owner_id, description)
  VALUES ('call_registered', NEW.id, NEW.lead_id, coalesce(l.name,''), coalesce(l.company,''), NEW.user_id, NEW.user_email, l.assigned_to,
    'Ligação registrada: ' || case NEW.resultado when 'nao_atendeu' then 'Não atendeu' when 'atendeu' then 'Atendeu' when 'interessado' then 'Interessado' when 'sem_interesse' then 'Sem interesse' else 'Retornar' end || case when NEW.observacao <> '' then ' — ' || NEW.observacao else '' end);
  RETURN NEW;
END $$;
CREATE TRIGGER lead_calls_log AFTER INSERT ON public.lead_calls FOR EACH ROW EXECUTE FUNCTION public.crm_log_call();