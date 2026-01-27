# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
pnpm dev          # Start dev server on http://localhost:5173

# Build & Check
pnpm build        # Build for production (tsc -b && vite build)
pnpm check        # Type check without emitting
pnpm lint         # Run ESLint
pnpm preview      # Preview production build

# Package Manager
# This project uses pnpm (specified in packageManager field)
```

## High-Level Architecture

### Tech Stack
- **Frontend**: React 18.3.1 + TypeScript 5.8.3 + Vite 6.3.5
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Map Service**: Amap (高德地图) for Chinese location services
- **State Management**: Zustand 5.0.3
- **Routing**: React Router 7.3.0
- **Styling**: Tailwind CSS 3.4.17
- **i18n**: i18next (supports zh, en, ru, de)
- **Authentication**: OAuth (Google, GitHub, Microsoft, LinuxDO) + Passkeys (@simplewebauthn)

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pages     │  │ Components  │  │   Stores    │         │
│  │  (routes)   │  │  (reusable) │  │  (Zustand)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                │
│         └─────────────────┴─────────────────┘                │
│                           │                                  │
│                    ┌──────▼──────┐                           │
│                    │   Hooks     │                           │
│                    │   / Lib     │                           │
│                    └──────┬──────┘                           │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                    Supabase Backend                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Auth     │  │   Storage   │         │
│  │   (RLS)     │  │  (OAuth)    │  │  (images)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Key Stores (Zustand)

- **`useAuthStore`** (`src/stores/useAuthStore.ts`): User authentication state, handles both Supabase and LinuxDO OAuth
- **`useMapStore`** (`src/stores/useMapStore.ts`): POS machine data, map state, filtering, search
- **`useCardAlbumStore`** (`src/stores/useCardAlbumStore.ts`): Card collection management

### Core Libraries

- **`supabase.ts`**: Supabase client configuration and database types (`POSMachine`, `User`, `Review`, etc.)
- **`amap.ts`**: Amap (高德地图) integration with geolocation utilities
- **`i18n.ts`**: Internationalization setup with language detection
- **`cardNetworks.ts`**: Card network definitions (Visa, Mastercard, UnionPay, Amex, etc.)

## Database Schema

### Core Tables

- **`pos_machines`**: Main POS machine records with location, payment methods, verification modes, fees
- **`users`**: User profiles with metadata and roles
- **`brands`**: Merchant brand information
- **`reviews`**: POS machine reviews and ratings
- **`card_album`**: Card collection entries
- **`notifications`**: User notifications

### Key POS Machine Fields

```typescript
{
  // Location
  latitude, longitude, address, merchant_name

  // Payment Support (in basic_info)
  supports_apple_pay, supports_google_pay, supports_contactless
  supports_foreign_cards, supported_card_networks[]

  // Verification Modes
  verification_modes: {
    small_amount_no_pin[], requires_password[], requires_signature[]
    // Each has _unsupported, _uncertain, _unknown flags
  }

  // Fees Configuration
  fees: { [networkId]: { type, value, enabled } }

  // Status
  status: 'active' | 'inactive' | 'maintenance' | 'disabled'
}
```

## Important Patterns

### Three-State Selectors
Payment support uses three states: `'supported'` | `'unsupported'` | `'unknown'`
- Implemented via `ThreeStateSelector` component
- Used in AddPOS/EditPOS for card networks and payment methods

### Search Parser
Global search accepts complex queries via `parseSearchInput()`:
- Keywords: `星巴克`
- Coordinates: `39.9,116.4`
- Date ranges: `2024-01..2024-12`
- Filters: `visa:true`, `applepay:true`

### Draft System
POS forms support auto-saving drafts via `lib/drafts.ts`:
- Drafts stored in localStorage
- Can be restored via `?draftId=` query param

### Route Structure
- `/` → Landing page
- `/app/*` → Protected routes (requires auth)
- `/onboarding` → First-time user flow
- `/auth/*` → OAuth callbacks

## Git Workflow

**IMPORTANT**: 每次完成一个开发任务后，必须：

1. 填写完整的 commit 信息（使用中文描述变更内容）
2. 以用户 `WilliamWang1721` 的 GitHub 账户身份推送到 `claude-code` 分支

```bash
# 提交变更
git add .
git commit -m "描述变更内容"

# 推送到 claude-code 分支
git push origin claude-code
```

如果 `claude-code` 分支不存在，需要先创建：
```bash
git checkout -b claude-code
git push -u origin claude-code
```

## Environment Variables

Required variables (see `.env.example`):

```bash
# Supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Amap (高德地图)
VITE_AMAP_KEY=...
VITE_AMAP_SECURITY_JS_CODE=...

# OAuth (at least one provider)
VITE_GOOGLE_CLIENT_ID=...
VITE_GITHUB_CLIENT_ID=...
VITE_LINUXDO_CLIENT_ID=...
```

## Build Configuration

- **Vite config**: Includes manual chunk splitting for optimal loading
- **TypeScript**: Path aliases configured (`@/*` → `./src/*`)
- **ESLint**: Relaxed rules (no-unused-vars off, no-explicit-any off)
- **Chunk strategy**: Separate chunks for React, map, animation, UI libraries

## MCP Integration

The project includes an MCP (Model Context Protocol) server in `mcp-server/`:
- Allows Claude Desktop to query/manage POS data
- OAuth-based authentication
- See `mcp-server/README.md` for deployment

## Notes

- The app is primarily for Chinese market (Amap, Chinese addresses)
- Multi-language support is first-class (i18next)
- POS machine data includes complex fee structures per card network
- Draft system saves form progress automatically
- Card album feature for tracking payment cards