# How Email Notifications Work

## What Emails Will I Receive?

FinalWishes sends you emails to keep you informed about important events in your estate. You will never receive spam or marketing emails from us.

### Types of Emails

| Email | When It's Sent | Who Receives It |
|-------|---------------|-----------------|
| **Welcome** | When you create your account | You |
| **Invitation** | When someone adds you to an estate | The person being invited |
| **Estate Notification** | Deadline reminders, document updates | Estate members |
| **Security Alert** | Password reset, login from new device | You |

## Can I Control Which Emails I Receive?

Yes. In your **Settings** page, you can choose your notification preferences:
- **Email notifications** — Turn on or off
- **Frequency** — Immediate, daily digest, or weekly summary

Security alerts (password resets, suspicious login attempts) cannot be turned off — they're essential for protecting your account.

## Are My Emails Secure?

- Emails are sent through the **Gmail API** using domain-wide delegation, keeping all email delivery within Google's infrastructure.
- We never include sensitive information (SSN, account numbers) in email content.
- Invitation emails contain a link to log in — they do not expose any estate details.

## Multi-Factor Authentication

For added security, FinalWishes supports **TOTP-based Multi-Factor Authentication** (MFA). When enabled:
- You'll use an authenticator app (such as Google Authenticator, Authy, or 1Password) to generate a 6-digit code when logging in
- This is powered by Firebase Authentication (Google's infrastructure)

You can enable TOTP MFA in **Settings → Security → Multi-Factor Authentication**.

## Questions?

Contact us at **support@sirsi.ai**.
