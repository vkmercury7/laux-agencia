import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AdminHeader } from "@/components/agency/admin-nav";
import { getContractsData, saveContract, generateInstallments, updateInstallment } from "@/lib/contracts.functions";
import { nextDueDate, isOverdue, isRecurring, type ContractRow, type InstallmentRow } from "@/lib/contracts";
import { currency, parseMoney, todaySP } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/admin/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos | LAUX AGÊNCIA" },
      { name: "description", content: "Gestão de contratos e mensalidades do CRM da LAUX AGÊNCIA." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Contratos | LAUX AGÊNCIA" },
      { property: "og:description", content: "Contratos e mensalidades vinculados às vendas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContratosPage,
});

type Data = Awaited<ReturnType<typeof getContractsData>>;
type Contract = Data["contracts"][number];
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const fmtDate = (d: string) => dateFmt.format(new Date(`${d}T12:00:00Z`));
const STATUS_LABEL: Record<string, string> = { ativo: "Ativo", suspenso: "Suspenso", cancelado: "Cancelado" };
const INST_LABEL: Record<string, string> = { pendente: "Pendente", pago: "Pago", cancelado: "Cancelado" };
const addDays = (d: string, n: number) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

const emptyForm = { sale_id: "", starts_on: todaySP(), monthly: "", due_day: "", status: "ativo", notes: "" };

function ContratosPage() {
  const fetchData = useServerFn(getContractsData);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchData() });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativo" | "suspenso" | "cancelado" | "vencimento">("todos");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);

  const today = todaySP();
  const leadOf = useMemo(() => new Map((data?.leads ?? []).map((l) => [l.id, l])), [data]);
  const saleOf = useMemo(() => new Map((data?.sales ?? []).map((s) => [s.id, s])), [data]);
  const instByContract = useMemo(() => {
    const map = new Map<string, InstallmentRow[]>();
    for (const i of data?.installments ?? []) {
      const list = map.get(i.contract_id) ?? [];
      list.push(i);
      map.set(i.contract_id, list);
    }
    return map;
  }, [data]);

  const stats = useMemo(() => {
    const contracts = data?.contracts ?? [];
    const installments = data?.installments ?? [];
    const active = contracts.filter((c) => c.status === "ativo");
    return {
      ativos: active.length,
      mrr: active.filter((c) => isRecurring(c) && c.starts_on <= today).reduce((n, c) => n + (c.monthly_value ?? 0), 0),
      pendentes: installments.filter((i) => i.status === "pendente").length,
      proximos: installments.filter((i) => i.status === "pendente" && i.due_date >= today && i.due_date <= addDays(today, 7)).length,
    };
  }, [data, today]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.contracts ?? []).filter((c) => {
      const lead = leadOf.get(c.lead_id);
      if (filter !== "todos" && filter !== "vencimento" && c.status !== filter) return false;
      if (filter === "vencimento") {
        const due = nextDueDate(c, today);
        const pendenteProximo = (instByContract.get(c.id) ?? []).some((i) => i.status === "pendente" && i.due_date >= today && i.due_date <= addDays(today, 7));
        if (!(pendenteProximo || (due && due <= addDays(today, 7)))) return false;
      }
      if (term && !lead?.name.toLowerCase().includes(term) && !lead?.company.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [data, search, filter, leadOf, instByContract, today]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["contracts"] });

  return (
    <main className="admin-shell">
      <div className="admin-container">
        <AdminHeader title="Contratos" subtitle="Contratos e mensalidades vinculados às vendas.">
          {data?.isAdmin && (
            <Button variant="premium" onClick={() => setCreating(true)}><Plus size={16} /> Novo contrato</Button>
          )}
        </AdminHeader>

        <div className="admin-stats">
          {([
            ["Contratos ativos", stats.ativos],
            ["Receita recorrente mensal", currency(stats.mrr)],
            ["Mensalidades pendentes", stats.pendentes],
            ["Vencimentos em 7 dias", stats.proximos],
          ] as const).map(([label, value]) => (
            <div key={label} className="admin-card admin-stat">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="admin-card admin-table-card">
          <div className="admin-toolbar">
            <label className="admin-search">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou empresa" aria-label="Buscar por nome ou empresa" />
            </label>
            <div className="admin-filters" role="group" aria-label="Filtrar contratos">
              {([["todos", "Todos"], ["ativo", "Ativos"], ["suspenso", "Suspensos"], ["cancelado", "Cancelados"], ["vencimento", "Vencimento próximo"]] as const).map(([key, label]) => (
                <Button key={key} variant={filter === key ? "secondary" : "ghost"} size="sm" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</Button>
              ))}
            </div>
          </div>

          {isLoading && <p className="admin-empty">Carregando contratos...</p>}
          {error && <p role="alert" className="admin-empty text-destructive">Não foi possível carregar os contratos.</p>}
          {!isLoading && !error && rows.length === 0 && (
            <p className="admin-empty"><FileText size={18} /> Nenhum contrato encontrado.</p>
          )}

          {rows.length > 0 && (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Empresa</th>
                    <th>Serviço</th>
                    <th>Mensalidade</th>
                    <th>Próximo vencimento</th>
                    <th>Situação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const lead = leadOf.get(c.lead_id);
                    const due = nextDueDate(c, today);
                    return (
                      <tr key={c.id}>
                        <td>{lead?.name ?? "—"}</td>
                        <td>{lead?.company ?? "—"}</td>
                        <td>{saleOf.get(c.sale_id)?.service ?? "—"}</td>
                        <td>{isRecurring(c) ? currency(c.monthly_value ?? 0) : "Não recorrente"}</td>
                        <td>{due ? fmtDate(due) : "—"}</td>
                        <td><span className={`client-badge contract-${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                        <td>
                          <Button variant="ghost" size="sm" onClick={() => setSelected(c)}>
                            <Eye size={15} /> Detalhes
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {data?.isAdmin && (
        <ContractForm
          open={creating}
          onClose={() => setCreating(false)}
          data={data}
          onSaved={async () => { setCreating(false); await refresh(); }}
        />
      )}
      <ContractDetails
        contract={selected}
        onClose={() => setSelected(null)}
        data={data}
        installments={selected ? instByContract.get(selected.id) ?? [] : []}
        onChanged={refresh}
      />
    </main>
  );
}

function ContractForm({ open, onClose, data, onSaved }: { open: boolean; onClose: () => void; data: Data; onSaved: () => Promise<void> }) {
  const save = useServerFn(saveContract);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const available = data.sales.filter((s) => s.status === "valida" && !data.contracts.some((c) => c.sale_id === s.id));
  const sale = data.sales.find((s) => s.id === form.sale_id);
  const lead = sale ? data.leads.find((l) => l.id === sale.lead_id) : null;

  const submit = async () => {
    if (!sale) { setError("Selecione uma venda."); return; }
    setSaving(true);
    setError("");
    try {
      const monthly = form.monthly ? parseMoney(form.monthly) : null;
      await save({
        data: {
          sale_id: sale.id,
          lead_id: sale.lead_id,
          seller_id: sale.seller_id,
          starts_on: form.starts_on,
          monthly_value: monthly && monthly > 0 ? monthly : null,
          due_day: monthly && monthly > 0 ? Number(form.due_day) : null,
          status: form.status as "ativo" | "suspenso" | "cancelado",
          notes: form.notes,
        },
      });
      setForm(emptyForm);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o contrato.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="admin-dialog">
        <DialogTitle>Novo contrato</DialogTitle>
        <DialogDescription>Vincule o contrato a uma venda existente.</DialogDescription>
        <div className="contract-form">
          <label className="lead-field">Venda
            <select value={form.sale_id} onChange={(e) => {
              const s = data.sales.find((v) => v.id === e.target.value);
              setForm({ ...form, sale_id: e.target.value, monthly: s && s.monthly_value > 0 ? String(s.monthly_value).replace(".", ",") : "", starts_on: s?.starts_on ?? form.starts_on });
            }}>
              <option value="">Selecione a venda</option>
              {available.map((s) => {
                const l = data.leads.find((x) => x.id === s.lead_id);
                return <option key={s.id} value={s.id}>{l?.name ?? "Cliente"} — {s.service}</option>;
              })}
            </select>
          </label>
          {sale && lead && (
            <dl className="admin-answers">
              <div><dt>Cliente</dt><dd>{lead.name}</dd></div>
              <div><dt>Empresa</dt><dd>{lead.company}</dd></div>
              <div><dt>Serviço</dt><dd>{sale.service}</dd></div>
              <div><dt>Vendedor</dt><dd>{sale.seller_email}</dd></div>
            </dl>
          )}
          <div className="lead-followup-grid">
            <label className="lead-field">Data de início
              <input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
            </label>
            <label className="lead-field">Valor da mensalidade (vazio = não recorrente)
              <input inputMode="decimal" placeholder="390,00" value={form.monthly} onChange={(e) => setForm({ ...form, monthly: e.target.value })} />
            </label>
          </div>
          <div className="lead-followup-grid">
            <label className="lead-field">Dia do vencimento (1 a 28)
              <input type="number" min={1} max={28} value={form.due_day} disabled={!form.monthly} onChange={(e) => setForm({ ...form, due_day: e.target.value })} />
            </label>
            <label className="lead-field">Situação
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
          </div>
          <label className="lead-field">Observações internas
            <input maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          {error && <p role="alert" className="text-destructive">{error}</p>}
          <Button variant="premium" onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar contrato"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContractDetails({ contract, onClose, data, installments, onChanged }: {
  contract: Contract | null; onClose: () => void; data: Data | undefined; installments: InstallmentRow[]; onChanged: () => Promise<void>;
}) {
  const save = useServerFn(saveContract);
  const generate = useServerFn(generateInstallments);
  const pay = useServerFn(updateInstallment);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [payId, setPayId] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(todaySP());
  const [received, setReceived] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const today = todaySP();
  const lead = contract ? data?.leads.find((l) => l.id === contract.lead_id) : null;
  const sale = contract ? data?.sales.find((s) => s.id === contract.sale_id) : null;
  const isAdmin = data?.isAdmin ?? false;
  const sorted = [...installments].sort((a, b) => b.ref_month.localeCompare(a.ref_month));

  const sync = (c: Contract | null) => { setStatus(c?.status ?? ""); setNotes(c?.notes ?? ""); setError(""); setPayId(null); };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await fn(); await onChanged(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={Boolean(contract)} onOpenChange={(o) => { if (!o) onClose(); else sync(contract); }}>
      <DialogContent className="admin-dialog">
        <DialogTitle>Contrato de {lead?.name ?? "cliente"}</DialogTitle>
        <DialogDescription>{sale?.service ?? ""} · vendedor {sale?.seller_email ?? ""}</DialogDescription>
        {contract && (
          <div className="contract-form">
            <dl className="admin-answers">
              <div><dt>Empresa</dt><dd>{lead?.company ?? "—"}</dd></div>
              <div><dt>Início</dt><dd>{fmtDate(contract.starts_on)}</dd></div>
              <div><dt>Mensalidade</dt><dd>{isRecurring(contract) ? currency(contract.monthly_value ?? 0) : "Não recorrente"}</dd></div>
              <div><dt>Vencimento</dt><dd>{contract.due_day ? `Dia ${contract.due_day}` : "—"}</dd></div>
            </dl>

            {isAdmin && (
              <div className="lead-followup-grid">
                <label className="lead-field">Situação
                  <select value={status || contract.status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ativo">Ativo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>
                <label className="lead-field">Observações internas
                  <input maxLength={2000} value={notes || contract.notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>
            )}
            {isAdmin && ((status && status !== contract.status) || (notes && notes !== contract.notes)) && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => save({
                data: {
                  id: contract.id, sale_id: contract.sale_id, lead_id: contract.lead_id, seller_id: contract.seller_id,
                  starts_on: contract.starts_on, monthly_value: contract.monthly_value, due_day: contract.due_day,
                  status: (status || contract.status) as ContractRow["status"] & string, notes: notes || contract.notes,
                },
              }))}>Salvar alterações</Button>
            )}

            {isRecurring(contract) && (
              <div className="client-extra">
                <div className="contract-installments-head">
                  <strong>Mensalidades</strong>
                  {isAdmin && contract.status !== "cancelado" && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => generate({ data: { contractId: contract.id } }))}>
                      Gerar mensalidades devidas
                    </Button>
                  )}
                </div>
                {sorted.length === 0 ? <p className="client-extra-empty">Nenhuma mensalidade gerada ainda.</p> : (
                  <ul className="contract-installments">
                    {sorted.map((i) => (
                      <li key={i.id} className={isOverdue(i, today) ? "installment-overdue" : ""}>
                        <span>{fmtDate(i.ref_month)} · vence {fmtDate(i.due_date)} · {currency(i.amount_due)}</span>
                        <span className={`client-badge installment-${i.status}`}>
                          {isOverdue(i, today) ? "Vencida" : INST_LABEL[i.status]}
                          {i.status === "pago" && i.paid_on ? ` em ${fmtDate(i.paid_on)} (${currency(i.amount_received ?? 0)})` : ""}
                        </span>
                        {isAdmin && i.status === "pendente" && (
                          payId === i.id ? (
                            <span className="installment-pay">
                              <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} aria-label="Data do pagamento" />
                              <input inputMode="decimal" placeholder="Valor recebido" value={received} onChange={(e) => setReceived(e.target.value)} aria-label="Valor recebido" />
                              <Button size="sm" variant="premium" disabled={busy} onClick={() => run(async () => {
                                await pay({ data: { id: i.id, status: "pago", paid_on: paidOn, amount_received: parseMoney(received) } });
                                setPayId(null);
                              })}>Confirmar</Button>
                            </span>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => { setPayId(i.id); setReceived(String(i.amount_due).replace(".", ",")); setPaidOn(todaySP()); }}>
                              Marcar como paga
                            </Button>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {error && <p role="alert" className="text-destructive">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
