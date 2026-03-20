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
 * @returns The document ID of the mail record (for tracking)
 */
async function sendEmail(options: EmailOptions, createdBy?: string): Promise<string> {
  const mailDoc: Record<string, unknown> = {
    to: Array.isArray(options.to) ? options.to : [options.to],
    createdAt: serverTimestamp(),
    createdBy: createdBy || 'system',
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
export async function sendInvitationEmail(data: InvitationEmailData, userId?: string): Promise<string> {
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
export async function sendWelcomeEmail(data: WelcomeEmailData, userId?: string): Promise<string> {
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
export async function sendNotificationEmail(data: NotificationEmailData, userId?: string): Promise<string> {
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
 * Note: Firebase Auth handles the actual reset email — this is
 * a supplemental notification for audit purposes.
 */
export async function sendPasswordResetNotification(email: string): Promise<string> {
  return sendEmail({
    to: email,
    subject: 'Password Reset Requested — FinalWishes',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1E3A5F, #2563EB); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #C8A951; font-family: Cinzel, serif; margin: 0; font-size: 24px;">FinalWishes</h1>
        </div>
        <div style="padding: 24px; background: #ffffff; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <p style="color: #1E3A5F; font-size: 16px;">A password reset was requested for your FinalWishes account.</p>
          <p style="color: #1E3A5F; font-size: 14px;">If you did not request this, please contact support immediately at <a href="mailto:support@finalwishes.app" style="color: #2563EB;">support@finalwishes.app</a>.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="color: #6B7280; font-size: 12px;">This is an automated security notification from FinalWishes.</p>
        </div>
      </div>
    `,
    text: 'A password reset was requested for your FinalWishes account. If you did not request this, please contact support@finalwishes.app immediately.',
  });
}

/**
 * React hook wrapper for sending emails with the current user's context.
 */
export function useEmailService() {
  const { user } = useAuth();

  return {
    sendInvitation: (data: InvitationEmailData) =>
      sendInvitationEmail(data, user?.uid),

    sendWelcome: (data: WelcomeEmailData) =>
      sendWelcomeEmail(data, user?.uid),

    sendNotification: (data: NotificationEmailData) =>
      sendNotificationEmail(data, user?.uid),

    sendPasswordResetNotification,
  };
}
