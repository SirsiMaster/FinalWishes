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
    <div className="max-w-[1240px] mx-auto space-y-12 pb-24 px-6">
      <div className="flex justify-between items-end border-b border-royal/5 pb-16">
        <div className="space-y-3">
          <h2 className="text-6xl font-[family-name:var(--font-cinzel)] font-black text-[#0F172A] uppercase tracking-tighter">Family & Heirs</h2>
          <p className="text-lg text-royal/40 font-medium">Add and manage the people who will receive your assets or help manage your estate.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-[#0F172A] hover:bg-royal text-white px-10 py-4 rounded-2xl font-bold text-[13px] transition-all shadow-xl hover:-translate-y-1 active:scale-95 flex items-center gap-3 group"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-royal group-hover:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
          Add Family Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {beneficiaries.map((b, i) => (
          <BeneficiaryCard key={i} name={b.name} relation={b.relation} share={b.share} status={b.status} email={b.email} />
        ))}
        {beneficiaries.length === 0 && (
          <div className="col-span-2 text-center py-48 bg-[#F8FAFC] rounded-[4rem] border border-royal/5 flex flex-col items-center justify-center group">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm border border-royal/5 transition-all group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-royal/20 group-hover:text-royal transition-colors" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
             </div>
             <p className="text-xl font-medium text-slate-400">No family members have been added to this estate yet.</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-16 max-w-xl w-full border border-royal/10 shadow-[0_48px_120px_rgba(15,23,42,0.15)] animate-in zoom-in duration-500 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-royal" />
            <h3 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-[#0F172A] mb-4 uppercase tracking-tight">Add New Heir</h3>
            <p className="text-lg text-slate-400 font-medium mb-12">Enter the details for the person you want to add to your estate plan.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addMutation.mutate({ 
                name: formData.get('name') as string, 
                relation: formData.get('relation') as string,
                email: formData.get('email') as string
              });
            }} className="space-y-10">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Full Name</label>
                <input name="name" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-royal focus:ring-[12px] focus:ring-royal/5 outline-none font-semibold text-[#0F172A] transition-all text-lg" placeholder="Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Relationship</label>
                  <input name="relation" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-royal outline-none font-semibold text-[#0F172A] text-lg transition-all" placeholder="Spouse" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Their Role</label>
                  <div className="relative">
                    <select name="role" className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-royal outline-none font-semibold text-[#0F172A] appearance-none text-lg transition-all">
                      <option value="heir">Primary Heir</option>
                      <option value="executor">Legal Executor</option>
                      <option value="trustee">Trustee Helper</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Email Address</label>
                <input name="email" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-royal outline-none font-semibold text-[#0F172A] text-lg transition-all" type="email" placeholder="jane@example.com" />
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-slate-100 font-bold text-slate-400 hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 py-5 rounded-2xl bg-[#0F172A] text-white font-bold transition-all shadow-xl hover:bg-royal active:scale-95 disabled:opacity-50">
                  {addMutation.isPending ? 'Saving...' : 'Add to Estate'}
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
    <div className="bg-white p-12 rounded-[3.5rem] border border-royal/5 shadow-[0_2px_40px_rgba(15,23,42,0.02)] flex items-center gap-10 group hover:border-royal/10 hover:shadow-[0_32px_80px_rgba(15,23,42,0.08)] transition-all relative overflow-hidden active:scale-[0.99] cursor-pointer">
      <div className="absolute top-0 right-0 w-32 h-32 bg-royal/[0.01] rounded-bl-[6rem] transition-colors group-hover:bg-royal/[0.03]" />
      <div className="w-24 h-24 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-royal font-black text-3xl shadow-sm shrink-0 transition-all duration-500 group-hover:bg-[#0F172A] group-hover:text-white">
        {name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex justify-between items-start">
          <h4 className="text-[#0F172A] font-bold text-3xl tracking-tight truncate leading-tight transition-colors group-hover:text-royal">{name}</h4>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
             <div className={`w-2 h-2 rounded-full ${status === 'Verified' ? 'bg-green-500' : 'bg-royal animate-pulse'}`} />
             <span className={`text-[11px] font-bold uppercase tracking-widest ${status === 'Verified' ? 'text-green-600' : 'text-royal'}`}>
              {status}
             </span>
           </div>
          <span className="text-[13px] font-medium text-slate-400 truncate">{email || 'No email provided'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-50 pt-6 mt-4">
           <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Relationship</span>
              <span className="text-[15px] font-semibold text-[#0F172A]">{relation}</span>
           </div>
           <div className="flex flex-col text-right gap-0.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Their Share</span>
              <span className="text-[15px] font-semibold text-royal">{share || 'Not set yet'}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
