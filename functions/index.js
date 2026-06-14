/**
 * FinalWishes Cloud Functions — Firestore Triggers Only
 *
 * All HTTP API endpoints live in the Go API (Cloud Run).
 * This file contains only event-driven Firestore triggers
 * that cannot run on Cloud Run.
 *
 * Functions:
 *   1. autoMatchInvitation     — Match pending invitations to new users (on signup)
 *   1b. autoMatchOnInvitation  — Link invitees who already have an account (on invite)
 *   2. sendMail                — Send transactional email via Gmail API (Google-native)
 *   3. guardianInactivityCheck — Daily Guardian Protocol inactivity sweep (scheduled)
 *
 * NOTE: There is intentionally NO SMS function. Invitation delivery is email-only
 * (the Gmail rail above). A phone-number/SMS path was deliberately removed rather
 * than ship a stub that silently never delivers a text — the UI must not promise a
 * channel that does not exist. When a real SMS provider is adopted (Sirsi Sign
 * shared rail per ADR-047, or a managed Twilio extension), reintroduce a delivery
 * function here AND re-expose the phone field in InviteTeamMember.tsx together.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
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
    // Strip CR/LF from any value interpolated into a header — otherwise a `to`/
    // `subject`/`replyTo` containing "\r\n" injects arbitrary MIME headers (Bcc
    // fan-out to many recipients from one doc, spoofed Reply-To, etc.). This is the
    // multiplier that turns the mail collection into a phishing relay.
    const hdr = (v) => String(Array.isArray(v) ? v.join(', ') : (v ?? '')).replace(/[\r\n]+/g, ' ').trim();
    const boundary = `boundary_${Date.now()}`;
    const lines = [
        `From: ${SENDER_NAME} <${SENDER_EMAIL}>`,
        `To: ${hdr(to)}`,
        `Subject: ${hdr(subject)}`,
        replyTo ? `Reply-To: ${hdr(replyTo)}` : null,
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

        const uid = event.params.uid;

        // CRITICAL — verified identity ONLY. The users/{uid} document is
        // client-writable, so an attacker can verify an account they control and
        // then write users/{uid}.email = 'victim-invited@...' to seize the
        // executor/heir role attached to that invitation. We MUST NOT trust
        // userData.email. Instead resolve the email from the Firebase Auth record
        // (admin.auth().getUser) — the identity the user actually proved — and
        // refuse to grant any estate access until that email is verified. This is
        // the write-side mirror of the firestore.rules isEstateRole() email_verified
        // gate; without it the junction is written off a bare email-string match.
        let rec;
        try {
            rec = await admin.auth().getUser(uid);
        } catch (e) {
            console.warn(`[autoMatch] admin.auth().getUser(${uid}) failed: ${e.message || e}`);
            return;
        }

        const email = (rec.email || '').toLowerCase().trim();
        if (!email) return;

        // Defense-in-depth: never grant estate access off an unverified address.
        // The attacker can never VERIFY an invited address they don't control, so
        // gating here makes the seizure path unreachable while a legitimate invitee
        // is matched the moment they verify (this trigger re-runs on profile create,
        // and the autoMatchOnInvitation path also covers already-verified users).
        if (!rec.emailVerified) {
            console.log(`[autoMatch] Skipping ${email} (uid: ${uid}) — email not verified`);
            return;
        }

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

                // Flip the heir/executor subcollection doc (the doc the estate's
                // Family/People section actually reads) from 'pending'/'invited'
                // to 'active'. Without this the added member stays pending forever
                // and never shows up as accepted — even after email verification.
                const roleCol = role === 'executor' ? 'executors' : 'heirs';
                const roleSnap = await db.collection(`estates/${estateId}/${roleCol}`)
                    .where('invitationId', '==', invDoc.id).get();
                roleSnap.forEach((rd) => batch.update(rd.ref, {
                    status: 'active',
                    userId: uid,
                    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }));

                // Backfill Soul Log sharing (ADR-046 #1): entries were tagged with this
                // person's display NAME before they had an account; now that they've
                // registered, add their UID to sharedWith so the per-recipient read rule
                // (request.auth.uid in resource.data.sharedWith) resolves. Without this,
                // sharing with a not-yet-registered heir would never grant them access.
                const personName = roleSnap.docs.length ? (roleSnap.docs[0].data().fullName || '') : '';
                if (personName) {
                    try {
                        // AMBIGUITY GUARD: if more than one heir in this estate shares
                        // this display name, we cannot tell which entries were meant for
                        // THIS heir — skip the name-keyed backfill rather than risk
                        // granting them access to another same-named heir's entries
                        // (claude-home PR #3 review). New entries already carry sharedWith
                        // by UID, so this only affects legacy name-only sharing.
                        const sameName = await db.collection(`estates/${estateId}/heirs`)
                            .where('fullName', '==', personName).get();
                        if (sameName.size > 1) {
                            console.warn(`[autoMatch] sharedWith backfill skipped for ${estateId}: "${personName}" is shared by ${sameName.size} heirs (ambiguous)`);
                        } else {
                            const slSnap = await db.collection(`estates/${estateId}/soul-log`)
                                .where('taggedPeople', 'array-contains', personName).get();
                            slSnap.forEach((sd) => batch.update(sd.ref, {
                                sharedWith: admin.firestore.FieldValue.arrayUnion(uid),
                            }));
                        }
                    } catch (e) {
                        console.warn(`[autoMatch] sharedWith backfill failed for ${estateId}: ${e.message}`);
                    }
                }

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

// ─── 1b. Auto-Match on Invitation (invitee already has an account) ────────
//
// When an invitation is created for an email that ALREADY has an account,
// grant estate access immediately. (autoMatchInvitation above covers the
// invitee who signs up AFTER being invited.) Together these replace the old
// client-side user lookup, which the Firestore `users` read rule correctly
// forbids (PII siloing, Rule 26) — that lookup was failing with
// "Missing or insufficient permissions" and blocking the whole add-member flow.

exports.autoMatchOnInvitation = onDocumentCreated(
    {
        document: 'estate_invitations/{invId}',
        memory: '256MiB',
        timeoutSeconds: 30,
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const inv = snapshot.data();
        if (!inv || inv.status !== 'pending') return;

        const email = (inv.email || '').toLowerCase().trim();
        const estateId = inv.estateId;
        const role = inv.role || 'heir';
        if (!email || !estateId) return;

        // Does the invitee already have an account? If not, autoMatchInvitation
        // will link them when they sign up.
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        } catch {
            return;
        }
        const uid = userRecord.uid;
        console.log(`[autoMatchOnInvitation] Linking existing user ${email} (uid: ${uid}) to estate ${estateId}`);

        try {
            const batch = db.batch();

            batch.set(db.collection('estate_users').doc(`${uid}_${estateId}`), {
                estateId,
                userId: uid,
                role,
                accessGranted: true,
                accessGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
                invitationId: snapshot.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            batch.update(snapshot.ref, {
                status: 'accepted',
                userId: uid,
                invitationAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Flip the heir/executor subcollection doc to 'active' (the doc the
            // Family/People UI reads). The heir doc is written by the client
            // immediately after this invitation; if not yet present, the
            // autoMatchInvitation (on signup) path and the UI's pending filter
            // still cover it.
            const roleColOnInv = role === 'executor' ? 'executors' : 'heirs';
            const roleSnapOnInv = await db.collection(`estates/${estateId}/${roleColOnInv}`)
                .where('invitationId', '==', snapshot.id).get();
            roleSnapOnInv.forEach((rd) => batch.update(rd.ref, {
                status: 'active',
                userId: uid,
                acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }));

            batch.set(db.collection('audit_logs').doc(), {
                action: 'invitation_auto_matched_on_create',
                entityType: 'estate_invitation',
                entityId: snapshot.id,
                userId: uid,
                estateId,
                details: { email, role, invitedBy: inv.invitedBy || 'unknown' },
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });

            await batch.commit();
            console.log(`[autoMatchOnInvitation] Linked ${email} to ${estateId}`);
        } catch (error) {
            console.error(`[autoMatchOnInvitation] Error:`, error);
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

// ─── Open-relay defense: validate recipients before sending ──────────────
//
// The Firestore `mail` create rule pins `createdBy == request.auth.uid`
// (attribution), but any authenticated user could still queue a mail doc to an
// ARBITRARY recipient — and sendMail would relay it SPF/DKIM-signed from
// admin@sirsi.ai, turning the mail collection into a phishing/relay multiplier.
//
// FAIL CLOSED. A recipient is authorized only if ONE of these holds for the
// createdBy user:
//   (a) the recipient matches a pending estate_invitations doc whose estate
//       the createdBy user belongs to (estate_invitations + estate_users);
//   (b) the recipient is the createdBy user's OWN account email
//       (self-sends, e.g. obituary-to-self);
//   (c) the recipient is an estate member's email (heirs/executors
//       subcollection) for an estate the createdBy user belongs to.
//
// Returns true if the recipient is authorized for this createdBy.
async function isRecipientAuthorized(recipient, createdBy) {
    const target = String(recipient || '').toLowerCase().trim();
    if (!target || !createdBy) return false;

    // (b) Self-send: recipient is the createdBy user's own account email.
    try {
        const userRecord = await admin.auth().getUser(createdBy);
        const authEmail = (userRecord.email || '').toLowerCase().trim();
        if (authEmail && authEmail === target) return true;
    } catch (e) {
        // Fall through to the users/{createdBy} profile doc lookup.
        console.warn(`[sendMail] admin.auth().getUser(${createdBy}) failed: ${e.message || e}`);
    }
    try {
        const userDoc = await db.collection('users').doc(createdBy).get();
        if (userDoc.exists) {
            const profileEmail = (userDoc.data().email || '').toLowerCase().trim();
            if (profileEmail && profileEmail === target) return true;
        }
    } catch (e) {
        console.warn(`[sendMail] users/${createdBy} lookup failed: ${e.message || e}`);
    }

    // Estates the createdBy user belongs to (junction collection).
    let estateIds = [];
    try {
        const euSnap = await db.collection('estate_users')
            .where('userId', '==', createdBy)
            .get();
        estateIds = euSnap.docs
            .map((d) => d.data().estateId)
            .filter((id) => !!id);
    } catch (e) {
        console.warn(`[sendMail] estate_users lookup for ${createdBy} failed: ${e.message || e}`);
    }
    if (estateIds.length === 0) return false;

    const estateSet = new Set(estateIds);

    // (a) Recipient matches a pending invitation whose estate createdBy belongs to.
    try {
        const invSnap = await db.collection('estate_invitations')
            .where('email', '==', target)
            .get();
        for (const invDoc of invSnap.docs) {
            const inv = invDoc.data();
            if (estateSet.has(inv.estateId)) return true;
        }
    } catch (e) {
        console.warn(`[sendMail] estate_invitations lookup for ${target} failed: ${e.message || e}`);
    }

    // (c) Recipient is a member email (heirs/executors) of one of those estates.
    for (const estateId of estateSet) {
        for (const roleCol of ['heirs', 'executors']) {
            try {
                const memberSnap = await db.collection(`estates/${estateId}/${roleCol}`)
                    .where('email', '==', target)
                    .limit(1)
                    .get();
                if (!memberSnap.empty) return true;
            } catch (e) {
                console.warn(`[sendMail] ${roleCol} lookup for ${target} in ${estateId} failed: ${e.message || e}`);
            }
        }
    }

    return false;
}

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
            const recipients = (Array.isArray(mailData.to) ? mailData.to : [mailData.to])
                .filter((r) => !!r);

            // Open-relay defense: every recipient must be authorized for the
            // createdBy user. FAIL CLOSED if attribution is missing or any
            // recipient cannot be validated — do not relay from admin@sirsi.ai.
            const createdBy = mailData.createdBy;
            if (!createdBy) {
                console.warn(`[sendMail] Rejected mail ${mailRef.id}: missing createdBy attribution`);
                await mailRef.update({
                    'delivery.state': 'ERROR',
                    'delivery.error': 'recipient not authorized',
                    'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
                    status: 'rejected',
                });
                return;
            }

            for (const recipient of recipients) {
                const ok = await isRecipientAuthorized(recipient, createdBy);
                if (!ok) {
                    console.warn(`[sendMail] Rejected mail ${mailRef.id}: recipient "${recipient}" not authorized for createdBy ${createdBy}`);
                    await mailRef.update({
                        'delivery.state': 'ERROR',
                        'delivery.error': 'recipient not authorized',
                        'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
                        status: 'rejected',
                    });
                    return;
                }
            }

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

// ─── 3. Guardian Protocol — Daily Inactivity Check ──────────────────────
// Runs every day at 6 AM EST. Calls the Go API's inactivity check endpoint
// which escalates estates where the owner has gone silent.
//
// Escalation sequence:
//   Day 90: Reminder email to owner
//   Day 97: Notification email to executor
//   Day 104+: Manual settlement only (executor must report via report-status)
exports.guardianInactivityCheck = onSchedule(
    {
        schedule: '0 6 * * *',
        timeZone: 'America/New_York',
        region: 'us-central1',
    },
    async () => {
        const apiUrl = process.env.FINALWISHES_API_URL ||
            'https://finalwishes-api-860699311615.us-central1.run.app';

        try {
            const customToken = await admin.auth().createCustomToken('guardian-scheduler', {
                role: 'admin',
            });

            const response = await fetch(`${apiUrl}/api/v1/guardian/run-inactivity-check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${customToken}`,
                },
            });

            if (!response.ok) {
                const body = await response.text();
                console.error(`[guardianInactivityCheck] API returned ${response.status}: ${body}`);
                return;
            }

            const result = await response.json();
            console.log('[guardianInactivityCheck] Completed:', {
                estatesChecked: result.estatesChecked || 0,
                remindersSent: result.remindersSent || 0,
                executorsNotified: result.executorsNotified || 0,
            });
        } catch (error) {
            console.error('[guardianInactivityCheck] Failed:', error.message);
        }
    }
);
