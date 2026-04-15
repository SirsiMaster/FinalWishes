/**
 * Shepherd Prompt Engine
 *
 * Pure functions that transform estate context into contextual,
 * ethos-aligned prompts. The Shepherd speaks like a trusted friend,
 * not a legal assistant. It gives you reasons to come back.
 *
 * @see /ETHOS.md — "Life first, death second"
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ShepherdContext {
  estateId: string
  userName: string
  soulLogCount: number
  lastSoulLogDate: Date | null
  assetCount: number
  documentCount: number
  heirCount: number
  heirloomCount: number
  capsuleCount: number
  directiveCount: number
  memoirCount: number
  heirs: Array<{ fullName: string; relationship?: string; email?: string }>
  completionPercent: number
}

export interface ShepherdPrompt {
  message: string
  cta?: { label: string; route: string }
}

// ─── Prompt Pools ───────────────────────────────────────────────────────────

interface PromptTemplate {
  condition: (ctx: ShepherdContext) => boolean
  generate: (ctx: ShepherdContext) => ShepherdPrompt
}

const memoryPrompts: PromptTemplate[] = [
  {
    condition: (ctx) => ctx.soulLogCount === 0,
    generate: () => ({
      message:
        "Your story starts here. What's the first thing you want your family to remember about you?",
      cta: { label: 'Record Your First Memory', route: 'soul-log' },
    }),
  },
  {
    condition: (ctx) => ctx.soulLogCount === 0,
    generate: () => ({
      message:
        'Every life has a moment worth preserving. A voice memo, a written thought, a quick video — that is how legacies begin.',
      cta: { label: 'Start Your Story', route: 'soul-log' },
    }),
  },
  {
    condition: (ctx) =>
      ctx.lastSoulLogDate !== null &&
      daysSince(ctx.lastSoulLogDate) > 14,
    generate: () => ({
      message:
        "It's been a while since you last recorded a thought. Even a quick voice memo becomes a treasure.",
      cta: { label: 'Record a Thought', route: 'soul-log' },
    }),
  },
  {
    condition: (ctx) =>
      ctx.lastSoulLogDate !== null &&
      daysSince(ctx.lastSoulLogDate) > 14,
    generate: () => ({
      message:
        "Your family will treasure the sound of your voice. It doesn't have to be polished — just real.",
      cta: { label: 'Leave a Voice Memo', route: 'soul-log' },
    }),
  },
  {
    condition: (ctx) => ctx.soulLogCount > 0 && ctx.soulLogCount < 3,
    generate: () => ({
      message:
        "You've started capturing your story. What's your earliest memory? Families say these recordings are what they treasure most.",
      cta: { label: 'Add Another Memory', route: 'soul-log' },
    }),
  },
  {
    condition: (ctx) => ctx.soulLogCount > 0 && ctx.soulLogCount < 3,
    generate: () => ({
      message:
        'You have the beginning of something beautiful. Keep going — even short entries become priceless over time.',
      cta: { label: 'Continue Your Story', route: 'soul-log' },
    }),
  },
]

const peoplePrompts: PromptTemplate[] = [
  {
    condition: (ctx) => ctx.heirCount > 0 && ctx.capsuleCount === 0,
    generate: (ctx) => {
      const heir = ctx.heirs[0]
      const name = heir?.fullName?.split(' ')[0] || 'your loved ones'
      return {
        message: `You've named ${name} as a beneficiary, but haven't written them a personal message yet. Would you like to?`,
        cta: { label: 'Write a Letter', route: 'timecapsule' },
      }
    },
  },
  {
    condition: (ctx) => ctx.heirCount > 0 && ctx.capsuleCount === 0,
    generate: () => ({
      message:
        'A time capsule is a letter your family opens when the time is right. It costs nothing but a few minutes — and means everything.',
      cta: { label: 'Create a Time Capsule', route: 'timecapsule' },
    }),
  },
  {
    condition: (ctx) =>
      ctx.heirCount > 0 && ctx.soulLogCount > 0 && ctx.capsuleCount === 0,
    generate: (ctx) => {
      const heir = ctx.heirs[0]
      const name = heir?.fullName?.split(' ')[0] || 'your family'
      return {
        message: `None of your diary entries are shared with your family yet. Want to tag one for ${name}?`,
        cta: { label: 'Share a Memory', route: 'soul-log' },
      }
    },
  },
]

const completenessPrompts: PromptTemplate[] = [
  {
    condition: (ctx) => ctx.documentCount === 0,
    generate: () => ({
      message:
        'Your vault is empty. Even uploading one key document — a will, an ID, insurance — gives your family a head start.',
      cta: { label: 'Upload a Document', route: 'vault' },
    }),
  },
  {
    condition: (ctx) => ctx.directiveCount === 0,
    generate: () => ({
      message:
        "You haven't written any directives yet. Your ethical will is the one document that can't be written by anyone else.",
      cta: { label: 'Write a Directive', route: 'directives' },
    }),
  },
  {
    condition: (ctx) => ctx.heirloomCount === 0,
    generate: () => ({
      message:
        "Is there an object in your home with a story? A ring, a quilt, a watch — documenting it here makes sure that story isn't lost.",
      cta: { label: 'Document an Heirloom', route: 'heirlooms' },
    }),
  },
  {
    condition: (ctx) => ctx.heirCount === 0,
    generate: () => ({
      message:
        "You haven't named any beneficiaries yet. Letting your family know who gets what — and why — is one of the greatest gifts you can give.",
      cta: { label: 'Add a Beneficiary', route: 'beneficiaries' },
    }),
  },
  {
    condition: (ctx) => ctx.assetCount === 0,
    generate: () => ({
      message:
        "Start by adding an asset — a bank account, a property, even a vehicle. It helps your family know where to look when the time comes.",
      cta: { label: 'Add an Asset', route: 'assets' },
    }),
  },
]

const celebrationPrompts: PromptTemplate[] = [
  {
    condition: (ctx) => ctx.soulLogCount >= 10,
    generate: (ctx) => ({
      message: `You've captured ${ctx.soulLogCount} moments. Your family's legacy is growing beautifully.`,
    }),
  },
  {
    condition: (ctx) => ctx.completionPercent >= 50,
    generate: () => ({
      message:
        'Your estate is more than halfway organized. Most families never get this far.',
    }),
  },
  {
    condition: (ctx) =>
      ctx.soulLogCount >= 1 &&
      ctx.assetCount >= 1 &&
      ctx.documentCount >= 1 &&
      ctx.heirCount >= 1 &&
      ctx.heirloomCount >= 1 &&
      ctx.capsuleCount >= 1 &&
      ctx.directiveCount >= 1 &&
      ctx.memoirCount >= 1,
    generate: () => ({
      message:
        "Every section of your estate has at least one entry. That's remarkable — you're building something your family will treasure.",
    }),
  },
  {
    condition: (ctx) => ctx.soulLogCount >= 5,
    generate: (ctx) => ({
      message: `${ctx.soulLogCount} entries and counting. The story of your life is taking shape, one moment at a time.`,
    }),
  },
  {
    condition: (ctx) => ctx.completionPercent >= 75,
    generate: () => ({
      message:
        "You're almost there. Your estate plan is stronger than most — your family is lucky to have someone this thoughtful.",
    }),
  },
  {
    condition: (ctx) => ctx.completionPercent === 100,
    generate: () => ({
      message:
        'Your estate is complete. Everything is organized, protected, and ready. That is an extraordinary act of love.',
    }),
  },
]

// ─── Soul Log Recording Prompts ─────────────────────────────────────────────

export const SOUL_LOG_DAILY_PROMPTS = [
  'Tell the story of how you met your spouse.',
  "What's your earliest childhood memory?",
  'What do you want your children to know about your parents?',
  'Describe your favorite place in the world.',
  "What's the best advice you've ever received?",
  'Record a bedtime story for your grandchildren.',
  'What are you grateful for today?',
  'What was the hardest decision you ever made?',
  'Describe the meal your family always makes for holidays.',
  "If you could tell your 20-year-old self one thing, what would it be?",
  'What tradition do you hope your family carries forward?',
  "What's the bravest thing you've ever done?",
  'If you could relive one day, which would it be?',
  'What does home mean to you?',
  'What are you most proud of?',
  'Describe a moment that changed the course of your life.',
  'What lesson took you the longest to learn?',
  'What song always makes you think of someone you love?',
  'What do you hope people say about you when you are not in the room?',
  'Record a message for someone who needs to hear your voice today.',
]

// ─── Core Engine ────────────────────────────────────────────────────────────

/**
 * Returns a context-aware Shepherd prompt based on estate state.
 * Prioritizes: celebration > memory > people > completeness.
 * Uses a date-seeded random so the prompt is stable within a day.
 */
export function getShepherdPrompt(ctx: ShepherdContext): ShepherdPrompt {
  const pools = [
    celebrationPrompts,
    memoryPrompts,
    peoplePrompts,
    completenessPrompts,
  ]

  // Collect all applicable prompts across pools (priority order preserved)
  const applicable: ShepherdPrompt[] = []
  for (const pool of pools) {
    for (const tpl of pool) {
      if (tpl.condition(ctx)) {
        applicable.push(tpl.generate(ctx))
      }
    }
  }

  if (applicable.length === 0) {
    // Fallback: generic warm prompt
    return {
      message: `Welcome back, ${ctx.userName || 'friend'}. Your legacy is a gift — keep building it, one moment at a time.`,
      cta: { label: 'Record a Memory', route: 'soul-log' },
    }
  }

  // Date-seeded random: stable for the day, rotates daily
  const seed = dateSeed()
  return applicable[seed % applicable.length]
}

/**
 * Returns a daily Soul Log recording prompt, seeded by date.
 */
export function getDailySoulLogPrompt(): string {
  const seed = dateSeed()
  return SOUL_LOG_DAILY_PROMPTS[seed % SOUL_LOG_DAILY_PROMPTS.length]
}

// ─── Section-Contextual Nudges ─────────────────────────────────────────────

export type SectionNudgeId =
  | 'soul-log'
  | 'my-legacy'
  | 'memories'
  | 'letters'
  | 'my-people'
  | 'the-vault'
  | 'life-chapters'

interface SectionNudge {
  message: string
  condition?: (ctx: ShepherdContext) => boolean
}

const SECTION_NUDGES: Record<SectionNudgeId, SectionNudge[]> = {
  'soul-log': [
    { message: 'What made today different from yesterday?' },
    { message: 'If your children could hear one thing from you right now, what would it be?' },
    { message: 'What are you grateful for today?' },
    { message: 'Record something that made you laugh recently — your family will treasure it.' },
  ],
  'my-legacy': [
    {
      message: 'Your timeline is growing. Consider organizing entries into Life Chapters.',
      condition: (ctx) => ctx.soulLogCount >= 5,
    },
    { message: 'Every entry you add paints a richer picture of who you are.' },
    { message: 'Your legacy is more than assets — it is the story of your life.' },
  ],
  'memories': [
    { message: 'Do you have a family photo that tells a story? Upload it and add the context only you know.' },
    {
      message: 'You have heirlooms waiting for stories. Who should receive your most treasured possession?',
      condition: (ctx) => ctx.heirloomCount > 0,
    },
    { message: 'A 30-second video of you telling a story is worth more than any photograph.' },
  ],
  'letters': [
    {
      message: 'Have you written to each of your heirs individually? Personal letters are the most cherished gifts.',
      condition: (ctx) => ctx.heirCount > 0 && ctx.capsuleCount < ctx.heirCount,
    },
    { message: 'What would you want to say to someone on their wedding day — even if that day is years away?' },
    {
      message: 'You have directives in progress. Consider finalizing them while your wishes are fresh.',
      condition: (ctx) => ctx.directiveCount > 0,
    },
  ],
  'my-people': [
    {
      message: 'Have all your heirs accepted their invitations? Check their status below.',
      condition: (ctx) => ctx.heirCount > 0,
    },
    {
      message: 'Consider adding an executor — someone you trust to carry out your wishes.',
      condition: (ctx) => ctx.heirCount > 0,
    },
    { message: 'The people you add here will one day access the love and wisdom you are preserving.' },
  ],
  'the-vault': [
    {
      message: 'Your documents are encrypted with AES-256. Only authorized people can access them.',
    },
    {
      message: 'Upload key documents like your will, insurance policies, and property deeds.',
      condition: (ctx) => ctx.documentCount < 3,
    },
    { message: 'Every credential you add to the Lockbox saves your heirs hours of searching.' },
  ],
  'life-chapters': [
    { message: 'Think about the chapters of your life — what periods shaped who you are?' },
    { message: 'Start with the chapter that matters most to you. You can always reorganize later.' },
    {
      message: 'You have Soul Log entries that could be organized into chapters.',
      condition: (ctx) => ctx.soulLogCount >= 3,
    },
  ],
}

/**
 * Returns a section-specific Shepherd nudge, seeded by date.
 * Returns null if no nudge is applicable.
 */
export function getSectionNudge(
  section: SectionNudgeId,
  ctx: ShepherdContext,
): string | null {
  const nudges = SECTION_NUDGES[section]
  const applicable = nudges.filter((n) => !n.condition || n.condition(ctx))
  if (applicable.length === 0) return null
  const seed = dateSeed()
  return applicable[seed % applicable.length].message
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysSince(date: Date): number {
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Returns a numeric seed based on today's date (YYYYMMDD).
 * Deterministic within a calendar day, rotates daily.
 */
function dateSeed(): number {
  const now = new Date()
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
}
