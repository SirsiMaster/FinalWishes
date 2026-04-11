/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { useEstateHeirs } from '../lib/firestore'
import { useAuth } from '../lib/auth'
import { sendEstateInvitation } from '../lib/invitations'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/estates/$estateId/beneficiaries')({
  component: BeneficiariesPage,
})

function BeneficiariesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/beneficiaries' });
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [_feedback, setFeedback] = useState<string | null>(null);
  const [roleValue, setRoleValue] = useState('heir');
  const estateId = useMemo(() => routeId === 'lockhart' ? 'estate_lockhart' : routeId, [routeId]);

  const { data: heirs, loading: isLoading } = useEstateHeirs(estateId);

  const handleAddHeir = async (vars: { name: string, relation: string, email: string }) => {
    if (!user) return;
    setSaving(true);
    setFeedback(null);
    const result = await sendEstateInvitation({
      estateId,
      fullName: vars.name,
      email: vars.email,
      role: 'heir',
      relationship: vars.relation,
      invitedBy: user.uid,
    });
    setSaving(false);
    if (result.success) {
      setFeedback(result.autoLinked ? 'Linked — they already have an account!' : 'Invitation sent!');
      setTimeout(() => { setModalOpen(false); setFeedback(null); }, 1500);
    } else {
      setFeedback(`Error: ${result.error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Loading family members...</span>
        </div>
      </div>
    );
  }

  const beneficiaries = heirs.map(h => ({
    name: h.fullName,
    relation: h.relationship || '',
    share: h.residuaryPercentage ? `${h.residuaryPercentage}%` : undefined,
    status: h.status === 'active' ? 'Verified' : 'Pending',
    email: h.email,
  }));

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-24 px-6">
      <div className="flex justify-between items-end pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Family & Heirs</h2>
          <p className="text-lg text-[#64748B] font-medium">Add and manage the people who will receive your assets or help manage your estate.</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-8 py-4 h-auto rounded-2xl font-bold text-[13px] shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Family Member
        </Button>
      </div>
      <Separator className="!-mt-10 mb-0" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {beneficiaries.map((b, i) => (
          <BeneficiaryCard key={i} name={b.name} relation={b.relation} share={b.share} status={b.status} email={b.email} />
        ))}
        {beneficiaries.length === 0 && (
          <Card className="col-span-2 rounded-[2.5rem] border-slate-100 bg-[#F8FAFC]">
            <CardContent className="text-center py-32 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              </div>
              <p className="text-lg font-medium text-[#64748B]">No family members have been added to this estate yet.</p>
              <p className="text-sm text-slate-400 mt-2">Click "Add Family Member" to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-[3rem] p-16 max-w-xl sm:max-w-xl border border-slate-100 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#133378]" />
          <DialogHeader className="gap-3 mb-4">
            <DialogTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Add family member</DialogTitle>
            <DialogDescription className="text-lg text-[#64748B] font-medium">Enter the details for the person you want to add to your estate plan.</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddHeir({
              name: formData.get('name') as string,
              relation: formData.get('relation') as string,
              email: formData.get('email') as string
            });
          }} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Full Name</Label>
              <Input name="name" id="name" required className="px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-[#133378]/5 font-semibold text-[#0F172A] text-base" placeholder="Jane Doe" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="relation" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Relationship</Label>
                <Input name="relation" id="relation" required className="px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] font-semibold text-[#0F172A] text-base" placeholder="Spouse" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Their Role</Label>
                <Select value={roleValue} onValueChange={setRoleValue}>
                  <SelectTrigger className="w-full px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] font-semibold text-[#0F172A] text-base">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heir">Primary Heir</SelectItem>
                    <SelectItem value="executor">Legal Executor</SelectItem>
                    <SelectItem value="trustee">Trustee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Email Address</Label>
              <Input name="email" id="email" required type="email" className="px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] font-semibold text-[#0F172A] text-base" placeholder="jane@example.com" />
            </div>

            {_feedback && (
              <p className={`text-sm font-semibold px-2 ${_feedback.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {_feedback}
              </p>
            )}

            <DialogFooter className="flex gap-4 pt-4 mx-0 mb-0 border-0 bg-transparent p-0 flex-row">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 py-4 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 active:scale-95">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 py-4 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold shadow-lg active:scale-95">
                {saving ? 'Saving...' : 'Add to Estate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BeneficiaryCard({ name, relation, share, status, email }: { name: string; relation: string; share?: string; status: string; email?: string }) {
  const initials = name.split(' ').map((n: string) => n[0]).join('');

  return (
    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md transition-all cursor-pointer group">
      <CardContent className="flex items-center gap-8 p-8">
        <Avatar className="w-16 h-16 rounded-2xl shrink-0 transition-all duration-500 group-hover:bg-[#133378]">
          <AvatarFallback className="rounded-2xl bg-[#F8FAFC] border border-slate-100 text-[#133378] font-bold text-xl group-hover:bg-[#133378] group-hover:text-white transition-all duration-500">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex justify-between items-start">
            <h4 className="text-[#0F172A] font-bold text-xl truncate leading-tight transition-colors group-hover:text-[#133378]">{name}</h4>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                status === 'Verified'
                  ? 'border-green-200 bg-green-50 text-green-600 gap-1.5'
                  : 'border-amber-200 bg-amber-50 text-amber-600 gap-1.5'
              }
            >
              <div className={`w-1.5 h-1.5 rounded-full ${status === 'Verified' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
              {status}
            </Badge>
            <span className="text-[13px] font-medium text-[#64748B] truncate">{email || 'No email provided'}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-50 pt-4">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Relationship</span>
              <span className="text-[14px] font-semibold text-[#0F172A]">{relation}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Their Share</span>
              <span className="text-[14px] font-semibold text-[#133378]">{share || 'Not set yet'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
