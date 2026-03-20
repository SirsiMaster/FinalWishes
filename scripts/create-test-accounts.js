/**
 * Create Test Accounts for Legacy Estate OS
 * Run with: node scripts/create-test-accounts.js
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'finalwishes-prod'
});

const auth = admin.auth();
const db = admin.firestore();

const testAccounts = [
    {
        email: 'admin@finalwishes.app',
        password: 'LegacyAdmin2025!',
        displayName: 'Legacy Admin',
        role: 'admin',
        subscription: { plan: 'whiteglove', status: 'active' }
    },
    {
        email: 'principal@finalwishes.app',
        password: 'LegacyPrincipal2025!',
        displayName: 'John Principal',
        role: 'principal',
        subscription: { plan: 'concierge', status: 'active' }
    },
    {
        email: 'executor@finalwishes.app',
        password: 'LegacyExecutor2025!',
        displayName: 'Sarah Executor',
        role: 'executor',
        subscription: { plan: 'concierge', status: 'active' }
    },
    {
        email: 'heir@finalwishes.app',
        password: 'LegacyHeir2025!',
        displayName: 'Michael Heir',
        role: 'heir',
        subscription: { plan: 'free', status: 'active' }
    }
];

async function createAccounts() {
    console.log('Creating test accounts...\n');
    
    for (const account of testAccounts) {
        try {
            let user;
            try {
                user = await auth.getUserByEmail(account.email);
                console.log('Exists:', account.email);
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    user = await auth.createUser({
                        email: account.email,
                        password: account.password,
                        displayName: account.displayName,
                        emailVerified: true
                    });
                    console.log('Created:', account.email);
                } else throw e;
            }
            
            await db.collection('users').doc(user.uid).set({
                email: account.email,
                displayName: account.displayName,
                role: account.role,
                subscription: { ...account.subscription, createdAt: admin.firestore.FieldValue.serverTimestamp() },
                mfaEnabled: false,
                emailVerified: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
                profile: { firstName: account.displayName.split(' ')[0], lastName: account.displayName.split(' ')[1] || '' },
                isTestAccount: true
            }, { merge: true });
            
        } catch (error) {
            console.error('Error:', account.email, error.message);
        }
    }
    
    console.log('\nDone!\n');
    process.exit(0);
}

createAccounts();
