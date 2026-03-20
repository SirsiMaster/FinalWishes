import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/estates/$estateId/estates')({
  component: EstatesPage,
})

function EstatesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/estates' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuth();
  const userId = user?.uid || 'test-user';

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
    <div className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-end border-b border-slate-50 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Estate Registry</span>
          </div>
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">Estate Plans</h2>
          <p className="text-[#64748B] text-lg font-medium max-w-2xl leading-relaxed">
            Manage your primary and secondary estate plans from a central vault.
          </p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 rounded-2xl font-bold text-[14px] transition-all shadow-[0_20px_50px_rgba(19,51,120,0.1)] flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Estate
        </button>
      </div>
      
      {/* ── Estate Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {estates.map((e) => {
          const isCurrent = routeId === e.id || (routeId === 'lockhart' && e.id === 'estate_lockhart');
          return (
            <div key={e.id} className={`bg-white p-12 rounded-[2.5rem] border ${isCurrent ? 'border-[#133378]/20 shadow-xl' : 'border-slate-100 shadow-sm'} hover:shadow-2xl hover:border-[#133378]/20 transition-all group overflow-hidden relative cursor-pointer`}>
              <div className={`w-16 h-16 ${isCurrent ? 'bg-[#133378] text-white' : 'bg-[#F8FAFC] text-[#133378]'} rounded-2xl flex items-center justify-center mb-8 border border-slate-100 transition-all duration-500`}>
                <svg viewBox="0 0 24 24" className="w-8 h-8 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <h3 className="text-[#0F172A] font-bold text-3xl mb-3 tracking-tight group-hover:text-[#133378] transition-colors">{e.name}</h3>
              <div className="flex items-center gap-4 mb-8">
                 <span className="px-4 py-1.5 bg-[#F1F5F9] text-[#334155] font-bold text-[11px] uppercase tracking-widest rounded-lg border border-slate-100">{e.role} Manager</span>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Verified</span>
                 </div>
              </div>
              <p className="text-[#64748B] font-medium text-sm leading-relaxed mb-10">The assets and memories for this estate are actively monitored and secured. All designated heirs have been verified.</p>
              <div className="flex gap-4">
                <button className="flex-1 bg-[#F8FAFC] border border-slate-100 text-[#0F172A] px-8 py-4 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all">
                  View History
                </button>
                <button 
                  onClick={() => {
                    if (isCurrent) return;
                    const nextId = e.id === 'estate_lockhart' ? 'lockhart' : e.id;
                    navigate({ to: `/estates/${nextId}/dashboard` });
                  }}
                  className={`flex-1 ${isCurrent ? 'bg-[#F8FAFC] text-slate-400 border border-slate-100 cursor-default' : 'bg-[#133378] text-white hover:bg-[#1E3A5F]'} px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-sm`}
                >
                  {isCurrent ? 'Currently Active' : 'Open Estate'}
                </button>
              </div>
            </div>
          );
        })}
        {estates.length === 0 && (
          <div className="col-span-2 text-center py-40 bg-[#F8FAFC] rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8 border border-slate-100 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
             </div>
             <p className="text-slate-400 font-medium text-sm">No active estates found for your account.</p>
          </div>
        )}
      </div>

      {/* ── New Estate Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-16 max-w-xl w-full border border-slate-100 shadow-2xl animate-in zoom-in duration-500 relative">
            <h3 className="text-3xl font-bold text-[#0F172A] mb-3 tracking-tight">Add New Plan</h3>
            <p className="text-slate-500 font-medium text-sm mb-12">Enter the details to create a new estate plan for your family.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              registerMutation.mutate({ 
                name: formData.get('name') as string, 
                type: formData.get('type') as string 
              });
            }} className="space-y-10">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Plan Name</label>
                <input name="name" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-slate-300 text-lg" placeholder="e.g. The Family Dynasty Trust" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Plan Type</label>
                <select name="type" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] appearance-none text-lg transition-all">
                  <option value="Personal">Personal Portfolio</option>
                  <option value="Family Trust">Family Holding Trust</option>
                  <option value="Corporate">Business Succession</option>
                </select>
              </div>
              <div className="flex gap-6 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-slate-100 font-bold text-slate-400 text-sm hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={registerMutation.isPending} className="flex-1 py-5 rounded-2xl bg-[#133378] text-white font-bold text-sm transition-all hover:bg-[#1E3A5F] shadow-xl disabled:opacity-50">
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
