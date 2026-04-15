/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useEstateAssets, type Asset } from '../lib/firestore'
import { addAsset as addAssetAction, updateAsset, archiveAsset } from '../lib/estate-actions'

import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Separator } from '../components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/ui/select'

export const Route = createFileRoute('/estates/$estateId/assets')({
  component: AssetsPage,
})

function AssetsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/assets' });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const estateId = routeId;

  const { data: assets, loading: isLoading } = useEstateAssets(estateId);

  // Controlled state for shadcn Select (not compatible with FormData)
  const [assetCategory, setAssetCategory] = useState('Real Estate');

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

  const handleUpdateAsset = async (data: { name: string; category: string; estimatedValue: string; description: string }) => {
    if (!editingAsset) return;
    setEditSaving(true);
    await updateAsset(estateId, editingAsset.id, {
      name: data.name,
      category: data.category,
      estimatedValue: parseFloat(data.estimatedValue.replace(/[^0-9.]/g, '')) || 0,
      description: data.description,
    });
    setEditSaving(false);
    setEditingAsset(null);
    setConfirmArchive(false);
  };

  const handleArchiveAsset = async () => {
    if (!editingAsset) return;
    setEditSaving(true);
    await archiveAsset(estateId, editingAsset.id);
    setEditSaving(false);
    setEditingAsset(null);
    setConfirmArchive(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* -- Page Header -- */}
      <div className="flex justify-between items-end pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Estate Asset Ledger</span>
          </div>
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">My Assets</h2>
          <p className="text-[#64748B] text-lg font-medium max-w-2xl leading-relaxed">
            A complete inventory of everything you own and want to pass on to your beneficiaries.
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 rounded-2xl font-bold text-[14px] shadow-[0_20px_50px_rgba(19,51,120,0.1)] h-auto gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Asset
        </Button>
        <Separator className="absolute bottom-0 left-0 right-0 bg-slate-50" />
      </div>

      {/* -- Asset Table -- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC] border-b border-slate-100 hover:bg-[#F8FAFC]">
              <TableHead className="px-10 py-6 text-[11px] uppercase tracking-widest font-bold text-slate-400">Asset Name</TableHead>
              <TableHead className="px-10 py-6 text-[11px] uppercase tracking-widest font-bold text-slate-400">Category</TableHead>
              <TableHead className="px-10 py-6 text-[11px] uppercase tracking-widest font-bold text-slate-400">Estimated Value</TableHead>
              <TableHead className="px-10 py-6 text-[11px] uppercase tracking-widest font-bold text-slate-400 text-center">Status</TableHead>
              <TableHead className="px-10 py-6 text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-[14px] font-medium text-[#334155]">
            {assets.map((a) => (
              <TableRow key={a.id} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-all group">
                <TableCell className="px-10 py-7 font-bold text-[#0F172A] text-[15px]">{a.name}</TableCell>
                <TableCell className="px-10 py-7">
                  <Badge variant="secondary" className="px-4 py-1.5 bg-[#F1F5F9] text-[#334155] font-bold text-[11px] uppercase tracking-widest rounded-lg border border-slate-100">
                    {a.category}
                  </Badge>
                </TableCell>
                <TableCell className="px-10 py-7 font-bold text-[#0F172A] text-lg tabular-nums">{a.estimatedValue ? `$${a.estimatedValue.toLocaleString()}` : '---'}</TableCell>
                <TableCell className="px-10 py-7 text-center">
                  <Badge
                    variant={a.status === 'active' ? 'default' : 'secondary'}
                    className={`gap-2 px-3 py-1 h-auto ${
                      a.status === 'active'
                        ? 'bg-green-50 text-green-600 border-green-200'
                        : 'bg-[#133378]/5 text-[#133378] border-[#133378]/20'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${a.status === 'active' ? 'bg-green-500' : 'bg-[#133378] animate-pulse'}`} />
                    <span className="text-[11px] uppercase font-bold tracking-widest">
                      {a.status}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell className="px-10 py-7 text-right">
                  <Button variant="outline" onClick={() => setEditingAsset(a)} className="text-[#133378] font-bold text-[12px] bg-[#F8FAFC] hover:bg-[#133378] hover:text-white px-5 py-2.5 rounded-xl border border-slate-100 h-auto">
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {assets.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-10 py-32 text-center text-slate-300 font-medium text-sm">No assets have been added to this estate yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* -- Add Asset Dialog -- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white rounded-[3rem] p-16 max-w-xl border border-slate-100 shadow-2xl">
          <DialogHeader className="space-y-3 mb-12">
            <DialogTitle className="text-3xl font-bold text-[#0F172A] tracking-tight">Add New Asset</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              Enter the details for a new asset entry in your estate ledger.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddAsset({
              name: formData.get('name') as string,
              type: assetCategory,
              value: formData.get('value') as string
            });
          }} className="space-y-10">
            <div className="space-y-3">
              <Label htmlFor="asset-name" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Asset Name</Label>
              <Input
                id="asset-name"
                name="name"
                required
                className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] placeholder:text-slate-300 text-lg h-auto"
                placeholder="e.g. Chase Savings Account"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Asset Category</Label>
              <Select value={assetCategory} onValueChange={setAssetCategory}>
                <SelectTrigger className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] font-bold text-[#0F172A] text-lg h-auto">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Cash">Cash / Savings</SelectItem>
                  <SelectItem value="Securities">Securities / Stocks</SelectItem>
                  <SelectItem value="Personal Property">Personal Property</SelectItem>
                  <SelectItem value="Digital Assets">Digital Assets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label htmlFor="asset-value" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Estimated Value</Label>
              <Input
                id="asset-value"
                name="value"
                required
                className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] placeholder:text-slate-300 text-lg h-auto"
                placeholder="e.g. $125,000"
              />
            </div>
            <DialogFooter className="flex gap-6 pt-4 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-5 rounded-2xl border border-slate-100 font-bold text-slate-400 text-sm hover:bg-slate-50 h-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 py-5 rounded-2xl bg-[#133378] text-white font-bold text-sm hover:bg-[#1E3A5F] shadow-xl h-auto"
              >
                {saving ? 'Saving...' : 'Add to Ledger'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -- Edit Asset Dialog -- */}
      <Dialog open={editingAsset !== null} onOpenChange={(open) => { if (!open) { setEditingAsset(null); setConfirmArchive(false); } }}>
        <DialogContent className="bg-white rounded-[3rem] p-16 max-w-xl border border-slate-100 shadow-2xl">
          <DialogHeader className="space-y-3 mb-12">
            <DialogTitle className="text-3xl font-bold text-[#0F172A] tracking-tight font-[family-name:var(--font-cinzel)]">Edit Asset</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              Update the details for this asset or archive it from your estate ledger.
            </DialogDescription>
          </DialogHeader>
          {editingAsset && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateAsset({
                name: formData.get('edit-name') as string,
                category: formData.get('edit-category') as string,
                estimatedValue: formData.get('edit-value') as string,
                description: formData.get('edit-description') as string,
              });
            }} className="space-y-10">
              <div className="space-y-3">
                <Label htmlFor="edit-asset-name" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Asset Name</Label>
                <Input
                  id="edit-asset-name"
                  name="edit-name"
                  required
                  defaultValue={editingAsset.name}
                  className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] placeholder:text-slate-300 text-lg h-auto"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-asset-category" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Asset Category</Label>
                <select
                  id="edit-asset-category"
                  name="edit-category"
                  defaultValue={editingAsset.category}
                  className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] font-bold text-[#0F172A] text-lg h-auto appearance-none"
                >
                  <option value="Real Estate">Real Estate</option>
                  <option value="Cash">Cash / Savings</option>
                  <option value="Securities">Securities / Stocks</option>
                  <option value="Personal Property">Personal Property</option>
                  <option value="Digital Assets">Digital Assets</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-asset-value" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Estimated Value</Label>
                <Input
                  id="edit-asset-value"
                  name="edit-value"
                  required
                  defaultValue={editingAsset.estimatedValue ? `$${editingAsset.estimatedValue.toLocaleString()}` : ''}
                  className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] placeholder:text-slate-300 text-lg h-auto"
                  placeholder="e.g. $125,000"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-asset-description" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Description</Label>
                <Textarea
                  id="edit-asset-description"
                  name="edit-description"
                  defaultValue={editingAsset.description || ''}
                  rows={3}
                  className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] placeholder:text-slate-300 text-base resize-none"
                  placeholder="Optional notes about this asset"
                />
              </div>
              <DialogFooter className="flex gap-4 pt-4 sm:flex-row">
                {!confirmArchive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmArchive(true)}
                    className="py-5 rounded-2xl border border-red-100 font-bold text-red-500 text-sm hover:bg-red-50 h-auto px-6"
                  >
                    Archive
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleArchiveAsset}
                    disabled={editSaving}
                    className="py-5 rounded-2xl border border-red-300 font-bold text-white text-sm bg-red-500 hover:bg-red-600 h-auto px-6"
                  >
                    {editSaving ? 'Archiving...' : 'Confirm Archive'}
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setEditingAsset(null); setConfirmArchive(false); }}
                  className="py-5 rounded-2xl border border-slate-100 font-bold text-slate-400 text-sm hover:bg-slate-50 h-auto px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSaving}
                  className="py-5 rounded-2xl bg-[#133378] text-white font-bold text-sm hover:bg-[#1E3A5F] shadow-xl h-auto px-10"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
