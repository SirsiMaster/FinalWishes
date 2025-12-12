/**
 * Estate Service
 * FinalWishes - Estate management operations
 * Uses Firebase Modular SDK
 * 
 * @version 2.0.0
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class EstateService {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }
    
    async initialize() {
        try {
            // Wait for Firebase to be ready
            if (window.firebaseDb) {
                this.db = window.firebaseDb;
            } else {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Firebase timeout')), 10000);
                    window.addEventListener('firebase-ready', (e) => {
                        clearTimeout(timeout);
                        this.db = e.detail.db;
                        resolve();
                    }, { once: true });
                });
            }
            
            this.isInitialized = true;
            console.log('✅ EstateService initialized');
            return true;
        } catch (error) {
            console.error('❌ EstateService init failed:', error);
            return false;
        }
    }
    
    // =========================================================================
    // ESTATE OPERATIONS
    // =========================================================================
    
    async getEstates(filters = {}) {
        try {
            if (!this.db) await this.initialize();
            
            const estatesRef = collection(this.db, 'estates');
            let q = query(estatesRef, orderBy('createdAt', 'desc'));
            
            if (filters.status) {
                q = query(estatesRef, where('status', '==', filters.status), orderBy('createdAt', 'desc'));
            }
            if (filters.limit) {
                q = query(q, limit(filters.limit));
            }
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('❌ Error getting estates:', error);
            return [];
        }
    }
    
    async getAllEstates() {
        return this.getEstates();
    }
    
    async getEstate(estateId) {
        try {
            if (!this.db) await this.initialize();
            
            const docRef = doc(this.db, 'estates', estateId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
            }
            return { success: false, error: 'Estate not found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async createEstate(estateData) {
        try {
            if (!this.db) await this.initialize();
            
            const estate = {
                ...estateData,
                status: estateData.status || 'active',
                phase: estateData.phase || 'planning',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            const docRef = await addDoc(collection(this.db, 'estates'), estate);
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async updateEstate(estateId, updates) {
        try {
            if (!this.db) await this.initialize();
            
            const docRef = doc(this.db, 'estates', estateId);
            await updateDoc(docRef, { ...updates, updatedAt: new Date() });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async deleteEstate(estateId) {
        try {
            if (!this.db) await this.initialize();
            
            const docRef = doc(this.db, 'estates', estateId);
            await updateDoc(docRef, { status: 'deleted', deletedAt: new Date() });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async getStatistics() {
        const estates = await this.getEstates();
        return {
            success: true,
            data: {
                total: estates.length,
                byStatus: estates.reduce((acc, e) => {
                    acc[e.status || 'unknown'] = (acc[e.status || 'unknown'] || 0) + 1;
                    return acc;
                }, {}),
            }
        };
    }
}

// Create singleton instance
const estateService = new EstateService();

// Auto-initialize when Firebase is ready
window.addEventListener('firebase-ready', () => {
    estateService.initialize();
});

// Make globally available  
window.EstateService = estateService;

export default estateService;
