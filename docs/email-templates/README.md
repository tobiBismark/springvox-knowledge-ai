# Rekall-IQ — Supabase Auth Email Templates

Branded, mobile-friendly HTML for the auth emails Supabase sends through your Resend SMTP.

## How to install
1. Supabase Dashboard → **Authentication → Emails → Templates**.
2. For each template below, open the matching tab, paste the **HTML** from the file, and save:
   - `confirm-signup.html` → **Confirm signup**
   - `reset-password.html` → **Reset password** (Recovery)
   - `magic-link.html` → **Magic Link**
   - `invite-user.html` → **Invite user** (only if you use Supabase's native invite; Rekall-IQ's own invite flow uses Resend directly, so this is optional)
3. Set a clear **Subject** for each (suggestions are at the top of each file as an HTML comment).
4. In **Authentication → URL Configuration**, set **Site URL** to `https://rekalliq.springvoxsl.com` and add it to **Redirect URLs** so the links resolve correctly.

## Notes
- These use Supabase Go-template variables: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}`. Leave them exactly as written.
- All CSS is inlined and the layout is table-based for broad email-client support (incl. Outlook).
- The logo loads from `https://rekalliq.springvoxsl.com/brand/rekall-mark.jpeg`; if a client blocks images, the "Rekall-IQ" text wordmark still shows.
- Product notifications (invites, trials, welcome, alerts) are separate — those are sent from the app via the Resend **API** (`src/lib/email/`), not these dashboard templates.
