REVOKE UPDATE ON public.leads FROM authenticated;
GRANT UPDATE (funnel_stage, contract_value, closing_notes, loss_reason) ON public.leads TO authenticated;