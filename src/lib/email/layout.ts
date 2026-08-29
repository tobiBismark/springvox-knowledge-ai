const MARK_URL = 'https://rekalliq.springvoxsl.com/brand/rekall-mark.jpeg';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type EmailButton = { label: string; url: string };

/**
 * Renders a branded, email-client-safe HTML email (table layout + inline CSS).
 * Matches the Supabase auth templates: dark header band + light body + jade CTA.
 * All interpolated text is HTML-escaped.
 */
export function renderBrandedEmail({
  heading,
  paragraphs,
  button,
  footerNote = "Secure answers from your company's approved documents.",
}: {
  heading: string;
  paragraphs: string[];
  button?: EmailButton;
  footerNote?: string;
}): string {
  const body = paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4b524c;">${escapeHtml(text)}</p>`,
    )
    .join('');

  const cta = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;">
        <tr>
          <td align="center" style="border-radius:10px;background-color:#0d9488;">
            <a href="${escapeHtml(button.url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(button.label)}</a>
          </td>
        </tr>
      </table>`
    : '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f5;margin:0;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3e7e3;">
        <tr>
          <td style="background-color:#0b1413;padding:22px 28px;" align="left">
            <img src="${MARK_URL}" width="32" height="32" alt="Rekall-IQ" style="vertical-align:middle;border:0;" />
            <span style="vertical-align:middle;color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:-0.2px;margin-left:8px;">Rekall<span style="color:#2dd4bf;">-IQ</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 8px 28px;">
            <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#161a17;">${escapeHtml(heading)}</h1>
            ${body}
            ${cta}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;border-top:1px solid #e3e7e3;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#9aa39d;">© 2026 Rekall-IQ · ${escapeHtml(footerNote)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
