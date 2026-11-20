# The Thinking Architects (`TTA`) — Technical & Product Audit Report

> **Audit Basis & Redactions:** Every finding below was verified directly against files and command outputs in the workspace (`git status`, `npm run lint`, `npx tsc --noEmit`, `npm audit --omit=dev`). Per security constraints, API keys, OAuth client IDs, spreadsheet IDs, and personal/member email addresses (including the two bootstrapped owner Gmail addresses) are omitted.

---

## A. Product

### 1. Overview, Audience & Full Feature List

**The Thinking Architects (`TTA`)** is a media, events, and community web platform launched in January 2026 (`app/layout.tsx`, `components/AboutPageClient.tsx`, `components/SiteFooter.tsx`). It operates as an independent community explicitly unaffiliated with ARCON, NIA, or JBAE (`components/SiteFooter.tsx`).

**Target Audience:**
- Architecture students (undergraduate, M.Arch, SIWES/interns)
- Recent graduates & NYSC / early-career architects
- Practising & registered architects (local and diaspora)

**Current Feature Inventory:**
- **Editorial Marketing & Community Pages:** Home (`/`), About (`/about`), Community (`/community`), Contact (`/contact`), plus `/get-involved` → `/community`.
- **Think Sessions Showcase & Archive (`/sessions`, `/sessions/[id]`):** Dynamic Home spotlight card, upcoming hero section, multi-term search + keyword topic filters + speaker directory, and individual session pages with companion resource links.
- **Live Session Companion Mode:** 1-click toggle in `/admin` writing to `/liveState/current`, switching Home/Sessions banners into a dark live strip with an elapsed/countdown clock (`LiveElapsedClock`), surfacing an optional HTTPS Meet/Zoom button, and opening a real-time **Live Q&A Queue** (`SessionLiveQaQueue`) with attendee submissions, `+1` upvotes, and admin moderation.
- **Calendar Ecosystem:**
  - Per-session **Google Calendar** prefilled link and client-side `.ics` download (`SessionCalendarActions`).
  - Live **Subscribed Calendar Feed** (`GET /api/sessions/calendar.ics`) paired with `SubscribeAllSessionsBar` (Google Calendar `cid=webcal://...`, Apple/Outlook `webcal://...`, copy URL).
  - Automatic client-side **WAT-to-local timezone detection** (`SessionLocalTimeNote`).
- **Browser Session Reminders:** Client-side Web Notifications scheduled 15 minutes before `startAtIso` (`SessionRemindButton`, `lib/sessionReminders.ts`).
- **Media Library & YouTube Feed Merge (`/media`):** Embedded player (`YouTube-nocookie`, `Vimeo`, `Spotify`, HTML5 `<video>`/`<audio>`), key takeaways, automatic merge of up to 12 latest videos from `/api/youtube`, and search/topic/speaker filtering.
- **Shareable Quote Card Generator:** Client-side HTML5 `<canvas>` PNG download (`1080×1350`) on session topics and media key takeaways (`TakeawayQuoteButton`, `lib/quoteCardGenerator.ts`).
- **Community Intake & Speaker/Topic Pitches:** Tally popup (`9q8l55`) with Firestore fallback `JoinModal` (`/subscribers`), footer newsletter signup, and `PitchModal` (`/pitches`).
- **TTA Year Wrapped (`/wrapped`):** 10-slide animated Annual Review with WebGL Bayer-dithered background (`DitherBackground`), play/pause autoplay, fullscreen/keyboard/swipe navigation, social share intents, and an admin-toggled countdown/offline holding screen.
- **Admin Console (`/admin`):** Google Auth-gated 7-tab CMS including Google Sheets member directory sync (writing `/communityStats/public` and optionally `/wrappedConfig/public`), legacy dual-DB import, and co-admin access control.

---

### 2. Public Routes

All `app/**/page.tsx` routes are minimal Server Component wrappers delegating to `"use client"` components inside `FirestoreErrorBoundary`, sharing `SiteHeader` and `SiteFooter`.

| Route | Purpose | Sections & Interactive Features |
| :--- | :--- | :--- |
| **`/`** (`app/page.tsx` → `LandingPageClient.tsx`) | Landing page & primary intake funnel | - **`HeroSection`**: Full-bleed studio image, *"Join the community"* CTA (`triggerTallyPopup` → `JoinModal` fallback), link to `/sessions`.<br>- **`WrappedHomeBanner`**: Conditionally overlaps hero bottom when `wrappedConfig.public.homeBannerEnabled` is true; renders live `WrappedCountdownClock` when `homeCountdownEnabled` and `launchDateIso` are set.<br>- **`TracksGrid` (`#what-we-do`, `#next-session`)**: 3 pillar cards (`Think Sessions`, `Recordings & features`, `Members' space`) + dynamic spotlight card. Normally shows the featured session (`isNextSession` fallback to upcoming/first), WAT/local time, custom Luma/Tally CTA, and compact Calendar buttons. When `/liveState/current.isLive` is true, transforms into a `#111111` **"Happening Live Now · Enter Session Room"** strip with `LiveElapsedClock`, `/sessions/[id]#live-qa` CTA, and optional HTTPS Meet/Zoom `"Join Live Call"` button.<br>- **`StageRailSection`**: 5 career-stage cards in a horizontal scroll-snap rail with prev/next buttons.<br>- **`HowItWorksGrid`**: 3-step hairline grid + Join CTA.<br>- **`FaqSection`**: 4 `<details>`/`<summary>` FAQ items; FAQ #4 (*"How can I suggest a topic or speak?"*) opens `PitchModal`.<br>- **`ClosingSection`**: Full-bleed atrium backdrop + Join CTA. |
| **`/about`** (`app/about/page.tsx` → `AboutPageClient.tsx`) | Mission, origin & independence statement | - Static editorial blocks: **"The gap"**, **"What we do"** (3 pillars), **"How we work"** (3 principles), Jan 2026 founding note, and Join CTA (`JoinModal` fallback). |
| **`/sessions`** (`app/sessions/page.tsx` → `SessionsPageClient.tsx`) | Calendar hub, next session & searchable archive | - **`SubscribeAllSessionsBar`**: Google Calendar subscribe, Apple/Outlook `webcal://` link, and copyable `.ics` URL for `/api/sessions/calendar.ics`.<br>- **Live Broadcast Strip**: Renders when `/liveState/current.isLive` is active, linking to `/sessions/[id]#live-qa` and optional HTTPS call URL.<br>- **Next Session Hero**: Upcoming featured session with custom Luma registration CTA (`"Reserve your place"`—excluding Tally & live call hosts—or Tally fallback), `SessionCalendarActions`, `SessionRemindButton`, and `SessionLocalTimeNote`.<br>- **Archive Discovery**: Search box, 5 keyword-matched `DISCOVERY_TOPICS` (`All`, `Registration`, `Studio Practice`, `Portfolio`, `Working Abroad`, `Early Career`), and `Past Speakers Directory` filter.<br>- **Session Archive Rows**: `"Watch"` link (matched to published media), `SessionRemindButton`, and `"Details"` link (`/sessions/[id]`).<br>- **Bottom Pitch CTAs**: Opens `PitchModal` pre-set to `"topic"` or `"speaker"`. |
| **`/sessions/[id]`** (`app/sessions/[id]/page.tsx` → `SessionDetailClient.tsx`) | Single session detail, live room & Q&A | - **Live Banner**: Renders when `liveState.isLive && liveState.sessionId === session.id` with `LiveElapsedClock` and HTTPS `"Join Live Call"` link.<br>- **Metadata & Time**: Number, date/time labels, WAT/local offset (`SessionLocalTimeNote`), format, speaker & role.<br>- **Topics & Key Takeaways**: Session `topics[]` and matched Media `highlights[]`, each paired with `TakeawayQuoteButton` (PNG quote card export).<br>- **Companion Resources**: Up to 4 external HTTPS links (`resources[]`).<br>- **Live Q&A Queue (`#live-qa`, `SessionLiveQaQueue`)**: Active when live, `qaOpen`, questions exist, or viewer is admin. Visitors submit name/stage/question and `+1` upvote (`localStorage` dedup); admins see inline **On Air / Answered / Re-queue / Delete** actions.<br>- **Upcoming Actions**: Custom Luma RSVP / Join CTA, Google Calendar, `.ics` download, and `SessionRemindButton`.<br>- **Media Player**: Embedded `getEmbedInfo` player for archived/recorded sessions.<br>- **Inline Pitch Trigger**: Opens `PitchModal` defaulted to `"topic"`. |
| **`/media`** (`app/media/page.tsx` → `MediaPageClient.tsx`) | Recording player, takeaways & YouTube merge | - Wrapped in `<Suspense>` for `?session=` pre-filtering.<br>- **Controls**: `All / Recording / Feature` filter, search input, `DISCOVERY_TOPICS`, and speaker directory.<br>- **Active Player Stage**: Embeds via `getEmbedInfo`, shows summary, takeaways with `TakeawayQuoteButton`, and external watch link.<br>- **3-Column Grid**: Merges Firestore `media` items with up to 12 latest videos fetched via `/api/youtube` (deduped by URL) from `siteSettings.youtubeUrl`. |
| **`/community`** (`app/community/page.tsx` → `CommunityPageClient.tsx`) | Community overview, stats & onboarding | - **Community Highlights**: 3 metric blocks preferring `/communityStats/public` when present, falling back to `/wrappedConfig/public` + live speaker count.<br>- **Benefits & Onboarding**: 3 benefits, 3 onboarding steps, 6-field Tally form breakdown, and 3 ground rules.<br>- **CTAs**: Join buttons (with `data-tally-open="9q8l55"` + `triggerTallyPopup`) and Pitch modal trigger. |
| **`/get-involved`** (`app/get-involved/page.tsx`) | Route alias | - Server-side `redirect("/community")`. |
| **`/contact`** (`app/contact/page.tsx` → `ContactPageClient.tsx`) | Inquiries, pitches & social directory | - Pitch modal + `mailto:hello@thethinkingarchitects.com.ng`, 4 inquiry topics with Suggest/Speak modal triggers, 2–5 business day SLA + deletion notice, and 4-card `"Find us"` grid reading `/siteSettings/public` (with hardcoded fallbacks for Instagram and X). |
| **`/wrapped`** (`app/wrapped/page.tsx` → `WrappedPageClient.tsx`) | Interactive Annual Review deck | - **`MotionConfig reducedMotion="user"`** + `DitherBackground` WebGL shader + `SpotlightStageBackdrop` + `RollingCounter`/`BlurWords`/`DecryptedText`/`MagneticAction`.<br>- **Enabled State**: 10-slide deck with Play/Pause (`6s` interval), Fullscreen, keyboard (`ArrowLeft`/`ArrowRight`/`Escape`), touch swipe, left-30%/right-70% click zones, chapter index, and Share controls (Copy caption, X intent, LinkedIn intent).<br>- **Disabled State (`CountdownLockedStage`)**: Dark holding card with live `launchDateIso` countdown or offline message + Join CTA. |

---

### 3. Admin Console (`/admin`)

`/admin` (`app/admin/page.tsx` → `AdminConsoleClient.tsx`) is gated by Google Sign-In. Unverified/unauthorized signed-in users see an **Access Denied** screen displaying their UID for admin provisioning. Header actions include Public Site / Sessions / Media navigation, Sign Out, and a **legacy content import trigger** (`syncLegacyContentToPrimary`) that batch-copies missing `sessions`, `media`, and `siteSettings` from `principal-day-6n50x`.

| Tab | Controls & UI | Firestore Writes |
| :--- | :--- | :--- |
| **`sessions`** | - **`AdminLiveCompanionPanel`**: Session selector, Meet/Zoom HTTPS `roomUrl`, Q&A open toggle, **Go Live / End Live Mode** toggle, `LiveElapsedClock`, and live Q&A moderation queue.<br>- **Session Form**: `number`, `title`, `speaker`, `speakerRole`, `dateLabel`, `timeLabel`, `format`, `status` (`upcoming`/`archived`), `registrationUrl` (Luma), `startAtIso` (WAT picker + Lagos/London/NY preview), `summary`, `topics` (1–6 lines), `resources` (0–4 `{label, url}`), `published`, `isNextSession`, and live `#next-session` preview.<br>- **List Actions**: Live toggle, Edit, **Promote as Next Session**, Toggle Published, **Create Media** draft shortcut, Delete. | - `/liveState/current` (`setDoc`)<br>- `/sessionQuestions/{id}` (`updateDoc`, `deleteDoc`)<br>- `/sessions/{id}` (`setDoc`, `updateDoc`, `deleteDoc`, batch `isNextSession` unset) |
| **`media`** | - **Media Form**: `kind` (`Recording`/`Feature`), `sessionRef`, `title`, `speaker`, `duration`, `publishedAt`, `mediaUrl` (HTTPS), `summary`, `highlights` (1–6 lines), `published`.<br>- **List Actions**: Edit, Toggle Published, Delete. | - `/media/{id}` (`setDoc`, `updateDoc`, `deleteDoc`) |
| **`pitches`** | - Status filter (`all`, `new`, `reviewed`, `scheduled`, `archived`), per-row status dropdown, Delete, and **Convert to Session Draft** (prefills `sessions` tab & sets pitch `status = "scheduled"`). | - `/pitches/{id}` (`updateDoc` `status`, `deleteDoc`) |
| **`wrapped`** (`AdminWrappedTab.tsx`) | - Edition switcher (`public` vs. `year-YYYY` archives), Snapshot & Delete Archive actions, 5 visibility toggles, live `WrappedBannerCard` preview, `launchDateIso` picker, attendance/community metrics, `sessionHighlights` (≤8), locations + `extraLocations` (≤10), `customStats` (≤6), and slide copy. | - `/wrappedConfig/public` & `/wrappedConfig/year-YYYY` (`setDoc`, `deleteDoc`) |
| **`subscribers`** (*Signups & Sheet*) | - **`AdminGoogleSheetsSyncCard`**: OAuth **Connect Google Sheets**, spreadsheet URL/ID loader, tab selector, column mapping (`emailColumn`, `stageColumn`, `locationColumn`), analyzed metrics preview, `showOnCommunity` toggle, **Sync Now & Publish** (plus optional `/wrappedConfig/public` sync).<br>- **Subscribers Table**: Lists `/subscribers`, CSV export (`tta-subscribers-YYYY-MM-DD.csv`), and Delete. | - `/adminConfig/googleSheets` (`setDoc`)<br>- `/communityStats/public` (`setDoc`)<br>- Optionally `/wrappedConfig/public` (`setDoc`)<br>- `/subscribers/{id}` (`deleteDoc`) |
| **`settings`** (*Channels*) | - Inputs for `instagramUrl`, `xUrl`, `linkedinUrl`, `youtubeUrl` (HTTPS). | - `/siteSettings/public` (`setDoc`) |
| **`admins`** | - Lists the 2 locked bootstrapped owner accounts + `/admins/{uid}` rows; Add co-admin (`uid`, `email`, `displayName`) and Revoke (self-revocation disabled). | - `/admins/{userId}` (`setDoc`, `deleteDoc`) |

---

## B. Frontend

### 4. Stack, Routing, State, Styling, Fonts, Canvas & WebGL

- **Framework & Tooling:** Next.js `^15.5.6` (runtime stack trace `15.5.29`, App Router), React `^19.1.1`, TypeScript `^5.9.2` (`strict: true`, `@/*` → `./*` in `tsconfig.json`), `motion ^14.14.0` (`motion/react`), `lucide-react ^1.74.0`, `firebase ^13.4.0`.
- **Server vs. Client Components:** All `app/**/page.tsx` routes are minimal Server Components (`metadata`, `params` resolution, or `redirect`). All data fetching, real-time listeners, forms, and interactive UI live in `"use client"` components; no Server Actions exist.
- **State Management:** React Context (`FirebaseProvider.tsx`) holds auth/admin flags and the in-memory Google Sheets OAuth token (`cachedSheetsAccessToken` + `sheetsToken`). Feature/page components manage local state backed by Firestore `onSnapshot` subscriptions plus browser `localStorage` for reminders (`tta_session_reminders_v1`) and Q&A upvotes (`tta_upvoted_questions_v1`).
- **Styling & Fonts:** Tailwind CSS v4 via `@tailwindcss/postcss` (`@import "tailwindcss";` in `app/globals.css`, no `tailwind.config.ts`). Google Fonts loaded in `app/layout.tsx`: `Plus Jakarta Sans` (`--font-plus-jakarta`), `IBM Plex Mono` (`--font-ibm-plex-mono`, weights 400/500/700, `.label-mono`), and `MuseoModerno` (`--font-museo`, `.logo-tta`).
- **Design Tokens (`app/globals.css`):** `--background: #f7f6f4`, `--foreground: #111111`, `--brand: #fe3619`, `--panel: #efeeec`, `--label-bg: #eaeaea`, `--rule: rgba(17, 17, 17, 0.08)`. Wrapped and Quote Cards add `#1C1C1C` (charcoal), `#F2EDE8` (warm cream), and `#D94F2B` (terracotta).
- **Canvas Card Generator (`lib/quoteCardGenerator.ts`):** Generates a `1080×1350` PNG on an offscreen `<canvas>` with `#1C1C1C` background, `72px` grid lines, `"TTA / THE THINKING ARCHITECTS"` lockup, rounded quote card border, adaptive font sizing (`54/48/42px`), speaker & session footer, and triggers PNG download via `toDataURL("image/png")`. Note: draws using generic system/monospace font stacks rather than the loaded Google Font faces.
- **WebGL Shader (`components/DitherBackground.tsx`):** Custom WebGL1 fragment shader computing 4-octave FBM Perlin noise (`cnoise`) quantized with an `8×8` Bayer matrix and pointer ripple (`u_mouse`), capped at ~30fps (`32ms`), paused via `IntersectionObserver` and `visibilitychange`, and rendered statically under `prefers-reduced-motion`.

---

### 5. Components Map (`components/*` — 36 Files)

- **Core Chrome & Auth:** `FirebaseProvider.tsx`, `FirestoreErrorBoundary.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`
- **Home Page:** `LandingPageClient.tsx`, `HeroSection.tsx`, `WrappedHomeBanner.tsx` (also exports `WrappedBannerCard`), `TracksGrid.tsx`, `StageRailSection.tsx`, `HowItWorksGrid.tsx`, `FaqSection.tsx`, `ClosingSection.tsx`
- **Sessions, Live Room & Media:** `SessionsPageClient.tsx`, `SessionDetailClient.tsx`, `SessionCalendarActions.tsx`, `SessionLiveQaQueue.tsx`, `SessionRemindButton.tsx`, `LiveElapsedClock.tsx`, `TakeawayQuoteButton.tsx`, `MediaPageClient.tsx`
- **Community, About, Contact & Modals:** `CommunityPageClient.tsx`, `AboutPageClient.tsx`, `ContactPageClient.tsx`, `JoinModal.tsx`, `PitchModal.tsx`
- **Wrapped Deck:** `WrappedPageClient.tsx`, `WrappedPrimitives.tsx`, `WrappedCountdownClock.tsx`, `DitherBackground.tsx`
- **Admin Console:** `AdminConsoleClient.tsx`, `AdminLiveCompanionPanel.tsx`, `AdminGoogleSheetsSyncCard.tsx`, `AdminWrappedTab.tsx`
- **Unused / Orphan Components (0 external imports verified by `grep`):** `LiveElapsedTimer.tsx`, `LiveQuestionQueue.tsx`, `WrappedSpotlightBanner.tsx`

---

### 6. Mobile Responsiveness, Accessibility, SEO, Images & Performance

- **Mobile Responsiveness:** Responsive breakpoints (`sm:`/`md:`/`lg:`/`xl:`), fluid `clamp()` display typography, `>=40–48px` tap targets, horizontal scroll-snap on `StageRailSection`, and touch-swipe + left-30%/right-70% click zones on `/wrapped`.
- **Accessibility:** Semantic landmarks, `aria-current="page"`, `aria-expanded`, `role="dialog"` + `aria-modal="true"` + `Escape` listeners on modals, `role="alert"` validation errors, global `2px solid #fe3619` `:focus-visible` outlines, and `prefers-reduced-motion` support across CSS, Framer `MotionConfig`, and WebGL. **Gaps:** Modals lack keyboard `Tab` focus trapping and focus restoration on close; `<textarea>` is omitted from the `:focus-visible` rule selector in `globals.css` (lines 46–53); `/wrapped` mobile overlay tap zones are `<div>`-like clickable regions rather than semantic controls (mitigated by separate Prev/Next buttons).
- **SEO (`app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`):**
  - Root layout configures `metadataBase`, default title/description, OpenGraph, Twitter `summary_large_image`, `/favicon.svg`, and `Schema.org` `Organization` JSON-LD.
  - `app/opengraph-image.tsx` renders a dynamic `1200×630` PNG OG image (`next/og`).
  - `app/robots.ts` allows `/` and disallows `/admin`, pointing to `/sitemap.xml`.
  - **SEO Gaps:** Dynamic pages (`/`, `/sessions`, `/sessions/[id]`, `/media`, `/community`) are client-rendered after hydration, meaning initial HTML lacks Firestore session/media text; `app/page.tsx` has no page-level metadata; `app/sessions/[id]/page.tsx` uses generic static metadata (no `generateMetadata`); `app/sitemap.ts` includes only the 7 static routes and omits `/sessions/[id]`.
- **Image Handling:** 5 local JPGs in `src/assets/images/` rendered with Next `<Image fill referrerPolicy="no-referrer" sizes="..." />` (`priority` on hero). `next.config.ts` sets only `output: "standalone"` (no `images.remotePatterns`). `/public/favicon.svg` is active; `/public/og-image.svg` and `/public/assets/aistudio/...` are unused.
- **Performance Concerns:**
  - **Multiple Concurrent `onSnapshot` Listeners:** Every public route mounts `SiteHeader` (3 listeners: `wrappedConfig/public`, `sessions`, `liveState/current`) and `SiteFooter` (3 listeners across primary+legacy `siteSettings/public` and `wrappedConfig/public`), alongside page-level duplicate listeners (e.g., `MediaPageClient` opens another `sessions` and `siteSettings` listener). `/admin` holds 10+ concurrent listeners open across primary and legacy DBs.
  - **Bundle Weight:** Initializes two `firebase/app` + `firebase/firestore` instances (`lib/firebase.ts` + `lib/legacyFirebase.ts`), `motion`, and external `tally.so/widgets/embed.js` (`afterInteractive`).

---

## C. Backend and API

### 7. API Routes (`app/api/*`)

| Route | Method | Reads / Writes | Auth & Validation | Error Handling & Caching |
| :--- | :--- | :--- | :--- | :--- |
| **`/api/sessions/calendar.ics`** (`app/api/sessions/calendar.ics/route.ts`) | `GET` | Calls `fetchPublishedSessions()` across primary & legacy DBs and outputs an RFC-5545 `.ics` feed of published sessions with valid `startAtIso`. Uses stable `UID:{id}@thethinkingarchitects.com.ng`, 1-hour duration, `URL` set to custom Luma URL (fallback `/sessions/[id]`), description containing both links, and excludes Meet/Zoom URLs and Tally URLs. | **Public (no auth).** Origin resolved from `APP_URL` (`https://`), `x-forwarded-host`/`proto` (non-localhost), `req.nextUrl.origin`, or `DEFAULT_SITE_ORIGIN`. | `dynamic = "force-dynamic"`, `Cache-Control: public, max-age=300, s-maxage=300`. Returns `500` plain text on failure. |
| **`/api/sheets`** (`app/api/sheets/route.ts`) | `GET` | Proxies Google Sheets API v4 (`mode=metadata` for spreadsheet title/tabs; `mode=values` for `A1:ZZ5000`). No Firestore access. | Requires `Authorization: Bearer <token>` header; validates `spreadsheetId` (`/^[a-zA-Z0-9_-]{10,128}$/`), `mode`, and `sheetName`. **Does NOT validate Firebase Auth or Admin role on server.** | `cache: "no-store"`. Forwards upstream HTTP status and Google error JSON; `401`/`400` on validation errors. |
| **`/api/youtube`** (`app/api/youtube/route.ts`) | `GET` | Resolves `channelUrl` to a `UC...` channel ID (path match or channel HTML fetch), fetches YouTube Atom XML, and regex-parses up to 12 `YouTubeVideoItem` entries. | **Public (no auth).** Enforces `https:` and exact host allowlist (`youtube.com`, `www.youtube.com`, `m.youtube.com`). | Next `fetch` cache: `revalidate: 3600` (HTML lookup) & `1800` (Atom XML). Returns HTTP `200` with `{ configured: true, error, videos: [] }` on upstream failure. |

---

### 8. Server Logic, `lib/*`, Caching, Rate Limiting & Schedules

- **Scheduled Jobs / Cron:** None exist in the codebase.
- **Rate Limiting:** None exists on `/api/sessions/calendar.ics`, `/api/sheets`, or `/api/youtube`.
- **Caching:** `max-age=300` on `.ics` feed, Next `revalidate` (1800s/3600s) on YouTube fetches, `no-store` on Google Sheets proxy, and live Firestore `onSnapshot` listeners on client.
- **`lib/*` Modules:**
  - `lib/firebase.ts`: Primary Firebase app, named Firestore DB, Auth, structured error logger (`handleFirestoreError`, `formatFirestoreErrorMessage`), `testConnection()`.
  - `lib/legacyFirebase.ts`: Read-only legacy Firebase app (`principal-day-6n50x`).
  - `lib/firebaseContent.ts`: Schemas/limits (`BLUEPRINT_LIMITS`), defaults, dual-DB merge subscriptions, legacy-to-primary batch import, all Firestore writes/transactions, and the `WrappedConfig` 10-slide adapter.
  - `lib/calendarFeed.ts`: `.ics` generator, 75-char line folder, text escaper, `LIVE_CALL_HOSTS` blocker, Luma URL selector.
  - `lib/sessionCalendar.ts`: Client-only WAT (`UTC+1`) helpers, `useLocalSessionTime`, Google Calendar URL builder, client `.ics` downloader.
  - `lib/sessionReminders.ts`: Client-only `Notification` scheduler backed by `localStorage` (`tta_session_reminders_v1`) and 6h-capped `setTimeout`.
  - `lib/quoteCardGenerator.ts`: `<canvas>` `1080×1350` PNG generator.
  - `lib/googleSheets.ts`: ID extractor, header detector, stage classifier (`student`/`graduate`/`professional`/`other`), location normalizer, email deduplicator, `/api/sheets` client wrappers.
  - `lib/mediaEmbed.ts`: Strict HTTPS embed parser (`youtube-nocookie.com`, `player.vimeo.com`, `open.spotify.com`, direct video/audio extensions).
  - `lib/tally.ts`: Tally `9q8l55` constants, `CONTACT_EMAIL`, `triggerTallyPopup()`.
  - `lib/archiveDiscovery.ts`: `DISCOVERY_TOPICS` keyword filter, search matcher, speaker directory builder.

---

### 9. Integrations

- **Google Sheets:** Client-side OAuth (`FirebaseProvider.connectGoogleSheets`) via `GoogleAuthProvider` + `signInWithPopup` requesting `spreadsheets.readonly`. Token stays strictly in JS memory (`cachedSheetsAccessToken`), passed via `Authorization: Bearer` to `/api/sheets`, analyzed client-side (`analyzeMemberSheetRows`), with aggregate counts only written to `/communityStats/public` (and optionally `/wrappedConfig/public`).
- **Luma:** Per-session `registrationUrl` field in `/admin`. Used for **"Reserve your place"** / **"Register for this session"** buttons and as the primary event `URL` + description link in `/api/sessions/calendar.ics` (ignoring Tally & live-call URLs).
- **Tally:** `app/layout.tsx` loads `https://tally.so/widgets/embed.js` (`afterInteractive`) for hardcoded form `9q8l55`. `triggerTallyPopup()` opens the Tally modal or falls back to `JoinModal` (`/subscribers`). Note: Tally submissions are not automatically synced into `/subscribers`; footer signups write directly to `/subscribers`.
- **Google Meet / Zoom:** Configured per live session in `/liveState/current.roomUrl` via `/admin`. Rendered as **"Join Live Call"** on live UI strips and explicitly excluded from `.ics` feeds and Google Calendar links.
- **Web Notifications:** Native browser `Notification` API (`lib/sessionReminders.ts`). Fires 15 minutes before `startAtIso` **only if a TTA browser tab stays open** (or on reopen within 30 minutes of start). No Service Worker or server Web Push is used.

---

## D. Data and Security

### 10. Data Model

Active named Firestore DB (`firebase-applet-config.json`) merges read-only on `sessions`, `media`, and `siteSettings/public` with legacy DB (`principal-day-6n50x` in `lib/legacyFirebase.ts`), where primary docs win on ID match.

| Collection / Path | Fields | Read / Write | UI Usage |
| :--- | :--- | :--- | :--- |
| **`sessions/{sessionId}`** | `number`, `title`, `speaker`, `speakerRole`, `dateLabel`, `timeLabel`, `format`, `status`, `isNextSession`, `published`, `summary`, `topics` (1–6), `registrationUrl`, `startAtIso` (opt), `resources` (0–4 `{label,url}`, opt), `createdBy`, `createdAt`, `updatedAt` | Read: Public if `published==true`, else Admin.<br>Write: Admin. | Home (`TracksGrid`), `SiteHeader`, `/sessions`, `/sessions/[id]`, `/media`, `/community`, `/api/sessions/calendar.ics`, `/admin` |
| **`media/{mediaId}`** | `kind` (`Recording`\|`Feature`), `sessionRef`, `title`, `speaker`, `duration`, `publishedAt`, `mediaUrl`, `published`, `summary`, `highlights` (1–6), `createdBy`, `createdAt`, `updatedAt` | Read: Public if `published==true`, else Admin.<br>Write: Admin. | `/media`, `/sessions`, `/sessions/[id]`, `/admin` |
| **`admins/{userId}`** | `email`, `displayName`, `addedBy`, `createdAt` | Read/Write: Admin (no self-delete). | `FirebaseProvider`, `/admin` (`Admins` tab) |
| **`subscribers/{subscriberId}`** | `email`, `name`, `stage`, `question`, `source` (`footer`\|`join_modal`), `createdAt` | Read/Delete: Admin.<br>Create: Public.<br>Update: Denied. | `SiteFooter`, `JoinModal`, `/admin` (`Signups & Sheet`) |
| **`pitches/{pitchId}`** | `pitchType`, `name`, `email`, `roleOrStudio`, `topicTitle`, `targetStage`, `outline`, `linkUrl`, `status`, `createdAt`, `updatedAt` | Read/Update(`status`)/Delete: Admin.<br>Create: Public (`status=='new'`). | `PitchModal`, `/admin` (`Pitches` tab) |
| **`siteSettings/public`** | `instagramUrl`, `xUrl`, `linkedinUrl`, `youtubeUrl`, `updatedBy`, `updatedAt` | Get: Public (`public`).<br>List/Write: Admin (no delete). | `SiteFooter`, `/contact`, `/media`, `/admin` (`Channels`) |
| **`communityStats/public`** | `showOnCommunity`, `communityTotal`, `studentsCount`, `graduatesCount`, `professionalsCount`, `countriesCount`, `topLocations` (≤10), `sourceLabel`, `lastSyncedIso`, `updatedBy`, `updatedAt` | Get: Public (`public`).<br>List/Write: Admin (no delete). | `/community`, `/admin` (`Signups & Sheet`) |
| **`adminConfig/googleSheets`** | `spreadsheetId`, `spreadsheetTitle`, `sheetName`, `emailColumn`, `stageColumn`, `locationColumn`, `lastSyncedIso`, `updatedBy`, `updatedAt` | Read/Write: Admin (`googleSheets`, no delete). | `/admin` (`AdminGoogleSheetsSyncCard`) |
| **`liveState/current`** | `isLive`, `sessionId`, `sessionNumber`, `sessionTitle`, `speaker`, `startedAtIso`, `roomUrl`, `qaOpen`, `updatedBy`, `updatedAt` | Get: Public (`current`).<br>List/Write: Admin (no delete). | `SiteHeader`, `TracksGrid`, `/sessions`, `/sessions/[id]`, `/admin` |
| **`sessionQuestions/{questionId}`** | `sessionId`, `authorName`, `authorStage`, `questionText`, `upvotes` (`1..100000`), `status` (`queued`\|`on_air`\|`answered`), `createdAt`, `updatedAt` | Get: Public.<br>List: Public (`limit <= 200`) / Admin.<br>Create: Public (`upvotes==1, status=='queued'`).<br>Update: Public `+1` upvote; Admin `status`.<br>Delete: Admin. | `/sessions/[id]#live-qa`, `/admin` (`AdminLiveCompanionPanel`) |
| **`wrappedConfig/{configId}`** | 49 fields (flags, copy, counts, `sessionHighlights`, `extraLocations`, `customStats`, `launchDateIso`, `updatedBy`, `updatedAt`) | Get: `public` always; `year-YYYY` if `enabled==true` or Admin.<br>List: `enabled==true` or Admin.<br>Write: Admin (`public` or `year-YYYY`).<br>Delete: Admin (`year-YYYY`). | `SiteHeader`, `SiteFooter`, `WrappedHomeBanner`, `/community`, `/wrapped`, `/admin` (`Wrapped`) |

---

### 11. Firestore Rules (`firestore.rules`)

- **Baseline:** Global deny-all fallback (`match /{document=**} { allow read, write: if false; }`); strict regex doc ID checks (`^[a-zA-Z0-9_\-]+$`, 1–128 chars); `request.time` timestamp enforcement; immutable `createdBy`/`createdAt` where present; `^https://.*` URL checks.
- **`startAtIso` Confirmation:** Confirmed **`startAtIso` IS present in `isValidSession`** (line 87 `hasOnly`, line 102 optional ISO-8601 regex & `<= 40` chars) and in `sessions` `allow update` `affectedKeys().hasOnly(...)` (line 398).
- **Local vs. Deployed Rules Parity:** **Cannot be verified from this workspace.** No Firebase CLI / Rules readback API (`GetRules`) is available in this read-only environment to fetch and diff the currently deployed rules on the named database (`ai-studio-thethinkingarchi-...`), though prior session history notes a rules deploy occurred.
- **Inconsistencies & Risks:**
  1. **Array Helpers Validate Only Element `[0]`:** `isValidBoundedStrings` (lines 44–51), `isValidWrappedOptionalList` (lines 53–57), and `isValidResourceList` (lines 71–75) only check `arr[0]`. Items at indices `1..N` (including `resources[1..3].url`) are not type/length/HTTPS-checked at the Firestore rule layer.
  2. **`wrappedConfig` Update Omits `affectedKeys()` Whitelist:** Line 665 validates the full schema via `isValidWrappedConfig(incoming())` + `updatedBy`/`updatedAt`, unlike other collections that also enforce `affectedKeys().hasOnly(...)`.
  3. **Email Case-Sensitivity Mismatch:** `isBootstrappedAdmin()` (lines 33–34) uses exact `==` string matching without `.lower()`, whereas `FirebaseProvider.tsx` checks `.toLowerCase()`.
  4. **Inconsistent `resource != null` on `get`:** `/sessions/{id}` and `/media/{id}` require `resource != null`, while `/siteSettings/public`, `/communityStats/public`, `/liveState/current`, and `/sessionQuestions/{id}` omit it.

---

### 12. Authentication & Authorization

- **Admin Verification:** Client UI (`FirebaseProvider.tsx`) verifies `user.emailVerified` plus membership in either the 2 hardcoded bootstrapped owner emails or `/admins/{uid}`. Firestore `isAdmin()` enforces the same on the server (`request.auth.token.email_verified == true` + bootstrapped email or `/admins/$(request.auth.uid)` existence).
- **Visitor Access:** Can read published sessions/media, public singletons (`siteSettings/public`, `communityStats/public`, `liveState/current`, `wrappedConfig/public`), enabled `year-YYYY` configs, and up to 200 `sessionQuestions`; can create `subscribers`, `pitches` (`status: "new"`), and `sessionQuestions` (`upvotes: 1`, `status: "queued"`); and can increment `sessionQuestions.upvotes` by `+1`. Cannot read drafts, `/subscribers`, `/pitches`, `/admins`, or `/adminConfig/googleSheets`.
- **OAuth Tokens:** Google Sheets readonly tokens come from Firebase `signInWithPopup`, live solely in memory (`cachedSheetsAccessToken`), clear on sign-out, and are sent as `Bearer` tokens to `/api/sheets`.

---

### 13. Security Review

- **Public Write Abuse / Spam Risk (HIGH):** `subscribers`, `pitches`, and `sessionQuestions` allow unauthenticated `create`, and `sessionQuestions` allows unauthenticated `+1` upvote updates. `recaptchaSiteKey` in `firebase-applet-config.json` is empty (`""`)—**Firebase App Check is disabled**, and no CAPTCHA or rate limiting exists. Upvote dedup (`tta_upvoted_questions_v1`) relies strictly on `localStorage`, so automated scripts can spam records or drive any question up to `100,000` upvotes.
- **Unverified Server API Endpoints (MEDIUM):**
  - `/api/sheets` checks only that an `Authorization: Bearer ...` header exists before forwarding to Google Sheets API v4; it does not verify a Firebase Admin ID token.
  - `/api/youtube` is unauthenticated and unthrottled (though strict hostname allowlisting blocks general SSRF).
- **Exposed Config & PII (LOW–MEDIUM):**
  - The 2 bootstrapped owner Gmail addresses are compiled into client JS (`FirebaseProvider.tsx`, `AdminConsoleClient.tsx`).
  - Public Firestore collections hold zero emails/PII (`/subscribers` and `/pitches` are admin-read-only); `saveSubscriber` generates doc IDs with `Date.now()` + `Math.random()` rather than `crypto.randomUUID()` or `addDoc`.
  - Legacy Firebase project (`principal-day-6n50x`) security rules live outside this repository and cannot be verified here.
- **XSS / Injection & URL Validation (LOW):** React auto-escapes JSX; only `dangerouslySetInnerHTML` is static Organization JSON-LD (`app/layout.tsx`). Dynamic URLs enforce `https://` in UI and rules (save the index `[0]` rule gap on `resources`), and `getEmbedInfo` strictly allowlists YouTube, Vimeo, Spotify, and direct audio/video extensions.
- **CORS:** Default Next.js same-origin behavior; no custom permissive `Access-Control-Allow-Origin` headers set.
- **Dependency Vulnerabilities:** `npm audit --omit=dev` **failed with `ENOLOCK`** because dependencies are locked via `bun.lock` rather than `package-lock.json`, preventing an npm vulnerability audit.

---

## E. Infrastructure and Repo

### 14. Hosting, Deployment, Env Vars, Firebase Config & Build/Lint

- **Hosting / Deployment:** Configured for Node.js standalone server output (`output: "standalone"` in `next.config.ts`). `package.json` scripts: `dev` (`next dev -p 3000 -H 0.0.0.0`), `build` (`next build`), `start` (`next start`), `lint` (`eslint`). No Dockerfile or CI/CD pipeline files exist.
- **Environment Variables (`.env.example`):** Declares **1 variable**: `APP_URL`.
- **Firebase Config Structure (`firebase-applet-config.json`):** JSON keys `projectId`, `appId`, `apiKey`, `authDomain`, `firestoreDatabaseId` (named DB `ai-studio-thethinkingarchi-...`), `storageBucket`, `messagingSenderId`, `measurementId` (empty), `oAuthClientId`, and `recaptchaSiteKey` (empty). Legacy read-only config lives in `lib/legacyFirebase.ts` (`projectId: "principal-day-6n50x"`, named `firestoreDatabaseId`).
- **Build / Lint Checks:**
  - `npm run lint` (`eslint.config.mjs` with `next/core-web-vitals`, `next/typescript`, `@firebase/eslint-plugin-security-rules`) **exited 0** (clean pass).
  - `npx tsc --noEmit` **exited 0** (zero TypeScript errors).

---

### 15. Git Status

- **No Git repository exists in this workspace.**
- Running `git status` fails with:
  `fatal: not a git repository (or any of the parent directories): .git`
- There are **no branches, commit history, uncommitted diffs, or branch divergence**. Version history and checkpoints are handled externally by the AI Studio environment.

---

### 16. Tests

- **What Exists:** `firestore.rules.test.ts` (271 lines) + `security_spec.md`.
- **Coverage:** Defines `dirtyDozenSecurityCases`, a **static TypeScript data matrix** of 24 security attack scenarios across the 11 Firestore collections mapped to expected `PERMISSION_DENIED` rule gates.
- **What Is Missing:**
  - **No executable test runner** (`package.json` has no `test` script; no `vitest`, `jest`, `@firebase/rules-unit-testing`, Firestore Emulator config, or `playwright` installed). `firestore.rules.test.ts` is specification-only and does not run.
  - Zero automated tests for `/api/*`, `lib/calendarFeed.ts`, `lib/googleSheets.ts`, `lib/mediaEmbed.ts`, `lib/sessionReminders.ts`, or UI flows.

---

## F. Status

### 17. Known Issues, Bugs & Hardcoded Values (Ranked by Severity)

1. **HIGH — Multi-Year Wrapped (`?year=YYYY`) & `customStats` Milestone Cards Are Unwired (`WrappedPageClient.tsx`, `lib/firebaseContent.ts`):**
   - `AdminWrappedTab.tsx` saves `year-YYYY` documents, generates `/wrapped?year=...` preview links, and tells admins that `customStats` *"automatically unlocks a dedicated Milestones slide in Wrapped and displays them below the deck."*
   - `WrappedPageClient.tsx` ignores `?year=` (always reading `"public"`), hardcodes `"Annual Review · 2026"` (line 775), and neither `mapWrappedConfigToSlides` nor `WrappedPageClient` renders `customStats`.
2. **HIGH — No Bot/Spam Protection on Public Writes & Unauthenticated `/api/sheets` Firebase Check:**
   - `recaptchaSiteKey` is empty; public `subscribers`, `pitches`, `sessionQuestions`, and `+1` upvotes lack App Check, CAPTCHA, or rate limits. `/api/sheets` does not verify Firebase Admin auth on the server.
3. **MEDIUM — Firestore Rules Array Helpers Only Check Index `[0]` (`firestore.rules` lines 44–75):**
   - `topics`, `highlights`, `resources` (including `resources[1..3].url`), `sessionHighlights`, `extraLocations`, `customStats`, and `topLocations` are only validated at `[0]`.
4. **MEDIUM — `Channels` Tab Copy Contradicts Hardcoded Fallbacks (`SiteFooter.tsx`, `ContactPageClient.tsx` vs. `AdminConsoleClient.tsx`):**
   - Admin UI claims blank channels are hidden from the public footer, yet `SiteFooter.tsx` (lines 79–88) and `ContactPageClient.tsx` fall back to hardcoded Instagram (`_tta.ng`) and X (`TTA_Africa`) URLs when blank.
5. **MEDIUM — Dead Border Beam Condition in Wrapped (`WrappedPrimitives.tsx` line 428):**
   - Checks `slideIndex === 0 || slideIndex === 11`, whereas `mapWrappedConfigToSlides` generates 10 slides (`0..9`), so index `11` never renders.
6. **MEDIUM — Client-Only Data Fetching Hurts SEO (`app/sessions/[id]/page.tsx`, `app/sitemap.ts`):**
   - Dynamic session pages lack `generateMetadata` and `/sitemap.ts` URLs; initial SSR HTML for data-driven pages contains loading states instead of session/media content.
7. **LOW–MEDIUM — Wrapped `autoplaySeconds` Hardcoded to `0` & Legacy Import Omits `startAtIso`:**
   - `mapWrappedConfigToSettings` hardcodes `autoplaySeconds: 0` (no admin setting); `syncLegacyContentToPrimary` does not populate `startAtIso` or `resources`.
8. **LOW — Substring Session ↔ Media Matching & YouTube Author Pollution (`SessionsPageClient.tsx`, `MediaPageClient.tsx`):**
   - Session recordings match via case-insensitive substring comparison instead of a `sessionId` foreign key. Unmatched YouTube feed videos are tagged with `sessionRef: "YouTube Channel"` and `speaker: "The Thinking Architects"`.
9. **LOW — Home vs. `/sessions` Next-Session Mismatch & Dead Code:**
   - `TracksGrid.tsx` falls back to any `isNextSession` or `items[0]` even if `archived`, whereas `SessionsPageClient.tsx` requires `status === "upcoming"`. Three orphan components (`LiveElapsedTimer.tsx`, `LiveQuestionQueue.tsx`, `WrappedSpotlightBanner.tsx`) and unused `/public/og-image.svg` / `/public/assets/aistudio/...` remain on disk.
10. **INFO — Hardcoded Values Inventory:** Tally form `9q8l55` (`lib/tally.ts`), 2 bootstrapped owner emails (`firestore.rules`, `FirebaseProvider.tsx`, `AdminConsoleClient.tsx`, `security_spec.md`), `hello@thethinkingarchitects.com.ng`, fallback domain `https://thethinkingarchitects.com.ng`, fallback Instagram/X URLs, legacy Firebase project config (`principal-day-6n50x`), and `"Annual Review · 2026"` in `WrappedPageClient.tsx`.

---

### 18. Features Discussed or Partially Built (Not Completed)

> **History Transparency:** Pre-compaction chat turns covering *"what ai capabilities can we add"* and *"apart from ai ideas what Else"* were truncated prior to this session and are not stored in the repository, so verbatim ideas from those earlier turns cannot be cited from history. The list below reflects **partially built, stubbed, or missing capabilities directly evidenced in the codebase**:

- **Multi-Year `/wrapped?year=YYYY` Viewer & `customStats` Milestone Rendering:** Admin CRUD and Firestore schema/rules exist (`year-YYYY`, `customStats`), but public `/wrapped` reading and slide rendering remain unwired (`WrappedPageClient.tsx`, `lib/firebaseContent.ts`).
- **Automated Member Onboarding & Webhooks:** `/subscribers` currently requires manual CSV export, Tally forms require manual OAuth Google Sheets pulls (`AdminGoogleSheetsSyncCard.tsx`), and welcome/invite emails are sent externally with no transactional email service or Tally/Luma webhooks.
- **Background Push Notifications:** `lib/sessionReminders.ts` only fires `Notification` alerts while a browser tab stays open; Service Worker / FCM background Web Push is not implemented.
- **Firebase App Check:** `recaptchaSiteKey` exists in `firebase-applet-config.json` as `""` and is unconfigured.
- **Executable Security & E2E Tests:** `firestore.rules.test.ts` documents 24 test cases without an emulator or test runner.
- **AI Capabilities:** No Gemini SDK, AI routes, or LLM-driven features exist anywhere in `package.json` or the codebase today.
