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
