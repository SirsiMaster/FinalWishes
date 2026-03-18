import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/estates')({
  component: EstatesPage,
})

function EstatesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/estates' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [userId, setUserId] = useState('test-user');

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      setUserId(u.login || 'test-user');
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['estates', userId],
    queryFn: () => estateClient.listEstates({ userId }),
  });

  const registerMutation = useMutation({
    mutationFn: (vars: { name: string, type: string }) => 
      estateClient.registerEstate({
        userId: userId,
        name: vars.name,
        type: vars.type
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estates', userId] });
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

  const estates = data?.estates || [];

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end border-b border-royal/10 pb-10">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">Estate Plans</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Manage your primary and secondary estate plans in one central vault.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-royal hover:bg-sapphire text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:shadow-[0_8px_32px_rgba(19,51,120,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all border border-white/10 flex items-center gap-3 shadow-xl"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
          Add New Estate
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {estates.map((e) => {
          const isCurrent = routeId === e.id || (routeId === 'lockhart' && e.id === 'estate_lockhart');
          return (
            <div key={e.id} className={`bg-white p-12 rounded-[3.5rem] border ${isCurrent ? 'border-royal/30 shadow-[0_20px_60px_rgba(19,51,120,0.1)]' : 'border-royal/10 shadow-[0_2px_30px_rgba(19,51,120,0.03)]'} hover:shadow-[0_30px_70px_rgba(19,51,120,0.08)] hover:border-royal/20 transition-all group overflow-hidden relative group cursor-pointer border-t-4 ${isCurrent ? 'border-t-royal' : 'border-t-royal/5'} hover:border-t-royal/20`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-royal/[0.02] rounded-bl-[6rem] -mr-12 -mt-12 group-hover:bg-royal/[0.05] transition-colors" />
              <div className={`w-20 h-20 ${isCurrent ? 'bg-royal text-white' : 'bg-royal/[0.03] text-royal'} rounded-[2rem] flex items-center justify-center mb-8 border border-royal/10 transition-all duration-500 shadow-sm`}>
                <svg viewBox="0 0 24 24" className="w-10 h-10 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <h3 className="text-royal font-black text-3xl mb-3 uppercase tracking-tight group-hover:text-sapphire transition-colors">{e.name}</h3>
              <div className="flex items-center gap-4 mb-8">
                 <span className="px-4 py-1.5 bg-royal/[0.02] text-royal font-black text-[10px] uppercase tracking-widest rounded-xl border border-royal/10 shadow-sm group-hover:bg-white group-hover:border-royal/20 transition-all">{e.role} Manager</span>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.4)]" />
                    <span className="text-[10px] font-black text-royal/30 uppercase tracking-[0.1em] group-hover:text-royal/50 transition-colors">Verified Estate</span>
                 </div>
              </div>
              <p className="text-royal/40 font-bold uppercase tracking-widest text-[11px] leading-relaxed mb-10 group-hover:text-royal/60 transition-colors">The assets and memories for this estate are actively monitored by the Secure Guidance Engine. All heirs have been notarized.</p>
              <div className="flex gap-4">
                <button className="flex-1 bg-white border border-royal/10 text-royal px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-royal/[0.02] hover:border-royal/20 transition-all hover:shadow-lg active:scale-[0.98]">
                  View History
                </button>
                <button 
                  onClick={() => {
                    if (isCurrent) return;
                    const nextId = e.id === 'estate_lockhart' ? 'lockhart' : e.id;
                    navigate({ to: `/estates/${nextId}/dashboard` });
                  }}
                  className={`flex-1 ${isCurrent ? 'bg-royal/10 text-royal/30 border border-royal/5 cursor-default' : 'bg-royal text-white hover:bg-sapphire hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] hover:-translate-y-0.5 border border-white/10'} px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]`}
                >
                  {isCurrent ? 'Plan Active' : 'Open Estate'}
                </button>
              </div>
            </div>
          );
        })}
        {estates.length === 0 && (
          <div className="col-span-2 text-center py-40 bg-royal/[0.01] rounded-[4rem] border-2 border-dashed border-royal/5 flex flex-col items-center justify-center group hover:bg-royal/[0.02] transition-all">
             <div className="w-24 h-24 bg-royal/5 rounded-full flex items-center justify-center mb-8 border border-royal/5 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-royal/20 group-hover:text-royal transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
             </div>
             <p className="italic text-[13px] font-black text-royal/20 uppercase tracking-[0.3em] group-hover:text-royal/40 transition-colors">No active estates found for your account.</p>
          </div>
        )}
      </div>

      {/* Registration Modal — Light Premium Glass */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal/[0.05] backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] p-16 max-w-xl w-full border border-royal/10 shadow-[0_40px_100px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
            <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-3 uppercase tracking-tight">Add New Plan</h3>
            <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest mb-10 italic">Enter the details to start a new estate plan.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              registerMutation.mutate({ 
                name: formData.get('name') as string, 
                type: formData.get('type') as string 
              });
            }} className="space-y-8">
              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Plan Name</label>
                <input name="name" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal focus:ring-[12px] focus:ring-royal/[0.03] outline-none font-black text-royal transition-all placeholder:text-royal/10 text-lg uppercase tracking-tight" placeholder="e.g. THE FAMILY DYNASTY TRUST" />
              </div>
              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Plan Type</label>
                <div className="relative">
                  <select name="type" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal outline-none font-black text-royal appearance-none text-lg transition-all uppercase tracking-tight">
                    <option value="Personal">Personal Portfolio</option>
                    <option value="Family Trust">Family Holding Trust</option>
                    <option value="Corporate">Business Succession</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-royal/30 group-hover/field:text-royal transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-royal/10 font-black text-royal/40 text-[11px] uppercase tracking-[0.2em] hover:bg-royal/[0.02] hover:text-royal transition-all active:scale-[0.98]">Cancel</button>
                <button type="submit" disabled={registerMutation.isPending} className="flex-1 py-5 rounded-2xl bg-royal text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-sapphire shadow-[0_12px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-[0.98] border border-white/10">
                  {registerMutation.isPending ? 'Saving...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
