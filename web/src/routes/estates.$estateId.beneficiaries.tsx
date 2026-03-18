import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/beneficiaries')({
  component: BeneficiariesPage,
})

function BeneficiariesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/beneficiaries' });
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [estateId, setEstateId] = useState(routeId === 'lockhart' ? 'estate_lockhart' : routeId);

  useEffect(() => {
    const preferredId = routeId === 'lockhart' ? 'estate_lockhart' : routeId;
    setEstateId(preferredId);
  }, [routeId]);

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
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end border-b border-royal/10 pb-12">
        <div className="space-y-4">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tighter">Family & Heirs</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Add and manage the people who will receive your assets or help manage your estate.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-royal hover:bg-sapphire text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_8px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_40px_rgba(15,82,186,0.3)] hover:-translate-y-1 active:scale-95 border border-white/10 flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
          Add Family Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {beneficiaries.map((b, i) => (
          <BeneficiaryCard key={i} name={b.name} relation={b.relation} share={b.share} status={b.status} email={b.email} />
        ))}
        {beneficiaries.length === 0 && (
          <div className="col-span-2 text-center py-40 bg-royal/[0.01] rounded-[4rem] border-2 border-dashed border-royal/5 flex flex-col items-center justify-center group hover:bg-royal/[0.02] transition-all">
             <div className="w-24 h-24 bg-royal/5 rounded-full flex items-center justify-center mb-8 border border-royal/5 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-royal/20 group-hover:text-royal transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
             </div>
             <p className="italic text-[13px] font-black text-royal/20 uppercase tracking-[0.3em] group-hover:text-royal/40 transition-colors">No family members have been added to this estate yet.</p>
          </div>
        )}
      </div>

      {/* Registration Modal — Light Premium Glass */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal/[0.05] backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-16 max-w-xl w-full border border-royal/10 shadow-[0_40px_100px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
            <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-3 uppercase tracking-tight">Add New Heir</h3>
            <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest mb-10 italic">Enter the details for the person you want to add to your estate plan.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addMutation.mutate({ 
                name: formData.get('name') as string, 
                relation: formData.get('relation') as string,
                email: formData.get('email') as string
              });
            }} className="space-y-8">
              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Full Name</label>
                <input name="name" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal focus:ring-[12px] focus:ring-royal/[0.03] outline-none font-black text-royal transition-all placeholder:text-royal/10 text-lg uppercase tracking-tight" placeholder="e.g. SARAH JOHNSON" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="group/field">
                  <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Relationship</label>
                  <input name="relation" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal outline-none font-black text-royal placeholder:text-royal/10 text-lg uppercase tracking-tight transition-all" placeholder="e.g. SPOUSE / SON" />
                </div>
                <div className="group/field">
                  <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Their Role</label>
                  <div className="relative">
                    <select name="role" className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal outline-none font-black text-royal appearance-none text-lg transition-all uppercase tracking-tight">
                      <option value="heir">Primary Heir</option>
                      <option value="executor">Legal Executor</option>
                      <option value="trustee">Trustee Helper</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-royal/30 group-hover/field:text-royal transition-colors">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Email Address</label>
                <input name="email" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal outline-none font-black text-royal placeholder:text-royal/10 text-lg uppercase tracking-tight transition-all" type="email" placeholder="sarah@example.com" />
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-royal/10 font-black text-royal/40 text-[11px] uppercase tracking-[0.2em] hover:bg-royal/[0.02] hover:text-royal transition-all active:scale-95">Cancel</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 py-5 rounded-2xl bg-royal text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-sapphire shadow-[0_12px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] hover:-translate-y-1 transition-all disabled:opacity-50 active:scale-95 border border-white/10">
                  {addMutation.isPending ? 'SAVING...' : 'Add to Estate'}
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
    <div className="bg-white p-12 rounded-[3.5rem] border border-royal/10 shadow-[0_2px_40px_rgba(19,51,120,0.05)] flex items-center gap-10 group hover:border-royal/30 hover:shadow-[0_40px_100px_rgba(19,51,120,0.1)] transition-all relative overflow-hidden active:scale-[0.99] cursor-pointer">
      <div className="absolute top-0 right-0 w-32 h-32 bg-royal/[0.02] rounded-bl-[6rem] -mr-10 -mt-10 group-hover:bg-royal/[0.05] transition-colors" />
      <div className="w-24 h-24 rounded-[2rem] bg-royal/[0.03] border border-royal/10 flex items-center justify-center text-royal font-black text-3xl shadow-sm shrink-0 uppercase tracking-tighter group-hover:bg-royal group-hover:text-white transition-all duration-500">
        {name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex justify-between items-start">
          <h4 className="text-royal font-black text-3xl uppercase tracking-tighter truncate leading-tight group-hover:text-sapphire transition-colors">{name}</h4>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-royal/[0.03] rounded-xl border border-royal/10 group-hover:bg-white transition-all shadow-sm">
             <div className={`w-2 h-2 rounded-full ${status === 'Verified' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-sapphire shadow-[0_0_12px_rgba(15,82,186,0.4)] animate-pulse'}`} />
             <span className={`text-[9px] font-black uppercase tracking-widest ${status === 'Verified' ? 'text-green-600' : 'text-sapphire'}`}>
              {status}
             </span>
           </div>
          <span className="text-[11px] font-black text-royal/30 uppercase tracking-widest truncate">{email || 'No email provided'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-royal/5 pt-6 mt-4">
           <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-royal/20 uppercase tracking-[0.2em] leading-none">Relationship</span>
              <span className="text-[13px] font-black text-royal uppercase tracking-widest">{relation}</span>
           </div>
           <div className="flex flex-col text-right gap-1">
              <span className="text-[9px] font-black text-royal/20 uppercase tracking-[0.2em] leading-none">Their Share</span>
              <span className="text-[13px] font-black text-sapphire uppercase tracking-widest">{share || 'NOT SET YET'}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
