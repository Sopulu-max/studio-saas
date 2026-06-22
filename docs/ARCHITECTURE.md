# Weave: Context-Driven Architecture Vision

This document outlines the core architecture of Weave, grounded in the reality of business operations in Nigeria and across Africa, where infrastructure, payments, and connectivity dictate how commerce actually flows.

**Always read this document when making architectural decisions.**

## 1. Critiques & Contextual Realities (The "Why")

### The "Heavy Visualizer" vs. Data Constraints
- **The Reality**: Intermittent 3G/4G connections will cause heavy WebGL 3D print visualizers to fail for the average client, leading to abandoned carts.
- **The Solution (Graceful Degradation)**: The print architecture must support **Server-Side Rendering of Mockups**. If a client is on WhatsApp and cannot open the heavy web visualizer, Weave's backend generates a static 2D composite image (their photo inside a selected frame) and sends it directly back to them *within WhatsApp*.

### Payments are Asynchronous & Trust-Based
- **The Reality**: Standard SaaS assumes automated credit card capture. In reality, bank transfers (via OPay, Moniepoint, etc.) and USSD are heavily utilized. Payments are often negotiated or split.
- **The Solution (The Payment Proof Engine)**: The architecture treats a "Payment" as an asynchronous state machine. WhatsApp acts as the receipt upload portal. The client uploads a screenshot of a transfer. The Weave Message Bus routes that image to the studio's dashboard as a "Pending Payment Proof," allowing the studio manager to manually verify it to advance the workflow.

### Informal Logistics & Fulfillment
- **The Reality**: Print fulfillment networks (Pathway 2) usually rely on standardized courier APIs. In reality, deliveries rely on local dispatch riders and descriptive addresses.
- **The Solution (Localized Logistics Primitive)**: The Print Order schema must support unstructured delivery descriptions ("The blue gate next to the bakery"), phone numbers for dispatch rider handoffs, and localized delivery zone pricing.

---

## 2. Omni-Channel Communication Architecture

WhatsApp is the operating system for commerce. It isn't just an interface; it's where the entire funnel often stays.

**The "Message Bus" Pattern**
We build a **Unified Communication Layer** that allows a client to go from "Hello" to "Here is my payment receipt" entirely within WhatsApp, without ever clicking a web link if they choose not to.

```mermaid
graph TD
    Client[Client (WhatsApp)]
    
    subgraph Unified Communication Layer
        WA[WhatsApp Webhook]
        MB[Weave Message Bus]
        AI[Automated Assistant / Flow Router]
    end
    
    subgraph Core System
        SM[Session Management & CRM]
        INV[Invoicing & Manual Payment Verification]
        PRT[Print Catalog & Static Mockup Generator]
    end

    Client <--> WA
    WA <--> MB
    MB <--> AI
    MB <--> SM
    MB <--> INV
    MB <--> PRT
```

---

## 3. Print Commerce Architecture

**Pathway 1: The Omni-Storefront (Current Phase)**
- **Web Frontend**: An interactive visualizer for high-bandwidth users.
- **WhatsApp Frontend**: Users can request mockups via chat, and the backend generates a static JPG mockup.
- **Order Capture**: Orders are captured with support for informal delivery instructions and asynchronous payment proofs.

**Pathway 2: The Print Fulfillment Network (Future Phase)**
- **Print Studio Nodes**: Dedicated print studios on the platform.
- **Localized Dispatch**: Supports handoffs to local dispatch riders, tracking order states via WhatsApp updates ("Your print is with the rider, call 080...").

---

## 4. The Tiered Gallery Architecture

Because data is expensive, galleries must be highly optimized.
- **Tier 1: The Client Gallery**: Branded delivery. Must include low-bandwidth "preview" modes and "download all" functions that work gracefully over unstable connections (e.g., resumable downloads).
- **Tier 2: The Studio Portfolio**: Public showcase for marketing.
- **Tier 3: The Weave Platform Gallery**: Global showcase.
