export function buildGenericContractTemplate(params: {
  studioName: string
  clientName: string
  sessionDate: string
  packageName: string
}) {
  return `
# Service Agreement

This Agreement is made by and between **${params.studioName}** (the "Provider") and **${params.clientName}** (the "Client").

## 1. Services Provided
The Provider agrees to provide photography/videography services for the Client on **${params.sessionDate}** as detailed in the selected package (**${params.packageName}**).

## 2. Payment Terms
- A non-refundable retainer is required to secure the booking date.
- The remaining balance must be paid in full prior to the delivery of the final assets.
- Prices are subject to change, but the agreed-upon price at the time of booking will be honored.

## 3. Copyright & Usage
- The Provider retains the copyright to all images and videos created during the session.
- The Client receives a personal use license to print and share the images/videos for non-commercial purposes.
- The Provider reserves the right to use the images/videos for portfolio, marketing, and promotional purposes unless explicitly requested otherwise by the Client in writing.

## 4. Cancellation & Rescheduling
- If the Client cancels the booking, the retainer is forfeit.
- Rescheduling requests must be made at least 48 hours in advance and are subject to the Provider's availability.

## 5. Liability
- The Provider is not liable for failure to deliver services due to circumstances beyond their control (e.g., extreme weather, illness, equipment failure). In such events, a full refund of any money paid will be issued.
- The Provider is not responsible for missed moments due to the interference of guests or other vendors.

By signing below, both parties agree to the terms outlined in this Agreement.
`.trim()
}
