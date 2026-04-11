/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { useLockboxItems, type LockboxItem } from '../lib/firestore'
import { addLockboxItem, archiveLockboxItem } from '../lib/estate-actions'
import {
  Plus,
  Lock,
  CreditCard,
  Globe,
  Bitcoin,
  Key,
  ShieldCheck,
  Trash2,
  Landmark,
  TrendingUp,
  Shield,
  Package,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

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
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 h-auto rounded-2xl font-bold text-[14px] shadow-[0_20px_50px_rgba(19,51,120,0.1)]"
        >
          <Plus className="w-5 h-5" />
          Add Credential
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-8">
        {[
          { label: 'Total Items', value: stats.total, icon: Lock },
          { label: 'Secured', value: stats.secure, icon: ShieldCheck },
          { label: 'Categories', value: stats.categories, icon: CreditCard },
        ].map((s) => (
          <Card key={s.label} className="bg-[#F8FAFC] rounded-3xl border-slate-100 py-0">
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#133378]/5 rounded-2xl flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-[#133378]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#0F172A]">{s.value}</p>
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Category Filter ── */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant={filterCategory === 'all' ? 'default' : 'secondary'}
          onClick={() => setFilterCategory('all')}
          className={`px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider ${filterCategory === 'all' ? 'bg-[#133378] text-white hover:bg-[#1E3A5F]' : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'}`}
        >
          All
        </Button>
        {CATEGORIES.map((c) => (
          <Button
            key={c.value}
            variant={filterCategory === c.value ? 'default' : 'secondary'}
            onClick={() => setFilterCategory(c.value)}
            className={`px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider ${filterCategory === c.value ? 'bg-[#133378] text-white hover:bg-[#1E3A5F]' : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'}`}
          >
            <c.icon className="w-3.5 h-3.5" />
            {c.label}
          </Button>
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
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-8 py-4 h-auto rounded-2xl font-bold text-[14px]"
          >
            <Plus className="w-4 h-4" /> Add First Credential
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <LockboxCard key={item.id} item={item} estateId={estateId} />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <AddLockboxModal estateId={estateId} open={modalOpen} onOpenChange={setModalOpen} />
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
    <Card className="rounded-3xl border-slate-100 hover:border-[#133378]/10 transition-all group py-0">
      <CardContent className="p-8">
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
              <Badge className="px-3 py-1.5 h-auto bg-[#C8A951]/10 text-[#C8A951] text-[10px] font-bold uppercase tracking-widest rounded-lg border-transparent hover:bg-[#C8A951]/15">
                <ShieldCheck className="w-3 h-3" /> Secured
              </Badge>
            )}
            <Badge
              className="px-3 py-1.5 h-auto text-[10px] font-bold uppercase tracking-widest rounded-lg border-transparent"
              style={{ backgroundColor: `${cat.color}10`, color: cat.color }}
            >
              {cat.label}
            </Badge>
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
              <Button variant="destructive" size="xs" onClick={handleArchive} className="text-[12px] font-bold">
                Yes
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setConfirming(false)} className="text-[12px] font-bold text-[#64748B]">
                No
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConfirming(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4 text-[#94A3B8] hover:text-[#DC2626]" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Add Modal ──────────────────────────────────────────────────────────────

function AddLockboxModal({ estateId, open, onOpenChange }: { estateId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
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
    onOpenChange(false)
  }, [estateId, form, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-10"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">
            Add Credential
          </DialogTitle>
          <DialogDescription>
            Store account credentials and transition instructions for your heirs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Account Name */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">
              Account Name *
            </Label>
            <Input
              value={form.accountName}
              onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
              placeholder="e.g., Chase Checking, Gmail, Bitcoin Wallet"
              className="px-5 py-4 h-auto rounded-2xl border-slate-200 text-[14px] text-[#0F172A]"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">
              Category
            </Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as CategoryValue }))}>
              <SelectTrigger className="w-full px-5 py-4 h-auto rounded-2xl border-slate-200 text-[14px] text-[#0F172A]">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Institution */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">
              Institution
            </Label>
            <Input
              value={form.institution}
              onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
              placeholder="e.g., JPMorgan Chase, Google, Coinbase"
              className="px-5 py-4 h-auto rounded-2xl border-slate-200 text-[14px] text-[#0F172A]"
            />
          </div>

          {/* Account Identifier */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">
              Account Identifier
            </Label>
            <Input
              value={form.accountIdentifier}
              onChange={(e) => setForm((f) => ({ ...f, accountIdentifier: e.target.value }))}
              placeholder="Last 4 digits, username, or account number hint"
              className="px-5 py-4 h-auto rounded-2xl border-slate-200 text-[14px] text-[#0F172A]"
            />
          </div>

          {/* Transition Instructions */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">
              Transition Instructions
            </Label>
            <Textarea
              value={form.transitionInstructions}
              onChange={(e) => setForm((f) => ({ ...f, transitionInstructions: e.target.value }))}
              placeholder="What should your heir do with this account? Close it? Transfer it? Keep it active?"
              rows={3}
              className="px-5 py-4 rounded-2xl border-slate-200 text-[14px] text-[#0F172A] resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">
              Notes
            </Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional details..."
              rows={2}
              className="px-5 py-4 rounded-2xl border-slate-200 text-[14px] text-[#0F172A] resize-none"
            />
          </div>

          {/* Secure Credentials Toggle */}
          <div className="flex items-center gap-4 bg-[#C8A951]/5 rounded-2xl p-5 border border-[#C8A951]/20">
            <Switch
              checked={form.hasSecureCredentials}
              onCheckedChange={(v) => setForm((f) => ({ ...f, hasSecureCredentials: v }))}
              className="data-checked:bg-[#C8A951]"
            />
            <div>
              <p className="text-[14px] font-bold text-[#0F172A]">Store Secure Credentials</p>
              <p className="text-[12px] text-[#64748B]">Passwords and PINs will be encrypted via the PII Vault (Cloud KMS)</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="gap-4 pt-8 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="px-8 py-4 h-auto rounded-2xl text-[14px] font-bold text-[#64748B]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.accountName.trim()}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-4 h-auto rounded-2xl font-bold text-[14px]"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Credential'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
