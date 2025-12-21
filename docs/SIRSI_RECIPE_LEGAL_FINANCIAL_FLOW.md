# SIRSI COMPONENT: Legal & Financial Workflow (Contracts -> Sign -> Payment)

**Version:** 1.0.0
**Dependencies:** TailwindCSS, Firebase (Auth/Functions), html2pdf.js, OpenSign (API)

## Overview
This component implements a secure, legally binding workflow for selecting a service plan, executing a Master Services Agreement (MSA) via digital signature, and processing an initial milestone payment with automatic receipt generation.

## Flow Architecture
The workflow consists of three distinct phases handled by three separate HTML files:

| Phase | File | Functionality |
| :--- | :--- | :--- |
| **1. Presentation** | `contracts.html` | Plan selection, dynamic terms (Exhibit B), and e-signature initiation. |
| **2. Signature** | `sign.html` | Secure iframe tunnel for OpenSign execution. |
| **3. Payment** | `payment.html` | Invoice presentation, Stripe/Wire selection, and automatic receipt emailing. |

---

## 1. Contracts Interface (`contracts.html`)
The entry point for the user. Handles plan configuration and acts as the "Proposal".

### Key Features
- **Plan Selection API**: `selectContractPlan(planName, btn)` updates the UI and `currentStep` state.
- **Dynamic Terms**: Updates "Exhibit B" content based on the selected plan using standardized HTML templates.
- **Signature Execution**: Calls `initiateOpenSign()` which contacts the backend to create an envelope and returns a signing URL.

### Usage
```javascript
// Initialize Flow
selectContractPlan('Plan A', this); // Step 2
initiateOpenSign(); // Step 3 -> Redirects to sign.html
```

---

## 2. Secure Signing Tunnel (`sign.html`)
A minimal, secure container for the e-signature iframe.

### Key Logic
- Checks `sessionStorage.getItem('signingUrl')` for the secure link.
- Redirects back to `payment.html` upon successful completion logic (handled by OpenSign callback or redirect).
- **Security**: Uses a minimal DOM to prevent interference.

---

## 3. Payment & Receipt (`payment.html`)
The landing page after successful contract execution.

### Key Features
- **Invoice Generation**: Uses `html2pdf.js` to client-side render a professional PDF invoice.
- **Auto-Receipt**: Automatically emails the invoice to the logged-in user upon page load using `firebase.functions().httpsCallable('sendContractEmail')`.
- **Payment Options**: Toggles between Stripe (Card) and Chase (Wire) instructions.

### Automatic Email Logic
Ensure Firebase Auth is initialized. The script automatically checks for a user and triggers `emailReceipt()`.

```javascript
// Internal Logic
async function emailReceipt() {
    const pdfBase64 = await generatePDFBase64();
    await firebase.functions().httpsCallable('sendContractEmail')({
        email: user.email,
        pdfBase64: pdfBase64,
        documentType: 'Payment Receipt'
    });
}
```

## Integration Guide
To use this component in another project:
1. **Copy Files**: `contracts.html`, `sign.html`, `payment.html` to your protected directory.
2. **Assets**: Ensure `admin-layout.css` and `firebase-init.js` are accessible.
3. **Backend**: Requires a Firebase Function `sendContractEmail` and an OpenSign integration.

## Customization
- **Theme**: Uses CSS variables in `admin-layout.css`.
- **Products**: Modify `selectContractPlan` content in `contracts.html` to change pricing/terms.
