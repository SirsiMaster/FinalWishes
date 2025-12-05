/**
 * Development Metrics Service
 * MyShepherd - Real-time development analytics
 * 
 * Uses Firebase Modular SDK
 * 
 * @version 2.1.0
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class DevelopmentMetricsService {
    constructor() {
        this.db = null;
        this.listeners = new Map();
        this.cache = new Map();
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            hourlyRate: 150, // $/hour
            monthlyToolsCost: 650, // $/month (Warp AI, etc.)
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            gitHubOwner: 'YourOrg',
            gitHubRepo: 'myshepherd',
            projectStartDate: '2025-11-01', // Project start date
        };
        
        // Metrics structure
        this.metrics = {
            project: {},
            today: {},
            thisWeek: {},
            thisMonth: {},
            features: {},
            recentActivity: [],
            resources: {},
            costs: {},
            deployment: {},
            specifications: {},
        };
    }
    
    /**
     * Initialize the service
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            // Wait for Firebase
            if (window.firebaseDb) {
                this.db = window.firebaseDb;
            } else {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Firebase timeout')), 10000);
                    window.addEventListener('firebase-ready', (e) => {
                        clearTimeout(timeout);
                        this.db = e.detail.db || window.firebaseDb;
                        resolve();
                    }, { once: true });
                });
            }
            
            this.isInitialized = true;
            console.log('✅ DevelopmentMetricsService initialized');
            return true;
            
        } catch (error) {
            console.error('❌ DevelopmentMetricsService init failed:', error);
            // Fall back to local metrics.json
            await this.loadLocalMetrics();
            return false;
        }
    }
    
    /**
     * Get project totals - main API method called by dashboard
     */
    async getProjectTotals() {
        if (!this.db) await this.initialize();
        
        try {
            const metricsRef = collection(this.db, 'development_metrics');
            const q = query(metricsRef, orderBy('date', 'desc'), limit(90));
            const snapshot = await getDocs(q);
            const metrics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            return this.calculateProjectTotals(metrics);
        } catch (error) {
            console.error('Error getting project totals:', error);
            return this.getEmptyProjectTotals();
        }
    }
    
    /**
     * Get today's metrics - main API method called by dashboard
     */
    async getTodayMetrics() {
        if (!this.db) await this.initialize();
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const docRef = doc(this.db, 'development_metrics', today);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    date: today,
                    hours: data.hours || 0,
                    commits: data.commits || 0,
                    files: data.filesChanged || 0,
                    lines: (data.additions || 0) - (data.deletions || 0),
                    cost: ((data.hours || 0) * this.config.hourlyRate).toFixed(0),
                };
            }
            return { date: today, hours: 0, commits: 0, files: 0, lines: 0, cost: '0' };
        } catch (error) {
            console.error('Error getting today metrics:', error);
            return { date: new Date().toISOString().split('T')[0], hours: 0, commits: 0, files: 0, lines: 0, cost: '0' };
        }
    }
    
    /**
     * Get all development sessions
     */
    async getAllSessions(limitCount = 10) {
        if (!this.db) await this.initialize();
        
        try {
            const sessionsRef = collection(this.db, 'development_sessions');
            const q = query(sessionsRef, orderBy('date', 'desc'), limit(limitCount));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting sessions:', error);
            return [];
        }
    }
    
    /**
     * Log a development session
     */
    async logSession(sessionData) {
        if (!this.db) await this.initialize();
        
        try {
            const date = sessionData.date || new Date().toISOString().split('T')[0];
            await addDoc(collection(this.db, 'development_sessions'), {
                ...sessionData,
                date,
                createdAt: new Date(),
            });
            
            // Update daily metrics
            await this.updateDailyMetrics(date, {
                hours: sessionData.hours || 0,
                commits: sessionData.commits || 0,
                filesChanged: sessionData.files || 0,
            });
            
            return { success: true };
        } catch (error) {
            console.error('Error logging session:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Update daily metrics (uses modular SDK)
     */
    async updateDailyMetrics(date, updates) {
        if (!this.db) return;
        
        try {
            const docRef = doc(this.db, 'development_metrics', date);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const current = docSnap.data();
                await updateDoc(docRef, {
                    hours: (current.hours || 0) + (updates.hours || 0),
                    commits: (current.commits || 0) + (updates.commits || 0),
                    filesChanged: (current.filesChanged || 0) + (updates.filesChanged || 0),
                    additions: (current.additions || 0) + (updates.additions || 0),
                    deletions: (current.deletions || 0) + (updates.deletions || 0),
                    updatedAt: new Date(),
                });
            } else {
                await setDoc(docRef, {
                    date,
                    hours: updates.hours || 0,
                    commits: updates.commits || 0,
                    filesChanged: updates.filesChanged || 0,
                    additions: updates.additions || 0,
                    deletions: updates.deletions || 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        } catch (error) {
            console.error('Error updating daily metrics:', error);
        }
    }
    
    /**
     * Load metrics from local JSON file (fallback)
     */
    async loadLocalMetrics() {
        try {
            const response = await fetch('./development/metrics.json');
            if (response.ok) {
                const data = await response.json();
                this.metrics = { ...this.metrics, ...data };
                console.log('📊 Loaded local metrics fallback');
            }
        } catch (error) {
            console.warn('⚠️ No local metrics available');
        }
    }
    
    /**
     * Subscribe to real-time metrics updates (uses modular SDK)
     * @param {Function} callback - Called with updated metrics
     * @returns {Function} Unsubscribe function
     */
    subscribeToMetrics(callback) {
        if (!this.isInitialized) {
            console.error('Service not initialized');
            return () => {};
        }
        
        const unsubscribers = [];
        
        if (this.db) {
            // Subscribe to development_metrics using modular SDK
            const metricsRef = collection(this.db, 'development_metrics');
            const metricsQuery = query(metricsRef, orderBy('date', 'desc'), limit(90));
            const metricsUnsub = onSnapshot(metricsQuery, (snapshot) => {
                const metrics = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                this.metrics.project = this.calculateProjectTotals(metrics);
                this.metrics.today = this._getTodayFromMetrics(metrics);
                this.metrics.thisWeek = this.getWeekMetrics(metrics);
                this.metrics.thisMonth = this.getMonthMetrics(metrics);
                callback(this.metrics);
            });
            unsubscribers.push(metricsUnsub);
        }
        
        const id = Date.now().toString();
        this.listeners.set(id, unsubscribers);
        
        return () => {
            const unsubs = this.listeners.get(id);
            if (unsubs) {
                unsubs.forEach(unsub => unsub());
                this.listeners.delete(id);
            }
        };
    }
    
    /**
     * Helper to get today's metrics from array (used by subscribeToMetrics)
     */
    _getTodayFromMetrics(metrics) {
        const today = new Date().toISOString().split('T')[0];
        const todayMetric = metrics.find(m => m.date === today);
        return {
            date: today,
            hours: todayMetric?.hours || 0,
            commits: todayMetric?.commits || 0,
            files: todayMetric?.filesChanged || 0,
            cost: ((todayMetric?.hours || 0) * this.config.hourlyRate).toFixed(0),
        };
    }
    
    /**
     * Calculate project totals from daily metrics
     */
    calculateProjectTotals(metrics) {
        if (!metrics || metrics.length === 0) {
            return this.getEmptyProjectTotals();
        }
        
        let totalHours = 0;
        let totalCommits = 0;
        let totalFiles = 0;
        let activeDays = 0;
        let totalAdditions = 0;
        let totalDeletions = 0;
        
        metrics.forEach(m => {
            totalHours += m.hours || 0;
            totalCommits += m.commits || 0;
            totalFiles += m.filesChanged || 0;
            totalAdditions += m.additions || 0;
            totalDeletions += m.deletions || 0;
            if ((m.hours || 0) > 0 || (m.commits || 0) > 0) activeDays++;
        });
        
        const totalDays = metrics.length;
        const laborCost = totalHours * this.config.hourlyRate;
        const toolsCost = Math.ceil(totalDays / 30) * this.config.monthlyToolsCost;
        const totalCost = laborCost + toolsCost;
        
        // Calculate start date
        const sortedDates = metrics.map(m => m.date).sort();
        const actualStartDate = sortedDates[sortedDates.length - 1] || this.config.projectStartDate;
        
        return {
            totalHours: totalHours.toFixed(1),
            totalCommits,
            totalFiles,
            totalAdditions,
            totalDeletions,
            activeDays,
            totalDays,
            avgHoursPerDay: activeDays > 0 ? (totalHours / activeDays).toFixed(1) : '0',
            velocity: activeDays > 0 ? (totalCommits / activeDays).toFixed(1) : '0',
            laborCost: laborCost.toFixed(0),
            toolsCost: toolsCost.toFixed(0),
            totalCost: totalCost.toFixed(0),
            costPerCommit: totalCommits > 0 ? (totalCost / totalCommits).toFixed(2) : '0',
            costPerHour: this.config.hourlyRate,
            actualStartDate,
        };
    }
    
    getEmptyProjectTotals() {
        return {
            totalHours: '0', totalCommits: 0, totalFiles: 0, totalAdditions: 0,
            totalDeletions: 0, activeDays: 0, totalDays: 0, avgHoursPerDay: '0',
            velocity: '0', laborCost: '0', toolsCost: '0', totalCost: '0',
            costPerCommit: '0', costPerHour: this.config.hourlyRate,
            actualStartDate: this.config.projectStartDate,
        };
    }
    
    /**
     * Get today's metrics
     */
    getTodayMetrics(metrics) {
        const today = new Date().toISOString().split('T')[0];
        const todayMetric = metrics.find(m => m.date === today);
        
        return {
            date: today,
            hours: todayMetric?.hours || 0,
            commits: todayMetric?.commits || 0,
            filesChanged: todayMetric?.filesChanged || 0,
            cost: ((todayMetric?.hours || 0) * this.config.hourlyRate).toFixed(0),
            additions: todayMetric?.additions || 0,
            deletions: todayMetric?.deletions || 0,
        };
    }
    
    /**
     * Get this week's metrics
     */
    getWeekMetrics(metrics) {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        let hours = 0, commits = 0, filesChanged = 0, days = 0;
        
        metrics.forEach(m => {
            const metricDate = new Date(m.date);
            if (metricDate >= weekAgo && metricDate <= today) {
                hours += m.hours || 0;
                commits += m.commits || 0;
                filesChanged += m.filesChanged || 0;
                if ((m.hours || 0) > 0 || (m.commits || 0) > 0) days++;
            }
        });
        
        return {
            hours: hours.toFixed(1),
            commits,
            filesChanged,
            days,
            cost: (hours * this.config.hourlyRate).toFixed(0),
        };
    }
    
    /**
     * Get this month's metrics
     */
    getMonthMetrics(metrics) {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        
        let hours = 0, commits = 0, filesChanged = 0, days = 0;
        
        metrics.forEach(m => {
            const metricDate = new Date(m.date);
            if (metricDate >= monthAgo && metricDate <= today) {
                hours += m.hours || 0;
                commits += m.commits || 0;
                filesChanged += m.filesChanged || 0;
                if ((m.hours || 0) > 0 || (m.commits || 0) > 0) days++;
            }
        });
        
        return {
            hours: hours.toFixed(1),
            commits,
            filesChanged,
            days,
            cost: (hours * this.config.hourlyRate).toFixed(0),
        };
    }
    
    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        if (!date) return 'Recently';
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
        return `${Math.floor(seconds / 2592000)}mo ago`;
    }
    
    // =========================================================================
    // ADDITIONAL WRITE OPERATIONS (use modular SDK)
    // =========================================================================
    
    /**
     * Log a git commit (modular SDK)
     */
    async logCommit(commitData) {
        if (!this.db) await this.initialize();
        
        try {
            await addDoc(collection(this.db, 'git_commits'), {
                ...commitData,
                timestamp: new Date(),
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // =========================================================================
    // GITHUB INTEGRATION
    // =========================================================================
    
    /**
     * Fetch commits from GitHub API
     */
    async fetchGitHubCommits(since = null) {
        try {
            const { gitHubOwner, gitHubRepo } = this.config;
            let url = `https://api.github.com/repos/${gitHubOwner}/${gitHubRepo}/commits?per_page=100`;
            if (since) url += `&since=${since}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('GitHub API error');
            
            const commits = await response.json();
            return commits.map(c => ({
                hash: c.sha,
                message: c.commit.message,
                author: c.commit.author.name,
                date: c.commit.author.date,
                url: c.html_url,
            }));
        } catch (error) {
            console.error('GitHub fetch error:', error);
            return [];
        }
    }
    
    /**
     * Sync GitHub commits to Firestore
     */
    async syncGitHubCommits() {
        const commits = await this.fetchGitHubCommits();
        
        for (const commit of commits.slice(0, 20)) {
            await this.logCommit(commit);
        }
        
        console.log(`✅ Synced ${commits.length} commits from GitHub`);
        return commits.length;
    }
    
    // =========================================================================
    // COST PROJECTIONS
    // =========================================================================
    
    /**
     * Calculate cost projections
     */
    calculateProjections(metrics) {
        const project = this.metrics.project;
        const week = this.metrics.thisWeek;
        
        const burnRate = parseFloat(week.cost || 0) / 7; // Daily burn rate
        const daysRemaining = 90; // Estimated days to completion
        
        return {
            dailyBurnRate: burnRate.toFixed(0),
            weeklyBurnRate: (burnRate * 7).toFixed(0),
            monthlyBurnRate: (burnRate * 30).toFixed(0),
            projectedTotal: (parseFloat(project.totalCost || 0) + (burnRate * daysRemaining)).toFixed(0),
            daysTo10k: burnRate > 0 ? Math.ceil((10000 - parseFloat(project.totalCost || 0)) / burnRate) : 'N/A',
            daysTo25k: burnRate > 0 ? Math.ceil((25000 - parseFloat(project.totalCost || 0)) / burnRate) : 'N/A',
            estimatedCompletion: burnRate > 0 ? (parseFloat(project.totalCost || 0) + (burnRate * daysRemaining)).toFixed(0) : 'N/A',
        };
    }
    
    // =========================================================================
    // EXPORT FUNCTIONALITY
    // =========================================================================
    
    /**
     * Export metrics to JSON
     */
    exportToJSON() {
        return JSON.stringify(this.metrics, null, 2);
    }
    
    /**
     * Export metrics to CSV
     */
    exportToCSV() {
        const rows = [
            ['Metric', 'Value'],
            ['Total Hours', this.metrics.project.totalHours],
            ['Total Commits', this.metrics.project.totalCommits],
            ['Total Cost', '$' + this.metrics.project.totalCost],
            ['Active Days', this.metrics.project.activeDays],
            ['Velocity (commits/day)', this.metrics.project.velocity],
            ['Cost per Commit', '$' + this.metrics.project.costPerCommit],
        ];
        
        return rows.map(r => r.join(',')).join('\n');
    }
    
    /**
     * Clean up listeners
     */
    destroy() {
        this.listeners.forEach((unsubs) => {
            unsubs.forEach(unsub => unsub());
        });
        this.listeners.clear();
        this.isInitialized = false;
        console.log('🔌 DevelopmentMetricsService destroyed');
    }
}

// Create singleton instance
const developmentMetricsService = new DevelopmentMetricsService();

// Auto-initialize when Firebase is ready
window.addEventListener('firebase-ready', () => {
    developmentMetricsService.initialize();
});

// Make globally available as instance
window.DevelopmentMetricsService = developmentMetricsService;

// Export singleton instance for ES modules
export default developmentMetricsService;
