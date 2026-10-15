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
- Contact actions use a shared provider (`useContact`) that tracks the click and opens wa.me with contextual encoded messages; an invalid number falls back to an honest copy-message dialog instead of a fabricated destination or success state.
- The Assistente LAUX is a rule-based chat (`src/components/agency/assistant.tsx`) with a single `replyTo` lookup that is the future plug-in point for a configured AI backend; analytics events queue locally in `window.dataLayer` (`src/lib/analytics.ts`) with no tracking IDs and no cookies.
- Legal content lives on distinct TanStack routes and remains explicitly marked as a draft until validated; this prevents unfinished legal text from appearing definitive.
- Express all brand colors, visual effects and reusable layout styles through semantic tokens in `src/styles.css`; this keeps the white/red system consistent.
- Pre-optimize browser UI dependencies and reject outdated optimized requests in Vite; open previews must reload rather than mix React instances from different dependency generations.

- Render the existing Diagnostic once at the end of the index content, after FinalContact; all lead-capture anchors target diagnostico to avoid duplicate forms.
