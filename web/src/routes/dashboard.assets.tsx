import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/assets')({
  component: AssetsPage,
})

function AssetsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => estateClient.listAssets({ estateId: 'test-estate' }),
  });

  const addAssetMutation = useMutation({
    mutationFn: (vars: { name: string, type: string, value: string }) => 
      estateClient.addAsset({
        estateId: 'test-estate',
        name: vars.name,
        type: vars.type,
        value: vars.value
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
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
          <h2 className="text-2xl font-bold text-navy">Asset Inventory</h2>
          <p className="text-sm text-text-muted">Track and designate your global holdings.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-gold text-black px-6 py-2.5 rounded-xl font-bold text-[0.7rem] uppercase tracking-widest hover:scale-105 transition-transform"
        >
          + Add Asset
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-border-light overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-navy/5 text-[0.65rem] uppercase tracking-widest font-bold text-navy">
              <th className="px-8 py-5">Asset Name</th>
              <th className="px-8 py-5">Type</th>
              <th className="px-8 py-5">Valuation</th>
              <th className="px-8 py-5 text-center">Status</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-text-secondary">
            {assets.map((a, i) => (
              <tr key={i} className="border-t border-border-light hover:bg-royal-subtle transition-colors group">
                <td className="px-8 py-5 font-semibold text-navy">{a.name}</td>
                <td className="px-8 py-5 font-mono text-[0.8rem] text-text-muted">{a.type}</td>
                <td className="px-8 py-5 font-bold text-navy">{a.value}</td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase font-bold ${a.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-gold-dim text-gold'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="text-royal font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:underline transition-opacity">Edit</button>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-text-muted italic">No assets registered in this estate protocol.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-border-light shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-navy mb-2 uppercase tracking-wide">Add New Asset</h3>
            <p className="text-sm text-text-muted mb-6">Enter details for the new holding in your estate.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addAssetMutation.mutate({ 
                name: formData.get('name') as string, 
                type: formData.get('type') as string,
                value: formData.get('value') as string
              });
            }} className="space-y-4">
              <div>
                <label className="text-[0.65rem] font-bold text-navy uppercase tracking-widest mb-1.5 block">Asset Name</label>
                <input name="name" required className="w-full px-4 py-3 rounded-xl border border-border-light focus:border-royal focus:ring-1 focus:ring-royal outline-none" placeholder="e.g. Chase Savings" />
              </div>
              <div>
                <label className="text-[0.65rem] font-bold text-navy uppercase tracking-widest mb-1.5 block">Asset Type</label>
                <select name="type" required className="w-full px-4 py-3 rounded-xl border border-border-light focus:border-royal focus:ring-1 focus:ring-royal outline-none">
                  <option value="Real Estate">Real Estate</option>
                  <option value="Cash">Cash / Savings</option>
                  <option value="Securities">Securities / Stocks</option>
                  <option value="Personal Property">Personal Property</option>
                  <option value="Digital Assets">Digital Assets</option>
                </select>
              </div>
              <div>
                <label className="text-[0.65rem] font-bold text-navy uppercase tracking-widest mb-1.5 block">Estimated Valuation</label>
                <input name="value" required className="w-full px-4 py-3 rounded-xl border border-border-light focus:border-royal focus:ring-1 focus:ring-royal outline-none" placeholder="e.g. $100,000" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 rounded-xl border border-border-light font-bold text-text-secondary text-sm hover:bg-gray-50 uppercase tracking-widest transition-colors">Cancel</button>
                <button type="submit" disabled={addAssetMutation.isPending} className="flex-1 py-3 rounded-xl bg-royal text-white font-bold text-sm hover:bg-navy uppercase tracking-widest transition-colors">
                  {addAssetMutation.isPending ? 'Adding...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
