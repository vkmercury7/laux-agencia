CREATE OR REPLACE FUNCTION public.crm_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') $$;
REVOKE ALL ON FUNCTION public.crm_is_admin() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.crm_is_admin() TO authenticated, service_role;
CREATE TABLE public.sales (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id), seller_id uuid NOT NULL, seller_email text NOT NULL DEFAULT '', service text NOT NULL CHECK(length(trim(service)) BETWEEN 1 AND 120), closed_on date NOT NULL, initial_value numeric(14,2) NOT NULL CHECK(initial_value>=0), monthly_value numeric(14,2) NOT NULL DEFAULT 0 CHECK(monthly_value>=0), contract_type text NOT NULL CHECK(contract_type IN ('unico','recorrente')), starts_on date NOT NULL, contract_status text NOT NULL DEFAULT 'ativo' CHECK(contract_status IN ('ativo','encerrado')), status text NOT NULL DEFAULT 'valida' CHECK(status IN ('valida','cancelada')), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=2000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(contract_type='recorrente' OR monthly_value=0)
);
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated; GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_read ON public.sales FOR SELECT TO authenticated USING(public.can_view_leads(auth.uid()) AND (public.crm_is_admin() OR seller_id=auth.uid()));
CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated WITH CHECK(public.can_view_leads(auth.uid()) AND public.can_view_leads(seller_id) AND (public.crm_is_admin() OR seller_id=auth.uid()));
CREATE POLICY sales_update ON public.sales FOR UPDATE TO authenticated USING(public.can_view_leads(auth.uid()) AND (public.crm_is_admin() OR seller_id=auth.uid())) WITH CHECK(public.can_view_leads(auth.uid()) AND (public.crm_is_admin() OR seller_id=auth.uid()));
CREATE TABLE public.sale_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid NOT NULL REFERENCES public.sales(id), amount numeric(14,2) NOT NULL CHECK(amount>=0), status text NOT NULL CHECK(status IN ('pendente','pago','cancelado')), received_on date, method text NOT NULL DEFAULT '' CHECK(length(method)<=80), history jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK((status='pago' AND received_on IS NOT NULL) OR (status<>'pago' AND received_on IS NULL))
);
GRANT SELECT, INSERT, UPDATE ON public.sale_payments TO authenticated; GRANT ALL ON public.sale_payments TO service_role;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_read ON public.sale_payments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.sales s WHERE s.id=sale_id));
CREATE POLICY payments_insert ON public.sale_payments FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.sales s WHERE s.id=sale_id AND s.status='valida'));
CREATE POLICY payments_update ON public.sale_payments FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM public.sales s WHERE s.id=sale_id)) WITH CHECK(EXISTS(SELECT 1 FROM public.sales s WHERE s.id=sale_id));
CREATE INDEX sales_seller_closed ON public.sales(seller_id,closed_on); CREATE INDEX payments_received ON public.sale_payments(received_on) WHERE status='pago'; CREATE INDEX payments_sale ON public.sale_payments(sale_id);
CREATE OR REPLACE FUNCTION public.crm_guard_sale() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL THEN
  IF NOT public.can_view_leads(auth.uid()) THEN RAISE EXCEPTION 'CRM access denied'; END IF;
  IF NOT public.crm_is_admin() THEN
   IF NEW.seller_id<>auth.uid() OR NEW.status<>'valida' THEN RAISE EXCEPTION 'Seller assignment or cancellation denied'; END IF;
   IF TG_OP='UPDATE' AND (OLD.seller_id IS DISTINCT FROM NEW.seller_id OR OLD.lead_id IS DISTINCT FROM NEW.lead_id OR OLD.status='cancelada') THEN RAISE EXCEPTION 'Ownership is immutable'; END IF;
  END IF;
 END IF;
 IF NOT public.can_view_leads(NEW.seller_id) THEN RAISE EXCEPTION 'Unauthorized seller'; END IF;
 SELECT email INTO NEW.seller_email FROM auth.users WHERE id=NEW.seller_id;
 IF NEW.seller_email IS NULL THEN RAISE EXCEPTION 'Seller not found'; END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER crm_guard_sale BEFORE INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.crm_guard_sale();
CREATE OR REPLACE FUNCTION public.crm_close_lead() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.status='valida' THEN UPDATE public.leads SET funnel_stage='fechado' WHERE id=NEW.lead_id; END IF; RETURN NEW; END $$;
CREATE TRIGGER crm_close_lead AFTER INSERT OR UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.crm_close_lead();
CREATE OR REPLACE FUNCTION public.crm_guard_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; sale_status text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.sale_id IS DISTINCT FROM OLD.sale_id THEN RAISE EXCEPTION 'Payment sale is immutable'; END IF;
 SELECT seller_id,status INTO owner_id,sale_status FROM public.sales WHERE id=NEW.sale_id;
 IF sale_status IS DISTINCT FROM 'valida' THEN RAISE EXCEPTION 'Cannot change payments on cancelled sales'; END IF;
 IF auth.uid() IS NOT NULL THEN
  IF NOT public.can_view_leads(auth.uid()) OR (NOT public.crm_is_admin() AND owner_id<>auth.uid()) THEN RAISE EXCEPTION 'Payment access denied'; END IF;
  IF NOT public.crm_is_admin() AND (NEW.status='cancelado' OR (TG_OP='UPDATE' AND OLD.status='pago')) THEN RAISE EXCEPTION 'Only administrators can correct received payments'; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN NEW.history=OLD.history || jsonb_build_array(jsonb_build_object('at',now(),'actor',auth.uid(),'amount',OLD.amount,'status',OLD.status,'received_on',OLD.received_on,'method',OLD.method)); ELSE NEW.history='[]'::jsonb; END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER crm_guard_payment BEFORE INSERT OR UPDATE ON public.sale_payments FOR EACH ROW EXECUTE FUNCTION public.crm_guard_payment();
CREATE OR REPLACE FUNCTION public.crm_register_sale(payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE sale_id uuid := (payload->>'id')::uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_view_leads(auth.uid()) THEN RAISE EXCEPTION 'CRM access denied'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales WHERE id=sale_id) THEN RETURN sale_id; END IF;
 INSERT INTO public.sales(id,lead_id,seller_id,service,closed_on,initial_value,monthly_value,contract_type,starts_on,contract_status,notes) VALUES(sale_id,(payload->>'lead_id')::uuid,(payload->>'seller_id')::uuid,payload->>'service',(payload->>'closed_on')::date,(payload->>'initial_value')::numeric,(payload->>'monthly_value')::numeric,payload->>'contract_type',(payload->>'starts_on')::date,payload->>'contract_status',payload->>'notes');
 INSERT INTO public.sale_payments(sale_id,amount,status,received_on,method) VALUES(sale_id,(payload->>'payment_amount')::numeric,payload->>'payment_status',NULLIF(payload->>'received_on','')::date,payload->>'payment_method');
 RETURN sale_id;
END $$;
REVOKE ALL ON FUNCTION public.crm_register_sale(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.crm_register_sale(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.crm_guard_sale(), public.crm_guard_payment(), public.crm_close_lead() FROM PUBLIC;