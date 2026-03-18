import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/beneficiaries')({
  component: BeneficiariesPage,
})

function BeneficiariesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [estateId, setEstateId] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      const preferredId = u.name === 'Tameeka Lockhart' ? 'estate_lockhart' : (u.primaryEstateId || 'estate_lockhart');
      setEstateId(preferredId);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['beneficiaries', estateId],
    queryFn: () => estateClient.listBeneficiaries({ estateId }),
  });

  const addMutation = useMutation({
    mutationFn: (vars: { name: string, relation: string, email: string }) => 
      estateClient.addBeneficiary({
        estateId: estateId,
        name: vars.name,
        relation: vars.relation,
        email: vars.email
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', estateId] });
      setModalOpen(false);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  const beneficiaries = data?.beneficiaries || [];

  return (
    <div className="space-y-10 pb-20 max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-end border-b border-royal/10 pb-8">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">Family Shard</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Register and manage legal heirs, executors, and primary trustees for this estate protocol.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-royal hover:bg-sapphire text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_8px_24px_rgba(15,82,186,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all border border-white/10"
        >
          + Register Family Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {beneficiaries.map((b, i) => (
          <BeneficiaryCard key={i} name={b.name} relation={b.relation} share={b.share} status={b.status} email={b.email} />
        ))}
        {beneficiaries.length === 0 && (
          <div className="col-span-2 text-center py-24 bg-royal/[0.01] rounded-[3rem] border-2 border-dashed border-royal/5 italic text-royal/20 font-black uppercase tracking-widest text-xs">
            No active heirs registered in this shard. Use the registration portal above to begin.
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal/[0.05] backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] p-12 max-w-lg w-full border border-royal/10 shadow-[0_20px_60px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-2 uppercase tracking-wide">Register New Heir</h3>
            <p className="text-[11px] text-royal/30 mb-10 font-black uppercase tracking-widest">Enter the legal identity for this beneficiary to initialize their access shard.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addMutation.mutate({ 
                name: formData.get('name') as string, 
                relation: formData.get('relation') as string,
                email: formData.get('email') as string
              });
            }} className="space-y-8">
              <div className="group">
                <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Full Legal Name</label>
                <input name="name" required className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white focus:border-royal focus:shadow-sm outline-none font-black text-royal transition-all placeholder:text-royal/10" placeholder="e.g. Sarah Johnson" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="group">
                  <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Relationship</label>
                  <input name="relation" required className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white outline-none font-black text-royal transition-all placeholder:text-royal/10" placeholder="e.g. Spouse" />
                </div>
                <div className="group">
                  <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Governance Role</label>
                  <div className="relative">
                    <select name="role" className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white outline-none font-black text-royal appearance-none transition-all">
                      <option value="heir">Primary Heir</option>
                      <option value="executor">Legal Executor</option>
                      <option value="trustee">Trustee Proxy</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-royal/20">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="group">
                <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Secure Email Shard</label>
                <input name="email" required className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white outline-none font-black text-royal transition-all placeholder:text-royal/10" type="email" placeholder="sarah@example.com" />
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4.5 rounded-2xl border border-royal/10 font-black text-royal/40 text-[11px] uppercase tracking-[0.2em] hover:bg-royal/[0.02] hover:text-royal transition-all">Discard</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 py-4.5 rounded-2xl bg-royal hover:bg-sapphire text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-[0.98] border border-white/10">
                  {addMutation.isPending ? 'Notarizing...' : 'Complete Notarization'}
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
    <div className="bg-white p-10 rounded-[3rem] border border-royal/10 shadow-[0_2px_20px_rgba(19,51,120,0.03)] flex items-center gap-10 group hover:border-royal/30 hover:shadow-[0_20px_50px_rgba(19,51,120,0.1)] transition-all relative overflow-hidden active:scale-[0.99] cursor-pointer">
      <div className="absolute top-0 right-0 w-32 h-32 bg-royal/[0.02] rounded-bl-[5rem] translate-x-4 -translate-y-4 group-hover:bg-royal/[0.05] transition-colors" />
      <div className="w-24 h-24 rounded-3xl bg-royal/[0.03] border border-royal/5 flex items-center justify-center text-royal font-black text-3xl shadow-sm shrink-0 uppercase tracking-tighter group-hover:scale-110 group-hover:rotate-2 transition-all duration-500 font-[family-name:var(--font-cinzel)]">
        {name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-royal font-black text-2xl uppercase tracking-tight truncate group-hover:text-sapphire transition-colors font-[family-name:var(--font-cinzel)]">{name}</h4>
        </div>
        <div className="flex items-center gap-4 mb-6">
           <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${status === 'Verified' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-[#C8A951]/5 text-[#C8A951] border-[#C8A951]/20'}`}>
            {status} Shard
          </span>
          <span className="text-[11px] font-black text-royal/20 uppercase tracking-tighter truncate group-hover:text-royal/40 transition-colors">{email || 'No identity provided'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-royal/5 pt-5 mt-2">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-royal/20 uppercase tracking-[0.2em] mb-1.5 leading-none">Legal Relation</span>
              <span className="text-[12px] font-black text-royal uppercase tracking-widest">{relation}</span>
           </div>
           <div className="flex flex-col text-right">
              <span className="text-[9px] font-black text-royal/20 uppercase tracking-[0.2em] mb-1.5 leading-none">Allocated Share</span>
              <span className="text-[12px] font-black text-[#C8A951] uppercase tracking-widest">{share || 'Pending Assignment'}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
