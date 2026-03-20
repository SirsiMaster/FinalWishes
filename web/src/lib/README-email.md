# Email System — Developer Documentation

## Architecture (Buy Decision — Firebase Extension)

Instead of building a custom Go email service (~500+ lines), we use the **Firebase Trigger Email Extension** — a Google-maintained, battle-tested solution that handles:
- Email delivery via SendGrid SMTP
- Handlebars template rendering
- Automatic retries on failure
- Delivery status tracking in Firestore

```
React → Firestore `mail` collection → Firebase Extension → SendGrid SMTP → Recipient
```

### Why Not Custom Go?

| Factor | Custom Go | Firebase Extension |
|--------|-----------|-------------------|
| Lines of code | ~500 | **0** (extension) + 200 TS helpers |
| Template engine | Build it | **Handlebars** (built-in) |
| Retry logic | Build it | **Built-in** (configurable) |
| Bounce handling | Build it | **SendGrid handles** |
| SMTP management | Build it | **Extension handles** |
| Maintenance | Ours forever | **Google maintains** |
| Cost | $0 + SendGrid | **$0 + SendGrid** |
| Time to implement | 2-3 days | **2-3 hours** |

## File Structure

```
web/src/lib/
├── email.ts              # Email helper functions (Firestore writes)
└── firebase.ts           # Firebase SDK initialization

scripts/
└── seed-email-templates.js   # Seed Handlebars templates to Firestore

extensions/
└── firestore-send-email.env  # Extension configuration

firestore.rules            # §9: mail + email_templates rules
firebase.json              # Extensions manifest
```

## How It Works

### Sending an Email

```typescript
import { sendInvitationEmail } from '@/lib/email';

// This writes a document to the `mail` Firestore collection.
// The Firebase Extension picks it up and sends via SendGrid.
await sendInvitationEmail({
  recipientEmail: 'heir@example.com',
  recipientName: 'Jane Doe',
  estateName: 'The Lockhart Estate',
  role: 'executor',
  inviterName: 'Cylton Collymore',
});
```

### Using the React Hook

```typescript
import { useEmailService } from '@/lib/email';

function InviteForm() {
  const { sendInvitation } = useEmailService();

  const handleInvite = async () => {
    await sendInvitation({
      recipientEmail: formData.email,
      recipientName: formData.name,
      estateName: currentEstate.name,
      role: formData.role,
      inviterName: user.displayName,
    });
  };
}
```

## Available Email Functions

| Function | Trigger | Template |
|----------|---------|----------|
| `sendInvitationEmail()` | Team member invited | `invitation` |
| `sendWelcomeEmail()` | User registration | `welcome` |
| `sendNotificationEmail()` | Estate deadline/update | `notification` |
| `sendPasswordResetNotification()` | Password reset | Inline HTML |

## Email Templates

Stored in Firestore `email_templates` collection. Each document:
- **ID:** Template name (e.g., `invitation`)
- **subject:** Handlebars subject line
- **html:** Full HTML with Handlebars variables

### Customizing Templates

Templates use Royal Neo-Deco styling:
- **Header:** Royal Blue gradient + Cinzel gold heading
- **Body:** White background, Inter font, dark text
- **CTA:** Metallic Gold button (`#C8A951`)
- **Footer:** AES-256 security badge

Modify templates directly in Firestore Console or re-run the seed script.

## Firestore Security Rules

```
mail/{mailId}
  ├── read:  authenticated + own documents only
  ├── create: authenticated users
  └── update/delete: DENIED (extension manages)

email_templates/{templateId}
  ├── read:  authenticated
  └── write: admin only
```

## Setup / Deployment

### 1. Create SendGrid API Key

1. Go to [sendgrid.com](https://sendgrid.com) → Settings → API Keys
2. Create key with "Mail Send" permission
3. Copy the key

### 2. Deploy Extension

```bash
# The extension is registered in firebase.json
# Deploy with SendGrid credentials:
firebase deploy --only extensions --project=finalwishes-prod

# When prompted for SMTP_PASSWORD, paste your SendGrid API key
# The extension stores it in Secret Manager automatically
```

### 3. Seed Templates

```bash
cd functions
GOOGLE_CLOUD_PROJECT=finalwishes-prod node -e "..."
# Or run: node ../scripts/seed-email-templates.js
```

## Environment

| Variable | Where | Value |
|----------|-------|-------|
| `MAIL_COLLECTION` | Extension config | `mail` |
| `TEMPLATES_COLLECTION` | Extension config | `email_templates` |
| `DEFAULT_FROM` | Extension config | `FinalWishes <noreply@finalwishes.app>` |
| `SMTP_PASSWORD` | Secret Manager | SendGrid API Key |
