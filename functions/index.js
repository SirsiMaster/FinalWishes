/**
 * FinalWishes Cloud Functions — Firestore Triggers Only
 *
 * All HTTP API endpoints live in the Go API (Cloud Run).
 * This file contains only event-driven Firestore triggers
 * that cannot run on Cloud Run.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Auto-Match Invitation — Firestore Trigger
 *
 * When a new user profile is created in /users/{uid}, check if their email
 * matches any pending invitations in /estate_invitations. If so:
 * 1. Create an estate_users record granting access
 * 2. Update the invitation status to 'accepted'
 * 3. Write an audit log entry
 *
 * This ensures that when someone is invited to an estate before they register,
 * they automatically get access upon creating their account.
 */
exports.autoMatchInvitation = onDocumentCreated(
    {
        document: 'users/{uid}',
        memory: '256MiB',
        timeoutSeconds: 30,
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) {
            console.log('[autoMatch] No data in event');
            return;
        }

        const userData = snapshot.data();
        const uid = event.params.uid;
        const email = (userData.email || '').toLowerCase().trim();

        if (!email) {
            console.log(`[autoMatch] User ${uid} has no email — skipping`);
            return;
        }

        console.log(`[autoMatch] Checking invitations for ${email} (uid: ${uid})`);

        try {
            const invitationsSnap = await db.collection('estate_invitations')
                .where('email', '==', email)
                .where('status', '==', 'pending')
                .get();

            if (invitationsSnap.empty) {
                console.log(`[autoMatch] No pending invitations for ${email}`);
                return;
            }

            console.log(`[autoMatch] Found ${invitationsSnap.size} pending invitation(s) for ${email}`);

            const batch = db.batch();

            for (const invDoc of invitationsSnap.docs) {
                const inv = invDoc.data();
                const estateId = inv.estateId;
                const role = inv.role || 'heir';

                // 1. Create estate_users record
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

                // 2. Update invitation status
                batch.update(invDoc.ref, {
                    status: 'accepted',
                    userId: uid,
                    invitationAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // 3. Write audit log
                const auditRef = db.collection('audit_logs').doc();
                batch.set(auditRef, {
                    action: 'invitation_auto_matched',
                    entityType: 'estate_invitation',
                    entityId: invDoc.id,
                    userId: uid,
                    estateId,
                    details: {
                        email,
                        role,
                        invitedBy: inv.invitedBy || 'unknown',
                    },
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`[autoMatch] Matched: ${email} → estate ${estateId} as ${role}`);
            }

            await batch.commit();
            console.log(`[autoMatch] Successfully matched ${invitationsSnap.size} invitation(s) for ${email}`);
        } catch (error) {
            console.error(`[autoMatch] Error processing invitations for ${email}:`, error);
        }
    }
);
