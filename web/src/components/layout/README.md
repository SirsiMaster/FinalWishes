# Layout Components — Developer README

## Architecture

```
components/layout/
├── AdminHeader.tsx      # Sticky top header — search, authority mode, avatar, notifications
├── Sidebar.tsx          # Desktop sidebar + MobileSidebar (Sheet) — role-filtered navigation
├── NotificationBell.tsx # Real-time notification dropdown (Firestore onSnapshot)
└── README.md            # This file
```

The layout shell is assembled in `routes/estates.$estateId.tsx`, which renders `Sidebar` + `AdminHeader` + `<Outlet />`.

---

## AdminHeader

Sticky header bar at the top of every estate page.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Page title (Cinzel uppercase) |
| `subtitle` | `string` | No | Subtitle below title (desktop only) |
| `onMenuClick` | `() => void` | No | Opens the MobileSidebar |

### Features
- **Search:** Estate-wide search powered by `lib/search.ts` (`useEstateSearch`). Keyboard navigation (↑↓ Enter Esc). Results rendered via `SearchResults` component.
- **Authority Mode Simulator:** Owner / Incapacity / Settlement toggle (desktop only, `lg:` breakpoint). Visual-only in current version.
- **Avatar Dropdown:** Profile photo modal + Sign Out. Uses shadcn `DropdownMenu`.
- **Mobile hamburger:** Hidden on `md:` and up.

### Dependencies
- `lib/auth.tsx` — `useAuth()` for profile and signOut
- `lib/search.ts` — `useEstateSearch()` hook
- `components/search/SearchResults.tsx` — dropdown rendering
- `components/layout/NotificationBell.tsx` — bell icon + badge

---

## Sidebar / MobileSidebar

Role-filtered navigation with collapsible groups.

### Exports
| Export | Description |
|--------|-------------|
| `Sidebar` | Desktop sidebar — `hidden md:flex`, fixed left, full height |
| `MobileSidebar` | Mobile drawer — shadcn `Sheet` (slide from left), controlled by `open`/`onOpenChange` |

### Role-Based Navigation

Each user role sees only the sections they're authorized to access:

| Role | Sections |
|------|----------|
| `principal` / `admin` | All 18 sections |
| `executor` | Dashboard, Life Chapters, Assets, Heirlooms, Beneficiaries, Obituary, Vault, Lockbox, Directives, Notifications, Events, Probate |
| `heir` | Dashboard, Life Chapters, Assets, Memoirs, Obituary, Directives, Notifications |
| `legal` | Dashboard, Assets, Vault, Directives, Notifications |
| `cpa` | Dashboard, Assets, Vault, Notifications |

Permissions are defined in `ROLE_PERMISSIONS` and `ROLE_LABELS` at the top of `Sidebar.tsx`.

### Navigation Groups
7 main groups (Soul Log, My Legacy, Memories, Letters, My People, The Vault, Estate Settlement) + 3 utility items (Notifications, Upgrade Plan, Settings). Groups with children use collapsible accordion behavior.

### CSS Variables
- `--sidebar-width: 280px` (set in `globals.css`)
- `--sidebar-bg: #FFFFFF` (default)
- `--header-height: 80px`

---

## NotificationBell

Real-time unread notification badge + dropdown.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `estateId` | `string` | Yes | The active estate ID |

### Behavior
- Subscribes to `useUnreadNotifications(estateId)` (Firestore `onSnapshot` query)
- Shows red badge with unread count (max "9+")
- Dropdown lists recent notifications with type-colored badges (security, activity, success, warning, error)
- "Mark all read" button calls `markAllNotificationsRead()`
- "View All Activity" navigates to `/estates/:id/notifications`

### Dependencies
- `lib/firestore.ts` — `useUnreadNotifications()` hook
- `lib/estate-actions.ts` — `markNotificationRead()`, `markAllNotificationsRead()`
