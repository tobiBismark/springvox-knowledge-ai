# Frontend Design Documentation

> **Theme note (2026-08-06):** the product is a unified **dark** theme driven by CSS tokens in
> `app/globals.css` (`--canvas #0a0c0b`, `--surface #141816`, `--ink`, `--line #242a26`, accent
> `--accent-jade #14b8a6`); `<html class="dark">`. Both sidebars are dark; each page shows one H1
> (body) with a breadcrumb top bar. In-app logo is inline SVG `RekallMark` via `BrandLogo`. The
> authoritative visual contract is `DESIGN.md` — body sections match the dark banner (Phase 0).

## Overview

Rekall-IQ uses a single Next.js App Router frontend with three clearly separated product surfaces:

- Public marketing and onboarding pages
- Tenant workspace experience under `/dashboard`
- Platform administration experience under `/platform`

The frontend is designed to feel consistent across all surfaces while still making role boundaries obvious. Public pages are lighter and more promotional, tenant pages focus on clarity and productivity, and platform pages emphasize operational oversight.

## Core Frontend Principles

- One enterprise visual language across public, tenant, and platform views
- Clear separation between workspace usage and platform operations
- Business-friendly UI that avoids technical jargon
- Strong mobile and narrow-screen resilience
- Source-backed AI interaction as the central product experience
- Reusable primitives first, branded wrappers second

## Technical Foundation

- Framework: Next.js 16 App Router
- Language: TypeScript
- Styling: Tailwind CSS v4
- UI primitives: `shadcn/ui` and Radix-based components
- Icons: `lucide-react`
- Motion: `motion` plus Tailwind animation utilities
- Charts: `recharts`
- Markdown rendering: `react-markdown`
- Notifications: `sonner`

Key app shell entrypoints:

- [app/layout.tsx](/home/water/Downloads/springvox-knowledge-ai/app/layout.tsx)
- [app/globals.css](/home/water/Downloads/springvox-knowledge-ai/app/globals.css)
- [app/page.tsx](/home/water/Downloads/springvox-knowledge-ai/app/page.tsx)
- [app/dashboard/layout.tsx](/home/water/Downloads/springvox-knowledge-ai/app/dashboard/layout.tsx)
- [app/platform/layout.tsx](/home/water/Downloads/springvox-knowledge-ai/app/platform/layout.tsx)

## Information Architecture

### 1. Public Surface

The public surface introduces the product and drives users into workspace creation or login.

Primary routes:

- `/`
- `/register`
- `/login`
- `/get-started`
- `/invite/[token]`

The landing page is composed from focused sections rather than one monolithic component:

- navigation
- hero
- problem framing
- workflow explanation
- features
- security/control messaging
- use cases
- call to action
- footer

Representative files:

- [src/components/landing/HeroSection.tsx](/home/water/Downloads/springvox-knowledge-ai/src/components/landing/HeroSection.tsx)
- [src/components/AuthForm.tsx](/home/water/Downloads/springvox-knowledge-ai/src/components/AuthForm.tsx)
- [src/components/WorkspaceOnboardingForm.tsx](/home/water/Downloads/springvox-knowledge-ai/src/components/WorkspaceOnboardingForm.tsx)

### 2. Tenant Workspace Surface

The tenant surface is the day-to-day application for workspace admins and viewers.

Primary route group:

- `/dashboard`

Key sections:

- chat
- documents
- upload
- users
- analytics
- knowledge gaps
- settings

The workspace shell adapts based on role:

- Workspace admins see broader navigation and management tools
- Viewers are streamlined toward chat-first usage
- Workspace status restrictions are surfaced in the shell

### 3. Platform Admin Surface

The platform surface supports Rekall-IQ operators managing many companies.

Primary route group:

- `/platform`

Key sections:

- overview
- companies
- users
- analytics
- plans

This surface intentionally looks related to the tenant UI, but its navigation, page copy, and actions make it clear that it is for platform operations rather than tenant usage.

## Layout And Shell Strategy

### Root Shell

The root layout keeps global concerns minimal:

- metadata
- global CSS
- tooltip provider
- toast notifications

This keeps feature-specific decisions inside route groups instead of overloading the application root.

### Dashboard Shell

The dashboard shell in [app/dashboard/layout.tsx](/home/water/Downloads/springvox-knowledge-ai/app/dashboard/layout.tsx) is the main authenticated workspace frame.

Important behaviors:

- Loads current auth, profile, and workspace context on mount
- Redirects unauthenticated users to login
- Redirects users away from routes they should not access
- Changes navigation density based on role
- Shows workspace state and role identity in the sidebar
- Uses a desktop sidebar plus mobile sheet pattern

A notable design choice is that viewer users get a chat-oriented left rail, including recent chat history directly in the shell through [src/components/dashboard/ViewerChatSidebarHistory.tsx](/home/water/Downloads/springvox-knowledge-ai/src/components/dashboard/ViewerChatSidebarHistory.tsx).

### Platform Shell

The platform shell in [app/platform/layout.tsx](/home/water/Downloads/springvox-knowledge-ai/app/platform/layout.tsx) mirrors the dashboard structure but uses:

- platform-only navigation
- strict platform admin gatekeeping
- a distinct "Platform Admin" identity label
- a quick return path back to the user’s own workspace

This gives administrators operational continuity without blurring tenant and platform concerns.

## Design System

### Visual Language

The current brand direction is enterprise, clean, and calm. The product uses a unified **dark** theme — see `DESIGN.md` for the authoritative visual contract.

Primary signals from [app/globals.css](/home/water/Downloads/springvox-knowledge-ai/app/globals.css):

- near-black olive-tinted canvas (`--canvas #0a0c0b`)
- raised dark surfaces (`--surface`, `--surface-2`)
- jade/teal accent (`--accent-jade #14b8a6`) for CTAs, active states, and trust markers
- hairline borders (`--line #242a26`) — depth from tone, not heavy shadows
- dark sidebars (`--brand-sidebar #070908`) with translucent-jade active states

Important tokens include:

- `--canvas` / `--canvas-soft`
- `--surface` / `--surface-2`
- `--ink` / `--ink-soft` / `--ink-muted`
- `--accent-jade` / `--accent-jade-hover` / `--accent-jade-50/100/200`
- `--line` / `--line-soft`
- `--brand-sidebar`
- `--brand-shadow`

### Typography

The app uses Inter as the only named product font for a friendly product feel while preserving dashboard clarity. Typography choices emphasize:

- strong page titles
- compact uppercase labels for section identity
- readable body copy
- clean markdown output in chat answers

The product relies heavily on hierarchy through weight, spacing, and casing rather than decorative type treatments.

### Surfaces And Components

The UI system is layered:

1. Base primitives in `components/ui`
2. Rekall-IQ-branded wrappers in `src/components/ui`
3. Feature-level compositions in `src/components/*`

Examples:

- Base buttons and inputs in `components/ui`
- Branded action buttons in [src/components/ui/app-button.tsx](/home/water/Downloads/springvox-knowledge-ai/src/components/ui/app-button.tsx)
- Branded cards in [src/components/ui/app-card.tsx](/home/water/Downloads/springvox-knowledge-ai/src/components/ui/app-card.tsx)
- Shared page headers in [src/components/shared/AppPageHeader.tsx](/home/water/Downloads/springvox-knowledge-ai/src/components/shared/AppPageHeader.tsx)

This approach avoids duplicating primitive behavior while still letting the product enforce a consistent branded feel.

## Responsive Design Strategy

Responsive behavior is handled mostly through composition and Tailwind breakpoints rather than separate mobile components.

Common patterns:

- Desktop sidebars collapse into sheet drawers on mobile
- Page containers cap width with reusable wrappers
- Tables are wrapped with overflow handling
- Text containers are hardened with aggressive word-wrapping rules
- Long labels and markdown content are explicitly protected against overflow

Useful shared helpers:

- [src/components/layout/SafePageContainer.tsx](/home/water/Downloads/springvox-knowledge-ai/src/components/layout/SafePageContainer.tsx)
- `MobileCardList`
- `ResponsiveToolbar`
- `OverflowGuard`

The frontend already reflects a practical enterprise constraint: admin data tables and chat citations must remain usable on smaller screens without horizontal breakage.

## Major User Experience Flows

### 1. Workspace Creation

The onboarding flow collects company and account details, validates the workspace slug, and creates the tenant admin workspace. The frontend goal here is low-friction setup with clear business framing.

Design priorities:

- plain-language field labels
- clear validation around slug/email/website
- confidence-building brand presentation

### 2. Authentication

Authentication pages are intentionally simple and branded. The user is moved quickly into the correct role-specific route after login.

Design priorities:

- minimal distractions
- clear state feedback
- immediate route resolution after successful auth

### 3. Document Upload

Workspace admins upload approved PDFs or text files. The UI needs to communicate that uploads are curated knowledge sources, not arbitrary chat inputs.

Design priorities:

- trust and clarity around approved content
- visible processing states
- admin-only control surface

### 4. Chat Experience

Chat is the core product interaction and the most mature UX flow in the repo.

The chat page:

- streams answers progressively
- renders markdown
- keeps citations separate from answer text
- supports feedback submission
- supports chat sessions and private history
- supports retry and source inspection workflows

Key file:

- [app/dashboard/chat/page.tsx](/home/water/Downloads/springvox-knowledge-ai/app/dashboard/chat/page.tsx)

Important design decisions:

- the answer body stays readable by not injecting inline citations everywhere
- sources are presented as a separate trust layer
- the empty state offers suggested prompts
- session history is private and easy to reopen
- viewer users are optimized for speed and focus rather than admin complexity

### 5. Platform Operations

Platform pages are designed for scanning many companies quickly, identifying operational issues, and making controlled workspace-level changes.

Design priorities:

- crisp data density
- obvious admin affordances
- clear distinction between metadata access and private tenant content

## Frontend State And Data Access Pattern

The application uses a lightweight client-fetching model instead of a heavy centralized state solution.

Typical pattern:

1. Client component loads auth/session context from Supabase
2. It fetches protected data from internal API routes using a bearer token
3. It stores feature-local state with React hooks
4. It reacts to mutations with local refreshes or event-based invalidation

Examples:

- chat session refresh via `springvox-chat-sessions-changed`
- route-driven session selection with `searchParams`
- local loading and error states per feature

This keeps the code approachable for an MVP-to-growth product while still supporting role-aware experiences.

## Security And UX Boundary Design

The frontend reinforces backend security boundaries instead of assuming UI hiding is enough.

Frontend responsibilities include:

- redirecting users out of disallowed areas
- showing only role-relevant navigation
- keeping platform and tenant navigation distinct
- treating viewer chat history as private

Backend enforcement still remains authoritative, but the frontend reduces confusion by aligning visible affordances with actual permissions.

## Current Strengths

- Clear separation of public, tenant, and platform surfaces
- Strong use of reusable branded wrappers over stable primitives
- Cohesive enterprise visual language
- Chat UX is thoughtfully designed around trust and readability
- Mobile shell patterns are already present across authenticated surfaces
- Role-aware navigation is implemented at the shell level

## Recommended Next Frontend Improvements

- Formalize design tokens beyond CSS variables into documented semantic categories such as action, warning, success, and support states
- Introduce shared loading skeleton patterns for all data-heavy admin pages
- Standardize empty-state and error-state copy across dashboard and platform routes
- Add a lightweight frontend architecture diagram to this doc once the product surface expands further
- Consider extracting repeated authenticated data-loading patterns into reusable hooks
- Add explicit accessibility review for keyboard behavior in chat, sheets, dialogs, and tables

## Suggested Maintenance Rule

When building new UI, prefer this order:

1. Reuse a `components/ui` primitive if it already solves the behavior
2. Wrap it in a Rekall-IQ-branded `src/components/ui` component if the visual pattern is shared
3. Compose that wrapper into feature-specific views

That preserves consistency while keeping product-specific design decisions centralized.
