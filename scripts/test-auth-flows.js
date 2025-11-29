/**
 * Test Firebase Auth Flows - Legacy Estate OS
 * Tests sign-in, user data fetch, and Firestore operations
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'legacy-estate-os'
});

const auth = admin.auth();
const db = admin.firestore();

const testAccounts = [
    { email: 'admin@legacy.estate', role: 'admin', expectedPlan: 'whiteglove' },
    { email: 'principal@legacy.estate', role: 'principal', expectedPlan: 'concierge' },
    { email: 'executor@legacy.estate', role: 'executor', expectedPlan: 'concierge' },
    { email: 'heir@legacy.estate', role: 'heir', expectedPlan: 'free' }
];

async function testAuthFlows() {
    console.log('========================================');
    console.log('TESTING FIREBASE AUTH FLOWS');
    console.log('========================================\n');
    
    let passed = 0;
    let failed = 0;
    
    for (const account of testAccounts) {
        console.log(`Testing: ${account.email}`);
        console.log('-'.repeat(40));
        
        try {
            // 1. Test: User exists in Firebase Auth
            const user = await auth.getUserByEmail(account.email);
            console.log(`  ✓ Auth user exists (uid: ${user.uid})`);
            
            // 2. Test: User doc exists in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                throw new Error('Firestore user doc not found');
            }
            console.log(`  ✓ Firestore doc exists`);
            
            const userData = userDoc.data();
            
            // 3. Test: Role is correct
            if (userData.role !== account.role) {
                throw new Error(`Role mismatch: expected ${account.role}, got ${userData.role}`);
            }
            console.log(`  ✓ Role correct: ${userData.role}`);
            
            // 4. Test: Subscription exists and correct plan
            if (!userData.subscription) {
                throw new Error('No subscription object');
            }
            if (userData.subscription.plan !== account.expectedPlan) {
                throw new Error(`Plan mismatch: expected ${account.expectedPlan}, got ${userData.subscription.plan}`);
            }
            console.log(`  ✓ Subscription: ${userData.subscription.plan} (${userData.subscription.status})`);
            
            // 5. Test: Required fields exist
            const requiredFields = ['email', 'displayName', 'createdAt', 'profile'];
            for (const field of requiredFields) {
                if (userData[field] === undefined) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            console.log(`  ✓ All required fields present`);
            
            // 6. Test: Update lastLoginAt (simulates login)
            await db.collection('users').doc(user.uid).update({
                lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`  ✓ lastLoginAt updated (login simulation)`);
            
            console.log(`  ✓ ALL TESTS PASSED for ${account.role}\n`);
            passed++;
            
        } catch (error) {
            console.log(`  ✗ FAILED: ${error.message}\n`);
            failed++;
        }
    }
    
    // Test Firestore write operations
    console.log('Testing Firestore Operations');
    console.log('-'.repeat(40));
    
    try {
        // Create test estate
        const estateRef = await db.collection('estates').add({
            name: 'Test Estate',
            principalId: 'test-principal',
            status: 'active',
            phase: 'planning',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isTestData: true
        });
        console.log(`  ✓ Estate created: ${estateRef.id}`);
        
        // Read it back
        const estateDoc = await estateRef.get();
        if (estateDoc.exists && estateDoc.data().name === 'Test Estate') {
            console.log(`  ✓ Estate read successful`);
        }
        
        // Update it
        await estateRef.update({ phase: 'documentation' });
        console.log(`  ✓ Estate updated`);
        
        // Delete test data
        await estateRef.delete();
        console.log(`  ✓ Estate deleted (cleanup)`);
        
        passed++;
    } catch (error) {
        console.log(`  ✗ Firestore ops FAILED: ${error.message}`);
        failed++;
    }
    
    // Summary
    console.log('\n========================================');
    console.log('TEST RESULTS');
    console.log('========================================');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total:  ${passed + failed}`);
    console.log('========================================\n');
    
    if (failed === 0) {
        console.log('✓ ALL AUTH FLOWS WORKING CORRECTLY');
    } else {
        console.log('✗ SOME TESTS FAILED - CHECK OUTPUT ABOVE');
    }
    
    process.exit(failed > 0 ? 1 : 0);
}

testAuthFlows().catch(err => {
    console.error('Test script error:', err);
    process.exit(1);
});
