import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { EstateService } from "../gen/estate/v1/estate_pb";
import { auth } from "./firebase";

// The transport defines how the client talks to the backend
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const baseUrl = isLocal ? "http://localhost:8080" : (import.meta.env.VITE_API_URL || "https://finalwishes-api-860699311615.us-central1.run.app");

const transport = createConnectTransport({
  baseUrl: baseUrl,
  // Inject Firebase Auth token on every request
  interceptors: [
    (next) => async (req) => {
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          req.header.set("Authorization", `Bearer ${token}`);
        } catch {
          // Token fetch failed — proceed without auth header
          // The server will return 401 if auth is required
        }
      }
      return next(req);
    },
  ],
});

// We create a client for each service
const realClient = createClient(EstateService, transport);

/**
 * Estate Client with demo-mode fallback
 * 
 * In production: routes through ConnectRPC with Firebase Auth headers.
 * In demo mode (?demo=true): falls back to hardcoded Lockhart data.
 */
const isDemoMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';

export const estateClient = isDemoMode
  ? new Proxy(realClient, {
    get(target, prop, _receiver) {
      const originalMethod = (target as Record<string | symbol, unknown>)[prop];
      if (typeof originalMethod !== 'function') return originalMethod;

      return async (...args: unknown[]) => {
        try {
          const networkCall = originalMethod.apply(target, args);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Demo Timeout")), 400)
          );
          return await Promise.race([networkCall, timeoutPromise]);
        } catch (err) {
          console.warn(`Demo fallback for ${String(prop)}`);
          
          const { estateId } = args[0] || {};
          const isLockhart = estateId === 'lockhart' || estateId === 'estate_lockhart';
          
          if (isLockhart) {
            switch(prop) {
              case 'getEstateMetadata': return { 
                id: 'estate_lockhart', 
                name: 'Lockhart Estate', 
                status: 'Active', 
                completionPercentage: 88, 
                tier: 'Concierge', 
                mfaEnabled: true,
                nextReviewDate: { seconds: BigInt(Math.floor(Date.now() / 1000) + 7776000), nanos: 0 } as unknown
              };
              case 'listAssets': return { assets: [
                { id: 'a1', category: 'Real Estate', name: 'Primary Residence (Chicago)', valuation: 750000, status: 'Verified' },
                { id: 'a2', category: 'Investment', name: 'Vanguard Index Fund', valuation: 250000, status: 'Active' }
              ], totalCount: 2 };
              case 'listVaultDocuments': return { documents: [
                { id: 'd1', category: 'Legal', name: 'Lockhart Family Trust', date: 'Mar 15, 2026', size: '2.4 MB' },
                { id: 'd2', category: 'Financial', name: 'Vanguard Q4 Statement', date: 'Mar 10, 2026', size: '1.1 MB' },
                { id: 'd3', category: 'Memoir', name: 'Legacy Tape 01', date: 'Mar 05, 2026', size: '48.2 MB' }
              ]};
              case 'listBeneficiaries': return { beneficiaries: [
                { id: 'b1', name: 'Maya Lockhart', role: 'Primary Executor', allocation: '75%', email: 'maya@lockhart.fam' },
                { id: 'b2', name: 'Andre Lockhart', role: 'Heir', allocation: '25%', email: 'andre@lockhart.fam' }
              ]};
              case 'listMemoirs': return { memoirs: [
                { id: 'm1', type: 'video', url: '/assets/tameeka/mommy.mp4', title: 'A Message to Tameeka', duration: '02:45' },
                { id: 'm2', type: 'photo', url: '/assets/tameeka/mom memorial.jpg', title: 'Grandma\'s Garden View', duration: '' },
                { id: 'm3', type: 'photo', url: '/assets/tameeka/mom dance.jpg', title: 'Celebration of Life', duration: '' },
                { id: 'm4', type: 'video', url: '/assets/tameeka/musical tribute.mp4', title: 'Musical Legacy', duration: '03:12' }
              ]};
              case 'getAIInsight': return { 
                insight: "Your estate is 88% complete. We recommend verifying the 'Primary Residence' valuation to reach 90% completion.",
                actionLabel: 'Verify Asset',
                actionUrl: '/estates/lockhart/assets'
              };
              case 'getGovernanceSettings': return { settings: { 
                mfaEnabled: true, 
                recoveryKeyStatus: 'ACTIVE', 
                biometricRelease: true, 
                emailAlerts: true, 
                statusReportsFrequency: 'Weekly' 
              }};
            }
          }
          throw err;
        }
      };
    }
  })
  : realClient;
