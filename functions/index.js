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

// Export the Express app as a Firebase Gen 2 Function
exports.api = onRequest(
    {
        memory: '512MiB',
        timeoutSeconds: 60,
        cors: true
    },
    app
);
