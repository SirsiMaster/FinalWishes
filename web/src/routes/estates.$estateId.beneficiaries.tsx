import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { useEstateHeirs } from '../lib/firestore'
import { addHeir } from '../lib/estate-actions'

export const Route = createFileRoute('/estates/$estateId/beneficiaries')({
  component: BeneficiariesPage,
})

function BeneficiariesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/beneficiaries' });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const estateId = useMemo(() => routeId === 'lockhart' ? 'estate_lockhart' : routeId, [routeId]);

  const { data: heirs, loading: isLoading } = useEstateHeirs(estateId);

  const handleAddHeir = async (vars: { name: string, relation: string, email: string }) => {
    setSaving(true);
    await addHeir({
      estateId,
      fullName: vars.name,
      email: vars.email,
      relationship: vars.relation,
    });
    setSaving(false);
    setModalOpen(false);
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
      <div className="flex justify-between items-end border-b border-slate-100 pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Family & Heirs</h2>
          <p className="text-lg text-[#64748B] font-medium">Add and manage the people who will receive your assets or help manage your estate.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-8 py-4 rounded-2xl font-bold text-[13px] transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Family Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {beneficiaries.map((b: any, i: number) => (
          <BeneficiaryCard key={i} name={b.name} relation={b.relation} share={b.share} status={b.status} email={b.email} />
        ))}
        {beneficiaries.length === 0 && (
          <div className="col-span-2 text-center py-32 bg-[#F8FAFC] rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
             </div>
             <p className="text-lg font-medium text-[#64748B]">No family members have been added to this estate yet.</p>
             <p className="text-sm text-slate-400 mt-2">Click "Add Family Member" to get started.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-16 max-w-xl w-full border border-slate-100 shadow-2xl animate-in zoom-in duration-500 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-[#133378]" />
            <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-3">Add family member</h3>
            <p className="text-lg text-[#64748B] font-medium mb-10">Enter the details for the person you want to add to your estate plan.</p>
            
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
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Full Name</label>
                <input name="name" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-semibold text-[#0F172A] transition-all text-base" placeholder="Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Relationship</label>
                  <input name="relation" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] outline-none font-semibold text-[#0F172A] text-base transition-all" placeholder="Spouse" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Their Role</label>
                  <div className="relative">
                    <select name="role" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] outline-none font-semibold text-[#0F172A] appearance-none text-base transition-all">
                      <option value="heir">Primary Heir</option>
                      <option value="executor">Legal Executor</option>
                      <option value="trustee">Trustee</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">Email Address</label>
                <input name="email" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] outline-none font-semibold text-[#0F172A] text-base transition-all" type="email" placeholder="jane@example.com" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 font-bold text-[#64748B] hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-4 rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add to Estate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function BeneficiaryCard({ name, relation, share, status, email }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-8 group hover:border-slate-200 hover:shadow-md transition-all cursor-pointer">
      <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-center text-[#133378] font-bold text-xl shrink-0 transition-all duration-500 group-hover:bg-[#133378] group-hover:text-white">
        {name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex justify-between items-start">
          <h4 className="text-[#0F172A] font-bold text-xl truncate leading-tight transition-colors group-hover:text-[#133378]">{name}</h4>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] rounded-lg border border-slate-100">
             <div className={`w-1.5 h-1.5 rounded-full ${status === 'Verified' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
             <span className={`text-[11px] font-bold ${status === 'Verified' ? 'text-green-600' : 'text-amber-600'}`}>
              {status}
             </span>
           </div>
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
    </div>
  );
}
