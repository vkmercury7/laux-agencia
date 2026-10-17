CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  nome_cliente text NOT NULL,
  empresa text,
  whatsapp text NOT NULL,
  segmento text,
  servico text,
  data_hora_inicio timestamptz NOT NULL,
  duracao_minutos integer NOT NULL DEFAULT 30 CHECK (duracao_minutos BETWEEN 5 AND 600),
  data_hora_fim timestamptz NOT NULL,
  responsavel_id uuid NOT NULL,
  responsavel_email text NOT NULL,
  modalidade text NOT NULL DEFAULT 'WhatsApp',
  link_reuniao text,
  origem text,
  observacoes text,
  status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','confirmada','realizada','nao_compareceu','cancelada')),
  historico jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT agendamentos_sem_conflito EXCLUDE USING gist (
    responsavel_id WITH =, tstzrange(data_hora_inicio, data_hora_fim) WITH &&
  ) WHERE (status <> 'cancelada')
);

CREATE INDEX agendamentos_inicio_idx ON public.agendamentos (data_hora_inicio);
CREATE INDEX agendamentos_resp_idx ON public.agendamentos (responsavel_id);
CREATE INDEX agendamentos_status_idx ON public.agendamentos (status);
CREATE INDEX agendamentos_lead_idx ON public.agendamentos (lead_id);

CREATE OR REPLACE FUNCTION public.agendamentos_set_fim()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.data_hora_fim := NEW.data_hora_inicio + make_interval(mins => NEW.duracao_minutos);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER agendamentos_set_fim BEFORE INSERT OR UPDATE ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.agendamentos_set_fim();

GRANT SELECT, INSERT, UPDATE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads agendamentos" ON public.agendamentos FOR SELECT TO authenticated USING (public.can_view_leads(auth.uid()));
CREATE POLICY "Team creates agendamentos" ON public.agendamentos FOR INSERT TO authenticated WITH CHECK (public.can_view_leads(auth.uid()) AND public.can_view_leads(responsavel_id));
CREATE POLICY "Team updates agendamentos" ON public.agendamentos FOR UPDATE TO authenticated USING (public.can_view_leads(auth.uid())) WITH CHECK (public.can_view_leads(auth.uid()) AND public.can_view_leads(responsavel_id));