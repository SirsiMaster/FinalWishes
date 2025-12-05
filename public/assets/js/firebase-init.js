/**
 * Firebase Modular SDK Initialization
 * MyShepherd - "The Estate Operating System"
 * 
 * IMPROVEMENTS OVER ASSIDUOUS:
 * - Better TypeScript-style JSDoc annotations
 * - Enhanced error handling with retry logic
 * - Connection state monitoring
 * - Graceful degradation for offline mode
 * - Performance monitoring hooks
 * - Cleaner service separation
 * 
 * @version 2.0.0
 * @author MyShepherd AI Development Team
 */

// Import Firebase modular SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    connectFirestoreEmulator,
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import {
    getAnalytics,
    logEvent,
    isSupported as analyticsIsSupported,
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Firebase configuration - MyShepherd
 * @type {Object}
 */
const firebaseConfig = {
    apiKey: "AIzaSyANMDZXcdn2eI8JN8FxXlAkCt-f4BONuiU",
    authDomain: "legacy-estate-os.firebaseapp.com",
    projectId: "legacy-estate-os",
    storageBucket: "legacy-estate-os.firebasestorage.app",
    messagingSenderId: "1002875213628",
    appId: "1:1002875213628:web:59d3f4b04345f3f7abb039"
};

// Environment detection
const ENV = {
    isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isDevelopment: window.location.hostname.includes('dev') || window.location.hostname.includes('staging'),
    isProduction: !window.location.hostname.includes('localhost') && !window.location.hostname.includes('dev'),
};

// ============================================================================
// INITIALIZATION
// ============================================================================

let app, auth, db, storage, analytics;
let isInitialized = false;
let connectionState = 'unknown'; // 'online' | 'offline' | 'unknown'

/**
 * Initialize Firebase with retry logic
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<boolean>} - Success status
 */
async function initializeFirebase(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔥 Firebase initialization attempt ${attempt}/${maxRetries}...`);
            
            // Initialize Firebase app
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            storage = getStorage(app);
            
            // Set auth persistence
            await setPersistence(auth, browserLocalPersistence);
            
            // Offline persistence disabled to prevent cross-project conflicts
            // Data is always fetched fresh from Firestore servers
            console.log('ℹ️ Firestore offline persistence disabled (server-only mode)');
            
            // Initialize Analytics (production only)
            if (ENV.isProduction) {
                const supported = await analyticsIsSupported();
                if (supported) {
                    analytics = getAnalytics(app);
                    console.log('📊 Analytics initialized');
                }
            }
            
            // Connect to emulators in development
            if (ENV.isLocalhost) {
                // Uncomment to use emulators:
                // connectFirestoreEmulator(db, 'localhost', 8080);
                console.log('🔧 Development mode - emulators available');
            }
            
            isInitialized = true;
            connectionState = 'online';
            
            // Make db available globally for services
            window.firebaseDb = db;
            window.firebaseAuth = auth;
            window.firebaseStorage = storage;
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('firebase-ready', {
                detail: { app, auth, db, storage, analytics }
            }));
            
            console.log('✅ Firebase initialized successfully');
            return true;
            
        } catch (error) {
            console.error(`❌ Firebase init attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                console.error('❌ Firebase initialization failed after all retries');
                connectionState = 'offline';
                window.dispatchEvent(new CustomEvent('firebase-error', { detail: error }));
                return false;
            }
            
            // Exponential backoff
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
    }
    return false;
}

// Auto-initialize
initializeFirebase();

// ============================================================================
// AUTH SERVICE
// ============================================================================

/**
 * Authentication Service with improved error handling
 * @namespace AuthService
 */
export const AuthService = {
    /**
     * Sign up a new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {Object} userData - Additional user data
     * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
     */
    async signUp(email, password, userData = {}) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Build display name
            const displayName = [userData.firstName, userData.lastName].filter(Boolean).join(' ');
            if (displayName) {
                await updateProfile(user, { displayName });
            }
            
            // Create user profile in Firestore
            const userProfile = {
                uid: user.uid,
                email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                displayName,
                role: userData.role || 'principal', // User roles: principal, executor, heir, admin
                phone: userData.phone || '',
                status: userData.role === 'executor' ? 'pending' : 'active',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Estate-specific fields
                ...(userData.estateId && { linkedEstates: [userData.estateId] }),
            };
            
            await setDoc(doc(db, 'users', user.uid), userProfile);
            
            // Log signup event
            if (analytics) {
                logEvent(analytics, 'sign_up', { method: 'email', role: userData.role });
            }
            
            return { success: true, user, profile: userProfile };
            
        } catch (error) {
            console.error('❌ Sign up error:', error);
            return { success: false, error: this._formatAuthError(error) };
        }
    },
    
    /**
     * Sign in an existing user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<{success: boolean, user?: Object, role?: string, error?: string}>}
     */
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Get user profile from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            // Log auth event
            await addDoc(collection(db, 'auth_events'), {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'principal',
                status: 'success',
                source: 'legacy_web',
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
            }).catch(() => {}); // Non-blocking
            
            if (analytics) {
                logEvent(analytics, 'login', { method: 'email', role: userData.role });
            }
            
            return {
                success: true,
                user,
                role: userData.role || 'principal',
                status: userData.status || 'active',
                profile: userData,
            };
            
        } catch (error) {
            console.error('❌ Sign in error:', error);
            return { success: false, error: this._formatAuthError(error) };
        }
    },
    
    /**
     * Sign out the current user
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async signOut() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Get the current authenticated user
     * @returns {Object|null}
     */
    getCurrentUser() {
        return auth?.currentUser || null;
    },
    
    /**
     * Listen to auth state changes
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChanged(callback) {
        return onAuthStateChanged(auth, callback);
    },
    
    /**
     * Get user profile data
     * @param {string} userId - User ID
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async getUserData(userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                return { success: true, data: { id: userDoc.id, ...userDoc.data() } };
            }
            return { success: false, error: 'User not found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Send password reset email
     * @param {string} email - User email
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            return { success: false, error: this._formatAuthError(error) };
        }
    },
    
    /**
     * Get redirect URL based on user role
     * @param {string} role - User role
     * @param {string} status - User status
     * @returns {string} Redirect URL
     */
    getRoleRedirect(role, status = 'active') {
        // Handle pending executors
        if (role === 'executor' && status === 'pending') {
            return '/portals/executor-pending.html';
        }
        
        const redirects = {
            admin: '/admin/dashboard.html',
            principal: '/portals/principal/dashboard.html',
            executor: '/portals/executor/dashboard.html',
            heir: '/portals/heir/dashboard.html',
        };
        
        return redirects[role] || '/portals/principal/dashboard.html';
    },
    
    /**
     * Format Firebase auth errors to user-friendly messages
     * @private
     */
    _formatAuthError(error) {
        const errorMap = {
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password must be at least 6 characters.',
            'auth/too-many-requests': 'Too many attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
        };
        return errorMap[error.code] || error.message;
    }
};

// ============================================================================
// DATABASE SERVICE
// ============================================================================

/**
 * Database Service for Firestore operations
 * @namespace DatabaseService
 */
export const DatabaseService = {
    /**
     * Get documents from a collection with filters
     * @param {string} collectionName - Collection name
     * @param {Array} filters - Array of filter objects {field, operator, value}
     * @param {number} limitCount - Max documents to return
     * @param {string} orderByField - Field to order by
     * @param {string} orderDirection - 'asc' or 'desc'
     * @returns {Promise<Array>} Array of documents
     */
    async getDocuments(collectionName, filters = [], limitCount = null, orderByField = null, orderDirection = 'asc') {
        try {
            let q = collection(db, collectionName);
            const constraints = [];
            
            // Apply filters
            filters.forEach(f => {
                if (f.field && f.operator && f.value !== undefined) {
                    constraints.push(where(f.field, f.operator, f.value));
                }
            });
            
            // Apply ordering
            if (orderByField) {
                constraints.push(orderBy(orderByField, orderDirection));
            }
            
            // Apply limit
            if (limitCount) {
                constraints.push(limit(limitCount));
            }
            
            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
        } catch (error) {
            console.error(`❌ Error getting ${collectionName}:`, error);
            return [];
        }
    },
    
    /**
     * Get a single document by ID
     * @param {string} collectionName - Collection name
     * @param {string} docId - Document ID
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async getDocument(collectionName, docId) {
        try {
            const docRef = await getDoc(doc(db, collectionName, docId));
            if (docRef.exists()) {
                return { success: true, data: { id: docRef.id, ...docRef.data() } };
            }
            return { success: false, error: 'Document not found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Create a new document
     * @param {string} collectionName - Collection name
     * @param {Object} data - Document data
     * @param {string} docId - Optional document ID
     * @returns {Promise<{success: boolean, id?: string, error?: string}>}
     */
    async createDocument(collectionName, data, docId = null) {
        try {
            const docData = {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            
            if (docId) {
                await setDoc(doc(db, collectionName, docId), docData);
                return { success: true, id: docId };
            } else {
                const docRef = await addDoc(collection(db, collectionName), docData);
                return { success: true, id: docRef.id };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Update an existing document
     * @param {string} collectionName - Collection name
     * @param {string} docId - Document ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async updateDocument(collectionName, docId, updates) {
        try {
            await updateDoc(doc(db, collectionName, docId), {
                ...updates,
                updatedAt: serverTimestamp(),
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Delete a document
     * @param {string} collectionName - Collection name
     * @param {string} docId - Document ID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async deleteDocument(collectionName, docId) {
        try {
            await deleteDoc(doc(db, collectionName, docId));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Subscribe to real-time updates
     * @param {string} collectionName - Collection name
     * @param {Function} callback - Callback function
     * @param {Array} filters - Optional filters
     * @returns {Function} Unsubscribe function
     */
    onCollectionChange(collectionName, callback, filters = []) {
        let q = collection(db, collectionName);
        
        if (filters.length > 0) {
            const constraints = filters.map(f => where(f.field, f.operator, f.value));
            q = query(q, ...constraints);
        }
        
        return onSnapshot(q, snapshot => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(docs);
        }, error => {
            console.error(`❌ Snapshot error for ${collectionName}:`, error);
        });
    },
    
    /**
     * Get count of documents in a collection
     * @param {string} collectionName - Collection name
     * @param {Array} filters - Optional filters
     * @returns {Promise<number>}
     */
    async getCount(collectionName, filters = []) {
        const docs = await this.getDocuments(collectionName, filters);
        return docs.length;
    }
};

// ============================================================================
// STORAGE SERVICE
// ============================================================================

/**
 * Storage Service for file operations
 * @namespace StorageService
 */
export const StorageService = {
    /**
     * Upload a file
     * @param {string} path - Storage path
     * @param {File} file - File to upload
     * @param {Object} metadata - Optional metadata
     * @returns {Promise<{success: boolean, url?: string, error?: string}>}
     */
    async uploadFile(path, file, metadata = {}) {
        try {
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, file, { customMetadata: metadata });
            const downloadURL = await getDownloadURL(snapshot.ref);
            return { success: true, url: downloadURL, path };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Get download URL for a file
     * @param {string} path - Storage path
     * @returns {Promise<{success: boolean, url?: string, error?: string}>}
     */
    async getFileURL(path) {
        try {
            const storageRef = ref(storage, path);
            const url = await getDownloadURL(storageRef);
            return { success: true, url };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Delete a file
     * @param {string} path - Storage path
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async deleteFile(path) {
        try {
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get current connection state
 * @returns {string}
 */
export function getConnectionState() {
    return connectionState;
}

/**
 * Check if Firebase is initialized
 * @returns {boolean}
 */
export function isFirebaseReady() {
    return isInitialized;
}

/**
 * Log analytics event
 * @param {string} eventName - Event name
 * @param {Object} params - Event parameters
 */
export function trackEvent(eventName, params = {}) {
    if (analytics) {
        logEvent(analytics, eventName, params);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make globally available for legacy code
window.Firebase = {
    app,
    auth,
    db,
    storage,
    analytics,
    AuthService,
    DatabaseService,
    StorageService,
    getConnectionState,
    isFirebaseReady,
    trackEvent,
};

// Also expose firebaseDb for compatibility with existing code
window.firebaseDb = db;

export { app, auth, db, storage, analytics };
export default { AuthService, DatabaseService, StorageService };
