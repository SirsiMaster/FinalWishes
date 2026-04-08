/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import React, { useMemo, useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useEstate, useEstateAssets, useEstateHeirs, useEstateDocuments } from '../lib/firestore'

export const Route = createFileRoute('/estates/$estateId/dashboard')({
  component: DashboardIndex,
})

// ─── Shepherd Types ──────────────────────────────────────────────────────

interface ShepherdStep {
  id: string
  label: string
  description: string
  category: string
  complete: boolean
  route: string
  priority: number
}

interface ShepherdScore {
  estateId: string
  completionPercent: number
  completedSteps: number
  totalSteps: number
  steps: ShepherdStep[]
  nextAction: ShepherdStep | null
  insight: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// ─── Main Page ──────────────────────────────────────────────────────────────

function DashboardIndex() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/dashboard' })
  const { user, profile } = useAuth()
  const estateId = useMemo(() => (routeId === 'lockhart' ? 'estate_lockhart' : routeId), [routeId])
  const userName = profile?.firstName || profile?.displayName || ''

  const { data: _estate, loading: metaLoading } = useEstate(estateId)
  const { data: assets, loading: assetsLoading } = useEstateAssets(estateId)
  const { data: heirs, loading: beneLoading } = useEstateHeirs(estateId)
  const { data: documents, loading: vaultLoading } = useEstateDocuments(estateId)

  // Shepherd score
  const [score, setScore] = useState<ShepherdScore | null>(null)
  const [scoreLoading, setScoreLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch(`${API_BASE}/api/v1/guidance/score?estate_id=${estateId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok && !cancelled) {
          setScore(await res.json())
        }
      } catch {
        // Fallback: score unavailable
      }
      if (!cancelled) setScoreLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, estateId])

  const isLoading = metaLoading || assetsLoading || beneLoading || vaultLoading

  const percent = score?.completionPercent ?? 0
  const insight = score?.insight ?? 'Loading your estate guidance...'
  const nextAction = score?.nextAction

  // Group steps by category
  const categories = useMemo(() => {
    const steps = score?.steps ?? []
    const map: Record<string, ShepherdStep[]> = {}
    for (const s of steps) {
      if (!map[s.category]) map[s.category] = []
      map[s.category].push(s)
    }
    return map
  }, [score])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto p-12 space-y-12 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Page Header ── */}
      <div className="space-y-3 mb-16">
        <div className="flex items-center gap-3 text-[11px] font-bold text-royal/40 uppercase tracking-[0.2em] mb-4">
          <div className="w-10 h-px bg-royal/20" />
          <span>The Shepherd — Estate Guidance</span>
        </div>
        <h1 className="text-[3.5rem] font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] leading-tight tracking-tight">
          Welcome back, {userName || 'there'}.
        </h1>
        <p className="text-[#64748B] text-xl font-medium max-w-3xl leading-relaxed">{insight}</p>
      </div>

      {/* ── Primary Action Card ── */}
      <div className="bg-[#F8FAFC] rounded-[3rem] p-16 flex items-center justify-between border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-royal/[0.015] rounded-bl-full pointer-events-none" />
        <div className="flex-1 space-y-10 relative z-10">
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em]">Estate Completion</div>
            <div className="flex items-end gap-5">
              <span className="text-8xl font-black text-[#0F172A] tracking-tighter leading-none tabular-nums">
                {scoreLoading ? '—' : `${percent}%`}
              </span>
              <span className="text-slate-400 font-semibold text-2xl pb-2">
                {score ? `${score.completedSteps} of ${score.totalSteps} steps` : 'calculating...'}
              </span>
            </div>
          </div>
          <div className="w-full max-w-xl h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-[#133378] transition-all duration-1000 shadow-[0_0_20px_rgba(19,51,120,0.3)]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        {nextAction && (
          <Link
            to={`/estates/${routeId}/${nextAction.route}`}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-14 py-6 rounded-2xl font-bold text-[15px] transition-all shadow-[0_20px_50px_rgba(19,51,120,0.15)] hover:shadow-[0_25px_60px_rgba(19,51,120,0.25)] hover:-translate-y-1 active:scale-95 z-10 no-underline"
          >
            {nextAction.label} →
          </Link>
        )}
      </div>

      {/* ── Stat Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <MiniStat label="Total Assets" value={assets.length.toString()} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} />
        <MiniStat label="Stored Documents" value={documents.length.toString()} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>} />
        <MiniStat label="Beneficiaries" value={heirs.length.toString()} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} />
        <MiniStat label="Completion" value={scoreLoading ? '—' : `${percent}%`} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-16 py-12">
        {/* ── Shepherd Checklist ── */}
        <div className="bg-white rounded-[3rem] p-16 border border-slate-100 shadow-[0_2px_40px_rgba(15,23,42,0.02)] space-y-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight">Estate Checklist</h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              {score ? `${score.completedSteps}/${score.totalSteps}` : '...'} Complete
            </span>
          </div>
          {Object.entries(categories).length > 0 ? (
            <div className="space-y-10">
              {Object.entries(categories).map(([category, catSteps]) => (
                <div key={category}>
                  <div className="text-[10px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] mb-4">{category}</div>
                  <div className="space-y-3">
                    {catSteps.map((step) => (
                      <Link
                        key={step.id}
                        to={`/estates/${routeId}/${step.route}`}
                        className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all no-underline group/step ${
                          step.complete
                            ? 'bg-[#059669]/5 border border-[#059669]/10'
                            : 'bg-[#F8FAFC] border border-slate-100 hover:border-[#133378]/20 hover:bg-white'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.complete ? 'bg-[#059669]' : 'border-2 border-slate-200 group-hover/step:border-[#133378]'
                        }`}>
                          {step.complete && (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-bold ${step.complete ? 'text-[#059669]' : 'text-[#0F172A] group-hover/step:text-[#133378]'} transition-colors`}>
                            {step.label}
                          </p>
                          <p className="text-[12px] text-[#64748B] truncate">{step.description}</p>
                        </div>
                        {!step.complete && (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-300 group-hover/step:text-[#133378] transition-colors" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-12">
              <ChecklistItem label="Loading..." percent={0} status="Calculating" color="bg-slate-200" />
            </div>
          )}
        </div>

        {/* ── Quick Actions + Support ── */}
        <div className="space-y-12">
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-[0_2px_40px_rgba(15,23,42,0.02)]">
            <h3 className="text-xl font-bold text-[#0F172A] mb-10 tracking-tight">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-8">
              <ActionBtn label="Add Asset" route={`/estates/${routeId}/assets`} icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12H3m9-9v18" /></svg>} />
              <ActionBtn label="Upload Doc" route={`/estates/${routeId}/vault`} icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>} />
              <ActionBtn label="Add Heir" route={`/estates/${routeId}/beneficiaries`} icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>} />
              <ActionBtn label="Memory" route={`/estates/${routeId}/memoirs`} icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>} />
            </div>
          </div>

          <div className="bg-[#133378] rounded-[3rem] p-12 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-[4rem] group-hover:bg-white/10 transition-colors" />
            <div className="relative z-10">
              <h4 className="text-xl font-bold mb-4 font-[family-name:var(--font-cinzel)] uppercase tracking-widest">Need Support?</h4>
              <p className="text-white/70 text-sm mb-8 leading-relaxed font-medium">Your dedicated Concierge is available 24/7 to help you navigate your estate plan.</p>
              <button className="w-full py-4 bg-white text-[#133378] rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-gold hover:text-white transition-all active:scale-[0.98]">
                Contact Concierge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared UI Components ──

interface MiniStatProps {
  label: string
  value: string
  icon: React.ReactNode
}

function MiniStat({ label, value, icon }: MiniStatProps) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_2px_30px_rgba(15,23,42,0.01)] flex flex-col gap-8 group hover:border-[#133378]/20 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#133378] group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-2">{label}</div>
        <div className="text-4xl font-bold text-[#0F172A] tracking-tighter tabular-nums">{value}</div>
      </div>
    </div>
  )
}

interface ChecklistItemProps {
  label: string
  percent: number
  status: string
  color: string
}

function ChecklistItem({ label, percent, status, color }: ChecklistItemProps) {
  return (
    <div className="space-y-5 group/item">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-bold text-[#0F172A] text-xl tracking-tight group-hover/item:text-[#133378] transition-colors">{label}</h4>
          <p className="text-slate-400 text-[13px] font-semibold tracking-wide mt-1">{status}</p>
        </div>
        <span className="font-bold text-slate-600 text-lg tabular-nums">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
        <div className={`h-full ${color} rounded-full transition-all duration-[1500ms] ease-out shadow-sm`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

interface ActionBtnProps {
  label: string
  icon: React.ReactNode
  route: string
}

function ActionBtn({ label, icon, route }: ActionBtnProps) {
  return (
    <Link
      to={route}
      className="flex flex-col items-center justify-center gap-6 p-10 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-[#133378]/20 hover:shadow-[0_20px_60px_rgba(19,51,120,0.06)] transition-all active:scale-[0.98] group no-underline"
    >
      <div className="text-slate-300 group-hover:text-[#133378] transition-all duration-500 scale-110 group-hover:scale-125">
        {icon}
      </div>
      <span className="text-[11px] font-bold text-slate-400 group-hover:text-[#0F172A] uppercase tracking-[0.2em] mt-2">{label}</span>
    </Link>
  )
}
