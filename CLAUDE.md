# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `pnpm dev` - Start development server at localhost:5173
- `pnpm build` - Build for production (runs TypeScript check then Vite build)
- `pnpm preview` - Preview production build

### Code Quality
- `pnpm check` - Run TypeScript type checking without emitting files
- `pnpm lint` - Run ESLint code linting

### Package Management
This project uses pnpm as the package manager. Always use `pnpm` commands instead of npm or yarn.

## Project Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for build tooling with path aliases configured
- **Tailwind CSS** for styling with custom design system
- **React Router DOM 7** for client-side routing with lazy loading
- **Framer Motion** for animations and transitions
- **Zustand** for state management (lightweight alternative to Redux)
- **React i18next** for internationalization (supports 4 languages)

### Backend & Services
- **Supabase** as Backend-as-a-Service providing:
  - PostgreSQL database with Row Level Security (RLS)
  - Authentication with OAuth providers (Google, GitHub, Microsoft, LinuxDo)
  - Real-time subscriptions
  - File storage
- **Amap (高德地图)** for mapping services with secure API key configuration

### State Management Architecture
The app uses Zustand stores for global state:

- **`useAuthStore`** (`src/stores/useAuthStore.ts`): Manages authentication state, user sessions, and Supabase auth integration with persistent storage
- **`useMapStore`** (`src/stores/useMapStore.ts`): Handles map data, POS machine filtering, search, location services, and comprehensive CRUD operations

### Internationalization
Multi-language support through React i18next:
- Supports Chinese, English, Russian, and German
- Language files in `src/locales/*.json`
- Automatic browser language detection with localStorage persistence
- Configured in `src/lib/i18n.ts`

### Database Schema
Key tables in PostgreSQL (Supabase):
- `pos_machines` - Core POS terminal data with JSONB fields for flexibility
- `users` - User profiles synced with Supabase auth
- `brands` - Merchant brand categorization
- `user_favorites` - User bookmarked locations
- `user_history` - Search and visit history
- `reviews` - User ratings and feedback
- `activation_codes` - Beta user access control

### Map Integration
Custom Amap integration (`src/lib/amap.ts`):
- Dynamic script loading with error handling
- Security key configuration for production
- Location services with retry logic and fallbacks
- Geocoding and reverse geocoding utilities
- Distance calculations and formatting

### Routing Structure
Protected routes with lazy loading:
- All main routes require authentication via `ProtectedRoute`
- Dynamic imports for code splitting
- Separate auth callback routes for OAuth flows
- Onboarding flow for new users

### Component Architecture
- **Layout Components**: `src/components/Layout.tsx` provides main app shell with animated navigation
- **UI Components**: Reusable components in `src/components/ui/` with consistent design system
- **Animated Components**: Enhanced UX with Framer Motion animations
- **Form Components**: Smart forms with validation and Supabase integration

### Environment Configuration
Required environment variables (see `.env.example`):
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` - Supabase connection
- `VITE_AMAP_KEY` and `VITE_AMAP_SECURITY_JS_CODE` - Amap API credentials
- OAuth provider credentials for social login

### Build Optimization
Vite configuration includes manual code splitting:
- React/routing libraries bundled separately
- Animation libraries isolated
- Supabase client separated
- UI component libraries grouped
- State management isolated

## Development Guidelines

### TypeScript
- Strict mode enabled with comprehensive type checking
- Custom types defined in `src/types/` directory
- Database types exported from `src/lib/supabase.ts`

### Database Operations
- All database operations go through Supabase client
- Row Level Security policies enforce data access permissions
- JSONB fields used for flexible schema evolution
- Comprehensive error handling for network timeouts and API limits

### Map Operations
- Always handle AMap API errors gracefully with fallbacks
- Implement retry logic for location services
- Use provided utility functions in `src/lib/amap.ts`
- Respect API rate limits and quotas

### Internationalization
- All user-facing strings must use `t()` function from `useTranslation`
- Add new translation keys to all language files
- Use consistent key naming patterns (dot notation)

### State Management
- Use Zustand stores for global state
- Implement optimistic updates with proper error handling
- Persist user preferences and auth state to localStorage
- Handle loading states for better UX

### Performance
- Components are lazy-loaded by default
- Images and assets optimized for web
- API calls debounced where appropriate
- Infinite scroll and pagination for large datasets