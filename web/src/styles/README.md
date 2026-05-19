# Styles — Developer README

## Architecture

```
styles/
├── globals.css   # Root design tokens, TailwindCSS v4 imports, Royal Neo-Deco system
└── README.md     # This file
```

## globals.css

Single entry point for all CSS. Imported by the Vite build via the root layout.

### Imports
1. `tailwindcss` — TailwindCSS v4 core
2. `tw-animate-css` — Animation utilities
3. `shadcn/tailwind.css` — shadcn/ui component tokens
4. `@fontsource-variable/geist` — Geist font (body fallback)

### Design Token Layers

**Primary Foundation (Royal Neo-Deco):**
| Token | Value | Usage |
|-------|-------|-------|
| `--royal` | `#133378` | Heritage Royal — headers, borders, nav |
| `--royal-blue` | `#1E3A5F` | Primary accent |
| `--royal-bright` | `#2563EB` | Interaction highlight (hover, focus) |
| `--gold` | `#C8A951` | Metallic Gold — CTAs, badges, accents |
| `--gold-bright` | `#D4AF37` | Bright gold variant |

**Semantic:**
| Token | Value |
|-------|-------|
| `--success` | `#10B981` |
| `--warning` | `#F59E0B` |
| `--danger` | `#EF4444` |

**Typography:**
| Token | Value |
|-------|-------|
| `--font-cinzel` | `'Cinzel', serif` — Headings (uppercase, tracked) |
| `--font-inter` | `'Inter', sans-serif` — Body text |

**Layout Spacing:**
| Token | Value |
|-------|-------|
| `--sidebar-width` | `280px` |
| `--header-height` | `80px` |

### Color Firewall
Royal Neo-Deco is EXCLUSIVE to FinalWishes. Never use Sirsi's Emerald (`#047857`) as a primary color here — that belongs to the Sirsi brand. FinalWishes uses Royal Blue + Gold.

### Dark Mode
Not implemented. `color-scheme: only light` is set to prevent Chrome Auto Dark Mode from inverting the landing page.
