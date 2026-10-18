CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL UNIQUE REFERENCES public.sales(id),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  seller_id uuid NOT NULL,
  starts_on date NOT NULL,
  monthly_value numeric(14,2),
  due_day integer CHECK (due_day BETWEEN 1 AND 28),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','cancelado')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contracts_read ON public.contracts FOR SELECT TO authenticated
  USING (can_view_leads(auth.uid()) AND (crm_is_admin() OR seller_id = auth.uid()));
CREATE POLICY contracts_admin_insert ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (crm_is_admin());
CREATE POLICY contracts_admin_update ON public.contracts FOR UPDATE TO authenticated
  USING (crm_is_admin()) WITH CHECK (crm_is_admin());

CREATE TABLE public.contract_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  ref_month date NOT NULL,
  amount_due numeric(14,2) NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  paid_on date,
  amount_received numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, ref_month)
);
GRANT SELECT, INSERT, UPDATE ON public.contract_installments TO authenticated;
GRANT ALL ON public.contract_installments TO service_role;
ALTER TABLE public.contract_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY installments_read ON public.contract_installments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_installments.contract_id AND (crm_is_admin() OR c.seller_id = auth.uid())));
CREATE POLICY installments_admin_insert ON public.contract_installments FOR INSERT TO authenticated
  WITH CHECK (crm_is_admin());
CREATE POLICY installments_admin_update ON public.contract_installments FOR UPDATE TO authenticated
  USING (crm_is_admin()) WITH CHECK (crm_is_admin());