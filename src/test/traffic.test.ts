import { describe,it,expect } from 'vitest';
import { trafficRatios,trafficTotals,resultSchema } from '@/lib/traffic';
import { allowedArea,assignableRoleSchema } from '@/lib/team-roles';
describe('Manual traffic calculations',()=>{
 it('CPC divides actual investment by clicks',()=>expect(trafficRatios({spend:200,clicks:50,leads:10,impressions:1000}).cpc).toBe(4));
 it('CPL divides actual investment by leads',()=>expect(trafficRatios({spend:200,clicks:50,leads:10,impressions:1000}).cpl).toBe(20));
 it('CTR multiplies clicks divided by impressions by 100',()=>expect(trafficRatios({spend:200,clicks:50,leads:10,impressions:1000}).ctr).toBe(5));
 it('zero denominators are unavailable',()=>expect(trafficRatios({spend:100,clicks:0,leads:0,impressions:0})).toEqual({cpc:null,cpl:null,ctr:null}));
 it('missing counts are unavailable',()=>expect(trafficRatios({spend:100,clicks:null,leads:null,impressions:null})).toEqual({cpc:null,cpl:null,ctr:null}));
 it('period totals use only fully included records without prorating',()=>expect(trafficTotals([{starts_on:'2026-10-01',ends_on:'2026-10-10',spend:200,leads:10},{starts_on:'2026-09-01',ends_on:'2026-10-05',spend:300,leads:20}],'2026-10-01','2026-10-18')).toEqual({spend:200,leads:10}));
 it('rejects reversed periods',()=>expect(resultSchema.safeParse({campaign_id:crypto.randomUUID(),starts_on:'2026-10-18',ends_on:'2026-10-01',spend:0,impressions:null,reach:null,clicks:null,leads:null,conversions:null,notes:''}).success).toBe(false));
});
describe('Staff areas',()=>{
 it('supports exactly the five assignable roles',()=>expect(assignableRoleSchema.options).toEqual(['admin','seller','sdr','attendant','traffic_manager']));
 it('preserves principal full access',()=>expect(allowedArea('/admin/equipe',['super_admin'])).toBe(true));
 it('SDR has no financial or team areas',()=>{expect(allowedArea('/admin/vendas',['sdr'])).toBe(false);expect(allowedArea('/admin/contratos',['sdr'])).toBe(false);expect(allowedArea('/admin/equipe',['sdr'])).toBe(false);});
 it('seller can open sales but not global finance',()=>{expect(allowedArea('/admin/vendas',['seller'])).toBe(true);expect(allowedArea('/admin/dashboard',['seller'])).toBe(false);});
 it('traffic manager cannot open sales or clients directory',()=>{expect(allowedArea('/admin/gestao-trafego',['traffic_manager'])).toBe(true);expect(allowedArea('/admin/clientes',['traffic_manager'])).toBe(false);expect(allowedArea('/admin/vendas',['traffic_manager'])).toBe(false);});
});