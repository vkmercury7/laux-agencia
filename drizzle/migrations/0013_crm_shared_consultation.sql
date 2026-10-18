-- Separate shared consultation from existing ownership-based write helpers.
CREATE OR REPLACE FUNCTION public.crm_can_consult() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND public.crm_has_any_role(auth.uid(),ARRAY['super_admin','admin','collaborator','seller','sdr','attendant','traffic_manager']) $$;
REVOKE ALL ON FUNCTION public.crm_can_consult() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_can_consult() TO authenticated,service_role;
ALTER POLICY "Team reads leads" ON public.leads USING(public.crm_can_consult());
ALTER POLICY "Team reads agendamentos" ON public.agendamentos USING(public.crm_can_consult());
ALTER POLICY sales_read ON public.sales USING(public.crm_can_consult());
ALTER POLICY contracts_read ON public.contracts USING(public.crm_can_consult());
ALTER POLICY activities_team_read ON public.crm_activities USING(public.crm_is_admin() OR (public.crm_can_consult() AND type <> 'installment_paid'));
ALTER POLICY traffic_clients_read ON public.traffic_clients USING(public.crm_can_consult());
ALTER POLICY traffic_campaigns_read ON public.traffic_campaigns USING(public.crm_can_consult());
ALTER POLICY traffic_results_read ON public.traffic_results USING(public.crm_can_consult());
CREATE OR REPLACE FUNCTION public.traffic_client_info() RETURNS TABLE(id uuid,name text,company text,service text,manager_id uuid,manager_email text,updated_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT l.id,l.name,l.company,COALESCE((SELECT string_agg(DISTINCT s.service,', ') FROM public.sales s WHERE s.lead_id=l.id AND s.status='valida'),''),tc.manager_id,(SELECT email::text FROM auth.users WHERE auth.users.id=tc.manager_id),tc.updated_at FROM public.leads l LEFT JOIN public.traffic_clients tc ON tc.lead_id=l.id WHERE public.crm_can_consult() $$;
COMMENT ON FUNCTION public.crm_can_consult() IS 'Shared staff read permission only; crm_can_read_lead and traffic_access retain scoped write authorization. Payments and installments remain administrator-only.';