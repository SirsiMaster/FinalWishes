/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { useDirectives, type Directive } from '../lib/firestore'
import { addDirective, updateDirective } from '../lib/estate-actions'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Plus,
  X,
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
} from 'lucide-react'

export const Route = createFileRoute('/estates/$estateId/directives')({
  component: DirectivesPage,
})

// ─── Type Config ──────────────────────────────────────────────────────────

const DIRECTIVE_TYPES = [
  { value: 'ethical_will' as const, label: 'Ethical Will', description: 'Values, lessons, and wisdom for your family', icon: Heart, color: '#7C3AED' },
  { value: 'funeral_preferences' as const, label: 'Funeral Preferences', description: 'Ceremony, burial, and memorial wishes', icon: FileText, color: '#133378' },
  { value: 'final_message' as const, label: 'Final Message', description: 'A personal letter to someone you love', icon: MessageSquare, color: '#C8A951' },
  { value: 'care_instructions' as const, label: 'Care Instructions', description: 'Guidance for dependents, pets, or property', icon: HandHeart, color: '#059669' },
] as const

type DirectiveType = (typeof DIRECTIVE_TYPES)[number]['value']

function getTypeConfig(value: string) {
  return DIRECTIVE_TYPES.find((t) => t.value === value) || DIRECTIVE_TYPES[0]
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function DirectivesPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/directives' })
  const estateId = useMemo(() => (routeId === 'lockhart' ? 'estate_lockhart' : routeId), [routeId])

  const { data: directives, loading } = useDirectives(estateId)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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
    <div className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Header ── */}
      <div className="flex justify-between items-end border-b border-slate-50 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Legacy Directives</span>
          </div>
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">
            Final Directives
          </h2>
          <p className="text-[#64748B] text-lg font-medium max-w-2xl leading-relaxed">
            Ethical wills, funeral wishes, personal messages, and care instructions for the people you love.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 rounded-2xl font-bold text-[14px] transition-all shadow-[0_20px_50px_rgba(19,51,120,0.1)] flex items-center gap-3"
        >
          <Plus className="w-5 h-5" />
          Create Directive
        </button>
      </div>

      {/* ── Cards ── */}
      {directives.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-[#133378]/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-[#133378]/30" />
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-2">No directives yet</h3>
          <p className="text-[#64748B] mb-8">Create your first ethical will, funeral preference, or personal message.</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-8 py-4 rounded-2xl font-bold text-[14px] transition-all"
          >
            <Plus className="w-4 h-4 inline mr-2" /> Create First Directive
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {directives.map((d) => {
            const cfg = getTypeConfig(d.type)
            const Icon = cfg.icon
            return (
              <button
                key={d.id}
                onClick={() => setEditingId(d.id)}
                className="text-left bg-white rounded-3xl border border-slate-100 p-8 hover:border-[#133378]/20 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${cfg.color}10` }}>
                      <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0F172A] group-hover:text-[#133378] transition-colors">{d.title}</h3>
                      <p className="text-[12px] text-[#64748B] font-medium">{cfg.label}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg ${d.status === 'finalized' ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>
                    {d.status === 'finalized' ? 'Finalized' : 'Draft'}
                  </span>
                </div>
                {d.recipientName && (
                  <p className="text-[13px] text-[#334155] mb-3">
                    <span className="text-[#64748B]">To:</span> {d.recipientName}
                    {d.recipientRelationship && <span className="text-[#64748B]"> ({d.recipientRelationship})</span>}
                  </p>
                )}
                {d.content && (
                  <p className="text-[13px] text-[#64748B] line-clamp-3">
                    {d.content.replace(/<[^>]*>/g, '').slice(0, 200)}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {createModalOpen && <CreateDirectiveModal estateId={estateId} onClose={() => setCreateModalOpen(false)} onCreated={(id) => { setCreateModalOpen(false); setEditingId(id); }} />}
    </div>
  )
}

// ─── Create Modal ──────────────────────────────────────────────────────────

function CreateDirectiveModal({ estateId, onClose, onCreated }: { estateId: string; onClose: () => void; onCreated: (id: string) => void }) {
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
      recipientName: needsRecipient ? recipientName.trim() : undefined,
      recipientRelationship: needsRecipient ? recipientRelationship.trim() : undefined,
    })
    setSaving(false)
    if (result.success && result.id) {
      onCreated(result.id)
    }
  }, [estateId, selectedType, title, recipientName, recipientRelationship, needsRecipient, onCreated])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-10">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Create Directive</h3>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center hover:bg-[#E2E8F0]">
              <X className="w-5 h-5 text-[#64748B]" />
            </button>
          </div>

          {/* Type Selection */}
          <div className="space-y-3 mb-8">
            <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-3">Directive Type</label>
            {DIRECTIVE_TYPES.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  onClick={() => setSelectedType(t.value)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedType === t.value ? 'border-[#133378] bg-[#133378]/5' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${t.color}10` }}>
                    <Icon className="w-4 h-4" style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#0F172A]">{t.label}</p>
                    <p className="text-[12px] text-[#64748B]">{t.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this directive a meaningful title..."
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378]"
            />
          </div>

          {/* Recipient (for final messages) */}
          {needsRecipient && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Recipient Name</label>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Who is this for?"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest mb-2">Relationship</label>
                <input
                  value={recipientRelationship}
                  onChange={(e) => setRecipientRelationship(e.target.value)}
                  placeholder="e.g., Son, Daughter, Friend"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#133378] focus:ring-1 focus:ring-[#133378]"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 mt-8 pt-8 border-t border-slate-100">
            <button onClick={onClose} className="px-8 py-4 rounded-2xl text-[14px] font-bold text-[#64748B] hover:bg-[#F1F5F9] transition-all">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              className="bg-[#133378] hover:bg-[#1E3A5F] disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-bold text-[14px] transition-all flex items-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Pencil className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create & Edit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Directive Editor ──────────────────────────────────────────────────────

function DirectiveEditor({ directive, estateId, onBack }: { directive: Directive; estateId: string; onBack: () => void }) {
  const cfg = getTypeConfig(directive.type)
  const Icon = cfg.icon
  const [mode, setMode] = useState<'edit' | 'view'>(directive.status === 'finalized' ? 'view' : 'edit')
  const [saving, setSaving] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: directive.content || '<p>Begin writing your directive here...</p>',
    editable: mode === 'edit' && directive.status !== 'finalized',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none min-h-[400px] focus:outline-none p-8 text-[#0F172A]',
      },
    },
  })

  const handleSave = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    await updateDirective(estateId, directive.id, { content: editor.getHTML() })
    setSaving(false)
  }, [editor, estateId, directive.id])

  const handleFinalize = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    await updateDirective(estateId, directive.id, { content: editor.getHTML(), status: 'finalized' })
    setSaving(false)
    setMode('view')
  }, [editor, estateId, directive.id])

  const handleExportPDF = useCallback(() => {
    if (!editor) return
    const content = editor.getText()
    const blob = new Blob(
      [`${directive.title}\n${'─'.repeat(40)}\nType: ${cfg.label}\n${directive.recipientName ? `To: ${directive.recipientName}\n` : ''}Date: ${new Date().toLocaleDateString()}\n\n${content}`],
      { type: 'text/plain' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${directive.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [editor, directive, cfg.label])

  return (
    <div className="max-w-[1000px] mx-auto p-12 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={onBack} className="flex items-center gap-2 text-[14px] font-bold text-[#133378] hover:underline">
          <ChevronLeft className="w-4 h-4" /> Back to Directives
        </button>
        <div className="flex items-center gap-3">
          {directive.status !== 'finalized' && (
            <>
              <button
                onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
                className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] flex items-center gap-2"
              >
                {mode === 'edit' ? <><Eye className="w-3.5 h-3.5" /> Preview</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[#133378] text-white hover:bg-[#1E3A5F] flex items-center gap-2"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleFinalize}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[#C8A951] text-white hover:bg-[#B8993E] flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" /> Finalize
              </button>
            </>
          )}
          <button
            onClick={handleExportPDF}
            className="px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* ── Title Section ── */}
      <div className="mb-10 pb-8 border-b border-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${cfg.color}10` }}>
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
            {directive.status === 'finalized' && (
              <span className="ml-3 px-3 py-1 bg-[#059669]/10 text-[#059669] text-[10px] font-bold uppercase tracking-widest rounded-lg">
                Finalized
              </span>
            )}
          </div>
        </div>
        <h1 className="text-4xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">{directive.title}</h1>
        {directive.recipientName && (
          <p className="text-[15px] text-[#64748B] mt-3">
            To: <span className="text-[#0F172A] font-medium">{directive.recipientName}</span>
            {directive.recipientRelationship && <span> ({directive.recipientRelationship})</span>}
          </p>
        )}
      </div>

      {/* ── Toolbar ── */}
      {mode === 'edit' && directive.status !== 'finalized' && editor && (
        <div className="flex items-center gap-1 mb-4 p-3 bg-[#F8FAFC] rounded-2xl border border-slate-100">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="w-4 h-4" /></ToolbarButton>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="w-4 h-4" /></ToolbarButton>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false}><Undo2 className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false}><Redo2 className="w-4 h-4" /></ToolbarButton>
        </div>
      )}

      {/* ── Editor ── */}
      <div className="rounded-3xl border border-slate-100 overflow-hidden bg-white min-h-[500px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarButton({ onClick, active, children }: { onClick: () => void; active: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-[#133378] text-white' : 'text-[#64748B] hover:bg-[#E2E8F0]'}`}
    >
      {children}
    </button>
  )
}
