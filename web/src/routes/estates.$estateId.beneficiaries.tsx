/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { useEstateHeirs, type Heir } from '../lib/firestore'
import { useAuth } from '../lib/auth'
import { sendEstateInvitation } from '../lib/invitations'
import { updateHeir } from '../lib/estate-actions'
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

// ─── Role Descriptions ───────────────────────────────────────────────────────

const ROLE_DESCRIPTIONS: Record<string, string> = {
  heir: 'A person who will receive assets from your estate. You can specify their share percentage.',
  executor: 'The person legally responsible for carrying out your will. They handle probate, pay debts, and distribute assets to heirs.',
  trustee: 'A person who manages assets held in a trust on behalf of beneficiaries. They have a fiduciary duty to act in beneficiaries\u2019 best interests.',
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function BeneficiariesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/beneficiaries' });
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [_feedback, setFeedback] = useState<string | null>(null);
  const [roleValue, setRoleValue] = useState('heir');
  const estateId = useMemo(() => routeId === 'lockhart' ? 'estate_lockhart' : routeId, [routeId]);

  // Edit state
  const [editingHeir, setEditingHeir] = useState<Heir | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: heirs, loading: isLoading } = useEstateHeirs(estateId);

  const handleAddHeir = async (vars: { name: string, relation: string, email: string }) => {
    if (!user) return;
    setSaving(true);
    setFeedback(null);
    const result = await sendEstateInvitation({
      estateId,
      fullName: vars.name,
      email: vars.email,
      role: roleValue as 'executor' | 'heir',
      relationship: vars.relation,
      invitedBy: user.uid,
    });
    setSaving(false);
    if (result.success) {
      setFeedback(result.autoLinked ? 'Linked \u2014 they already have an account!' : 'Invitation sent!');
      setTimeout(() => { setModalOpen(false); setFeedback(null); }, 1500);
    } else {
      setFeedback(`Error: ${result.error}`);
    }
  };

  // Compute total allocation for warning
  const totalAllocation = useMemo(() => {
    return heirs.reduce((sum, h) => sum + (h.residuaryPercentage ?? 0), 0);
  }, [heirs]);

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

      {/* Allocation Warning */}
      {totalAllocation > 100 && (
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-50 border border-red-200">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-sm font-semibold text-red-700">
            Total share allocation is {totalAllocation}% — exceeds 100%. Please adjust individual shares.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {heirs.map((h) => (
          <BeneficiaryCard
            key={h.id}
            heir={h}
            onEdit={() => { setEditingHeir(h); setEditModalOpen(true); }}
          />
        ))}
        {heirs.length === 0 && (
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
      <AddBeneficiaryDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        roleValue={roleValue}
        onRoleChange={setRoleValue}
        onSubmit={handleAddHeir}
        saving={saving}
        feedback={_feedback}
      />

      {/* Edit Modal */}
      {editingHeir && (
        <EditBeneficiaryDialog
          open={editModalOpen}
          onOpenChange={(open) => { setEditModalOpen(open); if (!open) setEditingHeir(null); }}
          heir={editingHeir}
          estateId={estateId}
        />
      )}
    </div>
  )
}

// ─── Add Beneficiary Dialog ──────────────────────────────────────────────────

function AddBeneficiaryDialog({
  open,
  onOpenChange,
  roleValue,
  onRoleChange,
  onSubmit,
  saving,
  feedback,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleValue: string;
  onRoleChange: (value: string) => void;
  onSubmit: (vars: { name: string; relation: string; email: string }) => void;
  saving: boolean;
  feedback: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[3rem] p-16 max-w-xl sm:max-w-xl border border-slate-100 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#133378]" />
        <DialogHeader className="gap-3 mb-4">
          <DialogTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Add family member</DialogTitle>
          <DialogDescription className="text-lg text-[#64748B] font-medium">Enter the details for the person you want to add to your estate plan.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          onSubmit({
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
              <Select value={roleValue} onValueChange={onRoleChange}>
                <SelectTrigger className="w-full px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] font-semibold text-[#0F172A] text-base">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heir">Primary Heir</SelectItem>
                  <SelectItem value="executor">Legal Executor</SelectItem>
                  <SelectItem value="trustee">Trustee</SelectItem>
                </SelectContent>
              </Select>
              {/* Role description */}
              <div className="flex items-start gap-2 pt-1 pl-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#64748B] shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <p className="text-[12px] italic text-[#64748B] leading-relaxed">
                  {ROLE_DESCRIPTIONS[roleValue]}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Email Address</Label>
            <Input name="email" id="email" required type="email" className="px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] font-semibold text-[#0F172A] text-base" placeholder="jane@example.com" />
          </div>

          {feedback && (
            <p className={`text-sm font-semibold px-2 ${feedback.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {feedback}
            </p>
          )}

          <DialogFooter className="flex gap-4 pt-4 mx-0 mb-0 border-0 bg-transparent p-0 flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 py-4 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 active:scale-95">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 py-4 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold shadow-lg active:scale-95">
              {saving ? 'Saving...' : 'Add to Estate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Beneficiary Dialog ─────────────────────────────────────────────────

function EditBeneficiaryDialog({
  open,
  onOpenChange,
  heir,
  estateId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heir: Heir;
  estateId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shareValue, setShareValue] = useState<string>(
    heir.residuaryPercentage != null ? String(heir.residuaryPercentage) : ''
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const relationship = formData.get('relationship') as string;
    const email = formData.get('email') as string;
    const pct = shareValue ? Number(shareValue) : undefined;

    if (pct !== undefined && (pct < 0 || pct > 100)) {
      setFeedback('Error: Share must be between 0 and 100.');
      return;
    }

    setSaving(true);
    setFeedback(null);
    const result = await updateHeir(estateId, heir.id, {
      fullName,
      relationship,
      email,
      residuaryPercentage: pct ?? null,
      isResiduary: pct != null && pct > 0,
    });
    setSaving(false);

    if (result.success) {
      setFeedback('Saved successfully.');
      setTimeout(() => { onOpenChange(false); setFeedback(null); }, 1000);
    } else {
      setFeedback(`Error: ${result.error}`);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    const result = await updateHeir(estateId, heir.id, { status: 'removed' });
    setRemoving(false);
    if (result.success) {
      onOpenChange(false);
    } else {
      setFeedback(`Error: ${result.error}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setConfirmRemove(false); setFeedback(null); } }}>
      <DialogContent className="rounded-[3rem] p-16 max-w-xl sm:max-w-xl border border-slate-100 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#C8A951]" />
        <DialogHeader className="gap-3 mb-4">
          <DialogTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Edit Beneficiary</DialogTitle>
          <DialogDescription className="text-lg text-[#64748B] font-medium">Update details and share allocation for {heir.fullName}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="edit-fullName" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Full Name</Label>
            <Input name="fullName" id="edit-fullName" defaultValue={heir.fullName} required className="px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-[#133378]/5 font-semibold text-[#0F172A] text-base" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="edit-relationship" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Relationship</Label>
              <Input name="relationship" id="edit-relationship" defaultValue={heir.relationship ?? ''} required className="px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] font-semibold text-[#0F172A] text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-share" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Share Percentage</Label>
              <div className="relative">
                <Input
                  id="edit-share"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={shareValue}
                  onChange={(e) => setShareValue(e.target.value)}
                  className="px-6 py-4 pr-12 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] font-semibold text-[#0F172A] text-base"
                  placeholder="0"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[#64748B] font-bold text-base">%</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Email Address</Label>
            <Input name="email" id="edit-email" defaultValue={heir.email ?? ''} type="email" className="px-6 py-4 h-auto rounded-2xl border-slate-200 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] font-semibold text-[#0F172A] text-base" />
          </div>

          {feedback && (
            <p className={`text-sm font-semibold px-2 ${feedback.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {feedback}
            </p>
          )}

          <DialogFooter className="flex flex-col gap-4 pt-4 mx-0 mb-0 border-0 bg-transparent p-0">
            <div className="flex gap-4 w-full">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 py-4 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 active:scale-95">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 py-4 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold shadow-lg active:scale-95">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            <Separator />

            {!confirmRemove ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmRemove(true)}
                className="w-full py-3 h-auto rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 font-semibold text-[13px] flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Remove from Estate
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <p className="text-sm font-semibold text-red-600">
                  Are you sure? This will remove {heir.fullName} from your estate plan.
                </p>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setConfirmRemove(false)} className="px-6 py-2 h-auto rounded-xl border-slate-200 font-bold text-[#64748B] text-sm">
                    Keep
                  </Button>
                  <Button type="button" onClick={handleRemove} disabled={removing} className="px-6 py-2 h-auto rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm">
                    {removing ? 'Removing...' : 'Yes, Remove'}
                  </Button>
                </div>
              </div>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Beneficiary Card ────────────────────────────────────────────────────────

function BeneficiaryCard({ heir, onEdit }: { heir: Heir; onEdit: () => void }) {
  const { fullName: name, relationship: relation, residuaryPercentage, status: heirStatus, email } = heir;
  const initials = name.split(' ').map((n: string) => n[0]).join('');
  const share = residuaryPercentage != null ? residuaryPercentage : null;
  const status = heirStatus === 'active' ? 'Verified' : 'Pending';

  return (
    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md transition-all group relative">
      <CardContent className="flex items-center gap-8 p-8">
        {/* Edit button -- visible on hover */}
        <button
          type="button"
          onClick={onEdit}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#F8FAFC] hover:border-[#133378]/20 cursor-pointer"
          title="Edit beneficiary"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#133378]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

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
              <span className="text-[14px] font-semibold text-[#0F172A]">{relation || '\u2014'}</span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Their Share</span>
              {share != null ? (
                <div className="flex items-center gap-2.5">
                  {/* Mini progress bar */}
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(share, 100)}%`,
                        backgroundColor: share > 100 ? '#EF4444' : '#133378',
                      }}
                    />
                  </div>
                  <span className="text-[14px] font-bold text-[#133378]">{share}%</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-[13px] font-medium text-[#C8A951] hover:text-[#133378] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Set share
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
