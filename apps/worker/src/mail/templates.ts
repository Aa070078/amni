import { MailTemplate, type MailJob } from "@amni/shared";

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, "");

function layout(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2328;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:32px 40px;">
              <div style="font-size:20px;font-weight:700;color:#4f46e5;letter-spacing:-0.02em;margin-bottom:24px;">Amni</div>
              ${body}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">You received this because you have an account with Amni. If you did not expect this email, you can safely ignore it.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const actionButton = (href: string, label: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:8px;background:#4f46e5;"><a href="${href}" style="display:inline-block;padding:12px 20px;border-radius:8px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;

export function renderVerificationMail(input: { firstName: string; token: string; baseUrl: string }): RenderedMail {
  const { firstName, token, baseUrl } = input;
  const link = `${normalizeBaseUrl(baseUrl)}/verify?token=${encodeURIComponent(token)}`;
  const greeting = escapeHtml(firstName);
  const body = `
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Verify your email</h1>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">Hi ${greeting},</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">Welcome to Amni. Please confirm your email address to activate your account.</p>
              ${actionButton(link, "Verify email")}
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">This link expires in 24 hours. If the button does not work, copy this address into your browser:</p>
              <p style="margin:4px 0 0;font-size:12px;line-height:1.6;color:#4f46e5;word-break:break-all;">${link}</p>`;
  return {
    subject: "Verify your Amni email",
    html: layout(body),
    text: `Hi ${firstName},\n\nWelcome to Amni. Please confirm your email address to activate your account.\n\n${link}\n\nThis link expires in 24 hours.`,
  };
}

export function renderResetMail(input: { firstName: string; token: string; baseUrl: string }): RenderedMail {
  const { firstName, token, baseUrl } = input;
  const link = `${normalizeBaseUrl(baseUrl)}/reset?token=${encodeURIComponent(token)}`;
  const greeting = escapeHtml(firstName);
  const body = `
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Reset your password</h1>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">Hi ${greeting},</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">We received a request to reset your Amni password. Click below to choose a new one.</p>
              ${actionButton(link, "Reset password")}
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
              <p style="margin:4px 0 0;font-size:12px;line-height:1.6;color:#4f46e5;word-break:break-all;">${link}</p>`;
  return {
    subject: "Reset your Amni password",
    html: layout(body),
    text: `Hi ${firstName},\n\nWe received a request to reset your Amni password.\n\n${link}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.`,
  };
}

export function renderWelcomeMail(input: { firstName: string; companyName: string }): RenderedMail {
  const { firstName, companyName } = input;
  const greeting = escapeHtml(firstName);
  const company = escapeHtml(companyName);
  const body = `
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Welcome to Amni, ${greeting}!</h1>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">Your workspace for <strong>${company}</strong> is ready. Finish your company profile to provision your ERP, then start invoicing, tracking inventory and managing your team from one place.</p>
              <p style="margin:0;font-size:14px;line-height:1.6;">We are here to help — sign in anytime at your workspace.</p>`;
  return {
    subject: `Welcome to Amni, ${firstName}!`,
    html: layout(body),
    text: `Hi ${firstName},\n\nWelcome to Amni! Your workspace for ${companyName} is ready. Finish your company profile to provision your ERP, then start invoicing, tracking inventory and managing your team from one place.`,
  };
}

export function renderInvitationMail(input: { firstName: string; companyName: string; role: string; token: string; baseUrl: string }): RenderedMail {
  const link = `${normalizeBaseUrl(input.baseUrl)}/accept-invite?token=${encodeURIComponent(input.token)}`;
  const body = `
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Join ${escapeHtml(input.companyName)} on Amni</h1>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">Hi ${escapeHtml(input.firstName)},</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">You have been invited as ${escapeHtml(input.role.toLowerCase())}. Set your password to accept the invitation.</p>
              ${actionButton(link, "Accept invitation")}
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">This invitation expires in 7 days.</p>`;
  return { subject: `Join ${input.companyName} on Amni`, html: layout(body), text: `Hi ${input.firstName},\n\nYou have been invited to join ${input.companyName} as ${input.role.toLowerCase()}.\n\n${link}\n\nThis invitation expires in 7 days.` };
}

export function renderMail(job: MailJob, baseUrl: string): RenderedMail {
  switch (job.template) {
    case MailTemplate.VERIFICATION:
      return renderVerificationMail({ firstName: job.firstName, token: job.token, baseUrl });
    case MailTemplate.RESET:
      return renderResetMail({ firstName: job.firstName, token: job.token, baseUrl });
    case MailTemplate.WELCOME:
      return renderWelcomeMail({ firstName: job.firstName, companyName: job.companyName });
    case MailTemplate.INVITATION:
      return renderInvitationMail({ ...job, baseUrl });
  }
}
