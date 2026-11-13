# CareerFlow Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership**: Every document in `users`, `applications`, `activityLogs`, `interviews`, `tasks`, `documents`, and `aiHistory` belongs to exactly one authenticated, email-verified user (`request.auth.uid`). No cross-user reads or writes are permitted.
2. **Identity Integrity**: `uid` / `userId` must equal `request.auth.uid` on creation and is immutable on updates.
3. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt` is immutable on update and `updatedAt` must equal `request.time`.
4. **Relational Integrity**: Every `activityLogs` and `interviews` document must reference an `applicationId` that exists after the transaction/batch (`existsAfter`) and belongs to `request.auth.uid` (`getAfter(...).data.userId == request.auth.uid`). Any `tasks` or `aiHistory` document with a non-empty `applicationId` must likewise reference an owned `applications` document.
5. **Path & Size Guarding**: All document IDs must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string and list has explicit upper bounds.
6. **No Ghost Fields**: `hasAll` + `hasOnly` on create, and action-scoped `affectedKeys().hasOnly(...)` on update.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated read/write** (`auth == null`) -> `PERMISSION_DENIED`.
2. **Unverified email write** (`auth.token.email_verified == false`) -> `PERMISSION_DENIED`.
3. **Cross-user `users/{otherUid}` PII read** -> `PERMISSION_DENIED`.
4. **Blanket `applications` list without `userId == auth.uid` filter** -> `PERMISSION_DENIED`.
5. **Identity spoofing on create** (`applications` doc with `userId: "victim_uid"`) -> `PERMISSION_DENIED`.
6. **Shadow/Ghost field injection** (adding `isAdmin: true` or `extraField: "x"`) -> `PERMISSION_DENIED`.
7. **Owner hijack on update** (changing `userId` on an owned `applications` doc) -> `PERMISSION_DENIED`.
8. **Backdated timestamp tampering** (`createdAt` or `updatedAt` != `request.time`) -> `PERMISSION_DENIED`.
9. **ID poisoning** (creating document with 300-char or invalid-character ID) -> `PERMISSION_DENIED`.
10. **Denial of Wallet payload** (`jobDescription` > 20,000 chars or `skills` array > 30 items) -> `PERMISSION_DENIED`.
11. **Orphaned activity log** (`activityLogs` referencing non-existent or another user's `applicationId`) -> `PERMISSION_DENIED`.
12. **Activity log tampering** (`update` on an immutable `activityLogs` record) -> `PERMISSION_DENIED`.
