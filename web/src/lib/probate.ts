/**
 * Probate API client — communicates with /api/v1/probate/* endpoints.
 */
import { getAuth } from 'firebase/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'https://finalwishes-api-{hash}.run.app'

async function authHeaders(): Promise<HeadersInit> {
  const user = getAuth().currentUser
  if (!user) throw new Error('Not authenticated')
  const token = await user.getIdToken()
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `API error ${res.status}`)
  }
  return res.json()
}

// ── Types ──

export interface Deadline {
  id: string
  name: string
  description: string
  dueDate: string
  daysFromNow: number
  overdue: boolean
  category: string
}

export interface ChecklistItem {
  id: string
  order: number
  title: string
  description: string
  phase: string
  category: string
  required: boolean
  formRef?: string
  formUrl?: string
}

export interface ProbateStatus {
  estateId: string
  currentPhase: string
  stateCode: string
  stateName: string
  probableTimeline: string
  eFilingAvailable: boolean
  courtSystem: string
  deadlines?: Deadline[]
  smallEstate?: SmallEstateResult
  validTransitions: string[]
}

export interface SmallEstateResult {
  qualifies: boolean
  estateValue: number
  threshold: number
  vehiclesExcluded: boolean
  reason?: string
}

export interface ChecklistResponse {
  estateId: string
  stateCode: string
  items: ChecklistItem[]
  completed: Record<string, boolean>
}

// ── API Functions ──

export async function getProbateStatus(estateId: string): Promise<ProbateStatus> {
  return apiFetch(`/api/v1/probate/status?estate_id=${encodeURIComponent(estateId)}`)
}

export async function getProbateChecklist(estateId: string): Promise<ChecklistResponse> {
  return apiFetch(`/api/v1/probate/checklist?estate_id=${encodeURIComponent(estateId)}`)
}

export async function transitionPhase(estateId: string, targetPhase: string, notes?: string) {
  return apiFetch('/api/v1/probate/transition', {
    method: 'POST',
    body: JSON.stringify({ estateId, targetPhase, notes }),
  })
}

export async function updateChecklistItem(estateId: string, itemId: string, complete: boolean) {
  return apiFetch('/api/v1/probate/checklist/update', {
    method: 'POST',
    body: JSON.stringify({ estateId, itemId, complete }),
  })
}

export async function evaluateSmallEstate(totalPersonalProperty: number, hasRealEstate: boolean): Promise<SmallEstateResult> {
  return apiFetch('/api/v1/probate/evaluate-small-estate', {
    method: 'POST',
    body: JSON.stringify({ totalPersonalProperty, hasRealEstate }),
  })
}

// ── Phase Display Helpers ──

export const PHASE_LABELS: Record<string, string> = {
  active: 'Active',
  death_reported: 'Death Reported',
  executor_confirmed: 'Executor Confirmed',
  in_probate: 'In Probate',
  probate_complete: 'Probate Complete',
  closed: 'Closed',
  small_estate: 'Small Estate',
}

export const PHASE_COLORS: Record<string, string> = {
  active: '#22C55E',
  death_reported: '#EF4444',
  executor_confirmed: '#F59E0B',
  in_probate: '#3B82F6',
  probate_complete: '#8B5CF6',
  closed: '#6B7280',
  small_estate: '#10B981',
}
