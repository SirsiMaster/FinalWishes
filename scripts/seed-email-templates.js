/**
 * Seed script: Populate email_templates collection in Firestore.
 *
 * These Handlebars templates are used by the Firebase Trigger Email extension.
 * Run once: node --experimental-specifier-resolution=node scripts/seed-email-templates.js
 *
 * Templates use the Royal Neo-Deco design language (Cinzel + Inter,
 * Royal Blue + Metallic Gold).
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS or gcloud auth)
const app = initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'finalwishes-prod',
});

const db = getFirestore(app);

const BRAND = {
  primaryBlue: '#1E3A5F',
  accentBlue: '#2563EB',
  gold: '#C8A951',
  darkText: '#0F172A',
  lightGray: '#F9FAFB',
  border: '#E5E7EB',
};

function layout(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${BRAND.lightGray}; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { background: linear-gradient(135deg, ${BRAND.primaryBlue}, ${BRAND.accentBlue}); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { color: ${BRAND.gold}; font-family: Cinzel, Georgia, serif; margin: 0; font-size: 28px; letter-spacing: 2px; }
    .header p { color: rgba(255,255,255,0.7); font-size: 12px; margin: 8px 0 0; letter-spacing: 1px; text-transform: uppercase; }
    .body { background: #ffffff; padding: 32px 24px; border-left: 1px solid ${BRAND.border}; border-right: 1px solid ${BRAND.border}; }
    .body h2 { color: ${BRAND.primaryBlue}; font-family: Cinzel, Georgia, serif; font-size: 20px; margin-top: 0; }
    .body p { color: ${BRAND.darkText}; font-size: 15px; line-height: 1.6; }
    .cta { display: inline-block; background: ${BRAND.gold}; color: ${BRAND.primaryBlue}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .badge { display: inline-block; background: ${BRAND.primaryBlue}; color: #ffffff; padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; }
    .footer { background: ${BRAND.lightGray}; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid ${BRAND.border}; border-top: none; text-align: center; }
    .footer p { color: #6B7280; font-size: 12px; margin: 4px 0; }
    .footer a { color: ${BRAND.accentBlue}; text-decoration: none; }
    .divider { border: none; border-top: 1px solid ${BRAND.border}; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FinalWishes</h1>
      <p>The Estate Operating System</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; {{year}} FinalWishes. All rights reserved.</p>
      <p>Your data is protected with AES-256 encryption.</p>
      <p><a href="https://finalwishes-prod.web.app">finalwishes.app</a> &middot; <a href="mailto:support@finalwishes.app">support@finalwishes.app</a></p>
    </div>
  </div>
</body>
</html>`;
}

const templates = {
  invitation: {
    subject: "You've been invited to {{estateName}} — FinalWishes",
    html: layout(`
      <h2>You're Invited</h2>
      <p>Hello {{recipientName}},</p>
      <p><strong>{{inviterName}}</strong> has invited you to join the <strong>{{estateName}}</strong> estate as a <span class="badge">{{role}}</span>.</p>
      <p>FinalWishes helps families organize assets, documents, and beneficiary designations in one secure place.</p>
      <hr class="divider" />
      <p style="text-align: center;">
        <a href="{{inviteLink}}" class="cta">Accept Invitation</a>
      </p>
      <p style="font-size: 13px; color: #6B7280;">If you weren't expecting this invitation, you can safely ignore this email.</p>
    `),
  },

  welcome: {
    subject: 'Welcome to FinalWishes — Your Estate Operating System',
    html: layout(`
      <h2>Welcome, {{firstName}}!</h2>
      <p>Thank you for creating your FinalWishes account. You've taken the first step toward organizing your legacy.</p>
      <p>Here's what you can do next:</p>
      <ul style="color: ${BRAND.darkText}; line-height: 2;">
        <li><strong>Create an estate</strong> — Start organizing your assets and documents.</li>
        <li><strong>Add beneficiaries</strong> — Designate who receives what.</li>
        <li><strong>Upload documents</strong> — Securely store wills, trusts, and deeds.</li>
        <li><strong>Invite your team</strong> — Add executors, legal counsel, or CPAs.</li>
      </ul>
      <p style="text-align: center;">
        <a href="{{loginUrl}}" class="cta">Go to Dashboard</a>
      </p>
    `),
  },

  notification: {
    subject: '[{{estateName}}] {{notificationType}} — FinalWishes',
    html: layout(`
      <h2>{{notificationType}}</h2>
      <p>Hello {{recipientName}},</p>
      <p>This is a notification regarding the <strong>{{estateName}}</strong> estate:</p>
      <div style="background: ${BRAND.lightGray}; padding: 16px; border-radius: 8px; border-left: 4px solid ${BRAND.gold}; margin: 16px 0;">
        <p style="margin: 0;">{{message}}</p>
      </div>
      {{#if actionUrl}}
      <p style="text-align: center;">
        <a href="{{actionUrl}}" class="cta">View Details</a>
      </p>
      {{/if}}
    `),
  },
};

async function seedTemplates() {
  console.log('Seeding email templates to Firestore...');

  for (const [name, template] of Object.entries(templates)) {
    await db.collection('email_templates').doc(name).set(template);
    console.log(`  ✅ Template "${name}" created`);
  }

  console.log('\nAll templates seeded successfully.');
  console.log('Collection: email_templates');
  console.log('Templates:', Object.keys(templates).join(', '));
}

seedTemplates().catch(console.error);
