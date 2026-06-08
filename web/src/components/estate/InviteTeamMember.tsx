/**
 * InviteTeamMember — Estate team invitation form + member list
 * 
 * Allows estate principals to invite heirs, executors, trustees, legal counsel, and CPAs.
 * Shows pending/accepted invitations with revoke capability.
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { 
  inviteTeamMember, getEstateInvitations, revokeInvitation,
  ROLE_LABELS, type EstateInvitation 
} from '../../lib/invitations';

interface InviteTeamMemberProps {
  estateId: string;
}

const ROLE_OPTIONS = [
  { value: 'heir', label: 'Beneficiary / Heir', description: 'Can view estate. Read-only access.' },
  { value: 'executor', label: 'Executor', description: 'Can view and manage estate assets and documents.' },
  { value: 'trustee', label: 'Trustee', description: 'Can view estate and coordinate trust asset administration.' },
  { value: 'legal', label: 'Legal Counsel', description: 'Can view estate. Read-only advisory access.' },
  { value: 'cpa', label: 'CPA / Tax Advisor', description: 'Can view estate. Read-only advisory access.' },
];

const STATUS_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Pending', color: 'text-[var(--gold)]', bg: 'bg-[var(--gold)]/10', border: 'border-[var(--gold)]/20' },
  accepted: { label: 'Active', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  declined: { label: 'Declined', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
  revoked: { label: 'Revoked', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' },
};

export function InviteTeamMember({ estateId }: InviteTeamMemberProps) {
  const { user, profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'executor' | 'heir' | 'trustee' | 'legal' | 'cpa'>('heir');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitations, setInvitations] = useState<EstateInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  // Only principals can invite
  const isPrincipal = profile?.role === 'principal' || profile?.role === 'admin';

  const refreshInvitations = async () => {
    const data = await getEstateInvitations(estateId);
    setInvitations(data);
    setLoadingInvitations(false);
  };

  useEffect(() => {
    let cancelled = false;
    getEstateInvitations(estateId).then((data) => {
      if (!cancelled) {
        setInvitations(data);
        setLoadingInvitations(false);
      }
    });
    return () => { cancelled = true; };
  }, [estateId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSending(true);

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      setSending(false);
      return;
    }

    const result = await inviteTeamMember({
      estateId,
      email: email.trim(),
      phone: phone.trim() || undefined,
      fullName: fullName.trim(),
      role,
      invitedBy: user.uid,
    });

    setSending(false);

    if (result.success) {
      setSuccess(`Invitation sent to ${fullName || email}`);
      setEmail('');
      setPhone('');
      setFullName('');
      setShowForm(false);
      refreshInvitations();
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setError(result.error || 'Failed to send invitation.');
    }
  };

  const handleRevoke = async (invitationId: string) => {
    const result = await revokeInvitation(invitationId);
    if (result.success) {
      refreshInvitations();
    }
  };

  return (
    <section className="bg-white rounded-[3rem] border border-royal/10 overflow-hidden shadow-[0_2px_20px_rgba(19,51,120,0.03)] relative">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/10" />
      
      {/* Header */}
      <div className="bg-royal/[0.03] px-10 py-6 border-b border-royal/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-royal/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-royal" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h3 className="text-royal font-black text-[11px] uppercase tracking-[0.3em]">Estate Team</h3>
        </div>
        <span className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] px-4 py-1.5 bg-royal/[0.02] border border-royal/5 rounded-xl">
          {invitations.length} Member{invitations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-10 space-y-6">
        {/* Success / Error Messages */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm font-bold flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            {success}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
            {error}
          </div>
        )}

        {/* Invitation List */}
        {loadingInvitations ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-royal/20 border-t-royal rounded-full animate-spin" />
          </div>
        ) : invitations.length > 0 ? (
          <div className="space-y-3">
            {invitations.map((inv) => {
              const badge = STATUS_BADGES[inv.status] || STATUS_BADGES.pending;
              return (
                <div key={inv.id} className="flex items-center justify-between p-5 rounded-2xl border border-royal/5 hover:border-royal/10 hover:bg-royal/[0.01] transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-royal/[0.05] flex items-center justify-center">
                      <span className="text-royal font-black text-[13px]">
                        {(inv.fullName || inv.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-royal font-bold text-[14px] leading-tight">
                        {inv.fullName || inv.email}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-royal/40 text-[11px] font-medium">{inv.email}</span>
                        <span className="text-royal/20">·</span>
                        <span className="text-royal/50 text-[11px] font-bold uppercase tracking-wider">
                          {ROLE_LABELS[inv.role] || inv.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-lg border ${badge.color} ${badge.bg} ${badge.border}`}>
                      {badge.label}
                    </span>
                    {isPrincipal && inv.status === 'pending' && (
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-royal/[0.03] mx-auto flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-royal/20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p className="text-royal/30 font-bold text-[13px]">No team members yet</p>
            <p className="text-royal/20 text-[11px] font-medium mt-1">Invite executors, beneficiaries, and advisors</p>
          </div>
        )}

        {/* Invite Button / Form */}
        {isPrincipal && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-royal/10 hover:border-royal/20 text-royal/40 hover:text-royal font-bold text-[12px] uppercase tracking-widest transition-all hover:bg-royal/[0.02] flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Invite Team Member
          </button>
        )}

        {isPrincipal && showForm && (
          <form onSubmit={handleInvite} className="bg-royal/[0.02] rounded-2xl border border-royal/10 p-8 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-royal font-black text-[11px] uppercase tracking-[0.2em]">New Invitation</h4>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="text-royal/30 hover:text-royal transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-royal/30 uppercase tracking-widest block">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="w-full bg-white border border-royal/10 rounded-xl px-4 py-3 text-[14px] font-semibold text-royal outline-none focus:border-royal transition-all placeholder:text-royal/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-royal/30 uppercase tracking-widest block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="w-full bg-white border border-royal/10 rounded-xl px-4 py-3 text-[14px] font-semibold text-royal outline-none focus:border-royal transition-all placeholder:text-royal/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-royal/30 uppercase tracking-widest block">Phone Number <span className="text-royal/15">(Optional — for SMS notification)</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full bg-white border border-royal/10 rounded-xl px-4 py-3 text-[14px] font-semibold text-royal outline-none focus:border-royal transition-all placeholder:text-royal/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-royal/30 uppercase tracking-widest block">Role</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value as typeof role)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      role === opt.value
                        ? 'border-royal bg-royal/[0.05] shadow-sm'
                        : 'border-royal/5 hover:border-royal/15 bg-white'
                    }`}
                  >
                    <p className={`font-bold text-[12px] ${role === opt.value ? 'text-royal' : 'text-royal/50'}`}>
                      {opt.label}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${role === opt.value ? 'text-royal/50' : 'text-royal/25'}`}>
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="px-6 py-3 rounded-xl border border-royal/10 font-bold text-royal/40 text-[11px] uppercase tracking-widest hover:bg-royal/[0.02] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !email || !fullName}
                className="flex-1 px-6 py-3 rounded-xl bg-royal hover:bg-sapphire text-white font-bold text-[11px] uppercase tracking-widest shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
