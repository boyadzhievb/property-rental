# Logic Flows

Consult these diagrams before implementing or modifying any action flow. Every state transition and multi-step operation must respect these rules.

## Room State Machine

```mermaid
stateDiagram-v2
    [*] --> Available
    Available --> Occupied : check-in
    Available --> Maintenance : markMaintenance
    Occupied --> Cleaning : check-out
    Cleaning --> Available : vacate (clean complete)
    Maintenance --> Available : markAvailable
```

- An occupied room cannot be booked or put into maintenance.
- A room must pass through Cleaning before becoming Available again after checkout.

## Reservation State Machine

```mermaid
stateDiagram-v2
    [*] --> Confirmed
    Confirmed --> Checked_In : checkIn
    Confirmed --> Cancelled : cancel
    Checked_In --> Checked_Out : checkOut
    Checked_In --> Cancelled : cancel
```

- Only active reservations (Confirmed or Checked In) block availability.
- Cancelled and Checked Out are terminal states.

## Reservation Creation Flow

```mermaid
flowchart TD
    A[Start] --> B{Select or create guest?}
    B -->|Existing| C[Select guest from list]
    B -->|New| D[Fill guest details and create]
    C --> E[Select room - all rooms visible]
    D --> E
    E --> F[Select dates]
    F --> G{Date overlap with active reservation for this room?}
    G -->|Yes| H[Reject: date conflict]
    G -->|No| I{Guest count <= room max?}
    I -->|No| J[Reject: exceeds capacity]
    I -->|Yes| K[Create reservation - status: Confirmed]
```

- All rooms are shown regardless of current status, since a reservation can be for future dates after the current guest checks out.

## Check-In Flow

```mermaid
flowchart TD
    A[Select reservation] --> B{Status = Confirmed?}
    B -->|No| C[Reject: cannot check in]
    B -->|Yes| D[Set reservation status to Checked In]
    D --> E[Set room status to Occupied]
```

## Check-Out Flow

```mermaid
flowchart TD
    A[Select reservation] --> B{Status = Checked In?}
    B -->|No| C[Reject: cannot check out]
    B -->|Yes| D[Set reservation status to Checked Out]
    D --> E[Set room status to Cleaning]
```

## Cancellation Flow

```mermaid
flowchart TD
    A[Select reservation] --> B{Status active?}
    B -->|No| C[Reject: already terminal]
    B -->|Yes| D[Set reservation status to Cancelled]
    D --> E{Was room Occupied?}
    E -->|Yes| F[Set room to Cleaning]
    E -->|No| G[No room change needed]
```

## Payment Flow

```mermaid
flowchart TD
    A[Select reservation] --> B{Status = Cancelled?}
    B -->|Yes| C[Reject: cannot pay cancelled reservation]
    B -->|No| D[Enter amount, method, optional note]
    D --> E{Amount > 0?}
    E -->|No| F[Reject: invalid amount]
    E -->|Yes| G[Create Payment record linked to reservation]
    G --> H[Balance = reservation.price - sum of payments]
    H --> I{Balance <= 0?}
    I -->|Yes| J[Reservation is fully paid]
    I -->|No| K[Balance still outstanding]
```

- Payments are a separate entity linked to a reservation via `reservationId`.
- Multiple partial payments are allowed until balance reaches zero.
- Payments can be recorded from: Guest detail view, Calendar reservation detail.
- Payment methods: `cash`, `card`, `transfer`.

## Task Flow

```mermaid
flowchart TD
    A[App loads Today view] --> B[Auto-generate tasks from current state]
    B --> C{Room in Cleaning status?}
    C -->|Yes| D[Create: Clean room-name]
    B --> E{Arrival today?}
    E -->|Yes| F[Create: Prepare room for guest]
    B --> G{Payment balance > 0 on today's reservation?}
    G -->|Yes| H[Create: Check payment from guest]
    B --> I[Show all tasks as checklist]
    I --> J{Owner completes cleaning task?}
    J -->|Yes| K[Mark task done + Room status → Available]
    I --> L{Owner completes other task?}
    L -->|Yes| M[Mark task done]
```

- Auto-generated tasks are idempotent: they use deterministic IDs (`auto-clean-{roomId}-{date}`) so they are not duplicated on refresh.
- Completing a cleaning task automatically transitions the room from Cleaning → Available.
- Manual tasks can be created by the owner with a title and category (cleaning, preparation, payment, communication, custom).
- Tasks are scoped to a single day.
