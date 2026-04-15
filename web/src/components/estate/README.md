# Estate Components — Developer README

## Architecture

```
components/estate/
├── InviteTeamMember.tsx    # Team invitation form + member list
├── SectionEmptyState.tsx   # Section-themed empty states with SVG illustrations
├── SectionHeader.tsx       # Shared emotional section header
├── SettlementPanel.tsx     # Settlement transition UI
└── README.md               # This file
```

## SectionHeader

Shared header component that gives each of the 6 navigation groups (+ Life Chapters) a distinct visual identity.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `section` | `SectionId` | Yes | Which section theme to apply |
| `title` | `string` | No | Override the default section title |
| `subtitle` | `string` | No | Override the default tagline |
| `action` | `ReactNode` | No | Right-side action slot (button, badge, etc.) |
| `children` | `ReactNode` | No | Content below the header (search, tabs, stats) |

### Section Themes
| Section | Accent Color | Gradient |
|---------|-------------|---------|
| `soul-log` | Amber `#B8860B` | Warm cream |
| `my-legacy` | Royal Blue `#133378` | Soft indigo |
| `memories` | Rose `#9D174D` | Blush pink |
| `letters` | Sage `#4D7C4D` | Soft green |
| `my-people` | Teal `#0F766E` | Mint |
| `the-vault` | Steel `#334155` | Cool slate |
| `life-chapters` | Purple `#7C3AED` | Lavender |

### Usage
```tsx
<SectionHeader
  section="memories"
  title="Heirloom Registry"
  subtitle="Physical assets and family treasures."
  action={<Button>Add Heirloom</Button>}
/>
```

---

## SectionEmptyState

Section-themed empty state with SVG illustration, emotionally-aware copy, and CTA button.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `section` | `SectionId` | Yes | Which section theme to apply |
| `heading` | `string` | No | Override default heading |
| `message` | `string` | No | Override default message |
| `ctaLabel` | `string` | No | Override default CTA label |
| `onAction` | `() => void` | No | CTA click handler |
| `hideCta` | `boolean` | No | Hide the CTA button |

### Illustrations
Each section has a unique hand-drawn SVG illustration:
- Soul Log: Journal + heartbeat line
- Memories: Photo stack + film strip
- Letters: Envelope + wax seal + heart
- My People: Connected people + shield
- The Vault: Vault door + dial + bolts
- My Legacy / Life Chapters: Timeline + cards

---

## InviteTeamMember

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `estateId` | `string` | ✅ | The estate ID to manage invitations for |

### Dependencies
- `lib/invitations.ts` — Firestore CRUD for `estate_invitations` collection
- `lib/auth.tsx` — `useAuth()` for current user/profile
- `lib/firebase.ts` — Firestore instance (`db`)

### Firestore Collection: `estate_invitations`
```typescript
{
  estateId: string;
  email: string;
  fullName: string;
  role: 'executor' | 'heir' | 'legal' | 'cpa';
  invitedBy: string;       // UID of inviting principal
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  accessGranted: boolean;
  invitedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Security Rules
- **Read**: Principal (estate owner), invitee (by email match), admin
- **Create**: Principal or admin only; must include required fields; status must be 'pending'
- **Update**: Principal or admin
- **Delete**: Principal or admin (used for revoke)

### Access Control
- Only users with `role === 'principal'` or `role === 'admin'` see the invite form
- Fiduciary users see the member list but cannot invite or revoke

### Known Limitations
1. Email notifications are not yet wired (requires SendGrid/Cloud Function)
2. Invitation acceptance flow is manual (invitee registers, then matched by email)
3. No duplicate invitation check (same email + estate can be invited twice)

### Future Work
- Cloud Function to send invitation emails via SendGrid
- Auto-match: when a user registers with a matching email, auto-create `estate_users` record
- Invitation expiration (e.g., 30 days)
