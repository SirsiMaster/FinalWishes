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

## Configuration Guide (Activating Payments)

To go live, you must update the placeholder values in `payment.html`.

### 1. Activating Stripe (Recurring Configuration)

To achieve the "Set and Forget" automation, we use **Recurring** intervals.

#### **Link 1: Plan A (Launch Milestone)**
- **Type**: Recurring (**Custom -> Every 5 Months**)
- **Price**: `$100,000.00`
- **Name**: "Plan A: Milestone Subscription"
- **Logic**: Charges $100k Today. Next charge is in ~5 months (approx May). Admin can cancel after 2nd payment.

#### **Link 2: Plan B (Trimester)**
- **Type**: Recurring (**Custom -> Every 2 Months**)
- **Price**: `$66,666.67`
- **Name**: "Plan B: Trimester Subscription"
- **Logic**: Charges $66k Today. Next charge in 2 months (Feb), then 4 months (Apr).

#### **Link 3: Plan C (Equity Bundle)**
*This relies on bundling a One-Time fee with a Subscription.*
1.  **Product 1 (The Adjustment)**:
    - Type: **One-Time**
    - Price: `$25,000.00`
2.  **Product 2 (The Core)**:
    - Type: **Recurring (Custom -> Every 2 Months)**
    - Price: `$50,000.00`
- **Logic**: Today = $75k ($25k + $50k). Future = $50k every 2 months.



### 2. Activating Chase (Wire Transfer)
1.  Obtain your **Incoming Wire Instructions** from Chase Commercial Banking.
2.  In `payment.html`, update the HTML text in the "Chase Option" section:
    - **Bank Name**: Replace `JPMORGAN CHASE BANK, N.A.`
    - **Beneficiary**: Replace `SIRSI TECHNOLOGIES INC`
    - **Routing Number**: Replace `021000021`
    - **Account Number**: Replace `XXXXXXXX9088`
3.  **Important**: Also update the `getInvoiceTemplateHTML()` function so the generated PDF receipts match the displayed instructions.
