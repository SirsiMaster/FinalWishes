/**
 * SectionEmptyState — Emotionally-themed empty states
 *
 * Each section gets a distinctive empty state with a themed SVG illustration,
 * section-colored accents, and emotionally-aware copy that encourages action
 * without feeling clinical.
 *
 * @version 1.0.0
 */
import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SECTION_THEMES, type SectionId } from './SectionHeader'

// ─── Illustrations ──────────────────────────────────────────────────────────

function SoulLogIllustration({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
      {/* Journal pages */}
      <rect x="25" y="20" width="70" height="85" rx="8" fill={`${color}08`} stroke={`${color}30`} strokeWidth="1.5" />
      <rect x="30" y="25" width="60" height="75" rx="6" fill="white" stroke={`${color}20`} strokeWidth="1" />
      {/* Lines */}
      <line x1="40" y1="42" x2="80" y2="42" stroke={`${color}15`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="52" x2="75" y2="52" stroke={`${color}15`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="62" x2="70" y2="62" stroke={`${color}15`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="72" x2="65" y2="72" stroke={`${color}15`} strokeWidth="1.5" strokeLinecap="round" />
      {/* Pen */}
      <line x1="82" y1="30" x2="92" y2="80" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <circle cx="92" cy="82" r="2" fill={color} opacity="0.5" />
      {/* Heartbeat line */}
      <path d="M35 85 L45 85 L50 75 L55 95 L60 80 L65 85 L85 85" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MemoriesIllustration({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
      {/* Photo stack */}
      <rect x="20" y="30" width="55" height="45" rx="4" fill={`${color}08`} stroke={`${color}25`} strokeWidth="1.5" transform="rotate(-5 47 52)" />
      <rect x="25" y="25" width="55" height="45" rx="4" fill="white" stroke={`${color}20`} strokeWidth="1.5" transform="rotate(3 52 47)" />
      <rect x="30" y="28" width="55" height="45" rx="4" fill="white" stroke={`${color}30`} strokeWidth="1.5" />
      {/* Mountain scene in top photo */}
      <path d="M35 63 L48 45 L55 52 L65 38 L80 63 Z" fill={`${color}12`} stroke={`${color}20`} strokeWidth="1" />
      <circle cx="72" cy="38" r="5" fill={`${color}15`} />
      {/* Film strip */}
      <rect x="65" y="75" width="40" height="20" rx="3" fill={`${color}06`} stroke={`${color}20`} strokeWidth="1" />
      <rect x="70" y="79" width="8" height="12" rx="1" fill={`${color}10`} />
      <rect x="81" y="79" width="8" height="12" rx="1" fill={`${color}10`} />
      <rect x="92" y="79" width="8" height="12" rx="1" fill={`${color}10`} />
    </svg>
  )
}

function LettersIllustration({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
      {/* Envelope */}
      <rect x="20" y="35" width="80" height="55" rx="6" fill={`${color}06`} stroke={`${color}25`} strokeWidth="1.5" />
      <path d="M20 41 L60 68 L100 41" stroke={`${color}30`} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Wax seal */}
      <circle cx="60" cy="82" r="10" fill={`${color}15`} stroke={`${color}30`} strokeWidth="1.5" />
      <circle cx="60" cy="82" r="5" fill={`${color}25`} />
      {/* Letter peeking out */}
      <rect x="30" y="22" width="60" height="20" rx="3" fill="white" stroke={`${color}15`} strokeWidth="1" />
      <line x1="40" y1="30" x2="70" y2="30" stroke={`${color}12`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="36" x2="60" y2="36" stroke={`${color}10`} strokeWidth="1.5" strokeLinecap="round" />
      {/* Heart */}
      <path d="M78 25 C78 22 82 20 84 23 C86 20 90 22 90 25 C90 30 84 34 84 34 C84 34 78 30 78 25Z" fill={`${color}20`} />
    </svg>
  )
}

function PeopleIllustration({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
      {/* Center person */}
      <circle cx="60" cy="40" r="12" fill={`${color}12`} stroke={`${color}25`} strokeWidth="1.5" />
      <path d="M40 78 C40 62 50 55 60 55 C70 55 80 62 80 78" stroke={`${color}25`} strokeWidth="1.5" fill={`${color}06`} strokeLinecap="round" />
      {/* Left person (smaller) */}
      <circle cx="30" cy="50" r="8" fill={`${color}08`} stroke={`${color}15`} strokeWidth="1" />
      <path d="M18 75 C18 65 23 60 30 60 C37 60 42 65 42 75" stroke={`${color}15`} strokeWidth="1" fill={`${color}04`} strokeLinecap="round" />
      {/* Right person (smaller) */}
      <circle cx="90" cy="50" r="8" fill={`${color}08`} stroke={`${color}15`} strokeWidth="1" />
      <path d="M78 75 C78 65 83 60 90 60 C97 60 102 65 102 75" stroke={`${color}15`} strokeWidth="1" fill={`${color}04`} strokeLinecap="round" />
      {/* Connection lines */}
      <line x1="38" y1="50" x2="48" y2="45" stroke={`${color}10`} strokeWidth="1" strokeDasharray="3 3" />
      <line x1="82" y1="50" x2="72" y2="45" stroke={`${color}10`} strokeWidth="1" strokeDasharray="3 3" />
      {/* Shield */}
      <path d="M55 88 L60 84 L65 88 L65 96 C65 98 60 100 60 100 C60 100 55 98 55 96Z" fill={`${color}15`} stroke={`${color}25`} strokeWidth="1" />
    </svg>
  )
}

function VaultIllustration({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
      {/* Vault door */}
      <rect x="25" y="20" width="70" height="80" rx="8" fill={`${color}06`} stroke={`${color}25`} strokeWidth="1.5" />
      {/* Inner rectangle */}
      <rect x="35" y="30" width="50" height="60" rx="4" fill="white" stroke={`${color}15`} strokeWidth="1" />
      {/* Dial */}
      <circle cx="60" cy="60" r="15" fill={`${color}04`} stroke={`${color}20`} strokeWidth="1.5" />
      <circle cx="60" cy="60" r="8" fill={`${color}08`} stroke={`${color}25`} strokeWidth="1.5" />
      <line x1="60" y1="52" x2="60" y2="48" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* Lock handle */}
      <rect x="80" y="50" width="8" height="20" rx="4" fill={`${color}15`} stroke={`${color}25`} strokeWidth="1" />
      {/* Bolts */}
      <circle cx="35" cy="40" r="3" fill={`${color}10`} />
      <circle cx="85" cy="40" r="3" fill={`${color}10`} />
      <circle cx="35" cy="80" r="3" fill={`${color}10`} />
      <circle cx="85" cy="80" r="3" fill={`${color}10`} />
    </svg>
  )
}

function LegacyIllustration({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
      {/* Timeline vertical line */}
      <line x1="40" y1="15" x2="40" y2="105" stroke={`${color}15`} strokeWidth="2" />
      {/* Timeline dots */}
      <circle cx="40" cy="25" r="5" fill={`${color}15`} stroke={`${color}30`} strokeWidth="1.5" />
      <circle cx="40" cy="55" r="5" fill={`${color}20`} stroke={`${color}35`} strokeWidth="1.5" />
      <circle cx="40" cy="85" r="5" fill={`${color}25`} stroke={`${color}40`} strokeWidth="1.5" />
      {/* Cards */}
      <rect x="52" y="17" width="48" height="16" rx="4" fill={`${color}06`} stroke={`${color}15`} strokeWidth="1" />
      <line x1="58" y1="23" x2="88" y2="23" stroke={`${color}12`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58" y1="28" x2="78" y2="28" stroke={`${color}08`} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="52" y="47" width="48" height="16" rx="4" fill={`${color}08`} stroke={`${color}18`} strokeWidth="1" />
      <line x1="58" y1="53" x2="90" y2="53" stroke={`${color}15`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58" y1="58" x2="80" y2="58" stroke={`${color}10`} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="52" y="77" width="48" height="16" rx="4" fill={`${color}10`} stroke={`${color}20`} strokeWidth="1" />
      <line x1="58" y1="83" x2="85" y2="83" stroke={`${color}18`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58" y1="88" x2="75" y2="88" stroke={`${color}12`} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Illustration Map ───────────────────────────────────────────────────────

const ILLUSTRATIONS: Record<SectionId, (props: { color: string }) => ReactNode> = {
  'soul-log': SoulLogIllustration,
  'my-legacy': LegacyIllustration,
  'memories': MemoriesIllustration,
  'letters': LettersIllustration,
  'my-people': PeopleIllustration,
  'the-vault': VaultIllustration,
  'life-chapters': LegacyIllustration,
  'events': LettersIllustration,
  'probate': VaultIllustration,
}

// ─── Empty State Content ────────────────────────────────────────────────────

interface EmptyStateContent {
  heading: string
  message: string
  ctaLabel: string
}

const EMPTY_CONTENT: Record<SectionId, EmptyStateContent> = {
  'soul-log': {
    heading: 'Your story starts here',
    message: 'Record a thought, share a memory, or write a reflection. Everything you capture becomes part of your legacy.',
    ctaLabel: 'Create your first entry',
  },
  'my-legacy': {
    heading: 'Your legacy timeline is waiting',
    message: 'As you add entries, memories, and letters, they\'ll appear here as a living story of your life.',
    ctaLabel: 'Start with Soul Log',
  },
  'memories': {
    heading: 'Preserve what matters',
    message: 'Photos, videos, and heirlooms — the moments and objects that tell your family\'s story.',
    ctaLabel: 'Add your first memory',
  },
  'letters': {
    heading: 'Words that outlast time',
    message: 'Write letters to the people you love. Ethical wills, final messages, and sealed time capsules — your words, delivered when they matter most.',
    ctaLabel: 'Write your first letter',
  },
  'my-people': {
    heading: 'The ones who matter most',
    message: 'Add the people who will carry your legacy forward — heirs, executors, and trusted advisors.',
    ctaLabel: 'Add a family member',
  },
  'the-vault': {
    heading: 'Your secure vault is ready',
    message: 'Documents, assets, and credentials — everything protected with bank-grade encryption and ready for when it\'s needed.',
    ctaLabel: 'Add your first item',
  },
  'life-chapters': {
    heading: 'Your story begins here',
    message: 'Organize your life into meaningful chapters — childhood memories, career milestones, parenthood, adventures.',
    ctaLabel: 'Create your first chapter',
  },
  'events': {
    heading: 'No events yet',
    message: 'Create funeral services, memorials, celebrations of life, or receptions to share with family and friends.',
    ctaLabel: 'Create your first event',
  },
  'probate': {
    heading: 'Estate settlement begins here',
    message: 'When the time comes, this section guides you through Illinois probate — deadlines, court forms, and checklist items.',
    ctaLabel: 'View probate checklist',
  },
}

// ─── Component ──────────────────────────────────────────────────────────────

interface SectionEmptyStateProps {
  section: SectionId
  /** Override default heading */
  heading?: string
  /** Override default message */
  message?: string
  /** Override default CTA label */
  ctaLabel?: string
  /** CTA click handler */
  onAction?: () => void
  /** Hide the CTA button */
  hideCta?: boolean
}

export function SectionEmptyState({
  section,
  heading,
  message,
  ctaLabel,
  onAction,
  hideCta = false,
}: SectionEmptyStateProps) {
  const theme = SECTION_THEMES[section]
  const content = EMPTY_CONTENT[section]
  const Illustration = ILLUSTRATIONS[section]

  return (
    <div className="text-center py-16 md:py-24">
      <div className="flex justify-center mb-8">
        <Illustration color={theme.accentColor} />
      </div>
      <h3
        className="text-xl font-bold mb-3 font-[family-name:var(--font-cinzel)]"
        style={{ color: 'var(--color-slate-900)' }}
      >
        {heading || content.heading}
      </h3>
      <p
        className="max-w-md mx-auto mb-8 leading-relaxed"
        style={{ color: `${theme.accentColor}80` }}
      >
        {message || content.message}
      </p>
      {!hideCta && onAction && (
        <Button
          onClick={onAction}
          className="px-8 py-4 h-auto rounded-2xl font-bold text-[14px] shadow-lg text-white"
          style={{ backgroundColor: theme.accentColor }}
        >
          {ctaLabel || content.ctaLabel}
        </Button>
      )}
    </div>
  )
}
