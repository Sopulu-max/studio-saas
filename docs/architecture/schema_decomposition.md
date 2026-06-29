# Database Schema Decomposition & Architectural Analysis

*Read this as a system blueprint, not a bug report. Every finding here is a structural pattern, not a mistake.*

---

## The Evolutionary Timeline

The schema grew in layers, each layer reflecting a different philosophy:

| Phase | Philosophy | Key tables introduced |
|---|---|---|
| **Phase 0 (Original)** | Sessions are everything | `studios`, `clients`, `bookings`, `invoices`, `payments`, `staff`, `galleries` |
| **Phase 1 (Catalog)** | Packages as products | `packages`, `package_addons`, `package_sections`, `package_inclusions` |
| **Phase 2 (Service-centric)** | Services as atoms | `services`, `package_services`, `booking_services`, `service_sections` |
| **Phase 3 (Ops)** | Operational infrastructure | `equipment`, `equipment_checkouts`, `staff_checkins`, `booking_staff` |
| **Phase 4 (Commerce)** | Print & products | `products`, `product_variants`, `frame_templates`, `print_orders`, `print_order_items` |
| **Phase 5 (Omnichannel)** | WhatsApp as a channel | `conversations`, `messages`, `message_templates` |
| **Phase 6 (Config)** | Studio as its own brain | JSONB columns on `studios`: `session_types`, `service_types`, `booking_statuses`, `equipment_categories`, `staff_roles` |

The problem is that **Phase 0 was never fully retired.** Its data shapes still live in the database, quietly coexisting with newer shapes.

---

## Complete Table Inventory

### LAYER 0 — Studio Identity

#### `studios`
The root entity. Every other table cascades from this.
```
studio_id               uuid PK
owner_id                uuid FK → auth.users
name                    text
slug                    text UNIQUE          -- public URL key
email                   text
phone                   text
address                 text
timezone                text
logo_url                text
cover_url               text                 -- storefront cover
bio                     text                 -- storefront bio
theme                   jsonb                -- color/font overrides

-- The Brain (JSONB columns — all config lives here, not in code)
session_types           jsonb                -- SessionTypeConfig[]
service_types           jsonb                -- ServiceTypeConfig[]
booking_statuses        jsonb                -- BookingStatusConfig[]
equipment_categories    jsonb                -- EquipmentCategoryConfig[]
staff_roles             jsonb                -- StaffRoleConfig[]

-- Operational
default_contract_template text
onboarding_completed_at   timestamptz

-- Omnichannel
wa_phone_number_id      text
wa_access_token         text
wa_verify_token         text
```

**Ownership Notes:** This table is structurally sound. The JSONB config columns are the correct pattern — they are the brain that drives all smart pipeline logic.

---

### LAYER 1 — People

#### `clients`
```
client_id   uuid PK
studio_id   uuid FK → studios (CASCADE)
full_name   text
phone       text
email       text
address     text
avatar_url  text
created_at  timestamptz
```
**Sound.** The client is correctly studio-scoped.

#### `staff`
```
staff_id            uuid PK
studio_id           uuid FK → studios (CASCADE)
full_name           text
email               text
phone               text
role                text     ⚠️  LEGACY SCALAR — first role only
roles               jsonb    ✅  Current — array of role values
hire_date           date
working_days        jsonb    -- e.g. ["monday","wednesday","friday"]
user_id             uuid FK → auth.users (nullable — null until invite accepted)
invite_sent_at      timestamptz
invite_accepted_at  timestamptz
```

**Conflict:** `role` (scalar) and `roles` (jsonb array) are both written and read in parallel. Every write touches both. `role` exists only for "backward compatibility" — but backward with what? Everything that matters reads `roles`. This column should be retired.

---

### LAYER 2 — Catalog

#### `services` ✅ The New Atom
```
service_id      uuid PK
studio_id       uuid FK → studios (CASCADE)
name            text
type            text        CHECK ('service', 'product', 'digital')
description     text
price           numeric     -- standalone base price
duration_mins   integer     ✅ BELONGS HERE
outfits_count   integer     ✅ BELONGS HERE
category_value  text        -- links to studio.service_types[].value
session_type    text        -- 'studio', 'outdoor', 'event', 'any'
booking_fields  jsonb       -- custom intake questions for this service
is_active       boolean
display_order   integer
created_at      timestamptz
```
**Sound.** This is the correct home for all service-level attributes.

#### `service_sections`
```
section_id    uuid PK
service_id    uuid FK → services (CASCADE)
title         text
body          text
image_url     text
video_url     text
layout        text    -- 'standard', 'hero', etc.
display_order integer
created_at    timestamptz
```
**Sound.** Mirrors `package_sections` for standalone service storefronts.

#### `packages` ⚠️ Carrying Legacy Weight
```
package_id      uuid PK
studio_id       uuid FK → studios (CASCADE)
name            text
tagline         text
description     text        -- now acts as internal summary
cover_url       text        -- now acts as list thumbnail

-- DEPRECATED columns (marked in migration_service_centric.sql but NOT DROPPED)
session_type    text        🚩 DEPRECATED — moved to services
service_type    text        🚩 DEPRECATED — moved to services.category_value
outfits_count   integer     🚩 DEPRECATED — moved to services.outfits_count
duration_mins   integer     🚩 DEPRECATED — moved to services.duration_mins

-- Still valid
base_price      numeric     ✅ package bundle price (may differ from sum of services)
is_public       boolean     ✅ visibility gate
display_order   integer
inclusions      text[]      ⚠️ Legacy bullet list — now superseded by package_inclusions
created_at      timestamptz
```

**The Core Problem:** The deprecated columns were intentionally left in place "for safety" during migration. But they were never cleaned up. Code in `sessions.ts` (`getSessionFormData`) still reads `packages.outfits_count` directly, treating the deprecated column as a live data source. A legacy package that was never decomposed into services will have data here and nowhere else — making it silently incompatible with the Smart Pipeline.

#### `package_services` ✅ The Muscle
```
package_service_id  uuid PK
package_id          uuid FK → packages (CASCADE)
service_id          uuid FK → services (CASCADE)
is_addon            boolean     -- false = included, true = optional
addon_price         numeric     -- price override when selected as addon
display_order       integer
UNIQUE (package_id, service_id)
```
**Sound.** This is the correct join. A package is only as smart as the services linked here.

#### `package_sections`
```
section_id    uuid PK
package_id    uuid FK → packages (CASCADE)
title, body, image_url, video_url, layout, display_order
```

#### `package_inclusions`
```
inclusion_id  uuid PK
package_id    uuid FK → packages (CASCADE)
label         text
type          text    CHECK ('service', 'product', 'digital')
display_order integer
```
**Note:** `package_inclusions` is for marketing display only — it is not linked to actual `services` rows. It's just copy. The real service linkage is in `package_services`.

#### `package_addons` ⚠️ Pre-Services Relic
```
addon_id    uuid PK
package_id  uuid FK → packages (CASCADE)
name        text
description text
price       numeric
```
**Problem:** This table predates `package_services`. It holds free-text addon names with prices, but no link to the `services` catalog. Invoice creation still reads from this table to build addon line items. Studios that built packages before the service catalog existed have their addons here — and nowhere in the service graph.

---

### LAYER 3 — Bookings (The Commercial Record)

#### `bookings` — The Pivotal Table
```
booking_id        uuid PK
studio_id         uuid FK → studios (CASCADE)
client_id         uuid FK → clients (CASCADE)
booking_ref       integer     -- human-readable sequential ref per studio
status            text        -- driven by studio.booking_statuses config

-- Session logistics (used when booking = a shoot)
session_type      text        -- from studio.session_types config
session_date      date
location_address  text        -- only relevant when is_outdoor=true
event_name        text        -- only relevant when is_event=true
event_date        date        -- only relevant when is_event=true
shoot_type        text        -- occasion category (birthday, wedding, etc.)

-- Catalog linkage
package_id        uuid FK → packages (nullable)   ⚠️ two write paths
drive_link        text                             ⚠️ two write paths

-- Smart Pipeline data
custom_answers    jsonb   -- client's answers to booking_fields questions

-- Operational
notes             text
selections_count  integer -- photo selections count
created_at        timestamptz
```

**Critical Issues:**

1. **`bookings` IS `sessions`.** The UI calls these "sessions" but the table is `bookings`. This is semantically valid for the old world where every booking was a shoot. Under the new model, `bookings` is the commercial agreement and the concept of a "session" (a physical delivery event) needs to become a separate, linked table.

2. **`package_id` has two write paths:** `addSession()` sets it when creating the booking; `addInvoice()` can also change it. If these disagree, the booking silently adopts the invoice's package.

3. **`drive_link` has two write paths:** `updateSessionDriveLink()` in sessions.ts sets it; `deliverGallery()` in galleries.ts also sets it. One source of truth is needed.

4. **No dedicated `session` table yet.** Under the new model, a booking can produce zero, one, or many physical sessions. Currently, `bookings` itself acts as the session record — storing `session_date`, `location_address`, etc. This limits a single booking to one shoot.

#### `booking_services` ✅ The Correct Per-Booking Service Record
```
booking_service_id  uuid PK
booking_id          uuid FK → bookings (CASCADE)
service_id          uuid FK → services
quantity            integer
price_at_booking    numeric    -- snapshot of price at time of booking
status              text       -- 'pending', 'in_progress', 'ready', 'delivered', 'cancelled'
```
**Sound in design.** But silently broken in practice: `updateSession()` does NOT re-seed this table when a booking's package is changed. The service records become stale after any package edit.

#### `booking_staff`
```
(no schema visible from migrations — inferred from code usage)
booking_id  uuid FK → bookings
staff_id    uuid FK → staff
role        text
```

#### `booking_addons` ⚠️ Legacy Snapshot
```
(inferred from code)
booking_id  uuid FK → bookings
addon_id    uuid FK → package_addons
quantity    integer
```
This is a snapshot of old-style package addons. Not connected to `services` or `booking_services`.

---

### LAYER 4 — Finance & Delivery

#### `invoices`
```
invoice_id    uuid PK
studio_id     uuid FK → studios
booking_id    uuid FK → bookings
total         numeric
status        text       -- 'draft', 'sent', 'paid', 'overdue'
due_date      date
issued_at     timestamptz
```

#### `payments`
```
payment_id    uuid PK
invoice_id    uuid FK → invoices (CASCADE)
amount        numeric
method        text
paid_at       timestamptz
```

#### `contracts`
```
contract_id   uuid PK
studio_id     uuid FK → studios
booking_id    uuid FK → bookings
content       text (HTML)
status        text
```

#### `galleries`
```
gallery_id    uuid PK
studio_id     uuid FK → studios
booking_id    uuid FK → bookings
title         text
status        text
shared_link   text
```

#### `gallery_photos`
```
photo_id      uuid PK
gallery_id    uuid FK → galleries (CASCADE)
url           text
is_favourite  boolean
```

---

### LAYER 5 — Operations

#### `equipment`
```
equipment_id    uuid PK
studio_id       uuid FK → studios (CASCADE)
name            text
serial_number   text
category        text        -- from studio.equipment_categories config
status          text        -- 'available', 'in_use', 'maintenance'
notes           text
assigned_to     text        -- free text name ⚠️ not a FK to staff
checked_out_at  timestamptz
booking_id      uuid FK → bookings ON DELETE SET NULL  ⚠️ ghost FK risk
```

**Issue:** `booking_id` on equipment is set when checked out to a booking. But `deleteSession` does not null this out — deleted bookings leave ghost equipment links. Also `assigned_to` is free text, not linked to `staff`.

#### `equipment_checkouts`
```
checkout_id     uuid PK
equipment_id    uuid FK → equipment (CASCADE)
studio_id       uuid FK → studios (CASCADE)
assigned_to     text
booking_id      uuid FK → bookings ON DELETE SET NULL
checked_out_at  timestamptz
checked_in_at   timestamptz
notes           text
```

#### `staff_checkins`
```
checkin_id      uuid PK
staff_id        uuid FK → staff (CASCADE)
studio_id       uuid FK → studios
date            date
checked_in_at   timestamptz
checked_out_at  timestamptz
```

---

### LAYER 6 — Print Commerce

#### `print_orders`
```
order_id      uuid PK
studio_id     uuid FK → studios
booking_id    uuid FK → bookings (nullable)
client_id     uuid FK → clients
status        text
total         numeric
notes         text
```

#### `print_order_items`
```
item_id         uuid PK
order_id        uuid FK → print_orders (CASCADE)
product_name    text          ⚠️ FREE TEXT — not linked to products table
quantity        integer
unit_price      numeric
product_id      uuid FK → products ON DELETE SET NULL   (added later)
variant_id      uuid FK → product_variants ON DELETE SET NULL (added later)
```
**Conflict:** `product_name` is a free-text string. `product_id` and `variant_id` were added later as optional FKs but not enforced. The `products` table is completely isolated from the `services` table — a product in the print catalog is unrelated to a service in the service catalog.

#### `products` / `product_variants` / `frame_templates`
Self-contained print commerce schema. No connection to `services`.

---

### LAYER 7 — Omnichannel

#### `conversations`
```
id              uuid PK
studio_id       uuid FK → studios (CASCADE)
client_id       uuid FK → clients ON DELETE SET NULL
client_phone    text
channel         text    DEFAULT 'whatsapp'
status          text    CHECK ('open', 'resolved')
last_message_at timestamptz
UNIQUE(studio_id, client_phone)
```

#### `messages`
```
id                    uuid PK
conversation_id       uuid FK → conversations (CASCADE)
direction             text    CHECK ('inbound', 'outbound')
content               text
media_url, media_type text
status                text
external_id           text    -- WhatsApp message ID
requires_verification boolean -- payment proof flag
created_at            timestamptz
```

#### `message_templates`
```
template_id   uuid PK
studio_id     uuid FK → studios (CASCADE)
title         text
content       text
created_at    timestamptz
```

---

## The Attribute Ownership Map

This is the definitive line drawn between what belongs where.

### ✅ SERVICES own:
- `duration_mins`
- `outfits_count`
- `category_value` (type of service work)
- `session_type` (what environment it requires)
- `booking_fields` (what custom intake data it needs)
- `price` (standalone base price)
- `type` (service / product / digital)

### ✅ PACKAGES own:
- `name`, `tagline`, `description`
- `cover_url` (thumbnail)
- `base_price` (bundle price — may differ from sum of services)
- `is_public` (visibility gate)
- `package_sections` (rich content / storytelling)
- `package_inclusions` (marketing copy bullets)

### 🚩 PACKAGES still holding service attributes (deprecated, not dropped):
- `packages.session_type` — remove
- `packages.service_type` — remove
- `packages.outfits_count` — remove
- `packages.duration_mins` — remove
- `packages.inclusions` (text[]) — superseded by `package_inclusions`, remove

### 🚩 `PACKAGE_ADDONS` — the relic:
This table stores free-text addon names. It is not connected to `services`. It predates `package_services`. It feeds `booking_addons` and is still read by `addInvoice`. It needs to be bridged to the service catalog or retired.

---

## The Silent Failures (no errors raised, system behaves incorrectly)

| # | Where | What's wrong | Impact |
|---|---|---|---|
| 1 | Legacy packages | `package_services` is empty → no services linked → Smart Pipeline is blind | These packages produce no dynamic intake, no staff inference, no custom questions |
| 2 | `updateSession` | Does not re-seed `booking_services` when package changes | Stale service records after any package edit |
| 3 | `packages.outfits_count` | Still read by session form despite being DEPRECATED | Session form uses wrong data source for outfits pre-fill |
| 4 | `addInvoice` | Can silently overwrite `bookings.package_id` | Invoice creation changes a booking's package without any confirmation |
| 5 | `deliverGallery` | Can overwrite `bookings.drive_link` | Parallel write path to the same field as `updateSessionDriveLink` |
| 6 | `equipment.booking_id` | Not nulled on booking delete | Ghost FK — equipment thinks it belongs to a deleted booking |
| 7 | `print_order_items.product_name` | Free text, not linked to `products` table | No referential integrity between print orders and the product catalog |
| 8 | `staff.role` scalar | Written in parallel with `roles` array, both read | Confusion about which is canonical; risk of mismatch |
| 9 | `package_addons` / `booking_addons` | Not linked to `services` | Legacy addons invisible to Smart Pipeline and service fulfillment tracking |
| 10 | Package Page query | `services` fetched without `studio_id` filter | Returns all active services on the platform, not just the studio's |
| 11 | `print-orders` action | Hardcodes `'cancelled'` status string | Will break silently when a studio renames their cancellation status |

---

## The Three Architectures That Must Be Separated

Looking at all of this together, the system is currently one table cluster trying to serve three distinct concerns:

### Architecture A — The Catalog
> What does this studio offer to the world?

`studios → services → packages (via package_services)`

This is clean. The problem is legacy packages that bypass it.

### Architecture B — The Commerce Engine
> How does a client engage the studio and how does money move?

`clients → bookings → booking_services → invoices → payments`

This is architecturally sound but the `bookings` table is overloaded — it is simultaneously the commercial agreement AND the operational session record. These need separating.

### Architecture C — The Operations Layer
> How does the studio actually deliver the work?

`bookings → booking_staff → galleries → contracts → print_orders`

This is mostly fine but has no formal concept of a "session" (a scheduled delivery event) separate from the booking. One booking = one shoot = one invoice is the assumption baked in everywhere. That assumption is now false.

---

## The Proposed Clean Architecture

```
CATALOG LAYER
────────────────────────────────────────────────────────
studios
  └── services (atoms: owns duration, outfits, booking_fields)
        └── service_sections
  └── packages (compositions: owns price, visibility, storytelling)
        ├── package_services → services
        └── package_sections / package_inclusions

COMMERCE LAYER
────────────────────────────────────────────────────────
clients
  └── bookings (the commercial agreement — status pipeline lives here)
        ├── booking_services → services (snapshot of what was selected + price at booking)
        └── [NEW] sessions (one or many physical delivery events per booking)
              ├── session_date, location, assigned staff
              └── booking_staff (moves here from bookings)

FINANCE & DELIVERY LAYER
────────────────────────────────────────────────────────
bookings
  ├── invoices → payments
  ├── contracts
  ├── galleries → gallery_photos
  └── print_orders → print_order_items → products

OPERATIONS LAYER
────────────────────────────────────────────────────────
staff
  └── staff_checkins
equipment
  └── equipment_checkouts → [sessions, not bookings]

OMNICHANNEL LAYER
────────────────────────────────────────────────────────
conversations (studio ↔ client thread)
  └── messages
```

---

## The Decomposer's Rules (for legacy packages)

When a legacy package (has no `package_services`) is opened, the decomposer should:

1. Read the deprecated scalar fields: `outfits_count`, `duration_mins`, `session_type`, `service_type`
2. Read `package_addons` for any addon text
3. Cross-reference against the studio's existing `services` for potential matches
4. Propose a service decomposition for the studio owner to review:
   - Create a base service with the package's primary attributes
   - Convert each addon to a service in the catalog
   - Link all via `package_services`
5. On confirmation: create the services, link them, and null out the deprecated package columns
6. If the studio has no services at all: walk them through creating their first service from the package data — "structure emerging from chaos"
