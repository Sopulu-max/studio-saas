# Studio SaaS Engineering Principles

These are the core architectural and design principles for the Photostudio SaaS project, agreed upon with the user. You MUST adhere to these principles when building new features, modifying the database, or designing UI.

## 1. The "Integrated Infrastructure" Mindset
Do not view this application as a fragmented set of tools (e.g., a CRM over here, a website builder over there). Treat it as a unified **digital ecosystem**.
* The business data entered into the dashboard IS the public data displayed on the storefront.
* Features must create a flywheel effect: updating a package automatically updates the booking flow and the public website simultaneously.

## 2. Strict Data Membrane (Operational vs. Marketing)
While the business data feeds the public face, **they must not share the same access level.**
* **Marketing Data** (bio, logos, public prices, public galleries) can be exposed.
* **Operational Data** (internal notes, financial margins, draft packages) MUST be strictly protected.
* Do not blindly pass full database objects (like `studio` or `package`) to public frontend components if they contain operational data. Pick and choose exactly what fields to send.

## 3. Explicit "Opt-In" for Public Visibility
Never assume data should be public by default.
* Features that have the potential to be public (like Team Members, Portfolios, or new Packages) must be built with explicit visibility toggles (e.g., `is_public` booleans in the database or `showTeam={false}` hardcoded in the UI until a toggle is built).
* Err on the side of hiding data from the public until the user explicitly requests it to be visible.

## 4. Omnichannel Inputs (The WhatsApp Strategy)
The architecture must support the concept of "Data Origin Points" outside of the traditional web dashboard.
* The system is a knowledge base, and interfaces like WhatsApp act as frontends.
* Design server actions, API routes, and database schemas cleanly so that in the future, a WhatsApp bot can execute the same commands as the web dashboard (e.g., confirming bookings, checking availability).

## 5. The 3-Tier "Strict Boundary" Architecture
We must enforce strict boundaries between different parts of the code. A UI page or component must never talk directly to the database.
* **Tier 1: Presentation (UI) Layer (`app/**/*.tsx`, `components/**/*.tsx`)**: Only cares about rendering data and handling user interactions. Knows nothing about Supabase or SQL.
* **Tier 2: Business Logic (Service) Layer (`app/actions/*.ts`, `lib/services/*.ts`)**: Enforces business rules, validation, and orchestrates actions.
* **Tier 3: Data Access Layer / Repositories (`lib/data/*.ts` or `lib/domains/*`)**: The ONLY place in the codebase allowed to write raw Supabase PostgREST queries.

## 6. Domain Models over Database Schemas (DTOs)
The UI must not consume raw, deeply nested database responses (e.g., `bookings.sessions[0].session_date`).
* The Data Access Layer must fetch raw database data and transform it into clean, predictable Domain Objects (Data Transfer Objects) before handing it to the UI.
* This ensures that if the database schema changes, only the mapping function in the Data Access Layer needs to be updated. The UI remains completely untouched.

## 7. Feature-Sliced Organization
As the application scales, group code by Feature Domain rather than technical type.
* Centralize related fetching, mutating, and validating logic into modules like `lib/domains/contracts/` or `lib/domains/bookings/` to keep related logic together.

## 8. The "Boy Scout Rule" for Refactoring
We will incrementally improve the architecture without halting feature development.
* Whenever we build a new feature or modify an existing page, we take the opportunity to extract its raw inline Supabase queries into the centralized Data Access Layer.

## 9. Command Query Responsibility Segregation (CQRS) "Light"
The way you read data is fundamentally different from the way you write data.
* **Queries** (fetching a list of bookings) require complex joins and mapping to rich UI DTOs.
* **Commands** (creating a new booking) should accept flat, minimal payloads.
* Do not force the UI to send back the complex read DTOs when performing updates. Keep write operations lean and atomic.

## 10. Idempotency & Omnichannel Resilience
An operation should produce the same result whether it is executed once or multiple times.
* Assume network inputs (like API webhooks or WhatsApp integrations) are flaky.
* If a webhook fires twice with the same transaction ID, the system must not create two identical invoices or process a double charge. Build safety checks into the Service Layer.

## 11. Graceful Degradation & Event-Driven Thinking
Core business flows should not fail because a secondary side-effect fails.
* If creating a contract succeeds, but the automated email to the client fails, the contract should still be successfully recorded.
* External service failures (email providers, SMS APIs) must not roll back core domain logic.

## 12. Dependency Injection (DI)
Functions should receive their dependencies as arguments rather than instantiating them internally.
* The Data Access Layer functions must accept `(supabase: SupabaseClient, ...)` rather than importing a hardcoded client.
* This allows the Service Layer to dynamically inject either the high-privilege Admin client or the user-scoped client, and makes the system easily testable.

## 13. Lean Payloads (Under-fetching over Over-fetching)
The server must send the UI exactly the data it needs to render the screen, and nothing more.
* Avoid `SELECT *` anti-patterns that send complete database records (which might contain password hashes, raw JSON blobs, or internal cost metrics) to the frontend.
* The DTO mapper acts as the bouncer, ensuring only the necessary presentation fields make it to the client.

## 14. The "Ports and Adapters" (Hexagonal) Mentality
The core business logic should be isolated from infrastructure decisions.
* Supabase is merely an implementation detail. The UI and Service Layer should not contain Supabase-specific code (like `.eq()` or `.single()`).
* If the underlying database or BaaS provider changes, you should only have to rewrite the `repository.ts` files, leaving the rest of the application completely untouched.
