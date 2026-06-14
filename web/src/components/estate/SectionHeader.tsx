/**
 * SectionHeader — Emotional Section Identity
 *
 * Each of the 6 navigation groups gets a distinctive header with
 * its own gradient wash, icon treatment, tagline, and accent color.
 * Consistent structure, distinct personality.
 *
 * @version 1.0.0
 */
import { type ReactNode } from 'react'
import {
  Mic,
  Sparkles,
  Camera,
  PenLine,
  Users,
  Shield,
  BookOpen,
  Calendar,
  Scale,
} from 'lucide-react'

// ─── Section Definitions ────────────────────────────────────────────────────

export type SectionId =
  | 'soul-log'
  | 'my-legacy'
  | 'memories'
  | 'letters'
  | 'my-people'
  | 'the-vault'
  | 'life-chapters'
  | 'events'
  | 'probate'

interface SectionTheme {
  label: string
  tagline: string
  breadcrumb: string
  accentColor: string
  accentLight: string
  gradientFrom: string
  gradientTo: string
  icon: ReactNode
  iconBg: string
}

const SECTION_THEMES: Record<SectionId, SectionTheme> = {
  'soul-log': {
    label: 'Soul Log',
    tagline: 'Your voice. Your story. Every day.',
    breadcrumb: 'Soul Log',
    accentColor: '#B8860B',
    accentLight: 'rgba(184, 134, 11, 0.08)',
    gradientFrom: '#FFFBEB',
    gradientTo: '#FEF3C7',
    icon: <Mic className="w-5 h-5" />,
    iconBg: 'rgba(184, 134, 11, 0.12)',
  },
  'my-legacy': {
    label: 'My Legacy',
    tagline: 'The life you\'re building.',
    breadcrumb: 'Your Legacy',
    accentColor: '#133378',
    accentLight: 'rgba(19, 51, 120, 0.06)',
    gradientFrom: '#EEF2FF',
    gradientTo: '#E0E7FF',
    icon: <Sparkles className="w-5 h-5" />,
    iconBg: 'rgba(19, 51, 120, 0.10)',
  },
  'memories': {
    // Re-toned off the magenta firewall → gold (heritage warmth, keepsakes).
    label: 'Memories',
    tagline: 'Moments worth keeping.',
    breadcrumb: 'Memories',
    accentColor: '#B8860B',
    accentLight: 'rgba(184, 134, 11, 0.06)',
    gradientFrom: '#FFFBEB',
    gradientTo: '#FEF3C7',
    icon: <Camera className="w-5 h-5" />,
    iconBg: 'rgba(184, 134, 11, 0.10)',
  },
  'letters': {
    // Re-toned off the green firewall → deep royal (composure, permanence).
    label: 'Letters',
    tagline: 'Words that outlast time.',
    breadcrumb: 'Letters & Directives',
    accentColor: '#1E3A5F',
    accentLight: 'rgba(30, 58, 95, 0.06)',
    gradientFrom: '#EEF2FF',
    gradientTo: '#E0E7FF',
    icon: <PenLine className="w-5 h-5" />,
    iconBg: 'rgba(30, 58, 95, 0.10)',
  },
  'my-people': {
    // Re-toned off the teal firewall → heritage royal (trust, lineage).
    label: 'My People',
    tagline: 'The ones who matter most.',
    breadcrumb: 'My People',
    accentColor: '#133378',
    accentLight: 'rgba(19, 51, 120, 0.06)',
    gradientFrom: '#EEF2FF',
    gradientTo: '#E0E7FF',
    icon: <Users className="w-5 h-5" />,
    iconBg: 'rgba(19, 51, 120, 0.10)',
  },
  'the-vault': {
    // Re-toned off the slate firewall → deep royal (security, weight).
    label: 'The Vault',
    tagline: 'Protected. Organized. Ready.',
    breadcrumb: 'The Vault',
    accentColor: '#1E3A5F',
    accentLight: 'rgba(30, 58, 95, 0.05)',
    gradientFrom: '#EEF2FF',
    gradientTo: '#E0E7FF',
    icon: <Shield className="w-5 h-5" />,
    iconBg: 'rgba(30, 58, 95, 0.10)',
  },
  'life-chapters': {
    // Re-toned off the violet firewall → gold (narrative warmth, chapters).
    label: 'Life Chapters',
    tagline: 'Your life, told in chapters.',
    breadcrumb: 'Your Legacy',
    accentColor: '#C8A951',
    accentLight: 'rgba(200, 169, 81, 0.06)',
    gradientFrom: '#FFFBEB',
    gradientTo: '#FEF3C7',
    icon: <BookOpen className="w-5 h-5" />,
    iconBg: 'rgba(200, 169, 81, 0.10)',
  },
  'events': {
    label: 'Events',
    tagline: 'Services, memorials, and gatherings.',
    breadcrumb: 'Letters & Wishes',
    accentColor: '#133378',
    accentLight: 'rgba(19, 51, 120, 0.06)',
    gradientFrom: '#EEF2FF',
    gradientTo: '#E0E7FF',
    icon: <Calendar className="w-5 h-5" />,
    iconBg: 'rgba(19, 51, 120, 0.10)',
  },
  'probate': {
    label: 'Probate',
    tagline: 'Illinois probate guidance and deadlines.',
    breadcrumb: 'Estate Settlement',
    accentColor: '#7C2D12',
    accentLight: 'rgba(124, 45, 18, 0.06)',
    gradientFrom: '#FFF7ED',
    gradientTo: '#FFEDD5',
    icon: <Scale className="w-5 h-5" />,
    iconBg: 'rgba(124, 45, 18, 0.10)',
  },
}

// ─── Component ──────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  section: SectionId
  /** Override the default title (e.g. "Welcome back, Cylton.") */
  title?: string
  /** Override the default tagline */
  subtitle?: string
  /** Right-side action slot (e.g. a "New Entry" button) */
  action?: ReactNode
  /** Shepherd contextual nudge — shown as a subtle hint below the header */
  shepherdHint?: string | null
  /** Additional content below the header (e.g. search bar, tabs) */
  children?: ReactNode
}

export function SectionHeader({
  section,
  title,
  subtitle,
  action,
  shepherdHint,
  children,
}: SectionHeaderProps) {
  const theme = SECTION_THEMES[section]

  return (
    <div
      className="relative -mx-4 md:-mx-8 lg:-mx-12 -mt-6 md:-mt-8 lg:-mt-12 mb-8 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.gradientFrom} 0%, ${theme.gradientTo} 60%, white 100%)`,
      }}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(${theme.accentColor} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pt-8 md:pt-12 lg:pt-16 pb-8 md:pb-10">
        {/* Breadcrumb line */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-px"
            style={{ backgroundColor: `${theme.accentColor}30` }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: `${theme.accentColor}60` }}
          >
            {theme.breadcrumb}
          </span>
        </div>

        {/* Title row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="flex items-start gap-4">
            {/* Section icon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{
                backgroundColor: theme.iconBg,
                color: theme.accentColor,
              }}
            >
              {theme.icon}
            </div>

            <div className="space-y-1.5">
              <h1
                className="text-[2rem] md:text-[2.5rem] font-[family-name:var(--font-cinzel)] font-bold leading-tight tracking-tight"
                style={{ color: 'var(--ink)' }}
              >
                {title || theme.label}
              </h1>
              <p
                className="text-sm md:text-base font-medium"
                style={{ color: `${theme.accentColor}90` }}
              >
                {subtitle || theme.tagline}
              </p>
            </div>
          </div>

          {/* Action slot */}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>

        {/* Shepherd nudge */}
        {shepherdHint && (
          <div className="mt-5 flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${theme.accentColor}10` }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: theme.accentColor }}>
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <p
              className="text-[13px] leading-relaxed italic"
              style={{ color: `${theme.accentColor}70` }}
            >
              {shepherdHint}
            </p>
          </div>
        )}

        {/* Optional children (search, tabs, etc.) */}
        {children && <div className="mt-6">{children}</div>}
      </div>

      {/* Bottom fade line */}
      <div
        className="h-px"
        style={{
          background: `linear-gradient(to right, ${theme.accentColor}15, ${theme.accentColor}08, transparent)`,
        }}
      />
    </div>
  )
}

export { SECTION_THEMES }
export type { SectionTheme }
