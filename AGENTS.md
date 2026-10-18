<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Traffic management links existing lead IDs through assignments, campaigns and non-overlapping campaign periods; reuse CRM activities with authenticated authors to avoid a parallel logging system.
- Staff roles remain in user_roles, with legacy collaborator treated as seller; enforce scoped row access and payment administration in database policies, and atomic role changes through a checked RPC.
- Diagnosis submissions are stored by the public server function in `src/lib/leads.functions.ts` (validated, deduplicated, service-role insert) and read only by an admin-role server function; the browser never queries leads directly, so credentials and lead data stay server-side.
- Admin-only screens live under `src/routes/_authenticated/`; the admin role comes from `public.user_roles` + `has_role`, never from client state.
- Keep the agency experience at the index route and compose domain sections from `src/components/agency`; this separates interactive experiences from route metadata.
- Keep portfolio references in a browser-safe static module with local filter/reveal state; this avoids backend requests and keeps reference data independently testable.
- Keep configurable contact information, website scope and commercial calculations in `src/lib/agency-config.ts`; this provides one source of truth for future configuration and pricing tests.
- Contact actions use a shared provider (`useContact`) that tracks the click and opens wa.me with contextual encoded messages; an invalid number falls back to an honest copy-message dialog instead of a fabricated destination or success state.
- The Assistente LAUX is a rule-based chat (`src/components/agency/assistant.tsx`) with a single `replyTo` lookup that is the future plug-in point for a configured AI backend; analytics events queue locally in `window.dataLayer` (`src/lib/analytics.ts`) with no tracking IDs and no cookies.
- Legal content lives on distinct TanStack routes and remains explicitly marked as a draft until validated; this prevents unfinished legal text from appearing definitive.
- Express all brand colors, visual effects and reusable layout styles through semantic tokens in `src/styles.css`; this keeps the white/red system consistent.
- Pre-optimize browser UI dependencies and reject outdated optimized requests in Vite; open previews must reload rather than mix React instances from different dependency generations.

- Render the existing Diagnostic once at the end of the index content, after FinalContact; all lead-capture anchors target diagnostico to avoid duplicate forms.
- Store funnel fields on existing leads and update them through authenticated, column-granted operations; an INSERT trigger on appointments synchronizes linked stages atomically without modifying appointments from funnel actions.
- Reuse LeadDetails for form and funnel response dialogs, and use the existing Select control instead of adding drag-and-drop dependencies to keep the CRM small.
- Commercial routes share one paginated authenticated Query dataset; sales/payment writes enforce ownership and immutable receipt history through database triggers, with atomic idempotent initial registration.
- CRM activities are appended atomically by source-table triggers; browser roles cannot write events and receipt state changes only through a principal-admin checked RPC, preventing forged authors and duplicate success logs.
- The shared AdminHeader owns desktop/sidebar and mobile drawer navigation plus the notification bell; /admin redirects to the existing dashboard and forms live at /admin/formularios, preserving page bodies and calculations.
