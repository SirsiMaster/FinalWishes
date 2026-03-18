import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/beneficiaries')({
  component: BeneficiariesPage,
})

function BeneficiariesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['beneficiaries'],
    queryFn: () => estateClient.listBeneficiaries({ estateId: 'test-estate' }),
  });

  const addMutation = useMutation({
    mutationFn: (vars: { name: string, relation: string, email: string }) => 
      estateClient.addBeneficiary({
        estateId: 'test-estate',
        name: vars.name,
        relation: vars.relation,
        email: vars.email
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
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
    <div className="space-y-10 pb-20 max-w-6xl mx-auto">
      <div className="flex justify-between items-end border-b border-border-light pb-8">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-tight">Family Shard</h2>
          <p className="text-sm text-text-muted">Register and manage legal heirs, executors, and primary trustees for this estate protocol.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-gold text-black px-8 py-3 rounded-2xl font-black text-[0.7rem] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          + Register Family Member
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
        {beneficiaries.map((b, i) => (
          <BeneficiaryCard key={i} name={b.name} relation={b.relation} share={b.share} status={b.status} email={b.email} />
        ))}
        {beneficiaries.length === 0 && (
          <div className="col-span-2 text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-border-light italic text-text-muted shadow-inner">
            No active heirs registered in this shard. Use the registration portal above to begin.
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full border border-border-light shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-navy mb-2 uppercase tracking-wide">Register New Heir</h3>
            <p className="text-sm text-text-muted mb-8 italic">Enter the legal identity for this beneficiary to initialize their access shard.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addMutation.mutate({ 
                name: formData.get('name') as string, 
                relation: formData.get('relation') as string,
                email: formData.get('email') as string
              });
            }} className="space-y-6">
              <div>
                <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.15em] mb-2 block">Full Legal Name</label>
                <input name="name" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white focus:border-royal focus:ring-4 focus:ring-royal/5 outline-none font-bold text-navy transition-all" placeholder="e.g. Sarah Johnson" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.15em] mb-2 block">Relationship</label>
                  <input name="relation" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white outline-none font-bold text-navy" placeholder="e.g. Spouse / Son" />
                </div>
                <div>
                  <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.15em] mb-2 block">Governance Role</label>
                  <select name="role" className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white outline-none font-bold text-navy appearance-none">
                    <option value="heir">Primary Heir</option>
                    <option value="executor">Legal Executor</option>
                    <option value="trustee">Trustee Proxy</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.15em] mb-2 block">Secure Email Shard</label>
                <input name="email" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white outline-none font-bold text-navy" type="email" placeholder="sarah@example.com" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-border-light font-black text-navy text-xs uppercase tracking-[0.15em] hover:bg-gray-50 transition-colors">Discard</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 py-4 rounded-2xl bg-gold text-black font-black text-xs uppercase tracking-[0.15em] hover:scale-[1.02] shadow-xl shadow-gold/20 transition-all">
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
    <div className="bg-white p-10 rounded-[2.5rem] border border-border-light shadow-sm flex items-center gap-8 group hover:border-royal/20 hover:shadow-2xl transition-all relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-royal/5 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-royal/10 transition-colors" />
      <div className="w-20 h-20 rounded-2xl bg-royal-subtle border border-royal/10 flex items-center justify-center text-royal font-black text-2xl shadow-inner shrink-0 uppercase tracking-tighter">
        {name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-navy font-black text-2xl uppercase tracking-tight truncate">{name}</h4>
        </div>
        <div className="flex items-center gap-3 mb-4">
           <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${status === 'Verified' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gold-dim text-gold border border-gold/20'}`}>
            {status}
          </span>
          <span className="text-[10px] font-black text-navy/40 uppercase tracking-tighter truncate">{email || 'No email provided'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-2">
           <div className="flex flex-col">
              <span className="text-[0.55rem] font-black text-navy/30 uppercase tracking-[0.2em] mb-1 leading-none">Legal Relation</span>
              <span className="text-[0.7rem] font-black text-navy uppercase tracking-widest">{relation}</span>
           </div>
           <div className="flex flex-col text-right">
              <span className="text-[0.55rem] font-black text-navy/30 uppercase tracking-[0.2em] mb-1 leading-none">Allocated Share</span>
              <span className="text-[0.7rem] font-black text-gold uppercase tracking-widest">{share || 'Pending Assignment'}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
