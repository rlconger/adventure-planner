# Security Rules Specification

This document details the data security requirements, malicious attack vector analysis ("Dirty Dozen" payloads), and Firestore security rules design to protect the Adventure Planner backend against unauthorized modifications and data leakage.

## 1. Data Invariants
1. **Trips access**: Trips can be read by anyone (enabling shared trip planning and poll viewing/voting). Writes (creates/updates) must check if the user is authenticated, and updates are restricted to the owner (`ownerId`) or members of the roster if applicable. Alternatively, since it is a personal/collaborative tool, authenticated users can write trips, and updates are only allowed if `ownerId` matches the request auth UID or if they are anonymous but updating voting. To keep our rules robust:
   - Creating a trip: the `ownerId` must match the authenticated user UID.
   - Updating/deleting a trip: must be authenticated and match `ownerId`.
   - Creating/updating GPX tracks: restricted to authenticated owners or authorized roles.
   - Registering a vote: votes are open-access based on `voterName` or can be updated by any caller who specifies a valid `pollId`.
   - Global attendees address book: can be updated by authenticated users.

## 2. The "Dirty Dozen" Extreme Payloads (Defensive Scope)
1. **Payload 1 (Identity Theft)**: An attacker attempts to create a trip document setting `ownerId: "someone_else_uid"`.
   - *Defense*: Secure rules must mandate `request.resource.data.ownerId == request.auth.uid`.
2. **Payload 2 (Ghost Field Injection)**: An attacker attempts to inject random attributes (e.g. `isVerifiedAdmin: true`) on a trip.
   - *Defense*: Strict map keys and shape validation in `isValidTrip()` blocks this.
3. **Payload 3 (ID Spoofing)**: Injecting extremely long, junk strings as trip, gpx, or attendee IDs to cause storage overflow (Denial of Wallet).
   - *Defense*: Rule-level regex string filters on ID variables (`id.size() <= 128` & matches a normal pattern).
4. **Payload 4 (Temporal Tampering)**: Writing a fake historical timestamp for `createdAt` during trip initialization.
   - *Defense*: Mandating `incoming().createdAt == request.time`.
5. **Payload 5 (Illegal State Escalation)**: Forcing an update of `status` from `Planning` directly to `Completed` without valid owner authorization.
   - *Defense*: Only the authentic trip owner can update `status` keys.
6. **Payload 6 (PII Address Book Scrape)**: An anonymous reader tries to pull down private roster email addresses and cell numbers.
   - *Defense*: Roster details and global attendees can only be list-read by authenticated users.
7. **Payload 7 (Ballot Stuffing)**: An attacker tries to wipe or change someone else's vote in another poll.
   - *Defense*: Individual polls must only allow key-based modifiers or validate specific update constraints on `votes` maps.
8. **Payload 8 (GPX Payload Flooding)**: Attempting to upload a huge file (e.g., 50MB of junk text) inside document keys.
   - *Defense*: String size boundaries (`data.content.size() <= 1048576`) to enforce limits on GPX text documents.
9. **Payload 9 (Roster Hijacking)**: A non-owner attempts to edit or clear the trip itinerary legs list.
   - *Defense*: `legs` array updates are strictly guarded by owner matches.
10. **Payload 10 (Immutability Violation)**: Trying to modify `createdAt` or change the `ownerId` of an existing trip.
    - *Defense*: Rules verify `incoming().ownerId == existing().ownerId` and `incoming().createdAt == existing().createdAt`.
11. **Payload 11 (Vandalism of Global Contacts)**: Trying to delete other riders' contact cards from the universal list.
    - *Defense*: Global contact updates must check creator matches or require user authentication blockages.
12. **Payload 12 (Anonymous Admin Pretender)**: An unauthenticated user requests access by mimicking custom claim tokens.
    - *Defense*: Custom claims are never trusted; role verification strictly relies on authenticated user variables.
