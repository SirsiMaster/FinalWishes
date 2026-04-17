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
 *   3. sendSMS — Process SMS queue for invitation notifications
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

// Domain-wide delegation requires JWT auth with a service account key.
// Cloud Functions 2nd gen use Compute metadata auth which doesn't support
// the 'subject' field. We load the firebase-adminsdk key from Secret Manager
// and create a JWT client that can impersonate Workspace users.
const IMPERSONATE_USER = 'admin@sirsi.ai';
const SENDER_EMAIL = 'admin@sirsi.ai';
const SENDER_NAME = 'FinalWishes';

let _cachedGmailClient = null;

/**
 * Get an authenticated Gmail client via domain-wide delegation.
 * Uses firebase-adminsdk service account key (from Secret Manager)
 * to create a JWT that impersonates admin@sirsi.ai.
 */
async function getGmailClient() {
    if (_cachedGmailClient) return _cachedGmailClient;

    // Load the service account key from Secret Manager
    const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
    const smClient = new SecretManagerServiceClient();
    const [version] = await smClient.accessSecretVersion({
        name: 'projects/finalwishes-prod/secrets/gmail-sa-key/versions/latest',
    });
    const keyData = JSON.parse(version.payload.data.toString('utf8'));

    // Create JWT client with domain-wide delegation
    const jwtClient = new google.auth.JWT({
        email: keyData.client_email,
        key: keyData.private_key,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        subject: IMPERSONATE_USER,
    });

    _cachedGmailClient = google.gmail({ version: 'v1', auth: jwtClient });
    return _cachedGmailClient;
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

// ─── 3. Send SMS — Notification Queue ────────────────────────────────────
//
// Watches the 'sms_queue' Firestore collection. When a document is created,
// processes the SMS request and updates delivery status.
//
// Document schema (written by web/src/lib/invitations.ts):
// {
//   to: "+15551234567",
//   body: "You've been invited to an estate on FinalWishes...",
//   invitationId: "abc123",
//   estateId: "estate456",
//   status: "pending",
//   createdBy: "uid789",
//   createdAt: Timestamp
// }
//
// TODO: Integrate a real SMS provider. Options (Google-first priority):
//   1. Google Cloud Communication API (when GA) — preferred, native GCP
//   2. Firebase Extensions: "Send Messages with Twilio" — managed, low-code
//   3. Direct Twilio SDK — fallback if Google options unavailable
//
// Until a provider is configured, this function validates the request,
// logs the SMS details for manual review, and updates delivery status.

exports.sendSMS = onDocumentCreated(
    {
        document: 'sms_queue/{smsId}',
        memory: '256MiB',
        timeoutSeconds: 30,
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const smsData = snapshot.data();
        const smsRef = snapshot.ref;

        // Skip if already processed
        if (smsData.delivery?.state === 'SUCCESS' || smsData.delivery?.state === 'ERROR') return;

        try {
            const { to, body, invitationId, estateId, createdBy } = smsData;

            // Validate required fields
            if (!to || !body) {
                await smsRef.update({
                    'delivery.state': 'ERROR',
                    'delivery.error': 'Missing required fields: to and body are required',
                    'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
                });
                return;
            }

            // Validate phone number format (E.164: +[country][number])
            const e164Regex = /^\+[1-9]\d{6,14}$/;
            if (!e164Regex.test(to.replace(/[\s\-()]/g, ''))) {
                await smsRef.update({
                    'delivery.state': 'ERROR',
                    'delivery.error': `Invalid phone number format: ${to}. Expected E.164 format (e.g., +15551234567)`,
                    'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
                });
                return;
            }

            // Validate body length (SMS limit is 160 chars for single segment)
            if (body.length > 1600) {
                await smsRef.update({
                    'delivery.state': 'ERROR',
                    'delivery.error': `SMS body too long (${body.length} chars). Maximum 1600 characters.`,
                    'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
                });
                return;
            }

            // TODO: Replace this block with actual SMS provider integration.
            // For now, log the request for manual processing / audit trail.
            console.log(`[sendSMS] SMS queued for delivery:`, {
                to,
                bodyLength: body.length,
                invitationId: invitationId || 'none',
                estateId: estateId || 'none',
                createdBy: createdBy || 'unknown',
            });

            // Mark as sent (provider pending — update to real delivery once integrated)
            await smsRef.update({
                'delivery.state': 'PENDING_PROVIDER',
                'delivery.info': 'SMS queued successfully. Awaiting SMS provider integration.',
                'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
                'delivery.leaseExpireTime': null,
            });

            console.log(`[sendSMS] Queued SMS to ${to} (invitation: ${invitationId || 'N/A'})`);
        } catch (error) {
            console.error(`[sendSMS] Error:`, error);

            await smsRef.update({
                'delivery.state': 'ERROR',
                'delivery.error': error.message || 'Unknown SMS processing error',
                'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
);
