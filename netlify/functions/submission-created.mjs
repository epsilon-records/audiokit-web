// Sends a confirmation email when someone joins the early-access list.
//
// Netlify runs this function on its `submission-created` event, after a verified (non-spam)
// form submission is stored. It only acts on the `access` form. It never fails the submission:
// on missing configuration, bad input or a Resend error it logs and returns 200.
//
// Environment (set in Netlify, never committed):
//   RESEND_API_KEY       Resend API key with sending access
//   AUDIOKIT_FROM_EMAIL  sender, e.g. `AudioKit <hello@mail.example.com>`, on a domain verified in Resend

const FORM_NAME = "access";
const RESEND_URL = "https://api.resend.com/emails";
const SUBJECT = "You're on the AudioKit early-access list";

// Deliberately simple; Resend validates again.
const EMAIL_RE = /^[^\s@<>()",;:\\[\]]+@[^\s@<>()",;:\\[\]]+\.[^\s@<>()",;:\\[\]]{2,}$/;

export function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

const done = (reason) => {
  console.log(`access confirmation: ${reason}`);
  return { statusCode: 200, body: "" };
};

// The email has no user-supplied text in it, so a submitted value can't be echoed to a stranger.
export function renderEmail(siteUrl) {
  const site = siteUrl || "https://audiokit.netlify.app";
  const host = site.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const text = [
    "Thanks for requesting access to AudioKit.",
    "",
    "You're on the early-access list. We'll email you at this address when access opens.",
    "",
    `Until then, the docs are at ${site.replace(/\/$/, "")}/docs/`,
    "",
    "If you didn't request this, you can ignore this email.",
    "",
    "-- AudioKit",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#0c0e11;color:#e6e8eb;font-family:'Space Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c0e11;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#14171c;border:1px solid #262b33;border-radius:10px;">
<tr><td style="padding:32px;">
<p style="margin:0 0 20px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:13px;color:#ffb547;">AudioKit &middot; 202 Accepted</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#e6e8eb;">You're on the early-access list.</h1>
<p style="margin:0 0 16px;color:#c3c9d1;">Thanks for requesting access to AudioKit. We'll email you at this address when access opens.</p>
<p style="margin:0 0 24px;color:#c3c9d1;">Until then, the docs are at <a href="${site.replace(/\/$/, "")}/docs/" style="color:#ffb547;text-decoration:underline;">${host}/docs</a>.</p>
<p style="margin:0;font-size:13px;color:#9aa3ae;">If you didn't request this, you can ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject: SUBJECT, text, html };
}

export async function handler(event) {
  try {
    let payload;
    try {
      payload = JSON.parse(event?.body || "{}").payload;
    } catch {
      return done("skipped, body is not JSON");
    }
    if (!payload || payload.form_name !== FORM_NAME) return done("skipped, not the access form");

    const data = payload.data || {};
    if (data["bot-field"]) return done("skipped, honeypot filled");

    const to = String(data.email ?? payload.email ?? "").trim();
    if (!isValidEmail(to)) return done("skipped, invalid email");

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.AUDIOKIT_FROM_EMAIL;
    if (!apiKey || !from) return done("not sent, RESEND_API_KEY or AUDIOKIT_FROM_EMAIL is not set");

    const { subject, text, html } = renderEmail(process.env.URL);
    const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
    // Netlify can retry the event; the submission id keeps Resend from sending twice.
    if (payload.id) headers["Idempotency-Key"] = `access-confirmation/${payload.id}`;

    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return done(`not sent, Resend returned ${res.status} ${detail}`);
    }
    const { id } = await res.json().catch(() => ({}));
    return done(`sent (resend id ${id ?? "unknown"}, submission ${payload.id ?? "unknown"})`);
  } catch (err) {
    return done(`not sent, ${err?.name ?? "Error"}: ${err?.message ?? err}`);
  }
}
