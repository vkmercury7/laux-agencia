import { createFileRoute, redirect } from '@tanstack/react-router';
export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: () => { throw redirect({ to: '/admin/dashboard', search: { period: 'month', from: '', to: '', seller: '' }, replace: true }); },
  head: () => ({ meta: [{ title: 'CRM | LAUX AGÊNCIA' }, { name: 'description', content: 'Painel comercial privado da LAUX AGÊNCIA.' }, { property: 'og:title', content: 'CRM | LAUX AGÊNCIA' }, { property: 'og:description', content: 'Acesso ao dashboard comercial LAUX.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }),
});