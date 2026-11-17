# Security Specification — The Thinking Architect

## 1. Data Invariants

1. **Public Read Isolation**: Unauthenticated and non-admin visitors may ONLY `get` or `list` documents in `/sessions/{sessionId}` and `/media/{mediaId}` where `resource.data.published == true`. Draft or unpublished documents (`published == false`) are strictly restricted to verified admins.
2. **Admin-Only Writes**: All `create`, `update`, and `delete` operations across `/sessions/{sessionId}`, `/media/{mediaId}`, and `/admins/{userId}` require `request.auth != null`, `request.auth.token.email_verified == true`, and `isAdmin()`.
3. **Email Spoofing Guard**: Bootstrapped admin access (`officialinioluwaoladipupo@gmail.com`) MUST verify `request.auth.token.email_verified == true` alongside the email match.
4. **Strict Schema & Key Allowlisting**: Every write must pass `isValidSession()`, `isValidMedia()`, or `isValidAdmin()` enforcing exact `keys().hasAll(...)` and `keys().hasOnly(...)`, string length bounds, bounded list size (`1..6`), and HTTPS-only URL patterns.
5. **Immutable Audit & Ownership Fields**: On `create`, `createdBy == request.auth.uid` and `createdAt == request.time` and `updatedAt == request.time`. On `update`, `createdBy` and `createdAt` remain immutable (`incoming().createdBy == existing().createdBy && incoming().createdAt == existing().createdAt`) and `updatedAt == request.time`.
6. **Path ID Hardening**: All document IDs (`sessionId`, `mediaId`, `userId`) must match `^[a-zA-Z0-9_-]+$` and `size() <= 128` on single-document operations (`get`, `create`, `update`, `delete`).
7. **PII Isolation (`/admins` & `/subscribers`)**: Admin records in `/admins/{userId}` and member emails in `/subscribers/{subscriberId}` are never readable by public or non-admin users (`allow get, list: if isAdmin()`). Public visitors may only submit valid create-only payloads to `/subscribers/{subscriberId}` with `createdAt == request.time`.
8. **Public Channel Links (`/siteSettings/public`)**: Only the `'public'` configuration document may be fetched by visitors (`allow get: if settingId == 'public'`); all writes require `isAdmin()`, strict HTTPS URL validation, and `updatedBy == request.auth.uid`.

## 2. The "Dirty Dozen" Attack Payloads (Expected: `PERMISSION_DENIED`)

1. **Unauthenticated Create Session**: Anonymous client sends `POST /sessions/hacked` with valid schema -> Denied (`isAdmin()` requires verified auth).
2. **Non-Admin Signed-In Create Session**: Regular Google user (`other@example.com`, `email_verified: true`) tries to create `/sessions/new-session` -> Denied (`isAdmin()` false).
3. **Unverified Admin Email Spoof**: User with `email: "officialinioluwaoladipupo@gmail.com"` and `email_verified: false` tries to read/write `/admins/uid` -> Denied (`email_verified == true` enforced).
4. **Draft Data Scraping (`list` without filter)**: Non-admin queries `collection(db, "sessions")` without `where("published", "==", true)` -> Denied (`allow list` requires `resource.data.published == true || isAdmin()`).
5. **Draft Single-Doc Read**: Non-admin calls `getDoc(doc(db, "sessions", "draft-id"))` where `published == false` -> Denied.
6. **Shadow / Ghost Field Injection**: Admin sends `{ ...validSession, isFeaturedBypass: true }` on create -> Denied (`keys().hasOnly(...)` rejects shadow keys).
7. **Ownership Spoofing on Create**: Admin creates session with `createdBy: "someone-else-uid"` instead of `request.auth.uid` -> Denied.
8. **Immutable Field Tampering on Update**: Admin updates session attempting to change `createdBy` or `createdAt` -> Denied.
9. **Client Timestamp Forgery**: Admin creates session with a backdated `createdAt` instead of `request.time` -> Denied.
10. **Oversized String / Denial-of-Wallet Payload**: Admin sends a `title` of 5,000 characters or `topics` array of 50 elements -> Denied (`size() <= 140`, `topics.size() <= 6`).
11. **Insecure `javascript:` URL Injection**: Admin sets `mediaUrl: "javascript:alert(1)"` on a media item or `instagramUrl: "javascript:alert(1)"` in siteSettings -> Denied (`matches('^(https://.*)?$')`).
12. **Subscriber PII Scraping & Path ID Poisoning**: Non-admin attempts `getDoc` or `list` on `/subscribers` -> Denied (`isAdmin()` required); or client attempts `/sessions/bad$id..slash` -> Denied (`isValidId()` rejects invalid characters).
