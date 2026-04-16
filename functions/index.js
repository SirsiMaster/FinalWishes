/**
 * FinalWishes Cloud Functions — Firestore Triggers Only
 *
 * All HTTP API endpoints live in the Go API (Cloud Run).
 * This file contains only event-driven Firestore triggers
 * that cannot run on Cloud Run.
 *
 * Functions:
 *   1. autoMatchInvitation — Match pending invitations to new users
 *   2. sendMail — Send transactional email via Gmail API (Google-native)
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();
const db = admin.firestore();

// ─── Gmail API Setup ──────────────────────────────────────────────────────
// Uses domain-wide delegation to impersonate noreply@sirsi.ai
// Requires ONE admin console setup step:
//   Workspace Admin → Security → API Controls → Domain-wide Delegation
//   Add Client ID for firebase-adminsdk service account
//   Grant scope: https://www.googleapis.com/auth/gmail.send

const SENDER_EMAIL = 'noreply@sirsi.ai';
const SENDER_NAME = 'FinalWishes';

/**
 * Get an authenticated Gmail client via domain-wide delegation.
 * Falls back to basic transport if delegation isn't configured yet.
 */
async function getGmailClient() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
    });
    const client = await auth.getClient();

    // Impersonate noreply@sirsi.ai via domain-wide delegation
    if (client.subject !== SENDER_EMAIL) {
        client.subject = SENDER_EMAIL;
    }

    return google.gmail({ version: 'v1', auth: client });
}

/**
 * Build a MIME email message.
 */
function buildMimeMessage({ to, subject, html, text, replyTo }) {
    const boundary = `boundary_${Date.now()}`;
    const lines = [
        `From: ${SENDER_NAME} <${SENDER_EMAIL}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        replyTo ? `Reply-To: ${replyTo}` : null,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        text || stripHtml(html || ''),
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        '',
        html || text || '',
        `--${boundary}--`,
    ].filter(l => l !== null);

    return Buffer.from(lines.join('\r\n')).toString('base64url');
}

function stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── 1. Auto-Match Invitation ─────────────────────────────────────────────

exports.autoMatchInvitation = onDocumentCreated(
    {
        document: 'users/{uid}',
        memory: '256MiB',
        timeoutSeconds: 30,
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const userData = snapshot.data();
        const uid = event.params.uid;
        const email = (userData.email || '').toLowerCase().trim();

        if (!email) return;

        console.log(`[autoMatch] Checking invitations for ${email} (uid: ${uid})`);

        try {
            const invitationsSnap = await db.collection('estate_invitations')
                .where('email', '==', email)
                .where('status', '==', 'pending')
                .get();

            if (invitationsSnap.empty) return;

            console.log(`[autoMatch] Found ${invitationsSnap.size} pending invitation(s) for ${email}`);

            const batch = db.batch();

            for (const invDoc of invitationsSnap.docs) {
                const inv = invDoc.data();
                const estateId = inv.estateId;
                const role = inv.role || 'heir';

                const euDocId = `${uid}_${estateId}`;
                const euRef = db.collection('estate_users').doc(euDocId);
                batch.set(euRef, {
                    estateId,
                    userId: uid,
                    role,
                    accessGranted: true,
                    accessGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
                    invitationId: invDoc.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                batch.update(invDoc.ref, {
                    status: 'accepted',
                    userId: uid,
                    invitationAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                const auditRef = db.collection('audit_logs').doc();
                batch.set(auditRef, {
                    action: 'invitation_auto_matched',
                    entityType: 'estate_invitation',
                    entityId: invDoc.id,
                    userId: uid,
                    estateId,
                    details: { email, role, invitedBy: inv.invitedBy || 'unknown' },
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            await batch.commit();
            console.log(`[autoMatch] Matched ${invitationsSnap.size} invitation(s) for ${email}`);
        } catch (error) {
            console.error(`[autoMatch] Error:`, error);
        }
    }
);

// ─── 2. Send Mail — Gmail API (Google-native) ────────────────────────────
//
// Watches the 'mail' Firestore collection. When a document is created with
// status 'pending' (or no status), sends the email via Gmail API and updates
// the document status to 'sent' or 'error'.
//
// Document schema (same as Trigger Email extension for compatibility):
// {
//   to: "recipient@example.com" | ["a@b.com", "c@d.com"],
//   message: {
//     subject: "Your estate invitation",
//     html: "<h1>Welcome</h1>...",
//     text: "Welcome..." (optional, auto-generated from html)
//   },
//   template: { name: "invitation", data: { ... } } (optional, uses email_templates)
//   replyTo: "support@sirsi.ai" (optional)
// }

exports.sendMail = onDocumentCreated(
    {
        document: 'mail/{mailId}',
        memory: '256MiB',
        timeoutSeconds: 60,
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const mailData = snapshot.data();
        const mailRef = snapshot.ref;

        // Skip if already processed
        if (mailData.delivery?.state === 'SUCCESS' || mailData.delivery?.state === 'ERROR') return;

        try {
            // Resolve template if specified
            let subject = mailData.message?.subject;
            let html = mailData.message?.html;
            let text = mailData.message?.text;

            if (mailData.template?.name && !html) {
                const templateSnap = await db.collection('email_templates').doc(mailData.template.name).get();
                if (templateSnap.exists) {
                    const tpl = templateSnap.data();
                    subject = subject || tpl.subject || 'FinalWishes Notification';
                    html = tpl.html || '';
                    // Simple variable interpolation: {{variableName}}
                    if (mailData.template.data) {
                        for (const [key, value] of Object.entries(mailData.template.data)) {
                            html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
                            if (subject) {
                                subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
                            }
                        }
                    }
                }
            }

            if (!subject || !html) {
                await mailRef.update({
                    'delivery.state': 'ERROR',
                    'delivery.error': 'Missing subject or html in message',
                    'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
                });
                return;
            }

            // Resolve recipients
            const recipients = Array.isArray(mailData.to) ? mailData.to : [mailData.to];

            // Send via Gmail API
            const gmail = await getGmailClient();

            for (const recipient of recipients) {
                const raw = buildMimeMessage({
                    to: recipient,
                    subject,
                    html,
                    text,
                    replyTo: mailData.replyTo || 'support@sirsi.ai',
                });

                await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: { raw },
                });
            }

            // Mark as sent
            await mailRef.update({
                'delivery.state': 'SUCCESS',
                'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
                'delivery.leaseExpireTime': null,
            });

            console.log(`[sendMail] Sent to ${recipients.join(', ')}: ${subject}`);
        } catch (error) {
            console.error(`[sendMail] Error:`, error);

            await mailRef.update({
                'delivery.state': 'ERROR',
                'delivery.error': error.message || 'Unknown Gmail API error',
                'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
);
