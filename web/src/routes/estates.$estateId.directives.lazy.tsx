/* eslint-disable react-refresh/only-export-components */
import { createLazyFileRoute, useParams, Link } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useDirectives, useEstateHeirs, type Directive } from '../lib/firestore'
import { useAuth } from '../lib/auth'
import { addDirective, updateDirective } from '../lib/estate-actions'
import { API_BASE } from '../lib/client'
import { toast } from 'sonner'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Plus,
  FileText,
  Heart,
  MessageSquare,
  HandHeart,
  ChevronLeft,
  Download,
  Lock,
  Pencil,
  Eye,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Undo2,
  Redo2,
  Check,
  Loader2,
  AlertCircle,
  PenTool,
  Users,
  Globe,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SectionHeader } from '@/components/estate/SectionHeader'
import { SectionEmptyState } from '@/components/estate/SectionEmptyState'
import { ShepherdNudge, useShepherdNudge } from '@/components/estate/ShepherdNudge'
import {
  getAdvanceDirectives,
  updateAdvanceDirectiveStatus,
  type AdvanceDirectiveType,
  type AdvanceDirectiveStatus,
} from '@/lib/probate'

export const Route = createLazyFileRoute('/estates/$estateId/directives')({
  component: DirectivesPage,
})

// ─── Type Config ──────────────────────────────────────────────────────────

// Directive-type accent collapsed to a single restrained gold (#C8A951 = var(--gold)).
// Kept as a hex literal because consumers build alpha tints via `${color}10`.
const DIRECTIVE_ACCENT = '#C8A951'
const DIRECTIVE_TYPES = [
  { value: 'ethical_will' as const, label: 'Ethical Will', description: 'Values, lessons, and wisdom for your family', icon: Heart, color: DIRECTIVE_ACCENT },
  { value: 'funeral_preferences' as const, label: 'Funeral Preferences', description: 'Ceremony, burial, and memorial wishes', icon: FileText, color: DIRECTIVE_ACCENT },
  { value: 'final_message' as const, label: 'Final Message', description: 'A personal letter to someone you love', icon: MessageSquare, color: DIRECTIVE_ACCENT },
  { value: 'care_instructions' as const, label: 'Care Instructions', description: 'Guidance for dependents, pets, or property', icon: HandHeart, color: DIRECTIVE_ACCENT },
] as const

type DirectiveType = (typeof DIRECTIVE_TYPES)[number]['value']

// ─── Structured Templates ────────────────────────────────────────────────
const DIRECTIVE_TEMPLATES: Record<DirectiveType, string> = {
  ethical_will: [
    '<h2>Values I Want to Pass On</h2>',
    '<p class="directive-guidance">What principles, beliefs, or values have guided your life? What do you hope your family carries forward?</p>',
    '<h2>Life Lessons Learned</h2>',
    '<p class="directive-guidance">What wisdom would you share from your experiences? What do you wish someone had told you earlier?</p>',
    '<h2>Hopes for My Family</h2>',
    '<p class="directive-guidance">What are your wishes for your children, grandchildren, or loved ones? What kind of life do you hope they lead?</p>',
    '<h2>Gratitude and Acknowledgments</h2>',
    '<p class="directive-guidance">Who has made a difference in your life? What are you most grateful for?</p>',
  ].join(''),

  funeral_preferences: [
    '<h2>Type of Service</h2>',
    '<p class="directive-guidance">Do you prefer burial or cremation? A religious service, celebration of life, or private ceremony?</p>',
    '<h2>Service Details</h2>',
    '<p class="directive-guidance">Where would you like the service held? Any specific readings, hymns, or music? Who should officiate?</p>',
    '<h2>Special Requests</h2>',
    '<p class="directive-guidance">Any traditions, dress code preferences, or specific wishes for the service?</p>',
    '<h2>Organ &amp; Tissue Donation</h2>',
    '<p class="directive-guidance">Have you registered as an organ donor? Any specific wishes regarding donation?</p>',
    '<h2>Final Resting Place</h2>',
    '<p class="directive-guidance">Do you have a preferred cemetery, columbarium, or location for scattering?</p>',
  ].join(''),

  final_message: [
    '<h2>To My Spouse / Partner</h2>',
    '<p class="directive-guidance">What would you want to say to the person closest to you?</p>',
    '<h2>To My Children</h2>',
    '<p class="directive-guidance">What do you want each of your children to know?</p>',
    '<h2>To My Friends</h2>',
    '<p class="directive-guidance">Who deserves a personal word? What would you tell them?</p>',
    '<h2>Final Thoughts</h2>',
    '<p class="directive-guidance">Is there anything else you want the world to know?</p>',
  ].join(''),

  care_instructions: [
    '<h2>Pet Care Arrangements</h2>',
    '<p class="directive-guidance">Who should care for your pets? Any specific instructions for their care, vet information, or dietary needs?</p>',
    '<h2>Subscriptions &amp; Memberships to Cancel</h2>',
    '<p class="directive-guidance">List ongoing subscriptions, memberships, and services that should be cancelled or transferred.</p>',
    '<h2>Digital Account Instructions</h2>',
    '<p class="directive-guidance">Social media accounts, email, cloud storage — what should happen to each? Who has access?</p>',
    '<h2>Home &amp; Property Maintenance</h2>',
    '<p class="directive-guidance">Any ongoing maintenance, service contracts, or important information about your property?</p>',
  ].join(''),
}

function getTypeConfig(value: string) {
  return DIRECTIVE_TYPES.find((t) => t.value === value) || DIRECTIVE_TYPES[0]
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function DirectivesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/directives' })
  const estateId = routeId

  const { data: directives, loading } = useDirectives(estateId)
  const { user } = useAuth()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // ── Signing status polling ──
  // When a directive has a signingEnvelopeId but no signedAt, poll the server
  // for webhook-verified completion instead of trusting client-side redirects.
  useEffect(() => {
    if (loading || directives.length === 0) return

    // Clean any legacy ?signed=true params from URL
    const params = new URLSearchParams(window.location.search)
    if (params.has('signed') || params.has('envelopeId')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('signed')
      url.searchParams.delete('envelopeId')
      window.history.replaceState({}, '', url.pathname)
    }

    // Find directives pending signing verification
    const pending = directives.filter((d) => d.signingEnvelopeId && !d.signedAt)
    if (pending.length === 0) return

    let cancelled = false
    const pollInterval = setInterval(async () => {
      if (cancelled) return
      for (const d of pending) {
        try {
          if (!user) continue
          const token = await user.getIdToken()
          const res = await fetch(
            `${API_BASE}/api/v1/opensign/status?envelopeId=${d.signingEnvelopeId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (!res.ok) continue
          const data = await res.json()
          if (data.verified && data.status === 'completed') {
            toast.success('Document signed and verified', {
              description: 'Signature confirmed by the signing service.'
            })
            clearInterval(pollInterval)
          }
        } catch {
          // Silent retry on next interval
        }
      }
    }, 5000) // Poll every 5 seconds

    return () => {
      cancelled = true
      clearInterval(pollInterval)
    }
  }, [loading, directives, user])

  // Shepherd inline nudge
  const noDirectivesNudge = useShepherdNudge(
    estateId,
    'directives-no-entries',
    !loading && directives.length === 0,
  )

  const editingDirective = useMemo(
    () => directives.find((d) => d.id === editingId) || null,
    [directives, editingId]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal" />
      </div>
    )
  }

  // ── Editor View ──
  if (editingDirective) {
    return (
      <DirectiveEditor
        directive={editingDirective}
        estateId={estateId}
        onBack={() => setEditingId(null)}
      />
    )
  }

  // ── List View ──
  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      <SectionHeader
        section="letters"
        title="Final Directives"
        subtitle="Ethical wills, funeral wishes, personal messages, and care instructions for the people you love."
        action={
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-10 py-5 h-auto rounded-2xl font-bold text-[14px] shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Directive
          </Button>
        }
      />

      {/* Shepherd Inline Nudge */}
      {noDirectivesNudge.visible && (
        <ShepherdNudge
          message="Start with what feels easiest. Many people begin with funeral preferences."
          ctaLabel="Create a directive"
          onDismiss={noDirectivesNudge.dismiss}
        />
      )}

      {/* ── Illinois Legal Advance Directives ── */}
      <IllinoisAdvanceDirectivesSection estateId={estateId} />

      {/* ── Statutory Form Generator ── */}
      <Link to="/estates/$estateId/forms" params={{ estateId }} className="block no-underline">
        <Card className="border-[var(--gold)]/40 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-[var(--royal)] text-lg">Generate statutory forms</h3>
              <p className="text-sm text-[var(--royal)]/70 mt-1">
                Pre-fill official Illinois forms — Power of Attorney (Property &amp; Health Care),
                Living Will, Small Estate Affidavit, Mental Health Declaration — print-ready for
                hand-signing.
              </p>
            </div>
            <FileText className="w-7 h-7 text-[var(--gold)] shrink-0" />
          </CardContent>
        </Card>
      </Link>

      {/* ── Personal Directives Cards ── */}
      {directives.length === 0 ? (
        <SectionEmptyState
          section="letters"
          heading="No directives yet"
          message="Create your first ethical will, funeral preference, or personal message."
          ctaLabel="Create First Directive"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {directives.map((d) => {
            const cfg = getTypeConfig(d.type)
            const Icon = cfg.icon
            return (
              <Card
                key={d.id}
                className="cursor-pointer rounded-3xl border-slate-100 p-0 hover:border-[var(--royal)]/20 hover:shadow-lg transition-all group"
                onClick={() => setEditingId(d.id)}
              >
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${cfg.color}10` }}>
                        <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-[var(--royal)] transition-colors">{d.title}</h3>
                        <p className="text-[12px] text-slate-500 font-medium">{cfg.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.status === 'finalized' && d.signedAt && (
                        <Badge variant="secondary" className="px-2.5 py-1 h-auto text-[10px] font-bold uppercase tracking-widest rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                          Signed
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={`px-3 py-1.5 h-auto text-[10px] font-bold uppercase tracking-widest rounded-lg ${d.status === 'finalized' ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}
                      >
                        {d.status === 'finalized' ? 'Finalized' : 'Draft'}
                      </Badge>
                    </div>
                  </div>
                  {d.recipientName && (
                    <p className="text-[13px] text-slate-700 mb-3">
                      <span className="text-slate-500">To:</span> {d.recipientName}
                      {d.recipientRelationship && <span className="text-slate-500"> ({d.recipientRelationship})</span>}
                    </p>
                  )}
                  {d.content && (
                    <p className="text-[13px] text-slate-500 line-clamp-3">
                      {d.content.replace(/<[^>]*>/g, '').slice(0, 200)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <CreateDirectiveModal
        estateId={estateId}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={(id) => { setCreateModalOpen(false); setEditingId(id); }}
      />
    </div>
  )
}

// ─── Create Modal ──────────────────────────────────────────────────────────

function CreateDirectiveModal({ estateId, open, onOpenChange, onCreated }: { estateId: string; open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: string) => void }) {
  const [saving, setSaving] = useState(false)
  const [selectedType, setSelectedType] = useState<DirectiveType>('ethical_will')
  const [title, setTitle] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientRelationship, setRecipientRelationship] = useState('')

  const needsRecipient = selectedType === 'final_message'

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return
    setSaving(true)
    const result = await addDirective({
      estateId,
      type: selectedType,
      title: title.trim(),
      content: DIRECTIVE_TEMPLATES[selectedType],
      recipientName: needsRecipient ? recipientName.trim() : undefined,
      recipientRelationship: needsRecipient ? recipientRelationship.trim() : undefined,
    })
    setSaving(false)
    if (result.success && result.id) {
      onCreated(result.id)
    }
  }, [estateId, selectedType, title, recipientName, recipientRelationship, needsRecipient, onCreated])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-10" showCloseButton={false}>
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900">
            Create Directive
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new directive for your estate plan
          </DialogDescription>
        </DialogHeader>

        {/* Type Selection */}
        <div className="space-y-3 mb-8">
          <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest mb-3">Directive Type</Label>
          {DIRECTIVE_TYPES.map((t) => {
            const Icon = t.icon
            return (
              <Card
                key={t.value}
                className={`cursor-pointer p-0 rounded-2xl border-2 transition-all ${selectedType === t.value ? 'border-[var(--royal)] bg-[var(--royal)]/5' : 'border-slate-100 hover:border-slate-200'}`}
                onClick={() => setSelectedType(t.value)}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${t.color}10` }}>
                    <Icon className="w-4 h-4" style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900">{t.label}</p>
                    <p className="text-[12px] text-slate-500">{t.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Title */}
        <div className="mb-6 space-y-2">
          <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this directive a meaningful title..."
            className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px] text-slate-900 focus-visible:border-[var(--royal)] focus-visible:ring-[var(--royal)]/50"
          />
        </div>

        {/* Recipient (for final messages) */}
        {needsRecipient && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Recipient Name</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Who is this for?"
                className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px] text-slate-900 focus-visible:border-[var(--royal)] focus-visible:ring-[var(--royal)]/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Relationship</Label>
              <Input
                value={recipientRelationship}
                onChange={(e) => setRecipientRelationship(e.target.value)}
                placeholder="e.g., Son, Daughter, Friend"
                className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px] text-slate-900 focus-visible:border-[var(--royal)] focus-visible:ring-[var(--royal)]/50"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-end gap-4 mt-8 pt-8 border-t border-slate-100 rounded-b-3xl bg-transparent -mx-10 -mb-10 px-10 pb-10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="px-8 py-4 h-auto rounded-2xl text-[14px] font-bold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !title.trim()}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] disabled:opacity-50 text-white px-10 py-4 h-auto rounded-2xl font-bold text-[14px]"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Pencil className="w-4 h-4" />}
            {saving ? 'Creating...' : 'Create & Edit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Directive Editor ──────────────────────────────────────────────────────

function DirectiveEditor({ directive, estateId, onBack }: { directive: Directive; estateId: string; onBack: () => void }) {
  const { user, profile } = useAuth()
  const { data: heirs } = useEstateHeirs(estateId)
  const cfg = getTypeConfig(directive.type)
  const Icon = cfg.icon
  const [mode, setMode] = useState<'edit' | 'view'>(directive.status === 'finalized' ? 'view' : 'edit')
  const [saving, setSaving] = useState(false)
  const [visibleTo, setVisibleTo] = useState<string[]>(directive.visibleTo || [])
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save: debounced 1.5s after last keystroke
  const doAutoSave = useCallback(async (html: string) => {
    if (directive.status === 'finalized') return
    setAutoSaveStatus('saving')
    const result = await updateDirective(estateId, directive.id, { content: html })
    if (!result.success) {
      // Only toast on the transition into error so a sustained outage doesn't
      // fire a toast on every debounced auto-save tick.
      setAutoSaveStatus((prev) => {
        if (prev !== 'error') {
          toast.error('Auto-save failed', { description: result.error || 'Your latest edits are not saved yet.' })
        }
        return 'error'
      })
      return
    }
    setAutoSaveStatus('saved')
    if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current)
    savedIndicatorTimer.current = setTimeout(() => setAutoSaveStatus('idle'), 2000)
  }, [estateId, directive.id, directive.status])

  const scheduleAutoSave = useCallback((html: string) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doAutoSave(html), 1500)
  }, [doAutoSave])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current)
    }
  }, [])

  const editor = useEditor({
    extensions: [StarterKit],
    content: directive.content || '<p>Begin writing your directive here...</p>',
    editable: mode === 'edit' && directive.status !== 'finalized',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none min-h-[400px] focus:outline-none p-8 text-slate-900',
      },
    },
    onUpdate: ({ editor: ed }) => {
      scheduleAutoSave(ed.getHTML())
    },
  })

  const handleSave = useCallback(async () => {
    if (!editor) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setSaving(true)
    const result = await updateDirective(estateId, directive.id, { content: editor.getHTML() })
    setSaving(false)
    if (!result.success) {
      setAutoSaveStatus('error')
      toast.error('Could not save draft', { description: result.error || 'Please try again.' })
      return
    }
    setAutoSaveStatus('saved')
    if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current)
    savedIndicatorTimer.current = setTimeout(() => setAutoSaveStatus('idle'), 2000)
    toast.success('Draft saved')
  }, [editor, estateId, directive.id])

  const handleFinalize = useCallback(async () => {
    if (!editor) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setSaving(true)
    const result = await updateDirective(estateId, directive.id, { content: editor.getHTML(), status: 'finalized' })
    setSaving(false)
    if (!result.success) {
      toast.error('Could not finalize directive', { description: result.error || 'Please try again.' })
      return
    }
    setMode('view')
    toast.success('Directive finalized', { description: 'This document is now locked and ready for signing.' })
  }, [editor, estateId, directive.id])

  const [signingLoading, setSigningLoading] = useState(false)
  // Set when the signing provider is not yet provisioned (API returns 503). We keep
  // the directive fully usable (it can still be exported / printed for wet-ink
  // signing) but replace the call-to-action with a calm "unavailable" notice instead
  // of letting the owner re-trigger a guaranteed error toast.
  const [signingUnavailable, setSigningUnavailable] = useState(false)
  const isSigned = !!directive.signedAt

  const handleSign = useCallback(async () => {
    if (!user || !profile) return
    setSigningLoading(true)
    try {
      const token = await user.getIdToken()
      const redirectUrl = `${window.location.origin}/estates/${estateId}/directives`
      const res = await fetch(`${API_BASE}/api/v1/opensign/create-envelope`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // estateId + directiveId bind the ceremony server-side (the API verifies
          // estate-write access and records the envelope→directive mapping so the
          // webhook stamps the verified result onto THIS directive only).
          estateId,
          directiveId: directive.id,
          templateId: `directive-${directive.type}`,
          signerName: profile.displayName || profile.firstName || 'Estate Owner',
          signerEmail: profile.email || user.email || '',
          redirectUrl,
        }),
      })

      // A 503 means no signing provider credential is configured yet (Sirsi Sign or
      // the dissociated fallback). Surface a steady "not available yet" state and stop
      // offering the action rather than treating it as a transient failure.
      if (res.status === 503) {
        setSigningUnavailable(true)
        toast.info('Electronic signing isn’t available yet', {
          description: 'You can export this directive and sign it by hand. Electronic signing will be enabled soon.',
        })
        return
      }

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Server error (${res.status})`)
      }

      const data = await res.json()
      if (data.signingUrl) {
        // Record that signing was initiated
        await updateDirective(estateId, directive.id, {
          signingEnvelopeId: data.envelopeId,
          signingInitiatedAt: new Date().toISOString(),
        })
        // Open signing ceremony in new tab
        window.open(data.signingUrl, '_blank', 'noopener')
        toast.success('Signing ceremony opened', { description: 'Complete the signing in the new tab.' })
      } else {
        toast.error('Signing unavailable', { description: 'The signing service did not return a signing URL.' })
      }
    } catch (err) {
      console.error('[handleSign] Error:', err)
      toast.error('Signing failed', { description: err instanceof Error ? err.message : 'Could not initiate signing.' })
    } finally {
      setSigningLoading(false)
    }
  }, [user, profile, estateId, directive.id, directive.type])

  const handleExportPDF = useCallback(async () => {
    if (!editor) return
    const { pdf } = await import('@react-pdf/renderer')
    const { DirectivePDF } = await import('@/components/pdf/DirectivePDF')
    const blob = await pdf(
      <DirectivePDF
        title={directive.title}
        typeLabel={cfg.label}
        status={directive.status as 'draft' | 'finalized'}
        content={editor.getHTML()}
        recipientName={directive.recipientName}
        recipientRelationship={directive.recipientRelationship}
        date={new Date().toLocaleDateString()}
      />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${directive.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [editor, directive, cfg.label])

  return (
    <div className="max-w-[1000px] mx-auto p-12 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between mb-10">
        <Button
          variant="link"
          onClick={onBack}
          className="text-[14px] font-bold text-[var(--royal)] p-0 h-auto"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Directives
        </Button>
        <div className="flex items-center gap-3">
          {/* Auto-save indicator */}
          {directive.status !== 'finalized' && autoSaveStatus !== 'idle' && (
            <span className={`flex items-center gap-1.5 text-[11px] font-medium mr-1 ${autoSaveStatus === 'error' ? 'text-[#DC2626]' : 'text-slate-500'}`}>
              {autoSaveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
              {autoSaveStatus === 'saved' && <Check className="w-3 h-3 text-[#059669]" />}
              {autoSaveStatus === 'error' && <AlertCircle className="w-3 h-3 text-[#DC2626]" />}
              {autoSaveStatus === 'saving' ? 'Saving...' : autoSaveStatus === 'error' ? 'Not saved' : 'Saved'}
            </span>
          )}
          {directive.status !== 'finalized' && (
            <>
              <Button
                variant="secondary"
                onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
                className="px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                {mode === 'edit' ? <><Eye className="w-3.5 h-3.5" /> Preview</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[var(--royal)] text-white hover:bg-[var(--royal-blue)]"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={saving}
                className="px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[var(--gold)] text-white hover:bg-[var(--gold)]"
              >
                <Lock className="w-3.5 h-3.5" /> Finalize
              </Button>
            </>
          )}
          {directive.status === 'finalized' && !isSigned && signingUnavailable && (
            <span
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[var(--royal)]/5 text-[var(--royal)] border border-[var(--royal)]/15"
              title="Electronic signing will be enabled soon. Use Export to sign by hand in the meantime."
            >
              <Info className="w-3.5 h-3.5" /> E-Signing Coming Soon
            </span>
          )}
          {directive.status === 'finalized' && !isSigned && !signingUnavailable && (
            <>
              <Button
                onClick={handleSign}
                disabled={signingLoading}
                className="px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[var(--gold)] text-white hover:bg-[var(--gold)]"
              >
                {signingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenTool className="w-3.5 h-3.5" />}
                {signingLoading ? 'Preparing...' : 'Sign Document'}
              </Button>
              {directive.signingEnvelopeId && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await updateDirective(estateId, directive.id, { signedAt: new Date().toISOString() })
                    toast.success('Document marked as signed')
                  }}
                  className="px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider border-[#059669]/30 text-[#059669] hover:bg-[#059669]/5"
                >
                  <Check className="w-3.5 h-3.5" /> Confirm Signed
                </Button>
              )}
            </>
          )}
          {directive.status === 'finalized' && isSigned && (
            <span className="flex items-center gap-1.5 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-[#059669]">
              <Check className="w-3.5 h-3.5" /> Signed
            </span>
          )}
          <Button
            variant="secondary"
            onClick={handleExportPDF}
            className="px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* ── Title Section ── */}
      <div className="mb-10 pb-8 border-b border-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${cfg.color}10` }}>
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
            {directive.status === 'finalized' && (
              <Badge
                variant="secondary"
                className="px-3 py-1 h-auto bg-[#059669]/10 text-[#059669] text-[10px] font-bold uppercase tracking-widest rounded-lg"
              >
                Finalized
              </Badge>
            )}
          </div>
        </div>
        <h1 className="text-4xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900 tracking-tight">{directive.title}</h1>
        {directive.recipientName && (
          <p className="text-[15px] text-slate-500 mt-3">
            To: <span className="text-slate-900 font-medium">{directive.recipientName}</span>
            {directive.recipientRelationship && <span> ({directive.recipientRelationship})</span>}
          </p>
        )}

        {/* Visibility Picker */}
        {directive.status !== 'finalized' && heirs.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-50">
            <div className="flex items-center gap-2 mb-3">
              {visibleTo.length === 0 ? (
                <Globe className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <Users className="w-3.5 h-3.5 text-[var(--royal)]" />
              )}
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                {visibleTo.length === 0 ? 'Visible to all heirs' : `Visible to ${visibleTo.length} selected`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setVisibleTo([])
                  updateDirective(estateId, directive.id, { visibleTo: [] })
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                  visibleTo.length === 0
                    ? 'border-[var(--royal)] bg-[var(--royal)]/5 text-[var(--royal)]'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                Everyone
              </button>
              {heirs.filter(h => h.status === 'active').map((heir) => {
                const selected = visibleTo.includes(heir.id)
                return (
                  <button
                    key={heir.id}
                    onClick={() => {
                      const next = selected
                        ? visibleTo.filter((n) => n !== heir.id)
                        : [...visibleTo, heir.id]
                      setVisibleTo(next)
                      updateDirective(estateId, directive.id, { visibleTo: next })
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                      selected
                        ? 'border-[var(--royal)] bg-[var(--royal)]/5 text-[var(--royal)]'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {heir.fullName}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      {mode === 'edit' && directive.status !== 'finalized' && editor && (
        <div className="flex items-center gap-1 mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={`w-9 h-9 rounded-xl ${editor.isActive('bold') ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}><Bold className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={`w-9 h-9 rounded-xl ${editor.isActive('italic') ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}><Italic className="w-4 h-4" /></Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`w-9 h-9 rounded-xl ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}><Heading2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`w-9 h-9 rounded-xl ${editor.isActive('bulletList') ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}><List className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`w-9 h-9 rounded-xl ${editor.isActive('orderedList') ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}><ListOrdered className="w-4 h-4" /></Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} className="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-200"><Undo2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} className="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-200"><Redo2 className="w-4 h-4" /></Button>
        </div>
      )}

      {/* ── Editor ── */}
      <div className="rounded-3xl border border-slate-100 overflow-hidden bg-white min-h-[500px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// ─── Illinois Advance Directives Section ────────────────────────────────────

function IllinoisAdvanceDirectivesSection({ estateId }: { estateId: string }) {
  const [directives, setDirectives] = useState<AdvanceDirectiveType[]>([])
  const [statuses, setStatuses] = useState<Record<string, AdvanceDirectiveStatus>>({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getAdvanceDirectives(estateId)
      .then((res) => {
        setDirectives(res.directives)
        setStatuses(res.statuses)
      })
      .catch((err: unknown) => {
        console.error('[AdvanceDirectives] load failed:', err)
        toast.error('Could not load advance directives', {
          description: err instanceof Error ? err.message : 'Please refresh to try again.',
        })
      })
      .finally(() => setLoading(false))
  }, [estateId])

  const handleStatusChange = async (directiveId: string, newStatus: string) => {
    const prev = statuses[directiveId]
    setStatuses({ ...statuses, [directiveId]: { ...prev, directiveId, status: newStatus } })
    try {
      await updateAdvanceDirectiveStatus(estateId, directiveId, newStatus)
      toast.success(newStatus === 'completed' ? 'Marked as completed' : 'Status updated')
    } catch {
      setStatuses({ ...statuses, [directiveId]: prev })
      toast.error('Failed to update status')
    }
  }

  if (loading) return null

  const completedCount = Object.values(statuses).filter((s) => s.status === 'completed').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Illinois Legal Advance Directives</h2>
          <p className="text-sm text-slate-900/60">
            {completedCount} of {directives.length} completed &middot; No lawyer or notary required
          </p>
        </div>
        <Badge
          className="text-xs px-3 py-1"
          style={{ backgroundColor: 'rgba(200, 169, 81, 0.12)', color: '#C8A951' }}
        >
          Illinois Law
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {directives.map((d) => {
          const status = statuses[d.id]
          const isComplete = status?.status === 'completed'
          const isExpanded = expandedId === d.id

          return (
            <Card
              key={d.id}
              className={`rounded-2xl transition-all cursor-pointer ${
                isComplete ? 'border-green-200 bg-green-50/30' : 'border-slate-100 hover:border-[var(--gold)]/20'
              }`}
              onClick={() => setExpandedId(isExpanded ? null : d.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-sm ${isComplete ? 'text-green-700' : 'text-slate-900'}`}>
                        {d.name}
                      </h3>
                      {isComplete && <Badge className="bg-green-100 text-green-700 text-[10px]">Done</Badge>}
                      {d.validityYears > 0 && (
                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                          Expires in {d.validityYears}yr
                        </Badge>
                      )}
                      {d.overriddenBy && (
                        <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">
                          Overridden by HCPOA
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-900/60">{d.description}</p>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                    <div className="text-xs space-y-1">
                      <p className="text-slate-900/50 font-medium">Requirements:</p>
                      <p className="text-slate-900/70">
                        {d.witnessRequired > 0 ? `${d.witnessRequired} witness (18+)` : 'No witnesses'}
                        {d.notaryRequired ? ' + Notary' : ''}
                        {!d.lawyerRequired ? ' · No lawyer needed' : ''}
                      </p>
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="text-slate-900/50 font-medium">Key points:</p>
                      <ul className="space-y-0.5">
                        {d.keyPoints.map((kp, i) => (
                          <li key={i} className="text-slate-900/70 pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-[var(--gold)]">
                            {kp}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-xs text-slate-900/50">
                      <span className="font-medium">Statute:</span> {d.statute}
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={d.formUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-[var(--royal)] hover:underline"
                      >
                        Download form &rarr;
                      </a>
                      <div className="flex-1" />
                      {!isComplete ? (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(d.id, 'completed')}
                          className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-white text-xs h-7"
                        >
                          <Check className="w-3 h-3 mr-1" /> Mark Complete
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(d.id, 'not_started')}
                          className="text-xs h-7"
                        >
                          Undo
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-[10px] text-slate-900/40 text-center">
        Forms available from the Illinois Department of Public Health. No lawyer or notary required for most directives.
      </p>
    </div>
  )
}
