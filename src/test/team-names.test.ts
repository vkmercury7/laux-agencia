import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeTeamPerformanceRows } from '@/lib/team-performance';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    let validate: ((input: unknown) => unknown) | undefined;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: (input: unknown) => unknown) => { validate = fn; return builder; },
      handler: (fn: (input: unknown) => unknown) => async (input: { data: unknown; context: unknown }) => fn({ ...input, data: validate ? validate(input.data) : input.data }),
    };
    return builder;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({ getRequestHeader: vi.fn() }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));

import { updateMemberName } from '@/lib/team.functions';

const save = updateMemberName as unknown as (input: { data: { id: string; fullName: string }; context: { supabase: { rpc: ReturnType<typeof vi.fn> } } }) => Promise<unknown>;
const id = '00000000-0000-4000-8000-000000000001';
const rpc = vi.fn();
const context = { supabase: { rpc } };

describe('Employee names', () => {
  beforeEach(() => rpc.mockReset());
  it('rejects non-administrators before updating a name', async () => {
    rpc.mockResolvedValueOnce({ data: false });
    await expect(save({ data: { id, fullName: 'Ana Silva' }, context })).rejects.toThrow('Acesso restrito');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('crm_is_admin');
  });
  it('saves only the member ID and trimmed name through the checked RPC', async () => {
    rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ error: null });
    await expect(save({ data: { id, fullName: ' Ana Silva ' }, context })).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenLastCalledWith('crm_update_team_member_name', { member_id: id, new_name: 'Ana Silva' });
  });
  it('rejects blank names without writing data', async () => {
    await expect(save({ data: { id, fullName: '  ' }, context })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('does not report success when the protected write fails', async () => {
    rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ error: { message: 'denied' } });
    await expect(save({ data: { id, fullName: 'Ana Silva' }, context })).rejects.toThrow('Não foi possível salvar');
  });
  it('preserves the saved name, email and indicators in performance rows', () => {
    const [row] = normalizeTeamPerformanceRows([{ userId: id, fullName: 'Ana Silva', email: 'ana@example.test', role: 'seller', calls: 3, meetings: 2, sales: 1, sold: 490 }]);
    expect(row).toMatchObject({ fullName: 'Ana Silva', email: 'ana@example.test', role: 'seller', calls: 3, meetings: 2, sales: 1, sold: 490 });
  });
});