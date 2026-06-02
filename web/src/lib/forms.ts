/**
 * Statutory Forms API client.
 *
 * Talks to the Go API's coordinate-overlay fill engine:
 *   GET  /api/v1/forms                — list supported forms + field schemas
 *   GET  /api/v1/forms/{id}           — one form's schema
 *   POST /api/v1/forms/{id}/fill      — fill; returns application/pdf
 *
 * Execution fields (signature/witness/notary/date) are flagged by the API and
 * NEVER stamped by the engine — the form is wet-signed. The UI hides them from
 * the input set entirely.
 */
import { auth } from './firebase';

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = isLocal ? 'http://localhost:8080' : (import.meta.env.VITE_API_URL || '');

export interface FormField {
  key: string;
  label?: string;
  kind: string; // "text" | "checkbox"
  required: boolean;
  execution: boolean;
  page: number;
}

export interface FormSchema {
  formId: string;
  title: string;
  jurisdiction: string;
  citation: string;
  pageCount: number;
  fields: FormField[];
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** List all supported statutory forms with their field schemas. */
export async function listForms(): Promise<FormSchema[]> {
  const res = await fetch(`${API_BASE}/api/v1/forms`, {
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) throw new Error(`Failed to load forms (${res.status})`);
  const body = (await res.json()) as { forms: FormSchema[] };
  return body.forms ?? [];
}

/** The fillable (non-execution) fields of a form, in page order. */
export function fillableFields(form: FormSchema): FormField[] {
  return form.fields
    .filter((f) => !f.execution)
    .sort((a, b) => a.page - b.page);
}

export interface FillResult {
  blob: Blob;
  /** Required fields the caller left blank (engine still returns a partial PDF). */
  missingRequired: string[];
  /** Execution fields the engine intentionally did not stamp. */
  skippedExecution: string[];
}

/** Fill a form and return the print-ready PDF plus the engine's report headers. */
export async function fillForm(
  formId: string,
  values: Record<string, string>,
): Promise<FillResult> {
  const res = await fetch(`${API_BASE}/api/v1/forms/${encodeURIComponent(formId)}/fill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    let msg = `Failed to generate form (${res.status})`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) msg = err.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  const parseHeader = (h: string | null): string[] =>
    h ? h.split(',').map((s) => s.trim()).filter(Boolean) : [];
  return {
    blob: await res.blob(),
    missingRequired: parseHeader(res.headers.get('X-Forms-Missing-Required')),
    skippedExecution: parseHeader(res.headers.get('X-Forms-Skipped-Execution')),
  };
}

/** Trigger a browser download of a filled-form PDF blob. */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
