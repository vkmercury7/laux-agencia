import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LeadDetails, type Lead } from './lead-details';
import { getNotifications, markNotificationsRead, openNotificationLead } from '@/lib/activities.functions';
import { activityTime } from '@/lib/activities';
export function Notifications() {
  const fetch = useServerFn(getNotifications), mark = useServerFn(markNotificationsRead), openLead = useServerFn(openNotificationLead);
  const cache = useQueryClient();
  const { data, error } = useQuery({ queryKey: ['notifications'], queryFn: () => fetch(), refetchInterval: 60_000 });
  const [open, setOpen] = useState(false), [selected, setSelected] = useState<Lead | null>(null), [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  async function read(ids: string[]) {
    setBusy(true); setFailure('');
    try { await mark({ data: { ids } }); await cache.invalidateQueries({ queryKey: ['notifications'] }); }
    catch { setFailure('Não foi possível marcar como lida.'); }
    finally { setBusy(false); }
  }
  async function view(id: string) {
    setBusy(true); setFailure('');
    try { const lead = await openLead({ data: { id } }); setSelected(lead); setOpen(false); await read([id]); }
    catch { setFailure('Não foi possível abrir o formulário.'); }
    finally { setBusy(false); }
  }
  if (!error && !data?.allowed) return null;
  return <><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" size="icon" className="notification-bell" aria-label={`Notificações: ${data?.count ?? 0} não lidas`} title="Novos formulários"><Bell size={18}/>{Boolean(data?.count) && <span className="notification-count">{data?.count}</span>}</Button></PopoverTrigger><PopoverContent align="end" className="notification-popover"><div className="notification-heading"><h2>Novos formulários</h2>{Boolean(data?.rows.length) && <Button size="icon" variant="ghost" disabled={busy} title="Marcar exibidas como lidas" aria-label="Marcar exibidas como lidas" onClick={() => void read((data?.rows ?? []).map(r => r.id))}><CheckCheck/></Button>}</div>{(failure || error) && <p role="alert" className="text-destructive">{failure || 'Não foi possível carregar as notificações.'}</p>}{!error && !data?.rows.length && <p className="text-muted-foreground">Nenhum novo formulário.</p>}<ul className="notification-list">{data?.rows.map(row => <li key={row.id}><Button variant="ghost" className="notification-open" disabled={busy} onClick={() => void view(row.id)}><strong>{row.client_name}</strong><span>{row.company}</span><time>{activityTime(row.created_at)}</time></Button><Button variant="ghost" size="icon" disabled={busy} aria-label={`Marcar ${row.client_name} como lida`} title="Marcar como lida" onClick={() => void read([row.id])}><Check size={16}/></Button></li>)}</ul></PopoverContent></Popover><LeadDetails lead={selected} onClose={() => setSelected(null)}/></>;
}