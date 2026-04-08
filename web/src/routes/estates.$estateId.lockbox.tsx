/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { useLockboxItems, type LockboxItem } from '../lib/firestore'
import { addLockboxItem, archiveLockboxItem } from '../lib/estate-actions'
import {
  Plus,
  X,
  Lock,
  CreditCard,
  Globe,
  Bitcoin,
  Key,
  ShieldCheck,
  Trash2,
  ChevronDown,
  Landmark,
  TrendingUp,
  Shield,
  Package,
} from 'lucide-react'

export const Route = createFileRoute('/estates/$estateId/lockbox')({
  component: LockboxPage,
})

// ─── Category Config ──────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'banking' as const, label: 'Banking', icon: Landmark, color: '#133378' },
  { value: 'investment' as const, label: 'Investment', icon: TrendingUp, color: '#059669' },
  { value: 'insurance' as const, label: 'Insurance', icon: Shield, color: '#7C3AED' },
  { value: 'digital_account' as const, label: 'Digital Account', icon: Globe, color: '#2563EB' },
  { value: 'crypto' as const, label: 'Cryptocurrency', icon: Bitcoin, color: '#F59E0B' },
  { value: 'physical_safe' as const, label: 'Physical Safe', icon: Key, color: '#DC2626' },
  { value: 'other' as const, label: 'Other', icon: Package, color: '#64748B' },
] as const

type CategoryValue = (typeof CATEGORIES)[number]['value']

function getCategoryConfig(value: string) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1]
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function LockboxPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/lockbox' })
  const estateId = useMemo(() => (routeId === 'lockhart' ? 'estate_lockhart' : routeId), [routeId])

  const { data: items, loading } = useLockboxItems(estateId)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<CategoryValue | 'all'>('all')

  const filtered = useMemo(() => {
    if (filterCategory === 'all') return items
    return items.filter((i) => i.category === filterCategory)
  }, [items, filterCategory])

  const stats = useMemo(() => ({
    total: items.length,
    secure: items.filter((i) => i.hasSecureCredentials).length,
    categories: new Set(items.map((i) => i.category)).size,
  }), [items])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-end border-b border-slate-50 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Secure Credential Vault</span>
          </div>
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">
            Digital Lockbox
          </h2>
          <p className="text-[#64748B] text-lg font-medium max-w-2xl leading-relaxed">
            Store account credentials, access instructions, and transition guidance for your heirs.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 rounded-2xl font-bold text-[14px] transition-all shadow-[0_20px_50px_rgba(19,51,120,0.1)] flex items-center gap-3"
        >
          <Plus className="w-5 h-5" />
          Add Credential
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-8">
        {[
          { label: 'Total Items', value: stats.total, icon: Lock },
          { label: 'Secured', value: stats.secure, icon: ShieldCheck },
          { label: 'Categories', value: stats.categories, icon: CreditCard },
        ].map((s) => (
          <div key={s.label} className="bg-[#F8FAFC] rounded-3xl p-8 border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#133378]/5 rounded-2xl flex items-center justify-center">
                <s.icon className="w-5 h-5 text-[#133378]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#0F172A]">{s.value}</p>
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Category Filter ── */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all ${filterCategory === 'all' ? 'bg-[#133378] text-white' : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCategory(c.value)}
            className={`px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${filterCategory === c.value ? 'bg-[#133378] text-white' : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'}`}
          >
            <c.icon className="w-3.5 h-3.5" />
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Items Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-[#133378]/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#133378]/30" />
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-2">No credentials stored yet</h3>
          <p className="text-[#64748B] mb-8">Add your first account to help your heirs manage your digital life.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all"
          >
            <Plus className="w-4 h-4 inline mr-2" /> Add First Credential
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <LockboxCard key={item.id} item={item} estateId={estateId} />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && <AddLockboxModal estateId={estateId} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

// ─── Lockbox Card ──────────────────────────────────────────────────────────

function LockboxCard({ item, estateId }: { item: LockboxItem; estateId: string }) {
  const cat = getCategoryConfig(item.category)
  const [confirming, setConfirming] = useState(false)
  const Icon = cat.icon

  const handleArchive = useCallback(async () => {
    await archiveLockboxItem(estateId, item.id)
    setConfirming(false)
  }, [estateId, item.id])

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-8 hover:border-[#133378]/10 transition-all group">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}10` }}>
            <Icon className="w-5 h-5" style={{ color: cat.color }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0F172A]">{item.accountName}</h3>
            {item.institution && <p className="text-[13px] text-[#64748B] font-medium">{item.institution}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.hasSecureCredentials && (
            <span className="px-3 py-1.5 bg-[#C8A951]/10 text-[#C8A951] text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Secured
            </span>
          )}
          <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg" style={{ backgroundColor: `${cat.color}10`, color: cat.color }}>
            {cat.label}
          </span>
        </div>
      </div>

      {item.accountIdentifier && (
        <p className="text-[13px] text-[#334155] mb-3">
          <span className="text-[#64748B]">Identifier:</span> {item.accountIdentifier}
        </p>
      )}

      {item.transitionInstructions && (
        <div className="bg-[#F8FAFC] rounded-2xl p-5 mb-4">
          <p className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest mb-2">Transition Instructions</p>
          <p className="text-[13px] text-[#334155] line-clamp-3">{item.transitionInstructions}</p>
        </div>
      )}

      {item.notes && (
        <p className="text-[13px] text-[#64748B] line-clamp-2 mb-4">{item.notes}</p>
      )}

      <div className="flex justify-end pt-2 border-t border-slate-50">
        {confirming ? (
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#DC2626] font-medium">Archive this item?</span>
            <button onClick={handleArchive} className="text-[12px] font-bold text-[#DC2626] hover:underline">Yes</button>
            <button onClick={() => setConfirming(false)} className="text-[12px] font-bold text-[#64748B] hover:underline">No</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="w-4 h-4 text-[#94A3B8] hover:text-[#DC2626]" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Add Modal ──────────────────────────────────────────────────────────────

function AddLockboxModal({ estateId, onClose }: { estateId: string; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    accountName: '',
    category: 'banking' as CategoryValue,
    institution: '',
    accountIdentifier: '',
    notes: '',
    transitionInstructions: '',
    hasSecureCredentials: false,
  })

  const handleSubmit = useCallback(async () => {
    if (!form.accountName.trim()) return
    setSaving(true)
    await addLockboxItem({ estateId, ...form })
    setSaving(false)
    onClose()
  }, [estateId, form, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-10">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Add Credential</h3>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center hover:bg-[#E2E8F0]">
              <X className="w-5 h-5 text-[#64748B]" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Account Name */}
            <div>
              <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Account Name *</label>
              <input
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                placeholder="e.g., Chase Checking, Gmail, Bitcoin Wallet"
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Category</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CategoryValue }))}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] appearance-none focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
              </div>
            </div>

            {/* Institution */}
            <div>
              <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Institution</label>
              <input
                value={form.institution}
                onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                placeholder="e.g., JPMorgan Chase, Google, Coinbase"
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378]"
              />
            </div>

            {/* Account Identifier */}
            <div>
              <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Account Identifier</label>
              <input
                value={form.accountIdentifier}
                onChange={(e) => setForm((f) => ({ ...f, accountIdentifier: e.target.value }))}
                placeholder="Last 4 digits, username, or account number hint"
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378]"
              />
            </div>

            {/* Transition Instructions */}
            <div>
              <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Transition Instructions</label>
              <textarea
                value={form.transitionInstructions}
                onChange={(e) => setForm((f) => ({ ...f, transitionInstructions: e.target.value }))}
                placeholder="What should your heir do with this account? Close it? Transfer it? Keep it active?"
                rows={3}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378] resize-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional details..."
                rows={2}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378] resize-none"
              />
            </div>

            {/* Secure Credentials Toggle */}
            <div className="flex items-center gap-4 bg-[#C8A951]/5 rounded-2xl p-5 border border-[#C8A951]/20">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, hasSecureCredentials: !f.hasSecureCredentials }))}
                className={`w-12 h-7 rounded-full transition-all flex items-center ${form.hasSecureCredentials ? 'bg-[#C8A951] justify-end' : 'bg-slate-200 justify-start'}`}
              >
                <div className="w-5 h-5 bg-white rounded-full mx-1 shadow-sm" />
              </button>
              <div>
                <p className="text-[14px] font-bold text-[#0F172A]">Store Secure Credentials</p>
                <p className="text-[12px] text-[#64748B]">Passwords and PINs will be encrypted via the PII Vault (Cloud KMS)</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-10 pt-8 border-t border-slate-100">
            <button onClick={onClose} className="px-8 py-4 rounded-2xl text-[14px] font-bold text-[#64748B] hover:bg-[#F1F5F9] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.accountName.trim()}
              className="bg-[#133378] hover:bg-[#1E3A5F] disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-bold text-[14px] transition-all flex items-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Credential'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
