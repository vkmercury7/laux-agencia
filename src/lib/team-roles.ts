import { z } from 'zod';
export const assignableRoleSchema = z.enum(['admin', 'seller', 'sdr', 'attendant', 'traffic_manager']);
export type TeamRole = z.infer<typeof assignableRoleSchema>;
export const ROLE_LABELS: Record<string, string> = { super_admin: 'Administrador principal', admin: 'Administrador', seller: 'Vendedor', collaborator: 'Vendedor (acesso existente)', sdr: 'SDR', attendant: 'Atendente', traffic_manager: 'Gestor de tráfego' };
export function allowedArea(path: string, roles: string[]) {
 if (roles.some(r => ['admin','super_admin'].includes(r))) return true;
 return roles.some(r => ['seller','collaborator','sdr','attendant','traffic_manager'].includes(r)) && ['/admin/dashboard','/admin/atividades','/admin/clientes','/admin/formularios','/admin/agendamentos','/admin/funil','/admin/vendas','/admin/contratos','/admin/gestao-trafego'].includes(path);
}
