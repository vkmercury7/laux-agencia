import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)), 'Data inválida');
const count = z.number().int().nonnegative().nullable();
export const campaignSchema = z.object({ id: z.string().uuid().optional(), lead_id: z.string().uuid(), name: z.string().trim().min(1).max(120), platform: z.enum(['Meta Ads','Google Ads','Outra']), objective: z.string().trim().max(1000), budget: z.number().nonnegative(), starts_on: date, status: z.enum(['Planejamento','Ativa','Pausada','Encerrada']), notes: z.string().trim().max(2000) });
export const resultSchema = z.object({ campaign_id:z.string().uuid(), starts_on:date, ends_on:date, spend:z.number().nonnegative(), impressions:count, reach:count, clicks:count, leads:count, conversions:count, notes:z.string().trim().max(2000) }).refine(v=>v.ends_on>=v.starts_on, 'A data final deve ser posterior à inicial');
export type CampaignInput = z.infer<typeof campaignSchema>;
export type ResultInput = z.infer<typeof resultSchema>;
export function trafficRatios(r: Pick<ResultInput,'spend'|'clicks'|'leads'|'impressions'>) {
 return { cpc: r.clicks ? r.spend/r.clicks : null, cpl: r.leads ? r.spend/r.leads : null, ctr: r.clicks !== null && r.impressions ? r.clicks/r.impressions*100 : null };
}
export function trafficTotals(rows: Array<Pick<ResultInput,'starts_on'|'ends_on'|'spend'|'leads'>>, from:string, to:string) {
 return rows.filter(r=>r.starts_on>=from && r.ends_on<=to).reduce((s,r)=>({spend:s.spend+r.spend,leads:s.leads+(r.leads??0)}),{spend:0,leads:0});
}