# Rekall-IQ Design System

> **CURRENT DIRECTION (2026-08-06) — Unified dark, professional console.**
> The entire product — landing page, auth, dashboard, and platform console — uses one **dark theme**.
> - **Canvas:** near-black olive-tinted `#0a0c0b` (`--canvas`); surfaces `#141816` (`--surface`); raised `#1c211e` (`--surface-2`); hairline borders `#242a26` (`--line`).
> - **Text:** `--ink #f3f5f4`, `--ink-soft #b2bab5`, `--ink-muted #7b847e`.
> - **Accent:** jade/teal — `--accent-jade #14b8a6`, hover `#2dd4bf`, translucent tints `--accent-jade-50/100/200`. Use the `teal-*` Tailwind scale or the tokens — never `cyan-*`.
> - **Shells:** both the dashboard and platform sidebars are dark (`--brand-sidebar #070908`); active states use translucent jade.
> - **One title per page:** the body owns the page H1 (`AppPageHeader` / `PlatformPageHeader`); the top bar is a quiet breadcrumb (workspace context + actions) and must never repeat the title.
> - **Logo:** in-app mark is the inline SVG `RekallMark` in `src/components/brand/BrandLogo.tsx`. Favicon: `public/brand/rekall-icon.svg`. Raster `rekall-mark.png` is retained only for email HTML and apple-touch / OG contexts where SVG is impractical.
> - **Radii:** `rounded-lg`/`rounded-xl`, denser spacing, subtle shadows — an "app" feel, not pill-heavy marketing.
> - `<html class="dark">`; tokens live in `app/globals.css` `:root` — the **single** token source. There is no separate `.dark` override block (the product is unified dark; `:root` already carries the dark values, so a `.dark` block would only duplicate and drift). Shared classes (`admin-shell-card`, `app-button-*`, `admin-input`) and `AppButton` tones follow these tokens and must stay in sync.
>
> The legacy v1 (navy `#0F172A` + cyan) **and** the interim light PipesHub direction are both retired. Body sections below match this dark contract.

This file is the permanent visual design contract for Rekall-IQ.

Future AI agents, frontend engineers, and contributors must read this file before making UI or UX changes. It defines how Rekall-IQ should look, feel, behave, and communicate across public pages, onboarding, workspace dashboards, platform administration, document workflows, chat, analytics, and trust pages.

Do not introduce a new visual direction without updating this file first.

## 1. Design Philosophy

Rekall-IQ is a secure workplace knowledge product. Its interface must communicate trust, calm intelligence, and operational control.

The product exists so organisations can upload approved documents and let staff ask questions from those documents. The design should make this feel safe, clear, and easy, especially for non-technical users.

Core philosophy:

- Workplace trust: the interface should feel stable, credible, and suitable for company information.
- Calm intelligence: AI should feel helpful and controlled, not magical or unpredictable.
- Source-backed clarity: answers, citations, document states, and failed states should be easy to understand.
- Non-technical usability: viewers and workspace admins should not need to understand embeddings, vectors, chunks, or RAG.
- Enterprise control: admins need precise tools for documents, users, analytics, settings, and governance.
- Lightweight execution: pages should feel fast, direct, and uncluttered.

Rekall-IQ should feel closer to a mature SaaS workspace than a marketing-heavy AI demo.

## 2. Brand Personality

Rekall-IQ speaks with a professional, helpful, and human voice.

Personality traits:

- Reliable: always clear about state, ownership, and next steps.
- Precise: admin tools should be direct and predictable.
- Helpful: empty states, errors, and guidance should reduce confusion.
- Professional: language should suit workplace users and business admins.
- Human: copy can be warm, but should avoid hype.
- Measured: AI claims must be grounded and source-aware.

Rekall-IQ should not sound like a speculative AI product promising too much. It should sound like a dependable assistant that respects company knowledge boundaries.

## 3. Visual Theme & Atmosphere

Rekall-IQ is a **unified dark product**. Landing, auth, dashboard, help, and platform console share one olive-tinted dark canvas.

Primary atmosphere:

- Near-black olive canvas (`--canvas #0a0c0b`).
- Raised surfaces (`--surface`, `--surface-2`) for cards, tables, dialogs, and panels.
- Hairline borders (`--line #242a26`) — depth from tone, not heavy shadows.
- Dark sidebars (`--brand-sidebar #070908`) with translucent-jade active states.
- Jade/teal accent only for focus, CTAs, active nav, and trust markers.
- Clear semantic status colors (emerald / amber / red) on dark surfaces.
- Minimal shadows; restrained landing glow only on marketing hero moments.

Authenticated surfaces stay work-focused: dense enough for operators, calm enough for non-technical viewers.

Avoid:

- Light/white dashboard canvases or light sidebars.
- `cyan-*` Tailwind utilities (use `teal-*` or `--accent-jade*`).
- Random gradients, decorative blobs, orbs, or heavy glassmorphism inside the app.
- Oversized marketing card stacks in admin views.
- Generic neon “AI dashboard” styling.
- Pill-heavy chrome that fights the denser “app” radius system (`rounded-lg` / `rounded-xl`).

## 4. Color Palette & Usage

Canonical tokens live in `app/globals.css` `:root` — the single source (no separate `.dark` block). Prefer CSS variables over hard-coded hex in components.

| Role | Token | Value |
|------|--------|--------|
| Canvas | `--canvas` | `#0a0c0b` |
| Soft canvas | `--canvas-soft` | `#101412` |
| Surface | `--surface` | `#141816` |
| Raised surface | `--surface-2` | `#1c211e` |
| Border | `--line` | `#242a26` |
| Soft border | `--line-soft` | `#1b201d` |
| Text primary | `--ink` | `#f3f5f4` |
| Text secondary | `--ink-soft` | `#b2bab5` |
| Text muted | `--ink-muted` | `#7b847e` |
| Accent | `--accent-jade` | `#14b8a6` |
| Accent hover | `--accent-jade-hover` | `#2dd4bf` |
| Accent tints | `--accent-jade-50/100/200` | translucent jade |
| Sidebar | `--brand-sidebar` | `#070908` |
| Success | emerald scale on dark | ready / active / completed |
| Warning | amber scale on dark | processing / trial / attention |
| Destructive | red scale on dark | failed / suspend / delete |

Usage rules:

- Sidebars and shell anchors use `--brand-sidebar` / `--canvas-soft`, never light navy panels.
- Primary CTAs use jade fill with dark ink text (`#04110e`) for contrast — see `.app-button-primary` and `AppButton` tone `primary`.
- Cards, tables, dialogs, and forms use `--surface` / `--surface-2`, not white.
- Jade is an accent, not a page fill. Most UI remains neutral olive-gray.
- Never use `cyan-*` for brand chrome.
- Status colors stay semantic and sparse.

## 5. Typography Rules

Preferred font stack:

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Typography should support scanning.

Rekall-IQ uses Inter as the only named product font. It gives the interface a familiar, precise SaaS feel while staying clean enough for enterprise dashboards and data tables.

Recommended scale:

- Public landing H1: `text-4xl` to `text-6xl`, only on true hero sections.
- Auth/onboarding H1: `text-2xl` to `text-3xl`.
- Dashboard page title: `text-2xl` to `text-3xl`.
- Platform page title: `text-2xl` to `text-3xl`.
- Section heading: `text-lg` to `text-xl`.
- Card title: `text-sm` to `text-lg`, depending on density.
- Table text: `text-xs` to `text-sm`.
- Body text: `text-sm` to `text-base`.
- Helper text: `text-xs`.
- Chat answer text: `text-sm` to `text-[15px]`, with comfortable line height.
- Labels/eyebrows: `text-[10px]` to `text-xs`, uppercase, increased tracking.

Rules:

- Dashboard headings must not be oversized.
- Admin pages prioritize scanning over editorial expression.
- Tables, forms, filters, and toolbars should use compact readable type.
- Landing pages may be more expressive but must remain restrained and product-relevant.
- Avoid negative letter spacing.
- Avoid scaling font size with viewport width.
- Do not use huge marketing typography inside dashboards.

## 6. Layout Principles

Rekall-IQ layouts should be spacious enough to breathe but dense enough for repeated workplace use.

App shell (shared, `src/components/shell/`):

- Sidebar navigation is **grouped into labeled sections** (Workspace / Insights / Administration in the dashboard; Monitor / Operations / Administration in the platform console) — never a long flat list.
- **Command palette** (`CommandPalette.tsx`, cmdk): opened with `Cmd+K` / `Ctrl+K` on every authenticated surface. Group commands under `Go to` (page navigation) and `Actions` (new chat, upload, notifications). Use sentence-case labels and `aria-selected` styling; close on navigation.
- **Profile menu** (`ProfileMenu.tsx`): one dropdown from the sidebar footer — email/role header, Account, Help & Guides, Sign out. No separate full-width Sign Out button competing with Account.
- **Workspace switcher** (`WorkspaceSwitcher.tsx`): compact context row in the sidebar. Platform admins get a dropdown with a `Platform console` jump; everyone else sees a static row (users belong to a single workspace).
- Keep sidebar group labels as small uppercase eyebrows (`text-[10px]`, `tracking-[0.2em]`, `--ink-muted`) and nav items sentence-case.

Page layout:

- Main dashboard content should generally use `max-w-7xl`.
- Narrow reading/legal content should use `max-w-3xl` or `max-w-4xl`.
- Platform admin pages may use `max-w-7xl`.
- Use page padding of `p-4` on mobile, `p-6` on tablet, and `p-8` to `p-10` on desktop.
- Use `gap-4`, `gap-6`, or `gap-8` for most grids.
- Avoid full-page horizontal overflow.
- Always set `min-w-0` on flex/grid children that contain long text.

Dashboard layout:

- Sidebar on desktop.
- Sheet/drawer navigation on mobile.
- Sticky top header is acceptable for workspace context and quick actions.
- Page headers should be concise.
- Action bars should appear near the top and be easy to scan.

Card layout:

- Cards should hold specific units of information or repeated items.
- Do not wrap page sections in decorative cards unless the section is a contained tool or data region.
- Avoid cards inside cards.
- Use rounded corners consistently with the current app, generally `rounded-xl`, `rounded-2xl`, or existing Rekall-IQ card radius.

## 7. Component Styling Rules

Use existing shared components before creating new visual patterns.

### AppButton

- Primary: jade fill (`--accent-jade`) with dark text `#04110e`; hover `--accent-jade-hover`.
- Secondary: `--surface` fill, `--line` border, `--ink` / `--ink-soft` text.
- Subtle: translucent jade surface (`--accent-jade-50`) with jade text.
- Destructive: red-tinted surface or red text on dark.
- Prefer shared classes (`.app-button-*`) or `AppButton` — keep both in sync.
- Include icons for clear actions (upload, delete, search, copy, send, new chat).
- Disabled states must reduce contrast and block pointer action.
- Button text should be short and action-oriented.

### AppCard

- Use `--surface` background, `--line` border, subtle `--brand-shadow`.
- Keep cards compact.
- Use cards for stats, repeated items, data groups, and contained tools.
- Avoid oversized decorative cards.
- Avoid nesting cards.

### StatCard

- KPI cards should show one number, one label, and optional short helper text.
- Use compact spacing.
- Use icons only when they improve scanning.
- Do not turn KPI cards into marketing blocks.

### StatusBadge

- Use clear semantic color:
  - ready/completed/active: emerald
  - processing/trial: amber or blue/cyan
  - failed/suspended/destructive: red
  - inactive/muted: slate
- Status labels should be human-readable.
- Avoid raw database labels when user-facing.

### AppTable

- Desktop tables should be compact and readable.
- Header text should be small, uppercase, and muted.
- Rows should have subtle hover states.
- Actions should be right-aligned.
- Long filenames, emails, company names, and titles must truncate with accessible full text via `title` where useful.

### PageHeader

- Use an eyebrow, title, subtitle, and optional right-side action.
- Keep subtitles short.
- Avoid explaining every feature in the header.

### EmptyState

- Empty states should explain what happened and what the next useful action is.
- Use a calm icon and concise copy.
- Do not use playful illustrations in enterprise admin areas.

### Dialog and Sheet

- Dialogs are for confirmation, editing, and focused decisions.
- Sheets are for mobile navigation, filters, and side panels.
- Always include accessible titles and descriptions.
- Keep destructive confirmations clear and direct.

### Form Inputs

- Inputs use `.admin-input`: `--canvas-soft` background, `--line` border, jade focus ring (`--accent-jade-100`).
- Labels should be clear and business-friendly; prefer sentence case over aggressive all-caps where density allows.
- Helper text should be short and use `--ink-muted`.
- Validation errors should be close to the related field.

### Search and Filter Bars

- Search should be visually prominent but not oversized.
- Filter controls should be compact.
- Clear-filter actions should be easy to find when filters are active.

## 8. Dashboard Patterns

Tenant and workspace dashboards should be operational and scannable.

Use:

- Compact KPI cards.
- Clear action bars.
- Tables on desktop.
- Mobile cards on small screens.
- Short page headers.
- Useful empty states.
- Consistent spacing between sections.

Avoid:

- Large marketing hero sections.
- Repeating explanatory text on every page.
- Oversized charts.
- Decorative gradients.
- Dense dashboards without grouping.

Workspace admins need to manage documents, users, analytics, settings, and knowledge gaps quickly. Prioritize clarity and repeated use.

## 9. Platform Admin Patterns

Platform Admin is for Rekall-IQ operational management, not tenant content browsing.

Platform admin UI should emphasize:

- Company metadata.
- Workspace status.
- Plan assignment.
- User counts.
- Document counts.
- Usage summaries.
- Internal notes.
- Operational actions such as suspend, reactivate, trial, inactive, and plan change.

Privacy rules:

- Do not show tenant private document text in platform admin UI.
- Do not show full private chat conversations in platform admin UI.
- Do not show private user chat session history.
- Platform pages should make operational boundaries clear.

Visual rules:

- Use compact enterprise admin layouts.
- Keep tables dense but readable.
- Use status badges consistently.
- Keep destructive/admin actions explicit and confirmed.

## 10. Chat UI Patterns

Chat is the core user experience. It should feel familiar, centered, private, and source-backed.

Chat layout:

- Use a centered thread with comfortable reading width.
- Keep assistant answers clean and uncluttered.
- Use user message bubbles or clearly grouped user messages.
- Use a sticky composer at the bottom.
- Keep `New Chat` and `Recent Chats` easy to access.
- Viewer chat history should remain private and user-scoped.
- Speech-to-text should use a clear microphone icon button with accessible labels.

Assistant messages:

- Do not wrap every answer in a heavy card.
- Render markdown clearly.
- Use readable line height.
- Keep source citations separate from the answer body.
- Use a compact source section with filename, preview, and source details.
- Show copy and feedback actions without overwhelming the answer.

Loading states:

- Use simple states such as `Thinking...`, `Searching approved documents...`, or equivalent.
- Avoid flashy AI animations.
- Streaming answers should feel smooth but restrained.

Source behavior:

- Label citations as `Sources`.
- Show sources only when they exist.
- If no supported answer is found, use clear language such as `No answer found in the uploaded documents.`

## 11. Documents & Upload Patterns

The document flow must be clear for non-technical admins.

Supported file types should be visible:

- PDF
- TXT
- DOCX
- CSV
- XLSX
- PPTX

Upload page rules:

- Make drag-and-drop obvious.
- Show max file size.
- Show supported formats near the upload control.
- Use clear processing language.
- Do not mention embeddings, vectors, chunks, or parser internals to end users.
- After upload, tell users the document is processing in the background.

Documents page rules:

- Show filename.
- Show file type.
- Show status: Processing, Completed/Ready, Failed.
- Show human-readable failure messages.
- Show section count only as a simple measure, not as a technical concept.
- Deleting a document must require confirmation.

End-user language:

- Use `document`, `file`, `source`, `processing`, `ready`, `failed`.
- Avoid `embedding`, `vector`, `chunk`, `Qdrant`, `RAG`, `parser pipeline`.

## 12. Data Table Patterns

Tables are important for workspace and platform administration.

Desktop:

- Use tables for documents, users, companies, plans, feedback, and analytics lists.
- Keep row height compact.
- Use muted uppercase table headers.
- Align actions to the right.
- Use hover states for rows.
- Use badges for status and role.

Mobile:

- Convert tables to cards.
- Each mobile card should show the primary label, key metadata, status, and actions.
- Avoid full-page horizontal scrolling on mobile.

Rules:

- Truncate long text.
- Preserve full text through `title` attributes or accessible detail views.
- Use pagination for longer lists.
- Search and filters should stay above the table.
- Row action menus are preferred when actions grow beyond one or two.

## 13. Analytics & Charts

Analytics should answer practical business questions.

Good analytics:

- How many questions were asked?
- How many answers had sources?
- Which documents are being used?
- What questions are not answered yet?
- Are users adopting the assistant?

Chart rules:

- Use clear labels.
- Prefer simple bar and line charts.
- Keep legends readable.
- Avoid decorative charts.
- Avoid 3D charts.
- Avoid charts without a clear decision value.
- Pair charts with compact KPI cards when useful.

## 14. Legal & Trust Pages

Legal and trust pages should be readable, calm, and precise.

Rules:

- Use a narrow reading width.
- Use clear headings and short paragraphs.
- Use calm `--ink-soft` body text on the dark canvas.
- Use trust-focused language.
- Do not overclaim certifications or security guarantees.
- Be explicit about workspace isolation, document handling, AI processing, and deletion behavior.
- Avoid marketing visuals on legal pages.

## 15. Responsive Behavior

Rekall-IQ must be first-class on mobile.

390px mobile:

- No horizontal page overflow.
- Sidebars become sheets.
- Tables become mobile cards.
- Chat composer remains usable.
- Buttons must not overflow.
- Long filenames and emails must truncate or wrap safely.

430px mobile:

- Preserve comfortable form spacing.
- Keep upload actions reachable.
- Avoid two-column layouts unless content still fits comfortably.

Tablet:

- Use two-column layouts only when content benefits from it.
- Sidebars may remain collapsed depending on route.
- Tables can appear if readable; otherwise use cards.

Desktop:

- Use persistent sidebars for dashboard and platform areas.
- Use wider data tables.
- Keep content constrained; do not stretch text across the full viewport.

Universal rules:

- Use `min-w-0` inside flex/grid layouts.
- Use `overflow-wrap:anywhere` for long user-generated or document-derived text.
- Avoid fixed widths that break small screens.
- Touch targets should be at least 40px high or wide where possible.

## 16. Micro-interactions

Interactions should be subtle and useful.

Use:

- Soft hover backgrounds.
- Slight border color changes.
- Clear active navigation states.
- Visible focus rings.
- Smooth drawer/sheet transitions.
- Loading spinners for async actions.
- Copy success feedback.
- Toasts for successful saves or errors.

Avoid:

- Heavy page animations.
- Bouncy effects.
- Overly animated AI states.
- Animations that delay admin workflows.
- Hover-only access to critical actions on mobile.

## 17. Accessibility Rules

Accessibility is required, not optional.

Rules:

- Maintain readable contrast for all text.
- Use visible focus states.
- Add `aria-label` to icon-only buttons.
- Dialogs must have titles and descriptions.
- Sheets must have accessible labels.
- Form fields must have labels.
- Error messages must be readable and close to the relevant control.
- Keyboard navigation must work for menus, dialogs, sheets, forms, and chat controls.
- Do not rely on color alone for status.
- Respect touch target size on mobile.

## 18. Copywriting Rules

Use plain workplace language.

Preferred phrases:

- `Upload approved documents`
- `Ask questions in plain English`
- `Answers based on your company documents`
- `Sources`
- `No answer found`
- `Processing document`
- `Document ready`
- `Upload failed`
- `Workspace`
- `Company documents`
- `Recent chats`
- `New chat`

Avoid in end-user UI:

- `embeddings`
- `vectors`
- `chunks`
- `RAG`
- `pipeline`
- `tenant_admin`
- `platform_admin`
- `hallucination`, unless explained simply in legal/trust content
- raw database field names
- internal provider names unless shown in technical/legal context

Tone:

- Be clear before being clever.
- Be reassuring without overpromising.
- Explain errors in human language.
- Keep admin copy concise.
- Keep viewer chat copy simple.

## 19. Do's and Don'ts

Do:

- Use compact cards for stats and repeated items.
- Keep admin pages scannable.
- Use teal/cyan sparingly for active states and trust signals.
- Make mobile layouts first-class.
- Show useful empty states.
- Use shared components before adding new styles.
- Keep document and chat language non-technical.
- Show clear Processing, Ready, and Failed states.
- Preserve platform admin privacy boundaries.

Don't:

- Create oversized dashboard cards.
- Add random gradients.
- Use raw database labels in user-facing UI.
- Expose technical terms to viewers.
- Add dark cinematic sections inside dashboards.
- Make every section a card.
- Nest cards inside cards.
- Create new visual styles for one page only.
- Over-animate loading states.
- Use decorative charts or fake analytics.
- Hide critical actions behind hover-only behavior on mobile.

## 20. Agent Prompt Guide

Future AI agents must follow these instructions when doing UI work:

1. Read `DESIGN.md` before making frontend changes.
2. Preserve backend behavior unless explicitly asked to change it.
3. Do not change auth, roles, workspace isolation, Supabase, Qdrant, Gemini, Inngest, RAG, or platform admin privacy rules during UI work.
4. Use existing shared components first.
5. Keep UI consistent with Rekall-IQ's enterprise SaaS style.
6. Do not introduce new colors, spacing systems, or component styles without updating `DESIGN.md`.
7. Keep admin pages compact and scannable.
8. Keep viewer-facing language non-technical.
9. Test mobile responsiveness, especially around 390px and 430px widths.
10. Prevent horizontal overflow.
11. Use accessible labels for icon buttons.
12. Run `npx tsc --noEmit` after code changes.
13. Run `npm run build` after significant UI or route changes.

Reusable prompt:

```text
Use DESIGN.md as the source of truth. Preserve backend behavior and existing routes. Update the UI using existing Rekall-IQ shared components, keep pages responsive at 390px and 430px, avoid technical end-user language, and run npx tsc --noEmit plus npm run build when code changes are complete.
```
