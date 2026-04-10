/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useUserEstates, useEstate } from '../lib/firestore'
import { createEstate } from '../lib/estate-actions'
import { useAuth } from '../lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

export const Route = createFileRoute('/estates/$estateId/estates')({
  component: EstatesPage,
})

function EstatesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/estates' });
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState('Personal');
  const { user } = useAuth();
  const userId = user?.uid || null;

  const { data: estateUsers, loading: isLoading } = useUserEstates(userId);

  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Map estate_users junction records to estate summaries
  const estates = estateUsers.map(eu => ({
    id: eu.estateId,
    name: eu.estateId, // Will be resolved by EstateCard
    role: eu.role || 'Owner',
  }));

  const handleCreateEstate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !planName.trim()) return;
    setSaving(true);
    await createEstate({
      name: planName,
      principalId: user.uid,
    });
    setSaving(false);
    setModalOpen(false);
    setPlanName('');
    setPlanType('Personal');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-8 md:pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Estate Registry</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">Estate Plans</h2>
          <p className="text-[#64748B] text-lg font-medium max-w-2xl leading-relaxed">
            Manage your primary and secondary estate plans from a central vault.
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-6 py-3 md:px-10 md:py-5 h-auto rounded-2xl font-bold text-[13px] md:text-[14px] shadow-[0_20px_50px_rgba(19,51,120,0.1)] flex items-center gap-3 w-full md:w-auto justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Estate
        </Button>
        <Separator className="absolute left-0 right-0 bottom-0 bg-slate-50" />
      </div>

      {/* ── Estate Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {estates.map((e) => (
          <EstateCard key={e.id} estateId={e.id} role={e.role} routeId={routeId} navigate={navigate} />
        ))}
        {estates.length === 0 && (
          <Card className="col-span-2 border-2 border-dashed border-slate-100 bg-[#F8FAFC] rounded-[2.5rem] ring-0">
            <CardContent className="text-center py-40 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8 border border-slate-100 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
              </div>
              <p className="text-slate-400 font-medium text-sm">No active estates found for your account.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── New Estate Dialog ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl rounded-[3rem] p-16 border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-[#0F172A] tracking-tight">Add New Plan</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              Enter the details to create a new estate plan for your family.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEstate} className="space-y-10 mt-4">
            <div className="space-y-3">
              <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Plan Name</Label>
              <Input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
                className="w-full px-8 py-5 h-auto rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-slate-300 text-lg"
                placeholder="e.g. The Family Dynasty Trust"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Plan Type</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger className="w-full px-8 py-5 h-auto rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] text-lg transition-all">
                  <SelectValue placeholder="Select a plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal">Personal Portfolio</SelectItem>
                  <SelectItem value="Family Trust">Family Holding Trust</SelectItem>
                  <SelectItem value="Corporate">Business Succession</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex gap-6 pt-4 flex-row border-t-0 bg-transparent mx-0 mb-0 p-0 rounded-none">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-5 h-auto rounded-2xl border border-slate-100 font-bold text-slate-400 text-sm hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 py-5 h-auto rounded-2xl bg-[#133378] text-white font-bold text-sm hover:bg-[#1E3A5F] shadow-xl disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Estate Card — resolves name from Firestore ──

function EstateCard({ estateId, role, routeId, navigate }: {
  estateId: string; role: string; routeId: string; navigate: (opts: { to: string }) => void;
}) {
  const { data: estate } = useEstate(estateId);
  const isCurrent = routeId === estateId || (routeId === 'lockhart' && estateId === 'estate_lockhart');
  const displayName = estate?.name || estateId;

  return (
    <Card className={`p-12 rounded-[2.5rem] ${isCurrent ? 'border-[#133378]/20 shadow-xl' : 'border-slate-100 shadow-sm'} hover:shadow-2xl hover:border-[#133378]/20 transition-all group overflow-hidden relative cursor-pointer ring-0`}>
      <CardContent className="p-0">
        <div className={`w-16 h-16 ${isCurrent ? 'bg-[#133378] text-white' : 'bg-[#F8FAFC] text-[#133378]'} rounded-2xl flex items-center justify-center mb-8 border border-slate-100 transition-all duration-500`}>
          <svg viewBox="0 0 24 24" className="w-8 h-8 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        </div>
        <h3 className="text-[#0F172A] font-bold text-3xl mb-3 tracking-tight group-hover:text-[#133378] transition-colors">{displayName}</h3>
        <div className="flex items-center gap-4 mb-8">
          <Badge variant="secondary" className="px-4 py-1.5 h-auto bg-[#F1F5F9] text-[#334155] font-bold text-[11px] uppercase tracking-widest rounded-lg border border-slate-100">{role}</Badge>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
          </div>
        </div>
        <p className="text-[#64748B] font-medium text-sm leading-relaxed mb-10">
          The assets and memories for this estate are actively monitored and secured.
        </p>
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1 bg-[#F8FAFC] border border-slate-100 text-[#0F172A] px-8 py-4 h-auto rounded-2xl text-sm font-bold hover:bg-slate-100"
          >
            View History
          </Button>
          <Button
            onClick={() => {
              if (isCurrent) return;
              const nextId = estateId === 'estate_lockhart' ? 'lockhart' : estateId;
              navigate({ to: `/estates/${nextId}/dashboard` });
            }}
            className={`flex-1 ${isCurrent ? 'bg-[#F8FAFC] text-slate-400 border border-slate-100 cursor-default hover:bg-[#F8FAFC]' : 'bg-[#133378] text-white hover:bg-[#1E3A5F]'} px-8 py-4 h-auto rounded-2xl text-sm font-bold shadow-sm`}
          >
            {isCurrent ? 'Currently Active' : 'Open Estate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
