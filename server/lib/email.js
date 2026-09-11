import { HttpError } from './http.js';

const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails';
const PASSWORD_RESET_SUBJECT = 'Reset your MarketIntel password';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getEnvValue(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function formatExpiration(expiresAt) {
  if (!expiresAt) return 'soon';
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return 'soon';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
}

export function getPasswordResetEmailConfig() {
  const apiKey = getEnvValue(['RESEND_API_KEY', 'EMAIL_RESEND_API_KEY']);
  const from = getEnvValue(['PASSWORD_RESET_EMAIL_FROM', 'RESEND_FROM_EMAIL', 'EMAIL_FROM']);
  const replyTo = getEnvValue(['PASSWORD_RESET_EMAIL_REPLY_TO', 'EMAIL_REPLY_TO']);
  const endpoint = getEnvValue(['RESEND_EMAIL_ENDPOINT']) || RESEND_EMAIL_ENDPOINT;

  return {
    apiKey,
    from,
    replyTo,
    endpoint,
    configured: Boolean(apiKey && from),
    missing: [
      apiKey ? '' : 'RESEND_API_KEY',
      from ? '' : 'PASSWORD_RESET_EMAIL_FROM'
    ].filter(Boolean)
  };
}

export function assertPasswordResetEmailConfigured() {
  const config = getPasswordResetEmailConfig();
  if (!config.configured) {
    throw new HttpError(
      424,
      `Password reset email is not configured. Missing ${config.missing.join(' and ')}.`
    );
  }
  return config;
}

function buildPasswordResetText({ resetUrl, expiresAt }) {
  return [
    'Reset your MarketIntel password',
    '',
    'We received a request to reset the password for your MarketIntel account.',
    `Open this secure link to choose a new password: ${resetUrl}`,
    '',
    `This link expires ${formatExpiration(expiresAt)}.`,
    'If you did not request this reset, you can ignore this email.'
  ].join('\n');
}

function buildPasswordResetHtml({ resetUrl, expiresAt }) {
  const safeUrl = escapeHtml(resetUrl);
  const safeExpiration = escapeHtml(formatExpiration(expiresAt));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(PASSWORD_RESET_SUBJECT)}</title>
  </head>
  <body style="margin:0;background:#f6f8fb;color:#162033;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce3ee;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;">
                <p style="margin:0 0 8px;color:#49607d;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">MarketIntel</p>
                <h1 style="margin:0;color:#102347;font-size:24px;line-height:1.25;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0 0 18px;color:#34445e;font-size:15px;line-height:1.6;">We received a request to reset the password for your MarketIntel account.</p>
                <p style="margin:0 0 24px;">
                  <a href="${safeUrl}" style="display:inline-block;background:#002068;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 18px;border-radius:6px;">Choose a new password</a>
                </p>
                <p style="margin:0 0 14px;color:#52657f;font-size:13px;line-height:1.6;">This link expires ${safeExpiration}.</p>
                <p style="margin:0 0 14px;color:#52657f;font-size:13px;line-height:1.6;">If the button does not work, copy and paste this link into your browser:</p>
                <p style="margin:0;word-break:break-all;color:#002068;font-size:13px;line-height:1.6;">${safeUrl}</p>
                <p style="margin:22px 0 0;color:#52657f;font-size:13px;line-height:1.6;">If you did not request this reset, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendPasswordResetEmail({ to, resetUrl, expiresAt }) {
  if (!to) {
    throw new HttpError(400, 'A reset email recipient is required.');
  }
  if (!resetUrl) {
    throw new HttpError(500, 'Password reset URL could not be generated.');
  }

  const config = assertPasswordResetEmailConfigured();
  const payload = {
    from: config.from,
    to: [to],
    subject: PASSWORD_RESET_SUBJECT,
    text: buildPasswordResetText({ resetUrl, expiresAt }),
    html: buildPasswordResetHtml({ resetUrl, expiresAt })
  };

  if (config.replyTo) {
    payload.reply_to = config.replyTo;
  }

  let response;
  try {
    response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new HttpError(502, 'Unable to reach the password reset email provider.');
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, 'Password reset email could not be sent.', {
      provider: 'resend',
      status: response.status,
      message: result?.message || result?.error || 'Unknown email provider error'
    });
  }

  return {
    provider: 'resend',
    id: result?.id || null
  };
}
