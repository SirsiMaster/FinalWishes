# Shared Types — Developer README

## Architecture

```
shared/
├── types/
│   └── index.ts   # TypeScript type definitions mirroring Protobuf messages
└── README.md      # This file
```

## Purpose

Hand-maintained TypeScript types that mirror the Protobuf schema (`proto/estate/v1/estate.proto`). These are used by the web frontend for Firestore document typing and UI logic where the full Protobuf runtime is not needed.

**Note:** `web/src/gen/` contains auto-generated Protobuf types for ConnectRPC calls. `shared/types/` contains simpler, hand-maintained equivalents for Firestore and local state.

## Key Types

### Enums
| Type | Values |
|------|--------|
| `EstateStatus` | `active`, `death_reported`, `executor_confirmed`, `in_settlement`, `closed` |
| `AssetCategory` | `financial`, `real_estate`, `vehicle`, `digital`, `personal_property` |
| `UserTier` | `free`, `concierge`, `white_glove` |
| `UserRole` | `principal`, `executor`, `heir`, `admin` |

### Interfaces
| Type | Key Fields |
|------|-----------|
| `User` | id, email, emailVerified, firstName, lastName, tier, status |
| `Estate` | id, name, principalId, status, deathInfo?, estimatedValue? |
| `Asset` | id, estateId, category, name, estimatedValue?, metadata, status |

## Usage

```typescript
import type { Estate, UserRole, AssetCategory } from '@shared/types';
```

The `@shared` path alias is configured in `web/tsconfig.json`.
