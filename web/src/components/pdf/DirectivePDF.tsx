import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

// ─── Styles ────────────────────────────────────────────────────────────────

const ROYAL_BLUE = '#133378'
const METALLIC_GOLD = '#C8A951'
const SLATE_700 = '#334155'
const SLATE_500 = '#64748B'

const styles = StyleSheet.create({
  page: {
    paddingTop: 72, // 1 inch
    paddingBottom: 80,
    paddingHorizontal: 72,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: SLATE_700,
    position: 'relative',
  },
  // Header
  headerContainer: {
    marginBottom: 8,
  },
  headerText: {
    fontFamily: 'Times-Roman',
    fontSize: 22,
    color: ROYAL_BLUE,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerTagline: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: SLATE_500,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  goldRule: {
    height: 2,
    backgroundColor: METALLIC_GOLD,
    marginTop: 12,
    marginBottom: 20,
  },
  // Type badge
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: ROYAL_BLUE,
    marginBottom: 16,
  },
  typeBadgeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Title
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 24,
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 1.3,
  },
  // Meta
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: SLATE_500,
    width: 40,
  },
  metaValue: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: SLATE_700,
  },
  metaSection: {
    marginBottom: 16,
  },
  // Content separator
  contentSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 20,
  },
  // Content body
  paragraph: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: SLATE_700,
    lineHeight: 1.7,
    marginBottom: 10,
    textAlign: 'justify' as const,
  },
  heading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  listItem: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: SLATE_700,
    lineHeight: 1.7,
    marginBottom: 4,
    paddingLeft: 16,
  },
  // Watermark
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '15%',
    fontFamily: 'Helvetica-Bold',
    fontSize: 72,
    color: '#E2E8F0',
    opacity: 0.3,
    transform: 'rotate(-35deg)',
    letterSpacing: 12,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 72,
    right: 72,
  },
  footerRule: {
    height: 1,
    backgroundColor: METALLIC_GOLD,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: SLATE_500,
  },
  footerBrand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: ROYAL_BLUE,
  },
  pageNumber: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: SLATE_500,
  },
})

// ─── HTML-to-Blocks Parser ─────────────────────────────────────────────────

interface ContentBlock {
  type: 'paragraph' | 'heading' | 'list-item'
  text: string
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parseHtmlToBlocks(html: string): ContentBlock[] {
  if (!html) return []
  const blocks: ContentBlock[] = []

  const blockPattern = /<(h[1-6]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null

  while ((match = blockPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const text = stripTags(match[2]).trim()
    if (!text) continue

    if (tag.startsWith('h')) {
      blocks.push({ type: 'heading', text })
    } else if (tag === 'li') {
      blocks.push({ type: 'list-item', text })
    } else {
      blocks.push({ type: 'paragraph', text })
    }
  }

  // Fallback: if no block tags found, split by newlines
  if (blocks.length === 0) {
    const plainText = stripTags(html).trim()
    if (plainText) {
      plainText.split(/\n\n+/).forEach((para) => {
        const trimmed = para.trim()
        if (trimmed) blocks.push({ type: 'paragraph', text: trimmed })
      })
    }
  }

  return blocks
}

// ─── Component Props ───────────────────────────────────────────────────────

export interface DirectivePDFProps {
  title: string
  typeLabel: string
  status: 'draft' | 'finalized'
  content: string
  recipientName?: string
  recipientRelationship?: string
  date: string
}

// ─── PDF Document Component ────────────────────────────────────────────────

export function DirectivePDF({
  title,
  typeLabel,
  status,
  content,
  recipientName,
  recipientRelationship,
  date,
}: DirectivePDFProps) {
  const blocks = parseHtmlToBlocks(content)

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Watermark */}
        {status === 'draft' && (
          <Text style={styles.watermark} fixed>
            DRAFT
          </Text>
        )}

        {/* Header */}
        <View style={styles.headerContainer} fixed>
          <Text style={styles.headerText}>FinalWishes</Text>
          <Text style={styles.headerTagline}>The Estate Operating System</Text>
        </View>
        <View style={styles.goldRule} fixed />

        {/* Type Badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Meta Info */}
        <View style={styles.metaSection}>
          {recipientName && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>To:</Text>
              <Text style={styles.metaValue}>
                {recipientName}
                {recipientRelationship ? ` (${recipientRelationship})` : ''}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date:</Text>
            <Text style={styles.metaValue}>{date}</Text>
          </View>
        </View>

        {/* Content Separator */}
        <View style={styles.contentSeparator} />

        {/* Content Body */}
        {blocks.map((block, i) => {
          switch (block.type) {
            case 'heading':
              return <Text key={i} style={styles.heading}>{block.text}</Text>
            case 'list-item':
              return (
                <Text key={i} style={styles.listItem}>
                  {'\u2022  '}{block.text}
                </Text>
              )
            default:
              return <Text key={i} style={styles.paragraph}>{block.text}</Text>
          }
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRule} />
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              This document was generated by{' '}
              <Text style={styles.footerBrand}>FinalWishes</Text>
              {' '}&mdash; The Estate Operating System &bull; {date}
            </Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  )
}
