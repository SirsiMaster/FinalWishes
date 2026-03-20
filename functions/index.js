/**
 * Legacy Estate OS - OpenSign Integration Cloud Functions
 * 
 * This module provides e-signature functionality for the Legacy Estate OS MSA signing workflow.
 * Based on the Sirsi OpenSign shared architecture.
 * 
 * Endpoints:
 * - POST /api/guest/envelopes - Create envelope for guest signing (no auth required)
 * - POST /api/envelopes - Create envelope for authenticated users
 * - GET /api/envelopes/:id - Get envelope status
 * - POST /api/envelopes/:id/sign - Record signature
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();
const db = admin.firestore();

const app = express();

// CORS configuration for cross-origin access
app.use(cors({
    origin: [
        'https://legacy-estate-os.web.app',
        'https://legacy-estate-os.firebaseapp.com',
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));

app.use(express.json());

/**
 * Middleware: Verify Firebase ID Token
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
};

/**
 * POST /api/guest/envelopes
 * Create a new signing envelope for GUEST users (no Firebase auth required)
 * Used for unauthenticated MSA contract signing
 */
app.post('/api/guest/envelopes', async (req, res) => {
    try {
        const { docType, signerName, signerEmail, metadata, callbackUrl, templateId, redirectUrl } = req.body;

        // Validate origin (only allow Legacy Estate OS and localhost)
        const origin = req.headers.origin || '';
        const allowedOrigins = [
            'https://legacy-estate-os.web.app',
            'https://legacy-estate-os.firebaseapp.com',
            'http://localhost',
            'http://127.0.0.1'
        ];

        const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
        if (!isAllowed && origin !== '') {
            console.warn('Guest envelope rejected from origin:', origin);
            return res.status(403).json({ error: 'Forbidden', message: 'Origin not allowed for guest signing' });
        }

        // Validate required fields
        if (!signerName || !signerEmail) {
            return res.status(400).json({ error: 'Bad Request', message: 'signerName and signerEmail are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(signerEmail)) {
            return res.status(400).json({ error: 'Bad Request', message: 'Invalid email format' });
        }

        // Create envelope record in Firestore
        const envelopeData = {
            docType: docType || templateId || 'legacy-msa',
            recipients: [{ name: signerName, email: signerEmail, role: 'signer' }],
            metadata: metadata || {},
            callbackUrl: callbackUrl || redirectUrl || null,
            status: 'created',
            createdBy: 'guest',
            createdByEmail: signerEmail,
            signerName: signerName,
            signers: [signerEmail],
            isGuestSigning: true,
            sourceProject: 'legacy-estate-os',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('envelopes').add(envelopeData);
        const envelopeId = docRef.id;

        // Generate signing URL - points back to sign.html with envelope ID
        const baseUrl = 'https://legacy-estate-os.web.app';
        const signingUrl = `${baseUrl}/admin/sign.html?envelope=${envelopeId}&guest=true`;

        // Update with envelope ID and signing URL
        await docRef.update({
            envelopeId,
            signingUrl
        });

        // Log audit trail
        await db.collection('auditLogs').add({
            action: 'guest_envelope_created',
            envelopeId,
            guestEmail: signerEmail,
            guestName: signerName,
            origin: origin,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            metadata: { docType: docType || templateId || 'legacy-msa' }
        });

        res.status(201).json({
            success: true,
            envelopeId,
            status: 'created',
            signingUrl,
            message: 'Guest envelope created successfully'
        });

    } catch (error) {
        console.error('Create guest envelope error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * POST /api/envelopes
 * Create a new signing envelope (authenticated)
 */
app.post('/api/envelopes', authenticate, async (req, res) => {
    try {
        const { docType, recipients, metadata, callbackUrl, templateId, signerName, signerEmail, redirectUrl } = req.body;

        // Handle both formats: recipients array or direct signer info
        let recipientsList = recipients;
        if (!recipientsList || !Array.isArray(recipientsList) || recipientsList.length === 0) {
            if (signerName && signerEmail) {
                recipientsList = [{ name: signerName, email: signerEmail, role: 'signer' }];
            } else {
                return res.status(400).json({ error: 'Bad Request', message: 'At least one recipient is required' });
            }
        }

        // Create envelope record in Firestore
        const envelopeData = {
            docType: docType || templateId || 'legacy-msa',
            recipients: recipientsList,
            metadata: metadata || {},
            callbackUrl: callbackUrl || redirectUrl || null,
            status: 'created',
            createdBy: req.user.uid,
            createdByEmail: req.user.email || null,
            signers: recipientsList.map(r => r.email),
            isGuestSigning: false,
            sourceProject: 'legacy-estate-os',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('envelopes').add(envelopeData);
        const envelopeId = docRef.id;

        // Generate signing URL
        const baseUrl = 'https://legacy-estate-os.web.app';
        const signingUrl = `${baseUrl}/admin/sign.html?envelope=${envelopeId}`;

        // Update with envelope ID and signing URL
        await docRef.update({
            envelopeId,
            signingUrl
        });

        // Log audit trail
        await db.collection('auditLogs').add({
            action: 'envelope_created',
            envelopeId,
            userId: req.user.uid,
            userEmail: req.user.email,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            metadata: { docType: docType || templateId, recipientCount: recipientsList.length }
        });

        res.status(201).json({
            success: true,
            envelopeId,
            status: 'created',
            signingUrl,
            message: 'Envelope created successfully'
        });

    } catch (error) {
        console.error('Create envelope error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * GET /api/envelopes/:id
 * Get envelope status and details
 */
app.get('/api/envelopes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('envelopes').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Not Found', message: 'Envelope not found' });
        }

        const data = doc.data();

        res.json({
            success: true,
            envelope: {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || null,
                updatedAt: data.updatedAt?.toDate?.() || null
            }
        });

    } catch (error) {
        console.error('Get envelope error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * POST /api/envelopes/:id/sign
 * Record a signature (can be guest or authenticated)
 */
app.post('/api/envelopes/:id/sign', async (req, res) => {
    try {
        const { id } = req.params;
        const { signatureData, signerName, signerEmail, signatureImage } = req.body;

        const docRef = db.collection('envelopes').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Not Found', message: 'Envelope not found' });
        }

        const data = doc.data();

        // Record signature
        // Note: Use JavaScript Date instead of serverTimestamp() because
        // FieldValue.serverTimestamp() cannot be used inside arrays
        const signatureRecord = {
            signerEmail: signerEmail || 'unknown',
            signerName: signerName || 'Guest Signer',
            signatureData: signatureData || null,
            signatureImage: signatureImage || null,
            signedAt: new Date().toISOString(),
            ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
            userAgent: req.headers['user-agent']
        };

        // Calculate if all signed (current signatures + 1)
        const currentSignatures = data.signatures || [];
        const allSigned = (currentSignatures.length + 1) >= data.signers.length;

        // Use arrayUnion for atomic array update
        await docRef.update({
            signatures: admin.firestore.FieldValue.arrayUnion(signatureRecord),
            status: allSigned ? 'completed' : 'partially_signed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            completedAt: allSigned ? admin.firestore.FieldValue.serverTimestamp() : null
        });

        // Log audit trail
        await db.collection('auditLogs').add({
            action: 'envelope_signed',
            envelopeId: id,
            signerEmail: signerEmail,
            signerName: signerName,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            metadata: { allSigned }
        });

        res.json({
            success: true,
            message: allSigned ? 'All signatures collected. Envelope completed.' : 'Signature recorded.',
            status: allSigned ? 'completed' : 'partially_signed',
            callbackUrl: allSigned ? data.callbackUrl : null
        });

    } catch (error) {
        console.error('Sign envelope error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'legacy-estate-opensign',
        timestamp: new Date().toISOString()
    });
});

/**
 * ConnectRPC Mock Handlers for EstateService
 * Provides data synchronization for the Lockhart Estate governance shard
 */
const mockShards = {
  'estate_lockhart': {
    metadata: {
      estateId: 'estate_lockhart',
      name: 'Tameeka Lockhart Estate',
      status: 'Active Shard',
      completionPercentage: 88,
      tier: 'Concierge Protocol',
      mfaEnabled: true,
      nextReviewDate: { seconds: Math.floor(Date.now() / 1000) + 7776000 } // 90 days out
    },
    assets: [
      { id: 'a1', category: 'Real Estate', name: 'Primary Residence (Chicago)', valuation: 750000, status: 'Verified' },
      { id: 'a2', category: 'Investment', name: 'Vanguard Index Cluster', valuation: 250000, status: 'Active Shard' }
    ],
    documents: [
      { id: 'd1', category: 'Legal', name: 'Lockhart Family Trust', date: 'Mar 15, 2026', size: '2.4 MB' },
      { id: 'd2', category: 'Financial', name: 'Vanguard Q4 Statement', date: 'Mar 10, 2026', size: '1.1 MB' },
      { id: 'd3', category: 'Memoir', name: 'Legacy Tape 01 (Verified)', date: 'Mar 05, 2026', size: '48.2 MB' }
    ],
    beneficiaries: [
      { id: 'b1', name: 'Cylton Collymore', role: 'Primary Executor', allocation: '75%', email: 'cylton@sirsi.ai' },
      { id: 'b2', name: 'Maya Lockhart', role: 'Heir', allocation: '25%', email: 'maya@lockhart.fam' }
    ],
    memoirs: [
      { id: 'm1', type: 'video', url: '/assets/tameeka/mommy.mp4', title: 'A Message to Cylton', duration: '02:45' },
      { id: 'm2', type: 'image', url: '/assets/tameeka/mom memorial.jpg', title: 'Grandma\'s Garden View', duration: 'Heritage Shard' },
      { id: 'm3', type: 'video', url: '/assets/tameeka/musical tribute.mp4', title: 'Musical Legacy Pulse', duration: '03:12' }
    ],
    insight: "Protocol detected. Tameeka, your estate is 88% synchronized. We recommend verifying the 'Primary Residence' valuation shard to reach 90% completion."
  }
};

const handleConnect = (req, res, data) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(data);
};

app.post('/api/estate.v1.EstateService/:method', (req, res) => {
  const { method } = req.params;
  const { estateId } = req.body;
  const shard = mockShards[estateId] || mockShards['estate_lockhart'];

  switch(method) {
    case 'GetEstateMetadata': return handleConnect(req, res, { metadata: shard.metadata });
    case 'ListAssets': return handleConnect(req, res, { assets: shard.assets, totalCount: shard.assets.length });
    case 'ListVaultDocuments': return handleConnect(req, res, { documents: shard.documents });
    case 'ListBeneficiaries': return handleConnect(req, res, { beneficiaries: shard.beneficiaries });
    case 'ListMemoirs': return handleConnect(req, res, { memoirs: shard.memoirs });
    case 'GetAIInsight': return handleConnect(req, res, { insight: shard.insight, actionLabel: 'Verify Asset Shard', actionUrl: '/estates/lockhart/assets' });
    case 'GetGovernanceSettings': return handleConnect(req, res, { settings: { mfaEnabled: true, recoveryKeyStatus: 'ACTIVE', biometricRelease: true, emailAlerts: true, statusReportsFrequency: 'Weekly Epoch' } });
    default: res.status(404).send('Method not synced');
  }
});

// Export the Express app as a Firebase Gen 2 Function
exports.api = onRequest(
    {
        memory: '512MiB',
        timeoutSeconds: 60,
        cors: true
    },
    app
);

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
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

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
            // Query pending invitations matching this email
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
