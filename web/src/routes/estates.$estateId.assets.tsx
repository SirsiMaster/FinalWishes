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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-navy uppercase tracking-tight font-[family-name:var(--font-cinzel)]">Asset Inventory</h2>
          <p className="text-sm text-text-muted">Track and designate your global holdings in the estate ledger.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-gold text-black px-6 py-2.5 rounded-xl font-black text-[0.7rem] uppercase tracking-widest hover:scale-105 transition-transform shadow-lg"
        >
          + Add Asset
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-border-light overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-navy/5 text-[0.65rem] uppercase tracking-widest font-black text-navy">
              <th className="px-8 py-5">Asset Name</th>
              <th className="px-8 py-5">Type</th>
              <th className="px-8 py-5">Valuation</th>
              <th className="px-8 py-5 text-center">Status Shard</th>
              <th className="px-8 py-5 text-right">Ledger Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-text-secondary">
            {assets.map((a, i) => (
              <tr key={i} className="border-t border-border-light hover:bg-royal-subtle transition-colors group">
                <td className="px-8 py-5 font-bold text-navy truncate max-w-[200px]">{a.name}</td>
                <td className="px-8 py-5 font-black text-[0.65rem] text-royal uppercase tracking-widest">{a.type}</td>
                <td className="px-8 py-5 font-black text-navy">{a.value}</td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-3 py-1 rounded-lg text-[8px] uppercase font-black tracking-widest border transition-all ${a.status === 'Verified' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gold-dim text-gold border-gold/10 pulse-slow'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="text-royal font-black text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-100 hover:underline transition-opacity">Audit Element</button>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-text-muted italic font-medium">No assets registered in this governance shard.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full border border-border-light shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-navy mb-2 uppercase tracking-wide">Register New Asset</h3>
            <p className="text-sm text-text-muted mb-8 italic">Synchronize a new holding with the estate's verified ledger.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addAssetMutation.mutate({ 
                name: formData.get('name') as string, 
                type: formData.get('type') as string,
                value: formData.get('value') as string
              });
            }} className="space-y-6">
              <div>
                <label className="text-[0.65rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-1.5 block">Asset Identifier</label>
                <input name="name" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white focus:border-royal focus:ring-4 focus:ring-royal/5 outline-none font-bold text-navy transition-all" placeholder="e.g. Chase Savings 0422" />
              </div>
              <div>
                <label className="text-[0.65rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-1.5 block">Holding Type Shard</label>
                <select name="type" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white outline-none font-bold text-navy appearance-none">
                  <option value="Real Estate">Real Estate</option>
                  <option value="Cash">Cash / Savings</option>
                  <option value="Securities">Securities / Stocks</option>
                  <option value="Personal Property">Personal Property</option>
                  <option value="Digital Assets">Digital Assets</option>
                </select>
              </div>
              <div>
                <label className="text-[0.65rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-1.5 block">Estimated Valuation (Dynamic)</label>
                <input name="value" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white focus:border-royal focus:ring-4 focus:ring-royal/5 outline-none font-bold text-navy transition-all" placeholder="e.g. $125,000" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-border-light font-black text-navy text-xs uppercase tracking-[0.15em] hover:bg-gray-50 transition-colors">Discard</button>
                <button type="submit" disabled={addAssetMutation.isPending} className="flex-1 py-4 rounded-2xl bg-navy text-white font-black text-xs uppercase tracking-[0.15em] hover:bg-black shadow-xl transition-all disabled:opacity-50">
                  {addAssetMutation.isPending ? 'Synchronizing...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
