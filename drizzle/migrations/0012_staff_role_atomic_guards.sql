CREATE OR REPLACE FUNCTION public.crm_change_team_role(member_id uuid,new_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE m public.team_members; BEGIN
 IF NOT public.crm_is_admin() THEN RAISE EXCEPTION 'Only administrators may change roles'; END IF;
 IF new_role NOT IN ('admin','seller','sdr','attendant','traffic_manager') THEN RAISE EXCEPTION 'Invalid role'; END IF;
 SELECT * INTO m FROM public.team_members WHERE id=member_id FOR UPDATE;
 IF NOT FOUND OR m.user_id IS NULL OR m.status='revoked' THEN RAISE EXCEPTION 'Invalid member'; END IF;
 IF m.user_id=auth.uid() OR public.has_role(m.user_id,'super_admin') THEN RAISE EXCEPTION 'Own and principal administrator roles are protected'; END IF;
 DELETE FROM public.user_roles WHERE user_id=m.user_id AND role::text<>'super_admin';
 INSERT INTO public.user_roles(user_id,role) VALUES(m.user_id,new_role::public.app_role);
 UPDATE public.team_members SET role=new_role::public.app_role,updated_at=now() WHERE id=member_id;
 INSERT INTO public.team_audit(actor_id,action,target_email,details) VALUES(auth.uid(),'change_role',m.email,jsonb_build_object('from',m.role,'to',new_role)); END $$;
REVOKE ALL ON FUNCTION public.crm_change_team_role(uuid,text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.crm_change_team_role(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.traffic_guard_campaign() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF TG_OP='UPDATE' AND NEW.lead_id IS DISTINCT FROM OLD.lead_id THEN RAISE EXCEPTION 'Campaign client is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER traffic_guard_campaign BEFORE UPDATE ON public.traffic_campaigns FOR EACH ROW EXECUTE FUNCTION public.traffic_guard_campaign();
CREATE OR REPLACE FUNCTION public.traffic_guard_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.manager_id IS NOT NULL AND NOT public.crm_has_any_role(NEW.manager_id,ARRAY['traffic_manager','admin','super_admin']) THEN RAISE EXCEPTION 'Invalid manager role'; END IF; RETURN NEW; END $$;
CREATE TRIGGER traffic_guard_assignment BEFORE INSERT OR UPDATE ON public.traffic_clients FOR EACH ROW EXECUTE FUNCTION public.traffic_guard_assignment();