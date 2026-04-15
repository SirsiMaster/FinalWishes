/**
 * Document Intelligence — AI-powered document analysis
 *
 * Sends uploaded vault documents to the Go API for structured analysis.
 * Fires in the background after upload — never blocks the UI.
 */

import { auth } from './firebase';

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = isLocal ? 'http://localhost:8080' : '';

export interface AnalyzeDocumentParams {
  estateId: string;
  documentId: string;
  storageKey: string;
  mimeType: string;
  fileName: string;
}

export interface AnalyzeDocumentResponse {
  analysis: {
    documentType: string;
    signingDate: string | null;
    notarized: boolean | null;
    namedBeneficiaries: string[];
    namedExecutor: string | null;
    namedTrustee: string | null;
    assetsMentioned: string[];
    jurisdiction: string | null;
    summary: string;
    flags: string[];
  };
  discrepancies: Array<{
    type: string;
    name: string;
    message: string;
  }>;
}

/**
 * Fire-and-forget document analysis request.
 * Returns the response if successful, null on failure.
 * Designed to run in the background — callers should not await this
 * unless they specifically need the result.
 */
export async function analyzeDocument(
  params: AnalyzeDocumentParams,
): Promise<AnalyzeDocumentResponse | null> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      console.warn('[DocIntell] No auth token — skipping analysis');
      return null;
    }

    const res = await fetch(`${API_BASE}/api/v1/documents/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      console.warn(`[DocIntell] Analysis request failed (${res.status})`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn('[DocIntell] Analysis request error:', err);
    return null;
  }
}
