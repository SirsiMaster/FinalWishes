/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { useEstateAssets, type Asset } from '../lib/firestore'
import { addAsset as addAssetAction } from '../lib/estate-actions'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

export const Route = createFileRoute('/estates/$estateId/assets')({
  component: AssetsPage,
})

function AssetsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/assets' });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const estateId = useMemo(() => routeId === 'lockhart' ? 'estate_lockhart' : routeId, [routeId]);

  const { data: assets, loading: isLoading } = useEstateAssets(estateId);

  const handleAddAsset = async (vars: { name: string, type: string, value: string }) => {
    setSaving(true);
    await addAssetAction({
      estateId,
      name: vars.name,
      category: vars.type as Asset['category'],
      estimatedValue: parseFloat(vars.value.replace(/[^0-9.]/g, '')) || 0,
    });
    setSaving(false);
    setModalOpen(false);
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-50 pb-8 md:pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Estate Asset Ledger</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">My Assets</h2>
          <p className="text-[#64748B] text-base md:text-lg font-medium max-w-2xl leading-relaxed">
            A complete inventory of everything you own and want to pass on to your beneficiaries.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-6 py-3 md:px-10 md:py-5 rounded-2xl font-bold text-[13px] md:text-[14px] transition-all shadow-[0_20px_50px_rgba(19,51,120,0.1)] flex items-center gap-3 w-full md:w-auto justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Asset
        </button>
      </div>

      {/* ── Asset Table ── */}
      <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] text-[11px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100">
                <th className="px-10 py-6">Asset Name</th>
                <th className="px-10 py-6">Category</th>
                <th className="px-10 py-6">Estimated Value</th>
                <th className="px-10 py-6 text-center">Status</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[14px] font-medium text-[#334155]">
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-all group">
                  <td className="px-10 py-7 font-bold text-[#0F172A] text-[15px]">{a.name}</td>
                  <td className="px-10 py-7">
                    <span className="px-4 py-1.5 bg-[#F1F5F9] text-[#334155] font-bold text-[11px] uppercase tracking-widest rounded-lg border border-slate-100">
                      {a.category}
                    </span>
                  </td>
                  <td className="px-10 py-7 font-bold text-[#0F172A] text-lg tabular-nums">{a.estimatedValue ? `$${a.estimatedValue.toLocaleString()}` : '—'}</td>
                  <td className="px-10 py-7 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${a.status === 'active' ? 'bg-green-500' : 'bg-[#133378] animate-pulse'}`} />
                       <span className={`text-[11px] uppercase font-bold tracking-widest ${a.status === 'active' ? 'text-green-600' : 'text-[#133378]'}`}>
                         {a.status}
                       </span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button className="text-[#133378] font-bold text-[12px] bg-[#F8FAFC] hover:bg-[#133378] hover:text-white px-5 py-2.5 rounded-xl border border-slate-100 transition-all">View Details</button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center text-slate-300 font-medium text-sm">No assets have been added to this estate yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Asset Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl md:rounded-[3rem] p-6 md:p-16 max-w-xl w-full border border-slate-100 shadow-2xl animate-in zoom-in duration-500 relative">
            <h3 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-3 tracking-tight">Add New Asset</h3>
            <p className="text-slate-500 font-medium text-sm mb-12">Enter the details for a new asset entry in your estate ledger.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddAsset({ 
                name: formData.get('name') as string, 
                type: formData.get('type') as string,
                value: formData.get('value') as string
              });
            }} className="space-y-10">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Asset Name</label>
                <input name="name" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-slate-300 text-lg" placeholder="e.g. Chase Savings Account" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Asset Category</label>
                <select name="type" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] appearance-none text-lg transition-all">
                  <option value="Real Estate">Real Estate</option>
                  <option value="Cash">Cash / Savings</option>
                  <option value="Securities">Securities / Stocks</option>
                  <option value="Personal Property">Personal Property</option>
                  <option value="Digital Assets">Digital Assets</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Estimated Value</label>
                <input name="value" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-slate-300 text-lg" placeholder="e.g. $125,000" />
              </div>
              <div className="flex gap-6 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-slate-100 font-bold text-slate-400 text-sm hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-5 rounded-2xl bg-[#133378] text-white font-bold text-sm transition-all hover:bg-[#1E3A5F] shadow-xl disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
