CREATE TABLE public.crm_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 type text NOT NULL,
 entity_id uuid NOT NULL,
 lead_id uuid,
 client_name text NOT NULL DEFAULT '',
 company text NOT NULL DEFAULT '',
 actor_id uuid,
 actor_name text,
 owner_id uuid,
 description text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz
);
GRANT SELECT ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY activities_team_read ON public.crm_activities FOR SELECT TO authenticated USING (public.can_view_leads(auth.uid()) AND (type NOT IN ('sale_created','contract_created','contract_cancelled','installment_paid') OR public.crm_is_admin() OR owner_id = auth.uid()));
CREATE INDEX crm_activities_recent ON public.crm_activities(created_at DESC, id DESC);
CREATE INDEX crm_activities_unread ON public.crm_activities(created_at DESC) WHERE type='lead_created' AND read_at IS NULL;
CREATE FUNCTION public.crm_is_notification_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(auth.uid(), 'super_admin') AND EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND lower(email)='vladmirbtc@gmail.com');
$$;
REVOKE ALL ON FUNCTION public.crm_is_notification_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_is_notification_admin() TO authenticated;
CREATE FUNCTION public.crm_mark_notifications_read(ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.crm_is_notification_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF cardinality(ids)>100 THEN RAISE EXCEPTION 'Too many notifications'; END IF;
 UPDATE public.crm_activities SET read_at=now() WHERE id=ANY(ids) AND type='lead_created' AND read_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_mark_notifications_read(uuid[]) TO authenticated;
CREATE FUNCTION public.crm_log_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 event_type text; msg text; lid uuid; owner uuid; client text; business text; actor uuid := auth.uid(); actor_label text;
BEGIN
 IF TG_TABLE_NAME='leads' THEN
  lid:=NEW.id;
  IF TG_OP='INSERT' THEN event_type:='lead_created'; msg:='Novo formulário recebido';
  ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN event_type:='lead_assigned'; msg:=CASE WHEN NEW.assigned_to IS NULL THEN 'Responsável removido' ELSE 'Lead atribuído a ' || COALESCE((SELECT email FROM auth.users WHERE id=NEW.assigned_to),'membro da equipe') END;
  END IF;
 ELSIF TG_TABLE_NAME='agendamentos' THEN
  lid:=NEW.lead_id; owner:=NEW.responsavel_id;
  IF TG_OP='INSERT' THEN event_type:='meeting_created'; msg:='Reunião agendada';
  ELSIF NEW.status='cancelada' AND OLD.status IS DISTINCT FROM NEW.status THEN event_type:='meeting_cancelled'; msg:='Reunião cancelada';
  ELSIF NEW.data_hora_inicio IS DISTINCT FROM OLD.data_hora_inicio THEN event_type:='meeting_rescheduled'; msg:='Reunião remarcada'; END IF;
  client:=NEW.nome_cliente; business:=COALESCE(NEW.empresa,'');
 ELSIF TG_TABLE_NAME='sales' AND TG_OP='INSERT' THEN
  lid:=NEW.lead_id; owner:=NEW.seller_id; event_type:='sale_created'; msg:='Venda registrada: R$ ' || replace(NEW.initial_value::text,'.',',');
 ELSIF TG_TABLE_NAME='contracts' THEN
  lid:=NEW.lead_id; owner:=NEW.seller_id;
  IF TG_OP='INSERT' THEN event_type:='contract_created'; msg:='Contrato criado';
  ELSIF NEW.status='cancelado' AND OLD.status IS DISTINCT FROM NEW.status THEN event_type:='contract_cancelled'; msg:='Contrato cancelado'; END IF;
 ELSIF TG_TABLE_NAME='contract_installments' THEN
  IF NEW.status='pago' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
   SELECT lead_id,seller_id INTO lid,owner FROM public.contracts WHERE id=NEW.contract_id;
   event_type:='installment_paid'; msg:='Mensalidade marcada como paga: R$ ' || replace(COALESCE(NEW.amount_received,NEW.amount_due)::text,'.',',');
  END IF;
 END IF;
 IF event_type IS NULL THEN RETURN NEW; END IF;
 IF lid IS NOT NULL THEN SELECT name,company INTO client,business FROM public.leads WHERE id=lid; END IF;
 IF actor IS NOT NULL THEN SELECT COALESCE(NULLIF(raw_user_meta_data->>'full_name',''),email) INTO actor_label FROM auth.users WHERE id=actor; END IF;
 INSERT INTO public.crm_activities(type,entity_id,lead_id,client_name,company,actor_id,actor_name,owner_id,description)
 VALUES(event_type,NEW.id,lid,COALESCE(client,''),COALESCE(business,''),actor,actor_label,owner,msg);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_log_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER crm_activity_leads AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity();
CREATE TRIGGER crm_activity_meetings AFTER INSERT OR UPDATE ON public.agendamentos FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity();
CREATE TRIGGER crm_activity_sales AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity();
CREATE TRIGGER crm_activity_contracts AFTER INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity();
CREATE TRIGGER crm_activity_installments AFTER INSERT OR UPDATE ON public.contract_installments FOR EACH ROW EXECUTE FUNCTION public.crm_log_activity();