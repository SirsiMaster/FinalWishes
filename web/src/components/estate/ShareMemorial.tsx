/**
 * ShareMemorial — QR Code + Link Sharing for Public Memorial Pages
 *
 * Creates a public_memorials document in Firestore (denormalized snapshot)
 * and generates a shareable link + QR code.
 *
 * Used from the obituary page or estate settings.
 *
 * @version 1.0.0
 */

import { useState, useCallback, useRef } from 'react'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth'
import { QRCodeSVG } from 'qrcode.react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Copy, Check, Download } from 'lucide-react'

interface ShareMemorialProps {
  estateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  personName: string
  obituaryContent?: string
  profilePhotoUrl?: string
  birthDate?: string
  deathDate?: string
  serviceDetails?: {
    type?: string
    date?: string
    time?: string
    location?: string
    address?: string
    notes?: string
  }
}

export function ShareMemorial({
  estateId,
  open,
  onOpenChange,
  personName,
  obituaryContent,
  profilePhotoUrl,
  birthDate,
  deathDate,
  serviceDetails,
}: ShareMemorialProps) {
  const { user } = useAuth()
  const [publishing, setPublishing] = useState(false)
  const [memorialUrl, setMemorialUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const publish = useCallback(async () => {
    if (!user) return
    setPublishing(true)

    try {
      // Use estateId as the memorial ID for simplicity (one memorial per estate)
      const memorialId = estateId
      const memorialRef = doc(db, 'public_memorials', memorialId)

      // Check if already published
      const existing = await getDoc(memorialRef)
      const isUpdate = existing.exists()

      await setDoc(memorialRef, {
        estateId,
        personName,
        obituaryContent: obituaryContent || '',
        profilePhotoUrl: profilePhotoUrl || null,
        birthDate: birthDate || null,
        deathDate: deathDate || null,
        serviceDetails: serviceDetails || null,
        publishedBy: user.uid,
        ...(isUpdate ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
      })

      const url = `${window.location.origin}/memorial/${memorialId}`
      setMemorialUrl(url)
      toast.success(isUpdate ? 'Memorial updated' : 'Memorial published', {
        description: 'Anyone with the link can view it.',
      })
    } catch (err) {
      console.error('[ShareMemorial] Error:', err)
      toast.error('Failed to publish memorial')
    } finally {
      setPublishing(false)
    }
  }, [user, estateId, personName, obituaryContent, profilePhotoUrl, birthDate, deathDate, serviceDetails])

  const copyLink = useCallback(async () => {
    if (!memorialUrl) return
    await navigator.clipboard.writeText(memorialUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied to clipboard')
  }, [memorialUrl])

  const downloadQR = useCallback(() => {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = 512
      canvas.height = 512
      ctx?.drawImage(img, 0, 0, 512, 512)
      const a = document.createElement('a')
      a.download = `memorial-${personName.replace(/[^a-zA-Z0-9]/g, '-')}-qr.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
  }, [personName])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-8" showCloseButton={false}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900">
            Share Memorial
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Create a public memorial page that anyone can view without an account.
          </DialogDescription>
        </DialogHeader>

        {!memorialUrl ? (
          /* Pre-publish state */
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed">
                This will create a public page for <span className="font-semibold">{personName}</span> with
                the obituary{serviceDetails ? ', service details,' : ''} and memorial information.
                Anyone with the link can view it.
              </p>
            </div>

            <DialogFooter className="flex-row justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="px-6 py-3 h-auto rounded-xl text-[13px] font-bold text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={publish}
                disabled={publishing}
                className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-8 py-3 h-auto rounded-xl font-bold text-[13px]"
              >
                {publishing ? 'Publishing...' : 'Publish Memorial'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Post-publish state — show link + QR */
          <div className="space-y-6">
            {/* Link */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
                Memorial Link
              </label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={memorialUrl}
                  className="h-auto px-4 py-3 rounded-xl border-slate-200 text-[13px] text-slate-900 bg-slate-50"
                />
                <Button
                  variant="secondary"
                  onClick={copyLink}
                  className="px-4 py-3 h-auto rounded-xl bg-slate-100 hover:bg-slate-200"
                >
                  {copied ? <Check className="w-4 h-4 text-[#059669]" /> : <Copy className="w-4 h-4 text-slate-500" />}
                </Button>
              </div>
            </div>

            {/* QR Code */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
                QR Code
              </label>
              <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl border border-slate-100">
                <div ref={qrRef}>
                  <QRCodeSVG
                    value={memorialUrl}
                    size={180}
                    level="M"
                    fgColor="#133378"
                    bgColor="transparent"
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={downloadQR}
                  className="text-[12px] font-bold text-slate-500 hover:text-[var(--royal)] rounded-xl"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download QR Code
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white py-3 h-auto rounded-xl font-bold text-[13px]"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
