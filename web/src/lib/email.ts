/**
 * Email Service — Firebase Trigger Email Extension Integration
 *
 * Sends emails by writing documents to the `mail` Firestore collection.
 * The Firebase "Trigger Email" extension picks up new documents and
 * sends them via SendGrid SMTP. Zero backend code required.
 *
 * Architecture:
 *   React → Firestore `mail` collection → Firebase Extension → SendGrid → Recipient
 *
 * Templates are stored in Firestore `email_templates` collection using
 * Handlebars syntax. The extension renders them at send time.
 *
 * @see https://extensions.dev/extensions/firebase/firestore-send-email
 * @see docs/ADR-037, SECURITY_COMPLIANCE.md §12
 *
 * SECURITY — fail-closed write attribution:
 *   The `mail` create rule (firestore.rules) requires
 *   `request.resource.data.createdBy == request.auth.uid`. Every send MUST
 *   therefore carry the *authenticated* caller's uid — there is no `'system'`
 *   actor on the client. `userId` is required on all helpers; passing a falsy
 *   value throws immediately instead of writing a doc the rule will reject
 *   (which previously failed silently the moment a helper was wired up).
 *   Unauthenticated sends (e.g. password-reset, where no user is signed in)
 *   cannot satisfy the rule client-side and must route through the Go API /
 *   Admin SDK — see `sendPasswordResetNotification` below.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';

// ─── Mail Collection Reference ────────────────────────────────
const mailCollection = collection(db, 'mail');

// ─── Types ────────────────────────────────────────────────────

interface EmailOptions {
  to: string | string[];
  subject: string;
  /** Plain text body */
  text?: string;
  /** HTML body */
  html?: string;
  /** Template name from email_templates collection */
  template?: {
    name: string;
    data: Record<string, unknown>;
  };
}

interface InvitationEmailData {
  recipientEmail: string;
  recipientName: string;
  estateName: string;
  role: string;
  inviterName: string;
  inviteLink?: string;
}

interface WelcomeEmailData {
  recipientEmail: string;
  firstName: string;
}

interface NotificationEmailData {
  recipientEmail: string;
  recipientName: string;
  estateName: string;
  notificationType: string;
  message: string;
  actionUrl?: string;
}

// ─── Core Send Function ───────────────────────────────────────

/**
 * Sends an email by writing to the Firestore `mail` collection.
 * The Firebase Trigger Email extension handles actual delivery.
 *
 * @param createdBy - The authenticated caller's uid. REQUIRED: the `mail`
 *   create rule pins `createdBy` to `request.auth.uid`, so a falsy value
 *   would be silently rejected by Firestore. We throw eagerly instead.
 * @returns The document ID of the mail record (for tracking)
 */
async function sendEmail(options: EmailOptions, createdBy: string): Promise<string> {
  if (!createdBy) {
    throw new Error(
      'sendEmail requires the authenticated user uid (createdBy). ' +
        'The mail create rule pins createdBy to request.auth.uid; ' +
        'unauthenticated sends must route through the Go API / Admin SDK.',
    );
  }

  const mailDoc: Record<string, unknown> = {
    to: Array.isArray(options.to) ? options.to : [options.to],
    createdAt: serverTimestamp(),
    createdBy,
  };

  // Use template or direct content
  if (options.template) {
    mailDoc.template = options.template;
  } else {
    mailDoc.message = {
      subject: options.subject,
      text: options.text,
      html: options.html,
    };
  }

  const docRef = await addDoc(mailCollection, mailDoc);
  return docRef.id;
}

// ─── Pre-Built Email Functions ────────────────────────────────

/**
 * Send an estate invitation email.
 * Called when a principal invites a team member.
 */
export async function sendInvitationEmail(data: InvitationEmailData, userId: string): Promise<string> {
  const roleLabel = {
    executor: 'Executor',
    heir: 'Beneficiary',
    legal: 'Legal Counsel',
    cpa: 'CPA Advisor',
  }[data.role] || data.role;

  return sendEmail({
    to: data.recipientEmail,
    subject: `You've been invited to ${data.estateName} — FinalWishes`,
    template: {
      name: 'invitation',
      data: {
        recipientName: data.recipientName,
        estateName: data.estateName,
        role: roleLabel,
        inviterName: data.inviterName,
        inviteLink: data.inviteLink || 'https://finalwishes-prod.web.app/login',
        year: new Date().getFullYear(),
      },
    },
  }, userId);
}

/**
 * Send a welcome email after registration.
 */
export async function sendWelcomeEmail(data: WelcomeEmailData, userId: string): Promise<string> {
  return sendEmail({
    to: data.recipientEmail,
    subject: 'Welcome to FinalWishes — Your Estate Operating System',
    template: {
      name: 'welcome',
      data: {
        firstName: data.firstName,
        loginUrl: 'https://finalwishes-prod.web.app/login',
        year: new Date().getFullYear(),
      },
    },
  }, userId);
}

/**
 * Send an estate notification email (deadline, update, etc.)
 */
export async function sendNotificationEmail(data: NotificationEmailData, userId: string): Promise<string> {
  return sendEmail({
    to: data.recipientEmail,
    subject: `[${data.estateName}] ${data.notificationType} — FinalWishes`,
    template: {
      name: 'notification',
      data: {
        recipientName: data.recipientName,
        estateName: data.estateName,
        notificationType: data.notificationType,
        message: data.message,
        actionUrl: data.actionUrl || 'https://finalwishes-prod.web.app/login',
        year: new Date().getFullYear(),
      },
    },
  }, userId);
}

/**
 * Send a password reset confirmation email.
 *
 * IMPORTANT — server-only: this fires during the password-reset flow, when
 * NO user is signed in. The `mail` create rule requires
 * `createdBy == request.auth.uid`, which an unauthenticated client cannot
 * satisfy, so this notification CANNOT be sent from the browser. It must be
 * issued server-side via the Go API / Firebase Admin SDK (which bypasses
 * security rules), keyed to the audited request.
 *
 * Firebase Auth already handles the actual reset email; this supplemental
 * audit notification is intentionally not wired client-side. Calling it from
 * the browser throws immediately rather than queuing a doc the rule rejects.
 *
 * @throws Always — there is no authenticated client path for this send.
 */
export async function sendPasswordResetNotification(_email: string): Promise<never> {
  throw new Error(
    'sendPasswordResetNotification must run server-side (Go API / Admin SDK): ' +
      'the password-reset flow is unauthenticated and cannot satisfy the ' +
      'fail-closed mail create rule (createdBy == request.auth.uid).',
  );
}

/**
 * React hook wrapper for sending emails with the current user's context.
 *
 * Every sender resolves the signed-in user's uid for `createdBy`. If no user
 * is authenticated the send throws (the `mail` rule would reject it anyway),
 * so callers should gate UI on auth state. Password-reset notifications are
 * deliberately absent here — they run unauthenticated and are server-only.
 */
export function useEmailService() {
  const { user } = useAuth();

  const requireUid = (): string => {
    if (!user?.uid) {
      throw new Error('Email sends require an authenticated user.');
    }
    return user.uid;
  };

  return {
    sendInvitation: (data: InvitationEmailData) =>
      sendInvitationEmail(data, requireUid()),

    sendWelcome: (data: WelcomeEmailData) =>
      sendWelcomeEmail(data, requireUid()),

    sendNotification: (data: NotificationEmailData) =>
      sendNotificationEmail(data, requireUid()),
  };
}
