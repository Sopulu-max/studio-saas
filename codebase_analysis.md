# Codebase Analysis: Weave Studio (Photostudio SaaS)

## Overview
Weave Studio is a B2B SaaS application designed for photography studios to manage their end-to-end workflow—from client booking and session tracking to invoicing, contracts, and photo gallery delivery.

The application uses a modern, bleeding-edge tech stack centered around **React 19** and **Next.js 16 (App Router)**, backed by **Supabase** for database, authentication, and backend services.

## Technology Stack
- **Framework:** Next.js 16.2.3 (App Router)
- **UI Library:** React 19.2.4
- **Styling:** Tailwind CSS v4, shadcn/ui, `tw-animate-css` for animations, `clsx` & `tailwind-merge`
- **Database & Auth:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Emails:** Resend (`resend`)
- **Validation:** Zod (`zod`)
- **Analytics:** Vercel Speed Insights

## Architecture & Directory Structure

The codebase strictly follows the Next.js App Router conventions with Server Actions for mutations.

### `app/` (Routing & Pages)
- **`(dashboard)/`**: The core authenticated application. It contains nested routes for all major business domains:
  - `sessions`, `clients`, `invoices`, `contracts`, `packages`, `galleries`, `equipment`, `print-orders`, `staff`, `attendance`, `reports`, `settings`, `calendar`.
- **`(auth)/`**: Handles login and signup flows.
- **`actions/`**: Contains Next.js Server Actions handling data mutations (e.g., `sessions.ts`, `invoices.ts`, `clients.ts`, `auth.ts`, `team.ts`). This is where the core business logic and Supabase database interactions live.
- **`api/`**: API routes (e.g., `addons`, `invite`, `search`).
- **`book/`, `invite/`, `gallery/`, `view/`**: Public-facing pages that clients interact with (e.g., booking a session, viewing a photo gallery, accepting a staff invite).
- **`onboarding/`**: The initial setup flow for new studio accounts.

### `components/` (UI Elements)
- **`ui/`**: Base reusable components, predominantly from `shadcn/ui`.
- **Custom Components**: Domain-specific components like `sidebar.tsx`, `global-search.tsx`, `client-field.tsx`, `date-range-filter.tsx`, and `studio-config-provider.tsx` (which provides context about studio-specific configurations like session types and booking statuses).

### `lib/` (Business Logic & Utilities)
- **`supabase/`**: Clients for interacting with Supabase (`client.ts` for browser, `server.ts` for RSC/actions, `admin.ts` for elevated privileges).
- **`studio.ts` / `studio-config.ts`**: Core logic for fetching studio data, parsing JSONB configuration columns, and providing studio context to the app.
- **`studio-ownership.ts`**: Implements Multi-Tenant Data Isolation (RBAC). It contains checks to ensure users can only access data belonging to their specific studio.
- **`email.ts`**: Integration with Resend for transactional emails (e.g., sending invoices, contracts, invites).

## Data Model & Multi-Tenancy

The application uses a **Multi-Tenant** architecture where data is siloed per studio.
- The `studios` table is the root entity.
- Users can have roles like `'owner'` or `'staff'` within a studio.
- `lib/studio-ownership.ts` is heavily utilized to verify that requested entities (e.g., a specific invoice or session) belong to the authenticated user's studio before allowing read or write operations.
- The `studios` table leverages PostgreSQL's `JSONB` columns for flexible configuration (e.g., `session_types`, `booking_statuses`, `service_types`, `contract_templates`).

## Key Workflows

1. **Authentication & Routing Middleware (`middleware.ts`)**:
   - Secures the `/(dashboard)` and `/onboarding` routes, redirecting unauthenticated users to `/login`.
   - Allows public access to `/book/` (client booking) and `/invite/` (staff invites).
2. **Onboarding**:
   - New studios are redirected to `/onboarding` if `onboarding_completed_at` is null, ensuring proper setup of initial config before dashboard access.
3. **Server Actions (`app/actions/`)**:
   - All form submissions and data updates are routed through Server Actions, providing a seamless and type-safe RPC-like interface between the client and server.

## Notable Observations

- **Bleeding Edge Versions:** The project is running React 19 and Next.js 16, which means it likely utilizes the latest features like Server Components by default, Actions, and potentially new React hooks (`useActionState`, `useFormStatus`, etc.).
- **Tailwind v4:** Uses the newly released Tailwind CSS v4 setup (`@tailwindcss/postcss`).
- **No ORM:** The app uses `@supabase/supabase-js` directly for database interactions instead of an ORM like Prisma or Drizzle. Type casting and validation (via Zod) are handled manually.
