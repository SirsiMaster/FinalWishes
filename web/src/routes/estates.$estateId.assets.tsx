import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/assets')({
  component: AssetsPage,
})

function AssetsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/assets' });
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [estateId, setEstateId] = useState(routeId === 'lockhart' ? 'estate_lockhart' : routeId);

  useEffect(() => {
    const preferredId = routeId === 'lockhart' ? 'estate_lockhart' : routeId;
    setEstateId(preferredId);
  }, [routeId]);

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
      <div className="flex justify-between items-end border-b border-royal/10 pb-12">
        <div className="space-y-4">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tighter">My Assets</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">A complete list of everything you own and want to pass on.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-royal hover:bg-sapphire text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_8px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_40px_rgba(15,82,186,0.3)] hover:-translate-y-1 active:scale-95 border border-white/10 flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
          Add New Asset
        </button>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-royal/10 overflow-hidden shadow-[0_2px_40px_rgba(19,51,120,0.05)] group relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-royal/[0.01] text-[10px] uppercase tracking-[0.25em] font-black text-royal/40 border-b border-royal/5">
                <th className="px-10 py-8 font-black">Asset Name</th>
                <th className="px-10 py-8 font-black">Category</th>
                <th className="px-10 py-8 font-black">Estimated Value</th>
                <th className="px-10 py-8 font-black text-center">Status</th>
                <th className="px-10 py-8 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px] font-bold text-royal/60">
              {assets.map((a, i) => (
                <tr key={i} className="border-b border-royal/5 hover:bg-royal/[0.01] transition-all group/row relative">
                  <td className="px-10 py-8 font-black text-royal text-base uppercase tracking-tight">{a.name}</td>
                  <td className="px-10 py-8">
                    <span className="px-4 py-1.5 bg-royal/[0.03] text-royal font-black text-[9px] uppercase tracking-widest rounded-xl border border-royal/10 group-hover/row:bg-white transition-all shadow-sm">
                      {a.type}
                    </span>
                  </td>
                  <td className="px-10 py-8 font-black text-royal/80 text-lg tabular-nums">{a.value}</td>
                  <td className="px-10 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${a.status === 'Verified' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-sapphire shadow-[0_0_12px_rgba(15,82,186,0.4)] animate-pulse'}`} />
                       <span className={`text-[9px] uppercase font-black tracking-widest ${a.status === 'Verified' ? 'text-green-600' : 'text-sapphire'}`}>
                         {a.status}
                       </span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button className="text-royal font-black text-[10px] uppercase tracking-widest bg-royal/[0.03] hover:bg-royal hover:text-white px-5 py-2.5 rounded-xl border border-royal/10 transition-all shadow-sm active:scale-95">View Details</button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center text-royal/20 italic font-black uppercase tracking-[0.3em]">No assets have been added to this estate yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal — Light Premium Glass */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal/[0.05] backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-16 max-w-xl w-full border border-royal/10 shadow-[0_40px_100px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
            <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-3 uppercase tracking-tight">Add New Asset</h3>
            <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest mb-10 italic">Add something new to your estate list.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addAssetMutation.mutate({ 
                name: formData.get('name') as string, 
                type: formData.get('type') as string,
                value: formData.get('value') as string
              });
            }} className="space-y-8">
              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Name of Asset</label>
                <input name="name" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal focus:ring-[12px] focus:ring-royal/[0.03] outline-none font-black text-royal transition-all placeholder:text-royal/10 text-lg uppercase tracking-tight" placeholder="e.g. CHASE SAVINGS 0422" />
              </div>
              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Type of Asset</label>
                <div className="relative">
                  <select name="type" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal outline-none font-black text-royal appearance-none text-lg transition-all uppercase tracking-tight">
                    <option value="Real Estate">Real Estate</option>
                    <option value="Cash">Cash / Savings</option>
                    <option value="Securities">Securities / Stocks</option>
                    <option value="Personal Property">Personal Property</option>
                    <option value="Digital Assets">Digital Assets</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-royal/30 group-hover/field:text-royal transition-colors">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
              </div>
              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Estimated Value</label>
                <input name="value" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal focus:ring-[12px] focus:ring-royal/[0.03] outline-none font-black text-royal transition-all placeholder:text-royal/10 text-lg uppercase tracking-tight" placeholder="e.g. $125,000" />
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-royal/10 font-black text-royal/40 text-[11px] uppercase tracking-[0.2em] hover:bg-royal/[0.02] hover:text-royal transition-all active:scale-95">Cancel</button>
                <button type="submit" disabled={addAssetMutation.isPending} className="flex-1 py-5 rounded-2xl bg-royal text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-sapphire shadow-[0_12px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] hover:-translate-y-1 transition-all disabled:opacity-50 active:scale-95 border border-white/10">
                  {addAssetMutation.isPending ? 'SAVING...' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
