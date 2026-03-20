# FinalWishes — Identity & Authentication Workflow Diagrams
**Version:** 1.0.0 · **Date:** March 19, 2026 · **ADR:** 034 (Firebase Auth), 035 (Tiered Identity)

> [!IMPORTANT]
> These diagrams are the canonical source of truth for all authentication, identity verification, and access control flows in FinalWishes.

---

## 1. Complete Auth State Machine

The master state diagram showing every possible user state and transition:

```mermaid
stateDiagram-v2
    [*] --> Anonymous: Visit Site
    
    Anonymous --> Registering: Click "Create Account"
    Anonymous --> SigningIn: Click "Sign In"
    Anonymous --> DemoMode: ?demo=true
    
    Registering --> EmailUnverified: Registration Success
    Registering --> Anonymous: Registration Failed
    
    SigningIn --> Authenticated: Credentials Valid (No MFA)
    SigningIn --> MFAChallenge: Credentials Valid (MFA Enrolled)
    SigningIn --> Anonymous: Invalid Credentials
    
    MFAChallenge --> Authenticated: TOTP Code Valid
    MFAChallenge --> SigningIn: Code Invalid (3 attempts)
    
    EmailUnverified --> Authenticated: Email Verified
    EmailUnverified --> EmailUnverified: Resend Verification
    
    Authenticated --> IdentityGated: Fiduciary Role + Missing MFA/Attestation
    Authenticated --> FullAccess: Principal Role
    Authenticated --> FullAccess: Fiduciary + MFA + Attestation
    
    IdentityGated --> MFAEnrolling: Step 1 (Enable MFA)
    MFAEnrolling --> AttestationPending: MFA Complete
    AttestationPending --> FullAccess: Attestation Signed
    
    FullAccess --> Anonymous: Sign Out
    
    DemoMode --> FullAccess: Bypass Auth
    
    note right of FullAccess
        Access to all estate
        documents and features
    end note
    
    note right of IdentityGated
        Fiduciary roles:
        heir, executor,
        legal, cpa
    end note
```

---

## 2. Registration Flow

```mermaid
flowchart TD
    A["User visits /login"] --> B{"Has account?"}
    B -->|No| C["Switch to Sign Up mode"]
    B -->|Yes| D["Sign In flow (see §3)"]
    
    C --> E["Enter: First Name, Last Name,<br/>Email, Username, Password"]
    E --> F{"Validate inputs"}
    
    F -->|"Username taken"| G["❌ Error: Username unavailable"]
    G --> E
    F -->|"Weak password"| H["❌ Error: Password too weak"]
    H --> E
    F -->|"Valid"| I["Firebase: createUserWithEmailAndPassword"]
    
    I --> J["Firebase: updateProfile (displayName)"]
    J --> K["Firestore: setDoc users/{uid}"]
    
    K --> L{"Write user profile"}
    L --> M["uid, email, username,<br/>firstName, lastName,<br/>displayName, role: 'principal',<br/>status: 'active'"]
    
    M --> N["Firestore: setDoc usernames/{username}"]
    N --> O["email, uid (lookup index)"]
    
    O --> P["Firebase: sendEmailVerification"]
    P --> Q["✅ Redirect to Dashboard"]
    
    Q --> R["🟡 Email Verification Banner shown"]
    R --> S{"User clicks email link?"}
    S -->|Yes| T["✅ emailVerified = true<br/>Banner disappears"]
    S -->|"Resend"| P

    style A fill:#1E3A5F,color:#fff
    style Q fill:#059669,color:#fff
    style G fill:#DC2626,color:#fff
    style H fill:#DC2626,color:#fff
    style R fill:#C8A951,color:#000
```

---

## 3. Sign-In Flow (Email or Username)

```mermaid
flowchart TD
    A["User enters identifier + password"] --> B{"Is identifier an email?<br/>(contains @)"}
    
    B -->|"Yes"| D["Use email directly"]
    B -->|"No (username)"| C["Firestore: getDoc<br/>usernames/{identifier.toLowerCase()}"]
    
    C --> C1{"Username found?"}
    C1 -->|No| E["❌ Error: Account not found"]
    C1 -->|Yes| C2["Extract email from doc"]
    C2 --> D
    
    D --> F["Firebase: signInWithEmailAndPassword"]
    
    F --> G{"Result?"}
    G -->|"Success"| H["Load profile from<br/>Firestore users/{uid}"]
    G -->|"auth/wrong-password"| I["❌ Invalid credentials"]
    G -->|"auth/user-not-found"| E
    G -->|"auth/multi-factor-<br/>auth-required"| J["🔐 MFA Challenge"]
    
    J --> K["Extract MFA Resolver"]
    K --> L["Show TOTP Code Input<br/>(6-digit, monospaced)"]
    L --> M{"User enters code"}
    M --> N["resolveTotpChallenge(resolver, code)"]
    N --> N1{"Valid?"}
    N1 -->|Yes| H
    N1 -->|No| O["❌ Invalid code, try again"]
    O --> L
    
    H --> P{"Profile exists<br/>in Firestore?"}
    P -->|Yes| Q["✅ Authenticated"]
    P -->|No| R["Auto-create profile<br/>from Firebase user data"]
    R --> Q
    
    Q --> S["Navigate to /dashboard<br/>or /estates/:id"]

    style A fill:#1E3A5F,color:#fff
    style Q fill:#059669,color:#fff
    style J fill:#C8A951,color:#000
    style E fill:#DC2626,color:#fff
    style I fill:#DC2626,color:#fff
```

---

## 4. MFA TOTP Enrollment Flow

```mermaid
flowchart TD
    A["User opens Settings"] --> B{"MFA Status?"}
    
    B -->|"Already enrolled"| C["🟢 Show: Authenticator Active<br/>+ Remove 2FA button"]
    B -->|"Not enrolled"| D["Show: Enable 2FA button"]
    
    C --> C1{"Is Fiduciary?"}
    C1 -->|Yes| C2["🔒 Remove button disabled<br/>'Required — Cannot Remove'"]
    C1 -->|No| C3["Enable Remove button"]
    C3 --> C4{"Click Remove?"}
    C4 -->|Yes| C5["multiFactor.unenroll(totpFactor)"]
    C5 --> C6["✅ MFA Removed"]
    
    D --> E{"Click Enable 2FA?"}
    E -->|Yes| F["multiFactor.getSession()"]
    F --> G["TotpMultiFactorGenerator<br/>.generateSecret(session)"]
    G --> H["Generate QR URL:<br/>totpSecret.generateQrCodeUrl()"]
    H --> I["Display QR Code<br/>(qrcode.react)"]
    
    I --> J["User scans with<br/>Google Authenticator /<br/>1Password / Authy"]
    J --> K["User enters 6-digit code"]
    K --> L["TotpMultiFactorGenerator<br/>.assertionForEnrollment(secret, code)"]
    L --> M["multiFactor.enroll(assertion,<br/>'Authenticator App')"]
    
    M --> N{"Verification result?"}
    N -->|"Success"| O["✅ MFA Active<br/>Show green status"]
    N -->|"Invalid code"| P["❌ Try again"]
    P --> K

    style A fill:#1E3A5F,color:#fff
    style O fill:#059669,color:#fff
    style C2 fill:#C8A951,color:#000
    style P fill:#DC2626,color:#fff
```

---

## 5. Tiered Identity Verification Gate (ADR-035)

```mermaid
flowchart TD
    A["User accesses<br/>/estates/:id/*"] --> B["AuthGuard:<br/>Is authenticated?"]
    
    B -->|No| C["Redirect to /login"]
    B -->|Yes| D["IdentityGate:<br/>Check user role"]
    
    D --> E{"User Role?"}
    
    E -->|"principal / admin"| F["✅ PASS THROUGH<br/>Tier 1: No gate"]
    
    E -->|"heir / executor /<br/>legal / cpa"| G["Tier 2: Fiduciary<br/>Check requirements"]
    
    G --> H{"MFA Enrolled?"}
    H -->|No| I["🚫 BLOCKED<br/>Show Step 1:<br/>'Enable Two-Factor Auth'"]
    I --> I1["Link: Go to Settings →"]
    I1 --> I2["MFA Enrollment flow (§4)"]
    
    H -->|Yes| J{"Attestation<br/>Signed?"}
    J -->|No| K["🚫 BLOCKED<br/>Show Step 2:<br/>'Sign Identity Attestation'"]
    K --> K1["Link: Sign Attestation →"]
    K1 --> K2["Attestation flow (§6)"]
    
    J -->|Yes| L["✅ PASS THROUGH<br/>Both requirements met"]
    
    F --> M["Render estate content:<br/>Dashboard, Vault, Assets,<br/>Beneficiaries, etc."]
    L --> M

    style A fill:#1E3A5F,color:#fff
    style F fill:#059669,color:#fff
    style L fill:#059669,color:#fff
    style I fill:#DC2626,color:#fff
    style K fill:#C8A951,color:#000
    style C fill:#DC2626,color:#fff
```

---

## 6. Identity Attestation Signing Flow

```mermaid
flowchart TD
    A["User navigates to<br/>/estates/:id/attestation"] --> B["Load AttestationForm"]
    
    B --> C["Display legal declaration:<br/>'I, [Full Name], attest under<br/>penalty of perjury...'"]
    
    C --> D["Dynamic fields populated:<br/>• Full legal name (from profile)<br/>• Role label (heir/executor/etc.)<br/>• Estate name"]
    
    D --> E["User reads 4 statements:<br/>1. False info → penalties<br/>2. Access contingent on accuracy<br/>3. Permanent record<br/>4. Principal can revoke"]
    
    E --> F["User draws signature<br/>on canvas pad"]
    
    F --> G["User checks acknowledgment:<br/>'I understand this is<br/>legally binding'"]
    
    G --> H{"Both complete?<br/>hasSigned && acknowledged"}
    H -->|No| I["Submit button disabled"]
    
    H -->|Yes| J["Click 'Sign & Submit'"]
    J --> K["Capture signature as<br/>base64 PNG data URL"]
    
    K --> L["Firestore: setDoc<br/>attestations/{uid}_{estateId}"]
    
    L --> M["Store:<br/>uid, estateId, role,<br/>fullLegalName, attestationText,<br/>signatureData, signedAt,<br/>userAgent, status: 'verified'"]
    
    M --> N["✅ Success screen:<br/>'Identity Verified'"]
    N --> O["Page reload →<br/>IdentityGate re-checks →<br/>Grants access"]

    style A fill:#1E3A5F,color:#fff
    style N fill:#059669,color:#fff
    style I fill:#94A3B8,color:#fff
```

---

## 7. Route Protection Hierarchy

```mermaid
flowchart LR
    subgraph Public["🌐 Public (No Auth)"]
        LP["/ Landing Page"]
        LG["/login"]
        UN["Firestore: usernames/*<br/>(read-only)"]
    end
    
    subgraph Authenticated["🔑 AuthGuard (Login Required)"]
        DB["/dashboard/*"]
        ST["/dashboard/settings"]
    end
    
    subgraph Gated["🛡 IdentityGate (MFA + Attestation for Fiduciaries)"]
        ED["/estates/:id/dashboard"]
        EA["/estates/:id/assets"]
        EV["/estates/:id/vault"]
        EB["/estates/:id/beneficiaries"]
        EO["/estates/:id/obituary"]
        EM["/estates/:id/memoirs"]
        EN["/estates/:id/notifications"]
        ES["/estates/:id/settings"]
        EE["/estates/:id/estates"]
        AT["/estates/:id/attestation"]
    end
    
    Public --> Authenticated
    Authenticated --> Gated

    style Public fill:#E2E8F0,color:#1E293B
    style Authenticated fill:#DBEAFE,color:#1E3A5F
    style Gated fill:#FEF3C7,color:#92400E
```

---

## 8. Firestore Data Flow

```mermaid
flowchart TD
    subgraph Registration["Registration"]
        R1["Firebase Auth<br/>createUser"] --> R2["Firestore<br/>users/{uid}"]
        R1 --> R3["Firestore<br/>usernames/{username}"]
    end
    
    subgraph Login["Login"]
        L1["Firestore<br/>usernames/{username}"] -->|"resolve email"| L2["Firebase Auth<br/>signIn"]
        L2 -->|"on success"| L3["Firestore<br/>users/{uid}"]
        L3 -->|"load profile"| L4["AuthContext<br/>profile state"]
    end
    
    subgraph MFA["MFA Enrollment"]
        M1["Firebase Auth<br/>multiFactor API"] --> M2["Identity Platform<br/>TOTP Provider"]
        M2 --> M3["Authenticator App<br/>(external)"]
    end
    
    subgraph Attestation["Identity Attestation"]
        A1["AttestationForm<br/>component"] --> A2["Firestore<br/>attestations/{uid}_{estateId}"]
        A2 --> A3["IdentityGate<br/>verification check"]
    end
    
    subgraph EstateData["Estate Data (Gated)"]
        E1["Firestore<br/>estates/{estateId}"]
        E2["Firestore<br/>estates/.../assets"]
        E3["Firestore<br/>estates/.../documents"]
        E4["Firestore<br/>estates/.../beneficiaries"]
    end
    
    L4 --> A3
    A3 -->|"verified"| EstateData

    style Registration fill:#DBEAFE,color:#1E3A5F
    style Login fill:#D1FAE5,color:#065F46
    style MFA fill:#FEF3C7,color:#92400E
    style Attestation fill:#FCE7F3,color:#9D174D
    style EstateData fill:#F3F4F6,color:#374151
```

---

## 9. Security Enforcement Layers

```mermaid
flowchart TB
    subgraph Layer1["Layer 1: Network"]
        FW["Firebase Hosting<br/>HTTPS Only"]
    end
    
    subgraph Layer2["Layer 2: Authentication"]
        FA["Firebase Auth<br/>Email + Password"]
        MFA["TOTP MFA<br/>(Identity Platform)"]
        EV["Email Verification"]
    end
    
    subgraph Layer3["Layer 3: Authorization (Frontend)"]
        AG["AuthGuard<br/>(React Component)"]
        IG["IdentityGate<br/>(React Component)"]
    end
    
    subgraph Layer4["Layer 4: Authorization (Backend)"]
        FR["Firestore Rules<br/>(Security Rules v2)"]
        GM["Go Middleware<br/>(API AuthZ)"]
    end
    
    subgraph Layer5["Layer 5: Data Protection"]
        AES["AES-256<br/>Encryption at Rest"]
        PII["PII Siloing<br/>(Rule 26)"]
        ATT["Attestation Records<br/>(Permanent, No Delete)"]
    end
    
    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer3 --> Layer4
    Layer4 --> Layer5

    style Layer1 fill:#E2E8F0,color:#1E293B
    style Layer2 fill:#DBEAFE,color:#1E3A5F
    style Layer3 fill:#FEF3C7,color:#92400E
    style Layer4 fill:#D1FAE5,color:#065F46
    style Layer5 fill:#FCE7F3,color:#9D174D
```

---

## 10. Principal Invites Fiduciary — End-to-End Flow

```mermaid
sequenceDiagram
    actor P as Principal (Estate Owner)
    participant FW as FinalWishes App
    participant FS as Firestore
    participant FA as Firebase Auth
    participant IP as Identity Platform
    actor F as Fiduciary (Heir/Executor)
    
    P->>FW: Invite [person] as [role]
    FW->>FS: Create invitation record
    FW-->>F: Email: "You've been invited"
    
    Note over F: Creates Account
    F->>FW: Register (name, email, password)
    FW->>FA: createUserWithEmailAndPassword
    FA-->>FW: User created
    FW->>FS: setDoc users/{uid} (role: 'heir')
    FW->>FS: setDoc usernames/{username}
    FW-->>F: Verification email sent
    
    Note over F: Accesses Estate
    F->>FW: Navigate to /estates/:id
    FW->>FW: AuthGuard → ✅ Logged in
    FW->>FW: IdentityGate → Check role
    FW->>FW: Role = 'heir' → Fiduciary tier
    FW->>IP: Check MFA status
    IP-->>FW: MFA not enrolled
    FW-->>F: 🚫 Show verification wizard
    
    Note over F: Step 1: Enable MFA
    F->>FW: Navigate to Settings
    FW->>IP: generateSecret(session)
    IP-->>FW: TOTP Secret + QR URL
    FW-->>F: Display QR Code
    F->>F: Scan with Google Authenticator
    F->>FW: Enter 6-digit code
    FW->>IP: enroll(assertion, code)
    IP-->>FW: ✅ MFA Enrolled
    
    Note over F: Step 2: Sign Attestation
    F->>FW: Navigate to attestation page
    FW-->>F: Display legal declaration
    F->>FW: Draw signature + acknowledge
    FW->>FS: setDoc attestations/{uid}_{estateId}
    FS-->>FW: ✅ Attestation stored
    
    Note over F: Full Access
    F->>FW: Navigate to /estates/:id
    FW->>FW: IdentityGate → MFA ✅, Attestation ✅
    FW-->>F: ✅ Estate dashboard rendered
    
    FW-->>P: Notification: "[Name] verified identity"
```

---

> [!TIP]
> These diagrams render natively in GitHub, VS Code Markdown Preview, and the Antigravity artifact viewer. For print/PDF, consider [Mermaid Live Editor](https://mermaid.live) for SVG export.
