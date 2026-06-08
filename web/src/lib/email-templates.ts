/**
 * Email Templates — FinalWishes
 *
 * Royal Neo-Deco styled HTML email templates with inline CSS.
 * Each function returns { subject, html, text } for the Firestore
 * `mail` collection (consumed by the firestore-send-email extension).
 *
 * Design tokens:
 *   Royal Blue: #133378
 *   Gold:       #C8A951
 *   Headings:   Georgia (Cinzel fallback for email clients)
 *   Body:       Inter, Arial, sans-serif
 *
 * @version 1.0.0
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailOutput {
  subject: string;
  html: string;
  text: string;
}

export interface EstateInvitationEmailParams {
  inviterName: string;
  estateName: string;
  recipientName: string;
  role: string;
  acceptUrl: string;
}

export interface CapsuleDeliveryEmailParams {
  senderName: string;
  recipientName: string;
  title: string;
  message: string;
  estateName: string;
}

export interface WelcomeEmailParams {
  userName: string;
  estateName?: string;
}

export interface PasswordResetEmailParams {
  userName: string;
  resetUrl: string;
}

export interface MfaEnabledEmailParams {
  userName: string;
}

export interface DocumentSharedEmailParams {
  sharedBy: string;
  recipientName: string;
  documentName: string;
  estateName: string;
  viewUrl: string;
}

export interface EstateStatusChangeEmailParams {
  estateName: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}

// ─── Layout Shell ─────────────────────────────────────────────────────────────

const DASHBOARD_URL = 'https://finalwishes-prod.web.app';

function wrapInLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8FAFC;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;">
        <!-- Header -->
        <tr><td style="background:#133378;padding:32px 40px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#FFFFFF;font-family:'Georgia',serif;font-size:24px;letter-spacing:0.15em;margin:0;font-weight:700;">FINALWISHES</h1>
          <p style="color:#C8A951;font-family:'Georgia',serif;font-size:11px;letter-spacing:0.2em;margin:8px 0 0;text-transform:uppercase;">The Estate Operating System</p>
        </td></tr>
        <!-- Gold accent line -->
        <tr><td style="height:3px;background:#C8A951;font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Content -->
        <tr><td style="background:#FFFFFF;padding:40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#F8FAFC;padding:24px 40px;text-align:center;border-top:1px solid #E2E8F0;">
          <p style="color:#94A3B8;font-size:12px;margin:0;font-family:'Inter',Arial,sans-serif;">FinalWishes &mdash; The Estate Operating System</p>
          <p style="color:#CBD5E1;font-size:11px;margin:8px 0 0;font-family:'Inter',Arial,sans-serif;">AES-256 Encrypted &middot; SOC 2 Compliant</p>
          <p style="color:#CBD5E1;font-size:11px;margin:8px 0 0;font-family:'Inter',Arial,sans-serif;">
            <a href="${DASHBOARD_URL}/unsubscribe" style="color:#94A3B8;text-decoration:underline;">Unsubscribe</a> &middot;
            <a href="${DASHBOARD_URL}/privacy" style="color:#94A3B8;text-decoration:underline;">Privacy Policy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
  <tr><td align="center" style="border-radius:12px;background:#133378;">
    <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;background:#133378;color:#FFFFFF;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;font-family:'Inter',Arial,sans-serif;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

function heading(text: string): string {
  return `<h2 style="color:#133378;font-family:'Georgia',serif;font-size:20px;margin:0 0 16px;font-weight:700;">${escapeHtml(text)}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;font-family:'Inter',Arial,sans-serif;">${text}</p>`;
}

function note(text: string): string {
  return `<p style="color:#94A3B8;font-size:13px;line-height:1.5;margin:16px 0 0;font-family:'Inter',Arial,sans-serif;font-style:italic;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Role Labels ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  executor: 'Executor',
  heir: 'Beneficiary',
  trustee: 'Trustee',
  legal: 'Legal Counsel',
  cpa: 'CPA Advisor',
  admin: 'Administrator',
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

// ─── 1. Estate Invitation ─────────────────────────────────────────────────────

export function estateInvitationEmail(params: EstateInvitationEmailParams): EmailOutput {
  const { inviterName, estateName, recipientName, role, acceptUrl } = params;
  const label = roleLabel(role);

  const subject = `You've been invited to ${estateName}`;

  const html = wrapInLayout(`
    ${heading(`You're Invited`)}
    ${paragraph(`Hello ${escapeHtml(recipientName)},`)}
    ${paragraph(`<strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(estateName)}</strong> as <strong>${escapeHtml(label)}</strong> on FinalWishes.`)}
    ${paragraph(`Click the button below to accept the invitation and access the estate.`)}
    ${ctaButton(acceptUrl, 'Accept Invitation')}
    ${divider()}
    ${note(`If you did not expect this invitation, you can safely ignore this email.`)}
  `);

  const text = [
    `Hello ${recipientName},`,
    ``,
    `${inviterName} has invited you to join "${estateName}" as ${label} on FinalWishes.`,
    ``,
    `Accept the invitation: ${acceptUrl}`,
    ``,
    `If you did not expect this invitation, you can safely ignore this email.`,
    ``,
    `— FinalWishes, The Estate Operating System`,
  ].join('\n');

  return { subject, html, text };
}

// ─── 2. Capsule Delivery ──────────────────────────────────────────────────────

export function capsuleDeliveryEmail(params: CapsuleDeliveryEmailParams): EmailOutput {
  const { senderName, recipientName, title, message, estateName } = params;

  const subject = `A Time Capsule from ${senderName}`;

  const html = wrapInLayout(`
    ${heading(escapeHtml(title))}
    ${paragraph(`Dear ${escapeHtml(recipientName)},`)}
    <div style="background:#F8FAFC;border-left:3px solid #C8A951;padding:20px 24px;margin:16px 0;border-radius:0 8px 8px 0;">
      <p style="color:#334155;font-size:15px;line-height:1.8;margin:0;font-family:'Georgia',serif;white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>
    ${divider()}
    ${note(`This message was scheduled by ${escapeHtml(senderName)} through FinalWishes as part of the ${escapeHtml(estateName)} estate.`)}
  `);

  const text = [
    `Dear ${recipientName},`,
    ``,
    `"${title}"`,
    ``,
    message,
    ``,
    `---`,
    `This message was scheduled by ${senderName} through FinalWishes as part of the ${estateName} estate.`,
    ``,
    `— FinalWishes, The Estate Operating System`,
  ].join('\n');

  return { subject, html, text };
}

// ─── 3. Welcome ───────────────────────────────────────────────────────────────

export function welcomeEmail(params: WelcomeEmailParams): EmailOutput {
  const { userName, estateName } = params;

  const subject = 'Welcome to FinalWishes';

  const html = wrapInLayout(`
    ${heading(`Welcome, ${escapeHtml(userName)}`)}
    ${paragraph(`Your account has been created${estateName ? ` and you're connected to <strong>${escapeHtml(estateName)}</strong>` : ''}. Here's how to get started:`)}
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 16px;">
      <tr><td style="padding:8px 0;color:#334155;font-size:15px;font-family:'Inter',Arial,sans-serif;">
        <strong style="color:#133378;">1.</strong> Complete your profile and enable two-factor authentication.
      </td></tr>
      <tr><td style="padding:8px 0;color:#334155;font-size:15px;font-family:'Inter',Arial,sans-serif;">
        <strong style="color:#133378;">2.</strong> Create your first estate or accept a pending invitation.
      </td></tr>
      <tr><td style="padding:8px 0;color:#334155;font-size:15px;font-family:'Inter',Arial,sans-serif;">
        <strong style="color:#133378;">3.</strong> Upload key documents to your secure vault.
      </td></tr>
    </table>
    ${ctaButton(`${DASHBOARD_URL}/dashboard`, 'Go to Dashboard')}
  `);

  const text = [
    `Welcome, ${userName}!`,
    ``,
    `Your FinalWishes account has been created${estateName ? ` and you're connected to "${estateName}"` : ''}.`,
    ``,
    `Get started:`,
    `1. Complete your profile and enable two-factor authentication.`,
    `2. Create your first estate or accept a pending invitation.`,
    `3. Upload key documents to your secure vault.`,
    ``,
    `Go to your dashboard: ${DASHBOARD_URL}/dashboard`,
    ``,
    `— FinalWishes, The Estate Operating System`,
  ].join('\n');

  return { subject, html, text };
}

// ─── 4. Password Reset ───────────────────────────────────────────────────────

export function passwordResetEmail(params: PasswordResetEmailParams): EmailOutput {
  const { userName, resetUrl } = params;

  const subject = 'Reset Your FinalWishes Password';

  const html = wrapInLayout(`
    ${heading('Password Reset')}
    ${paragraph(`Hello ${escapeHtml(userName)},`)}
    ${paragraph(`We received a request to reset your FinalWishes password. Click the button below to create a new password.`)}
    ${ctaButton(resetUrl, 'Reset Password')}
    ${paragraph(`This link expires in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email or contact support at <a href="mailto:support@finalwishes.app" style="color:#133378;text-decoration:underline;">support@finalwishes.app</a>.`)}
  `);

  const text = [
    `Hello ${userName},`,
    ``,
    `We received a request to reset your FinalWishes password.`,
    ``,
    `Reset your password: ${resetUrl}`,
    ``,
    `This link expires in 1 hour. If you did not request this, please ignore this email or contact support@finalwishes.app.`,
    ``,
    `— FinalWishes, The Estate Operating System`,
  ].join('\n');

  return { subject, html, text };
}

// ─── 5. MFA Enabled ──────────────────────────────────────────────────────────

export function mfaEnabledEmail(params: MfaEnabledEmailParams): EmailOutput {
  const { userName } = params;

  const subject = 'Two-Factor Authentication Activated';

  const html = wrapInLayout(`
    ${heading('MFA Activated')}
    ${paragraph(`Hello ${escapeHtml(userName)},`)}
    ${paragraph(`Two-factor authentication has been successfully enabled on your FinalWishes account. You will now need your authenticator app to sign in.`)}
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="color:#166534;font-size:14px;margin:0;font-family:'Inter',Arial,sans-serif;font-weight:600;">&#10003; Your account is now more secure.</p>
    </div>
    ${paragraph(`If you did not enable MFA, please contact support immediately at <a href="mailto:support@finalwishes.app" style="color:#133378;text-decoration:underline;">support@finalwishes.app</a>.`)}
  `);

  const text = [
    `Hello ${userName},`,
    ``,
    `Two-factor authentication has been successfully enabled on your FinalWishes account.`,
    `You will now need your authenticator app to sign in.`,
    ``,
    `If you did not enable MFA, please contact support immediately at support@finalwishes.app.`,
    ``,
    `— FinalWishes, The Estate Operating System`,
  ].join('\n');

  return { subject, html, text };
}

// ─── 6. Document Shared ──────────────────────────────────────────────────────

export function documentSharedEmail(params: DocumentSharedEmailParams): EmailOutput {
  const { sharedBy, recipientName, documentName, estateName, viewUrl } = params;

  const subject = `${sharedBy} shared a document with you`;

  const html = wrapInLayout(`
    ${heading('Document Shared')}
    ${paragraph(`Hello ${escapeHtml(recipientName)},`)}
    ${paragraph(`<strong>${escapeHtml(sharedBy)}</strong> has shared a document with you from the <strong>${escapeHtml(estateName)}</strong> estate.`)}
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="color:#133378;font-size:15px;margin:0;font-family:'Inter',Arial,sans-serif;font-weight:600;">&#128196; ${escapeHtml(documentName)}</p>
    </div>
    ${ctaButton(viewUrl, 'View Document')}
    ${divider()}
    ${note(`You are receiving this because you are a member of the ${escapeHtml(estateName)} estate on FinalWishes.`)}
  `);

  const text = [
    `Hello ${recipientName},`,
    ``,
    `${sharedBy} has shared "${documentName}" with you from the "${estateName}" estate.`,
    ``,
    `View the document: ${viewUrl}`,
    ``,
    `— FinalWishes, The Estate Operating System`,
  ].join('\n');

  return { subject, html, text };
}

// ─── 7. Estate Status Change ─────────────────────────────────────────────────

export function estateStatusChangeEmail(params: EstateStatusChangeEmailParams): EmailOutput {
  const { estateName, oldStatus, newStatus, changedBy } = params;

  const subject = `Estate Status Update — ${estateName}`;

  const html = wrapInLayout(`
    ${heading('Estate Status Updated')}
    ${paragraph(`The status of <strong>${escapeHtml(estateName)}</strong> has been changed by <strong>${escapeHtml(changedBy)}</strong>.`)}
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;width:100%;">
      <tr>
        <td style="padding:12px 16px;background:#FEF2F2;border-radius:8px 0 0 8px;text-align:center;width:45%;">
          <p style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;font-family:'Inter',Arial,sans-serif;">Previous</p>
          <p style="color:#991B1B;font-size:15px;font-weight:700;margin:0;font-family:'Inter',Arial,sans-serif;">${escapeHtml(oldStatus)}</p>
        </td>
        <td style="padding:12px 8px;text-align:center;width:10%;font-size:18px;color:#94A3B8;">&#8594;</td>
        <td style="padding:12px 16px;background:#F0FDF4;border-radius:0 8px 8px 0;text-align:center;width:45%;">
          <p style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;font-family:'Inter',Arial,sans-serif;">Current</p>
          <p style="color:#166534;font-size:15px;font-weight:700;margin:0;font-family:'Inter',Arial,sans-serif;">${escapeHtml(newStatus)}</p>
        </td>
      </tr>
    </table>
    ${ctaButton(`${DASHBOARD_URL}/dashboard`, 'View Estate')}
  `);

  const text = [
    `Estate Status Update — ${estateName}`,
    ``,
    `The status of "${estateName}" has been changed by ${changedBy}.`,
    ``,
    `Previous: ${oldStatus}`,
    `Current:  ${newStatus}`,
    ``,
    `View the estate: ${DASHBOARD_URL}/dashboard`,
    ``,
    `— FinalWishes, The Estate Operating System`,
  ].join('\n');

  return { subject, html, text };
}
