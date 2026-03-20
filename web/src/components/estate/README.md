# Estate Components — Developer README

## Architecture

```
components/estate/
├── InviteTeamMember.tsx    # Team invitation form + member list
└── README.md               # This file
```

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
