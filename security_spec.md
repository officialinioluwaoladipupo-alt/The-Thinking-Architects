# Security Specification — The Thinking Architect

## 1. Data Invariants

1. **Public Read Isolation**: Unauthenticated and non-admin visitors may ONLY `get` or `list` documents in `/sessions/{sessionId}` and `/media/{mediaId}` where `resource.data.published == true`, and in `/wrappedConfig/{configId}` (`year-YYYY` archives) where `resource.data.enabled == true`. Draft or unpublished documents are strictly restricted to verified admins.
2. **Admin-Only Writes**: All `create`, `update`, and `delete` operations across `/sessions/{sessionId}`, `/media/{mediaId}`, `/admins/{userId}`, `/siteSettings/public`, and `/wrappedConfig/{configId}` require `request.auth != null`, `request.auth.token.email_verified == true`, and `isAdmin()`.
3. **Email Spoofing Guard**: Bootstrapped admin access (`oladipupoinioluwa93@gmail.com` and `officialinioluwaoladipupo@gmail.com`) MUST verify `request.auth.token.email_verified == true` alongside the email match.
4. **Strict Schema & Key Allowlisting**: Every write must pass `isValidSession()`, `isValidMedia()`, `isValidAdmin()`, `isValidSubscriber()`, `isValidPitch()`, `isValidSiteSettings()`, or `isValidWrappedConfig()` enforcing exact `keys().hasAll(...)` and `keys().hasOnly(...)`, string length bounds, bounded list sizes, integer bounds, and HTTPS/ISO pattern validation.
5. **Immutable Audit & Ownership Fields**: On `create`, `createdBy == request.auth.uid` and `createdAt == request.time` and `updatedAt == request.time`. On `update`, `createdBy` and `createdAt` remain immutable (`incoming().createdBy == existing().createdBy && incoming().createdAt == existing().createdAt`) and `updatedAt == request.time`.
6. **Path ID Hardening**: All document IDs (`sessionId`, `mediaId`, `userId`, `pitchId`, `settingId`, `configId`) must match `^[a-zA-Z0-9_-]+$` and `size() <= 128` on single-document operations (`get`, `create`, `update`, `delete`).
7. **PII Isolation (`/admins`, `/subscribers`, `/pitches`)**: Admin records in `/admins/{userId}`, member emails in `/subscribers/{subscriberId}`, and speaker/topic pitches in `/pitches/{pitchId}` are never readable by public or non-admin users (`allow get, list: if isAdmin()`). Public visitors may only submit valid create-only payloads to `/subscribers/{subscriberId}` or `/pitches/{pitchId}` (with `status == 'new'` and `createdAt == request.time`).
8. **Public Channel Links (`/siteSettings/public`)**: Only the `'public'` configuration document may be fetched by visitors (`allow get: if settingId == 'public'`); all writes require `isAdmin()`, strict HTTPS URL validation, and `updatedBy == request.auth.uid`.
9. **Public Wrapped Configuration & Yearly Archives (`/wrappedConfig/{configId}`)**: Only `'public'` or `'year-YYYY'` documents are permitted. Public visitors may `get` `'public'` or enabled `'year-YYYY'` editions and `list` enabled editions; admins may create/update `'public'` and `'year-YYYY'` editions and delete `'year-YYYY'` archives (`'public'` cannot be deleted).

## 2. The "Dirty Dozen+" Attack Payloads (Expected: `PERMISSION_DENIED`)

1. **Unauthenticated Create Session**: Anonymous client sends `POST /sessions/hacked` with valid schema -> Denied (`isAdmin()` requires verified auth).
2. **Non-Admin Signed-In Create Session**: Regular Google user (`other@example.com`, `email_verified: true`) tries to create `/sessions/new-session` -> Denied (`isAdmin()` false).
3. **Unverified Admin Email Spoof**: User with `email: "oladipupoinioluwa93@gmail.com"` and `email_verified: false` tries to read/write `/admins/uid` -> Denied (`email_verified == true` enforced).
4. **Draft Data Scraping (`list` without filter)**: Non-admin queries `collection(db, "sessions")` without `where("published", "==", true)` -> Denied (`allow list` requires `resource.data.published == true || isAdmin()`).
5. **Draft Single-Doc Read**: Non-admin calls `getDoc(doc(db, "sessions", "draft-id"))` where `published == false` -> Denied.
6. **Shadow / Ghost Field Injection**: Admin sends `{ ...validSession, isFeaturedBypass: true }` or `{ ...validWrapped, secretFlag: true }` on create -> Denied (`keys().hasOnly(...)` rejects shadow keys).
7. **Ownership Spoofing on Create**: Admin creates session with `createdBy: "someone-else-uid"` instead of `request.auth.uid` -> Denied.
8. **Immutable Field Tampering on Update**: Admin updates session or pitch attempting to change `createdBy` or `createdAt` -> Denied.
9. **Client Timestamp Forgery**: Admin creates session or updates `/wrappedConfig/public` with a backdated timestamp instead of `request.time` -> Denied.
10. **Oversized String / Array Exhaustion**: Admin sends a `title` of 5,000 characters, `topics` array of 50 elements, or `extraLocations` array of 50 elements -> Denied (`size() <= ...`, bounded array checks).
11. **Insecure `javascript:` URL or Malformed Date Injection**: Admin sets `mediaUrl: "javascript:alert(1)"`, submitter sets `linkUrl: "javascript:alert(1)"`, or admin sets `launchDateIso: "not-a-date"` -> Denied (`matches(...)` regex enforcement).
12. **Subscriber & Pitch PII Scraping**: Non-admin attempts `getDoc` or `list` on `/subscribers` or `/pitches` -> Denied (`isAdmin()` required).
13. **Wrapped Arbitrary Document ID Poisoning**: Client attempts to create `/wrappedConfig/private-draft` -> Denied (`configId == 'public' || configId.matches('^year-[0-9]{4}$')`).
14. **Public Pitch Status Escalation**: Unauthenticated client submits a `/pitches` document with `status: "scheduled"` instead of `"new"` -> Denied (`incoming().status == 'new'`).
