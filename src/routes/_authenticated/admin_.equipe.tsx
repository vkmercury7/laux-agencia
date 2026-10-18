import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AdminHeader } from "@/components/agency/admin-nav";
import { changeRole, getMyAccess, inviteMember, listTeam, resendInvite, revokeMember } from "@/lib/team.functions";
import { ROLE_LABELS, assignableRoleSchema, type TeamRole } from '@/lib/team-roles';

export const Route = createFileRoute("/_authenticated/admin_/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe | LAUX AGÊNCIA" },
      { name: "description", content: "Gerenciamento privado de membros e convites do painel da LAUX AGÊNCIA." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Equipe | LAUX AGÊNCIA" },
      { property: "og:description", content: "Convites e permissões da equipe LAUX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const roleLabel = ROLE_LABELS;
const statusLabel: Record<string, string> = { pending: "Pendente", active: "Ativo", revoked: "Revogado" };
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function TeamPage() {
  const qc = useQueryClient();
  const access = useQuery({ queryKey: ["access"], queryFn: useServerFn(getMyAccess) });
  const fetchTeam = useServerFn(listTeam);
  const team = useQuery({ queryKey: ["team"], queryFn: () => fetchTeam(), enabled: Boolean(access.data?.isAdmin) });
  const invite = useServerFn(inviteMember);
  const revoke = useServerFn(revokeMember);
  const setRole = useServerFn(changeRole);
  const resend = useServerFn(resendInvite);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRoleSel] = useState<TeamRole>('seller');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await run.mutateAsync(() => invite({ data: { email, role } }));
      setMsg({ ok: true, text: `Convite enviado para ${email}.` });
      setOpen(false);
      setEmail("");
    } catch {
      /* message set by onError */
    }
  }

  if (access.isLoading) return <main className="admin-shell"><p className="admin-empty">Carregando...</p></main>;
  if (!access.data?.isAdmin)
    return (
      <main className="admin-shell"><div className="admin-container">
        <p role="alert" className="admin-empty">Acesso restrito aos administradores.</p>
        <Button variant="ghost" asChild><Link to="/admin"><ArrowLeft /> Voltar ao painel</Link></Button>
      </div></main>
    );

  return (
    <main className="admin-shell">
      <div className="admin-container">
        <AdminHeader title="Equipe" subtitle="Cargos e acessos da equipe.">
          <Button variant="premium" onClick={() => { setMsg(null); setOpen(true); }}><UserPlus /> Convidar membro</Button>
        </AdminHeader>

        {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "admin-empty" : "admin-empty text-destructive"}>{msg.text}</p>}

        <div className="admin-card admin-table-card">
          {team.isLoading && <p className="admin-empty">Carregando equipe...</p>}
          {team.error && <p role="alert" className="admin-empty text-destructive">Não foi possível carregar a equipe.</p>}
          {team.data && team.data.length === 0 && <p className="admin-empty">Nenhum membro convidado ainda.</p>}
          {team.data && team.data.length > 0 && (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead><tr><th>E-mail</th><th>Função</th><th>Situação</th><th>Convidado em</th><th>Ações</th></tr></thead>
                <tbody>
                  {team.data.map((m) => (
                    <tr key={m.id}>
                      <td>{m.email}</td>
                      <td>
                        {m.status === "revoked" || m.role === 'super_admin' ? roleLabel[m.role] : (
                          <select aria-label={`Função de ${m.email}`} value={m.role} disabled={run.isPending}
                            onChange={(e) => run.mutate(() => setRole({ data: { id: m.id, role: assignableRoleSchema.parse(e.target.value) } }))}>
                            {m.role==='collaborator'&&<option value="collaborator">Vendedor (acesso existente)</option>}
                            {assignableRoleSchema.options.map(r=><option key={r} value={r}>{roleLabel[r]}</option>)}
                          </select>
                        )}
                      </td>
                      <td>{statusLabel[m.status]}</td>
                      <td>{date.format(new Date(m.invited_at))}</td>
                      <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {m.status === "pending" && (
                          <Button variant="ghost" size="sm" disabled={run.isPending}
                            onClick={() => run.mutate(() => resend({ data: { id: m.id } }).then(() => setMsg({ ok: true, text: `Convite reenviado para ${m.email}.` })))}>
                            <Send size={14} /> Reenviar
                          </Button>
                        )}
                        {m.status !== "revoked" && m.role !== 'super_admin' && (
                          <Button variant="ghost" size="sm" disabled={run.isPending}
                            onClick={() => confirm(`Remover o acesso de ${m.email}?`) && run.mutate(() => revoke({ data: { id: m.id } }))}>
                            {m.status === "pending" ? "Revogar convite" : "Remover"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="admin-dialog">
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>A pessoa receberá um e-mail para criar a própria senha.</DialogDescription>
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <label className="admin-search">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" aria-label="E-mail do colaborador" />
            </label>
            <select aria-label="Tipo de acesso" value={role} onChange={(e) => setRoleSel(assignableRoleSchema.parse(e.target.value))}>
              {assignableRoleSchema.options.map(r=><option key={r} value={r}>{roleLabel[r]}</option>)}
            </select>
            {msg && !msg.ok && <p role="alert" className="text-destructive">{msg.text}</p>}
            <Button variant="premium" type="submit" disabled={run.isPending}>{run.isPending ? "Enviando..." : "Enviar convite"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
