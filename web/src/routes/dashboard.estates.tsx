import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/estates')({
  component: EstatesPage,
})

function EstatesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['estates'],
    queryFn: () => estateClient.listEstates({ userId: 'test-user' }),
  });

  const registerMutation = useMutation({
    mutationFn: (vars: { name: string, type: string }) => 
      estateClient.registerEstate({
        userId: 'test-user',
        name: vars.name,
        type: vars.type
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estates'] });
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
    <div className="space-y-10 pb-20 max-w-6xl mx-auto">
      <div className="flex justify-between items-end border-b border-border-light pb-8">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-tight">Governance Shards</h2>
          <p className="text-sm text-text-muted">Manage your primary and secondary estate directives across multiple jurisdictions.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-gold text-black px-8 py-3 rounded-2xl font-black text-[0.7rem] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          + Register New Estate
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
        {estates.map((e) => (
          <div key={e.id} className="bg-white p-10 rounded-[2.5rem] border border-border-light shadow-sm hover:shadow-2xl hover:border-royal/20 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-royal/5 rounded-bl-[5rem] -mr-10 -mt-10 group-hover:bg-royal/10 transition-colors" />
            <div className="w-16 h-16 bg-royal-subtle rounded-2xl flex items-center justify-center mb-6 border border-royal/10">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-royal" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <h3 className="text-navy font-black text-2xl mb-2 uppercase tracking-tight">{e.name}</h3>
            <div className="flex items-center gap-3 mb-6">
               <span className="px-2.5 py-1 bg-navy/5 text-navy font-black text-[0.6rem] uppercase tracking-widest rounded-lg border border-navy/10">{e.role} Authority</span>
               <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  <span className="text-[10px] font-black text-navy/40 uppercase tracking-tighter">Verified Protocol</span>
               </div>
            </div>
            <p className="text-text-muted text-sm leading-relaxed mb-8 opacity-70">The underlying assets and memoirs for this shard are actively monitored by the Guidance Engine. All heirs have been notarized.</p>
            <div className="flex gap-4">
              <button className="flex-1 border-2 border-border-light text-navy px-6 py-3 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                Audit Shard
              </button>
              <button className="flex-1 bg-navy text-white px-6 py-3 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg hover:shadow-navy/20">
                Switch Focus
              </button>
            </div>
          </div>
        ))}
        {estates.length === 0 && (
          <div className="col-span-2 text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-border-light italic text-text-muted shadow-inner">
            No active estate protocols detected for this user identity.
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full border border-border-light shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-navy mb-2 uppercase tracking-wide">Register New Protocol</h3>
            <p className="text-sm text-text-muted mb-8 italic">Enter the governance details to initialize a new estate holding shard.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              registerMutation.mutate({ 
                name: formData.get('name') as string, 
                type: formData.get('type') as string 
              });
            }} className="space-y-6">
              <div>
                <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-2 block">Protocol Name</label>
                <input name="name" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white focus:border-royal focus:ring-4 focus:ring-royal/5 outline-none font-bold text-navy transition-all" placeholder="e.g. The Family Dynasty Trust" />
              </div>
              <div>
                <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-2 block">Estate Type</label>
                <select name="type" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white outline-none font-bold text-navy appearance-none">
                  <option value="Personal">Personal Portfolio</option>
                  <option value="Family Trust">Family Holding Trust</option>
                  <option value="Corporate">Corporate Succession</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-border-light font-black text-navy text-xs uppercase tracking-[0.15em] hover:bg-gray-50 transition-colors">Discard</button>
                <button type="submit" disabled={registerMutation.isPending} className="flex-1 py-4 rounded-2xl bg-navy text-white font-black text-xs uppercase tracking-[0.15em] hover:bg-black shadow-xl transition-all">
                  {registerMutation.isPending ? 'Initializing...' : 'Initialize Shard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
