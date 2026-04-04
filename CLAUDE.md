# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 4001
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run prettier-fix # Auto-format all files
npm run prettier-check # Check formatting without fixing
```

Pre-commit hooks (Husky + lint-staged) run ESLint and Prettier automatically on staged files.

## Architecture

**Velte** is a WhatsApp AI sales automation SaaS built with Next.js 16 App Router, React 19, and TypeScript.

### Routing & Middleware

`src/proxy.ts` is the Next.js middleware that handles auth routing:

- Public routes: `/`, `/about`, `/auth/*`, `/careers`, `/contact`, `/privacy`, `/terms`
- Unauthenticated users hitting protected routes → redirect to `/auth/login`
- Authenticated users hitting `/` → redirect to `/:userId/dashboard`
- JWT verification via `jose`; extracts `userId` and sets `x-user-id` header

### Layer Responsibilities

| Layer        | Location                 | Purpose                                                                                                       |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| API client   | `src/lib/api.ts`         | Fetch wrapper; base URL from `NEXT_PUBLIC_API_BASE_URL` (default: `localhost:5000/api`), includes credentials |
| Services     | `src/services/`          | Typed functions wrapping the API client (`usersApi`, `passwordApi`)                                           |
| State        | `src/store/userStore.ts` | Zustand store for `User` object, persisted to localStorage under `user-storage`                               |
| Server cache | `src/app/providers.tsx`  | React Query `QueryClientProvider` at the root                                                                 |
| Middleware   | `src/proxy.ts`           | Auth gating and route redirects                                                                               |

### Authentication Flow

1. **Signup** → `POST /auth/register` → redirect to `/auth/verify`
2. **Verify** → `POST /auth/verify` (OTP)
3. **Login** → `POST /auth/login` → stores `auth_token` cookie; 403 redirects to `/auth/verify`
4. **Forgot/Reset Password** → `POST /auth/getPasswordOTP` → `POST /auth/reset-password`

### Forms & Validation

- All forms use **TanStack React Form** with **Zod** schemas for validation
- Password validation logic lives in `src/lib/password-utils.ts` (strength scoring, Zod schema, color/text helpers)
- `<PasswordStrengthMeter>` renders real-time strength feedback

### UI

- **shadcn/ui** components (via `@base-ui/react`) live in `src/components/ui/`
- **Tailwind CSS v4** with OKLCH-based CSS variables; theme defined in `src/app/globals.css`
- Animations via **Motion** (Framer Motion)
- Toast notifications via **Sonner** (mounted in root layout)
- Path alias `@/*` maps to `src/*`

### Key Conventions

- Components are co-located with their page when page-specific, or in `src/components/` when shared
- Service functions are the only place that call `apiClient` directly — pages/components call services, not `apiClient`
- Zustand store is the source of truth for the authenticated user object; React Query handles server data fetching/caching
