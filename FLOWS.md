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
    C --> E[Select room]
    D --> E
    E --> F{Room available?}
    F -->|No| G[Reject: room not available]
    F -->|Yes| H{Date overlap with active reservation?}
    H -->|Yes| I[Reject: date conflict]
    H -->|No| J{Guest count <= room max?}
    J -->|No| K[Reject: exceeds capacity]
    J -->|Yes| L[Create reservation - status: Confirmed]
```

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
