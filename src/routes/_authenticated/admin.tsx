import { createFileRoute, redirect } from '@tanstack/react-router';
import { getMyAccess } from '@/lib/team.functions';
export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async () => { const access=await getMyAccess(); if(access.isAdmin)throw redirect({ to: '/admin/dashboard', search: { period: 'month', from: '', to: '', seller: '' }, replace: true }); if(access.roles.includes('traffic_manager'))throw redirect({to:'/admin/gestao-trafego',replace:true});throw redirect({to:'/admin/clientes',replace:true}); },
  head: () => ({ meta: [{ title: 'CRM | LAUX AGÊNCIA' }, { name: 'description', content: 'Painel comercial privado da LAUX AGÊNCIA.' }, { property: 'og:title', content: 'CRM | LAUX AGÊNCIA' }, { property: 'og:description', content: 'Acesso ao dashboard comercial LAUX.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }),
});