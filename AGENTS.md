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
- Keep the agency experience at the index route and compose domain sections from `src/components/agency`; this separates interactive experiences from route metadata.
- Keep configurable contact information, website scope and commercial calculations in `src/lib/agency-config.ts`; this provides one source of truth for future configuration and pricing tests.
- Contact actions use a shared provider and prepare WhatsApp messages; an absent configured number opens an honest pending-contact dialog instead of a fabricated destination or success state.
- Legal content lives on distinct TanStack routes and remains explicitly marked as a draft until validated; this prevents unfinished legal text from appearing definitive.
- Express all brand colors, visual effects and reusable layout styles through semantic tokens in `src/styles.css`; this keeps the white/red system consistent.
