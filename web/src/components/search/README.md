# Search — Developer README

## Architecture

```
components/search/
├── SearchResults.tsx   # Dropdown for estate-wide search results
└── README.md           # This file
```

---

## SearchResults

Renders below the AdminHeader search input as an absolutely-positioned dropdown. Supports keyboard navigation (↑↓ Enter Esc) and mouse interaction.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `results` | `SearchResult[]` | Yes | Array of search results from `useEstateSearch` |
| `loading` | `boolean` | Yes | Whether the search query is still loading |
| `query` | `string` | Yes | The current search query text |
| `activeIndex` | `number` | Yes | Currently highlighted result index (-1 = none) |
| `onSelect` | `(result: SearchResult) => void` | Yes | Callback when a result is selected |
| `onActiveIndexChange` | `(index: number) => void` | Yes | Callback when keyboard/mouse changes active item |

### States
1. **Empty query** — "Type to search across your estate"
2. **Too short** (< 2 chars) — "Type at least 2 characters"
3. **Loading** — Spinner + "Searching..."
4. **No results** — "No results found"
5. **Results** — Scrollable list grouped by type with icon, title, subtitle, and type badge

### Result Types
Defined in `lib/search.ts` (`TYPE_META`). Each result includes an `icon` field mapped to inline SVGs: DollarSign, Lock, Users, Key, FileText, Clock, Diamond, Video.

### Accessibility
- `role="listbox"` on the container
- `role="option"` + `aria-selected` on each item
- `aria-live="polite"` for screen reader announcements
- Keyboard shortcut hints in the footer (↑↓ navigate, ↵ select)

### Dependencies
- `lib/search.ts` — `SearchResult` type, `TYPE_META` metadata
- `components/ui/badge.tsx` — Type badge
- `components/ui/scroll-area.tsx` — Scrollable result list
