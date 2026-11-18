# Security Specification — The Thinking Architects

## 1. Data Invariants

1. **Public Read Isolation**: Unauthenticated and non-admin visitors may ONLY `get` or `list` documents in `/sessions/{sessionId}`, `/media/{mediaId}`, and `/wrappedSlides/{slideId}` where `resource.data.published == true`. Draft or unpublished documents (`published == false`) are strictly restricted to verified admins.
2. **Admin-Only Writes**: All `create`, `update`, and `delete` operations across `/sessions/{sessionId}`, `/media/{mediaId}`, `/wrappedSlides/{slideId}`, `/admins/{userId}`, and `/siteSettings/{settingId}` require `request.auth != null`, `request.auth.token.email_verified == true`, and `isAdmin()`.
3. **Email Spoofing Guard**: Bootstrapped admin access (`officialinioluwaoladipupo@gmail.com`) MUST verify `request.auth.token.email_verified == true` alongside the email match.
4. **Strict Schema & Key Allowlisting**: Every write must pass `isValidSession()`, `isValidMedia()`, `isValidAdmin()`, `isValidSubscriber()`, `isValidSiteSettings()`, `isValidWrappedSettings()`, `isValidLiveSettings()`, `isValidWrappedSlide()`, or `isValidSessionQuestion()` enforcing exact `keys().hasAll(...)` and `keys().hasOnly(...)`, string length bounds, bounded list sizes, and HTTPS/relative URL & ISO-8601 patterns.
5. **Immutable Audit & Ownership Fields**: On `create`, `createdBy == request.auth.uid` and `createdAt == request.time` and `updatedAt == request.time`. On `update`, `createdBy` and `createdAt` remain immutable (`incoming().createdBy == existing().createdBy && incoming().createdAt == existing().createdAt`) and `updatedAt == request.time`.
6. **Path ID Hardening**: All document IDs (`sessionId`, `mediaId`, `slideId`, `settingId`, `subscriberId`, `questionId`, `userId`) must match `^[a-zA-Z0-9_-]+$` and `size() <= 128` on single-document operations (`get`, `create`, `update`, `delete`).
7. **PII Isolation (`/admins` & `/subscribers`)**: Admin records in `/admins/{userId}` and member emails in `/subscribers/{subscriberId}` are never readable by public or non-admin users (`allow get, list: if isAdmin()`). Public visitors may only submit valid create-only payloads to `/subscribers/{subscriberId}` with `createdAt == request.time`.
8. **Public Site, Live Companion & Wrapped Config (`/siteSettings/{public|wrapped|live}`)**: Only `'public'`, `'wrapped'`, and `'live'` configuration documents may be fetched by visitors (`allow get: if settingId == 'public' || settingId == 'wrapped' || settingId == 'live'`); all writes require `isAdmin()`, strict key/regex validation, and `updatedBy == request.auth.uid`.
9. **Live Q&A Queue Integrity (`/sessionQuestions/{questionId}`)**: Public attendees may create questions (`upvotes == 1`, `answered == false`, `createdAt == request.time`) tied to an existing session or `'live-lobby'`, and may ONLY upvote by `+1` (`upvotes == existing().upvotes + 1`) changing only `['upvotes', 'updatedAt']`; marking `answered` or deleting questions requires `isAdmin()`.

## 2. The "Dirty Dozen" Attack Payloads (Expected: `PERMISSION_DENIED`)

1. **Unauthenticated Create Session / Wrapped Slide**: Anonymous client sends `POST /sessions/hacked` or `POST /wrappedSlides/hacked` with valid schema -> Denied (`isAdmin()` requires verified auth).
2. **Non-Admin Signed-In Mutation**: Regular Google user (`other@example.com`, `email_verified: true`) tries to write `/sessions/new-session` or `/siteSettings/live` -> Denied (`isAdmin()` false).
3. **Unverified Admin Email Spoof**: User with `email: "officialinioluwaoladipupo@gmail.com"` and `email_verified: false` tries to read/write `/admins/uid` -> Denied (`email_verified == true` enforced).
4. **Draft Data Scraping (`list` without filter)**: Non-admin queries `collection(db, "sessions")` or `collection(db, "wrappedSlides")` without `where("published", "==", true)` -> Denied (`allow list` requires `resource.data.published == true || isAdmin()`).
5. **Q&A Vote Inflation / Text Tampering**: Public attendee sends `updateDoc` on `/sessionQuestions/{id}` setting `upvotes: 9999` or rewriting `question` text or flipping `answered: true` -> Denied (`upvotes == existing().upvotes + 1` and `affectedKeys().hasOnly(['upvotes', 'updatedAt'])`).
6. **Shadow / Ghost Field Injection**: Admin or public client sends `{ ...validQuestion, isPinnedBypass: true }` on create -> Denied (`keys().hasOnly(...)` rejects shadow keys).
7. **Orphan Q&A Target Spoofing**: Attendee submits `/sessionQuestions/{id}` referencing non-existent `sessionId: "fake-session"` -> Denied (`exists(/sessions/...)` check).
8. **Immutable Field Tampering on Update**: Admin or public user attempts to change `createdBy` or `createdAt` -> Denied.
9. **Client Timestamp Forgery**: Client creates question or settings with a backdated `createdAt` / `updatedAt` instead of `request.time` -> Denied.
10. **Oversized String / Denial-of-Wallet Payload**: Client sends a `question` of 5,000 characters or `announcementText` of 1,000 characters -> Denied (`size() <= 280`, `size() <= 140`).
11. **Insecure `javascript:` URL Injection**: Admin sets `announcementLinkHref: "javascript:alert(1)"` or `liveRoomUrl: "javascript:alert(1)"` -> Denied (strict `matches(...)`).
12. **Subscriber PII Scraping & Path ID Poisoning**: Non-admin attempts `getDoc` or `list` on `/subscribers` or `/siteSettings` -> Denied (`isAdmin()` required); or client attempts `/sessionQuestions/bad$id..slash` -> Denied (`isValidId()` rejects invalid characters).
