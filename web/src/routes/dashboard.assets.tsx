import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/dashboard/assets')({
  component: AssetsPage,
})

function AssetsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [estateId, setEstateId] = useState('estate_lockhart');

  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.primaryEstateId) {
      setEstateId(profile.primaryEstateId);
    }
  }, [profile]);

  const { data, isLoading } = useQuery({
    queryKey: ['assets', estateId],
    queryFn: () => estateClient.listAssets({ estateId }),
  });

  const addAssetMutation = useMutation({
    mutationFn: (vars: { name: string, type: string, value: string }) => 
      estateClient.addAsset({
        estateId: estateId,
        name: vars.name,
        type: vars.type,
        value: vars.value
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', estateId] });
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

  const assets = data?.assets || [];

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end border-b border-royal/10 pb-8">
        <div>
          <h2 className="text-3xl font-black text-royal uppercase tracking-tight font-[family-name:var(--font-cinzel)] mb-2">Asset Inventory</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Track and designate your global holdings in the estate ledger.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-royal hover:bg-sapphire text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_8px_24px_rgba(15,82,186,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all border border-white/10"
        >
          + Add Asset
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-royal/10 overflow-hidden shadow-[0_2px_20px_rgba(19,51,120,0.03)] relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-royal opacity-5" />
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-royal/[0.03] text-[10px] uppercase tracking-[0.2em] font-black text-royal/60">
              <th className="px-10 py-7">Asset Identifier</th>
              <th className="px-10 py-7">Category</th>
              <th className="px-10 py-7 text-right">Valuation</th>
              <th className="px-10 py-7 text-center">Status</th>
              <th className="px-10 py-7 text-right">Ledger Actions</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-royal/60">
            {assets.map((a, i) => (
              <tr key={i} className="border-t border-royal/5 hover:bg-royal/[0.02] transition-colors group cursor-pointer">
                <td className="px-10 py-6 font-black text-royal uppercase tracking-tight truncate max-w-[240px] font-[family-name:var(--font-cinzel)]">{a.name}</td>
                <td className="px-10 py-6">
                  <span className="font-black text-[10px] text-royal/40 uppercase tracking-[0.15em] bg-royal/[0.05] px-3 py-1 rounded-lg border border-royal/5">{a.type}</span>
                </td>
                <td className="px-10 py-6 font-black text-royal text-right tabular-nums text-[14px]">$ {a.value}</td>
                <td className="px-10 py-6 text-center">
                  <span className={`px-3 py-1.5 rounded-xl text-[9px] uppercase font-black tracking-widest border shadow-sm transition-all ${a.status === 'Verified' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-[#C8A951]/5 text-[#C8A951] border-[#C8A951]/20'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-10 py-6 text-right">
                  <button className="text-royal/20 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:text-royal transition-all hover:scale-105 active:scale-95">View Details</button>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-10 py-32 text-center text-royal/20 italic font-black uppercase tracking-widest text-[11px] bg-royal/[0.01]">No assets have been added to this estate yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal/[0.05] backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[3rem] p-12 max-w-lg w-full border border-royal/10 shadow-[0_20px_60px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-2 uppercase tracking-wide">Register New Asset</h3>
            <p className="text-[11px] text-royal/30 mb-10 font-black uppercase tracking-widest leading-relaxed">Add a new asset to your estate inventory.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addAssetMutation.mutate({ 
                name: formData.get('name') as string, 
                type: formData.get('type') as string,
                value: formData.get('value') as string
              });
            }} className="space-y-8">
              <div className="group">
                <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Asset Identifier</label>
                <input name="name" required className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white focus:border-royal focus:shadow-sm outline-none font-black text-royal transition-all placeholder:text-royal/10" placeholder="e.g. Chase Savings 0422" />
              </div>
              <div className="group">
                <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Asset Category</label>
                <div className="relative">
                  <select name="type" required className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white outline-none font-black text-royal appearance-none cursor-pointer transition-all">
                    <option value="Real Estate">Real Estate</option>
                    <option value="Cash">Cash / Savings</option>
                    <option value="Securities">Securities / Stocks</option>
                    <option value="Personal Property">Personal Property</option>
                    <option value="Digital Assets">Digital Assets</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-royal/20">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div className="group">
                <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Estimated Valuation (Dynamic)</label>
                <input name="value" required className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white focus:border-royal focus:shadow-sm outline-none font-black text-royal transition-all placeholder:text-royal/10" placeholder="e.g. $125,000" />
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4.5 rounded-2xl border border-royal/10 font-black text-royal/40 text-[11px] uppercase tracking-[0.2em] hover:bg-royal/[0.02] hover:text-royal transition-all">Discard</button>
                <button type="submit" disabled={addAssetMutation.isPending} className="flex-1 py-4.5 rounded-2xl bg-royal hover:bg-sapphire text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-[0.98] border border-white/10">
                  {addAssetMutation.isPending ? 'Saving...' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
